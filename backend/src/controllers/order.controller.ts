import { Request, Response } from 'express'
import { prisma } from '../config/prisma.js';
import { inngest } from '../inngest/index.js';
import Stripe from 'stripe'

// Create order
// POST /api/orders
export const createOrder = async (request: Request, response: Response) => {
    const { items, shippingAddress, paymentMethod } = request.body

    // Check if order items are empty
    if (!items || items.length === 0) {
        return response.status(400).json({ message: "No order items" })
    }

    // Loop up actual prices from the database
    const productIds = items.map((item: any) => item.product);

    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap: Record<string, (typeof products)[0]> = {}

    products.forEach((p: any) => (productMap[p.id] = p))

    // Check if product is in stock
    for (const item of items) {
        const product = productMap[item.product]

        if (!product || (product.stock ?? 0) < item.quantity) {
            return response.status(400).json({ message: "Product out of stock" })
        }
    }

    const orderItems = items.map((item: any) => {
        const dbProduct = productMap[item.product];

        if (!dbProduct) throw new Error(`Product ${item.product} not found`);
        return {
            product: dbProduct.id,
            name: dbProduct.name,
            image: dbProduct.image,
            price: dbProduct.price,
            quantity: item.quantity,
            unit: dbProduct.unit
        }
    })

    const subtotal = orderItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0)

    const deliveryFee = subtotal > 20 ? 0 : 1.99;

    const tax = Math.round(subtotal * 0.08 * 100) / 100;

    const total = Math.round((subtotal + deliveryFee + tax) * 100) / 100;

    const order = await prisma.order.create({
        data: {
            userId: request.user!.id,
            items: orderItems,
            shippingAddress,
            paymentMethod,
            subtotal,
            deliveryFee,
            tax,
            total,
            statusHistory: [{ status: "Placed", note: "Order Placed Successfully", timestamp: new Date() }]
        }
    })

    if (paymentMethod == "card") {
        // stripe payment link
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

        // Create Session
        const session = await stripe.checkout.sessions.create({
            success_url: `${request.headers.origin}/orders?clearCart=true`,
            cancel_url: `${request.headers.origin}/checkout`,
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: "Payment Groceries",
                        },
                        unit_amount: Math.round(total * 100)
                    },
                    quantity: 1, 
                },
            ],
            mode: 'payment',
            metadata: {
                orderId: order.id
            }
        });
        return response.json({url: session.url})
    }

    response.json({ order })

    // Decrease stock
    for (const item of orderItems) {
        await prisma.product.update({
            where: { id: item.product },
            data: { stock: { decrement: item.quantity } }
        })
    }

    // Send Stock update events for each product in the order
    for (const item of orderItems) {
        await inngest.send({ name: "inventory/stock.updated", data: { productId: item.product } })
    }

    await inngest.send({ name: "order/placed", data: { orderId: order.id } })
}

// Get Users Orders
// GET /api/orders
export const getUserOrders = async (request: Request, response: Response) => {
    const { status } = request.query;

    const where: any = {
        userId: request.user!.id,
        NOT: [{ paymentMethod: "card", isPaid: false }]
    }

    if (status && status !== "all") {
        where.status = status;
    }

    const orders = await prisma.order.findMany({
        where,
        include: {
            deliveryPartner: {
                select: {
                    name: true,
                    phone: true
                }
            }
        },
        orderBy: { createdAt: "desc" },
    })
    response.json({ orders })
}


// Get Single Order
// GET /api/orders/:id
export const getOrder = async (request: Request, response: Response) => {
    const order = await prisma.order.findFirst({
        where: {
            id: request.params.id as string,
            userId: request.user!.id
        },
        include: {
            deliveryPartner: {
                select: { name: true, phone: true, avatar: true, vehicleType: true }
            }
        }
    })

    if (!order) {
        return response.status(404).json({ message: "Order not found" })
    }

    response.json({ order })
}

// Update order status (admin)
// PUT /api/orders/:id/status
export const updateOrderStatus = async (request: Request, response: Response) => {
    const { status, note } = request.body;
    const order = await prisma.order.findUnique({ where: { id: request.params.id as string } })

    if (!order) {
        return response.status(404).json({ message: "Order not found" })
    }

    const history = (Array.isArray(order.statusHistory) ? order.statusHistory : []) as any[];

    history.push({ status, note: note || `Order ${status.toLowerCase()}`, timestamp: new Date() })

    const updatedOrder = await prisma.order.update({
        where: { id: request.params.id as string },
        data: { status, statusHistory: history }
    })

    response.json({ order: updatedOrder })
}

// Get all orders (admin)
// GET /api/orders/all
export const getAllOrders = async (requst: Request, response: Response) => {
    const orders = await prisma.order.findMany({
        where: { NOT: [{ paymentMethod: "card", isPaid: false }] },
        include: {
            user: { select: { name: true, email: true } },
            deliveryPartner: { select: { name: true, phone: true, email: true } }
        },
        orderBy: { createdAt: "desc" }
    })
    response.json({ orders })
}

// Get Order Location
// GET /api/orders/:id/location
export const getOrderLocation = async (request: Request, response: Response) => {
    const order = await prisma.order.findFirst({
        where: {
            id: request.params.id as string,
            userId: request.user!.id
        },
        select: { liveLocation: true, status: true }
    })

    if (!order) return response.status(404).json({ message: "Order not Found" })

    response.json({ liveLocation: order.liveLocation, status: order.status })
}

