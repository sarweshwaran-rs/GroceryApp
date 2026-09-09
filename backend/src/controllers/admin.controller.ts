import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import bcrypt from 'bcrypt';
import { pipeTo } from "node:stream/iter";

// Get Admin Dashboard data
// GET /admin/stats
export const getAdminStats = async (request: Request, response: Response) => {
    const [totalOrders, totalUsers, totalProduct, outOfStock, totalPartners, recentOrders] = await Promise.all([
        prisma.order.count({
            where: { NOT: [{ paymentMethod: "card", isPaid: false }] },
        }),
        prisma.user.count(),
        prisma.product.count(),
        prisma.product.count({ where: { stock: 0 } }),
        prisma.deliveryPartner.count(),
        prisma.order.findMany({
            where: {
                NOT: [{ paymentMethod: "card", isPaid: false }]
            },
            orderBy: {
                createdAt: "desc"
            },
            take: 8,
            include: {
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                },
                deliveryPartner: {
                    select: {
                        name: true,
                        phone: true,
                    }
                }
            },
        })
    ])

    response.status(200).json({
        totalOrders, 
        totalUsers, 
        totalProduct, 
        outOfStock, 
        totalPartners, 
        recentOrders
    })
} 

// Get Delivery Partners list for admin
// GET /api/admin/partners
export const getDeliveryPartners = async (request: Request, resposne: Response) => {
    const partners = await prisma.deliveryPartner.findMany({
        orderBy: {
            createdAt: "desc"
        }
    })

    resposne.status(200).json({partners})
}


// Create delivery partner profile
// POST /api/admin/partners
export const createDeliveryPartner = async (request: Request, response: Response) => {
    const { name, email, password, phone, vehicleType } = request.body;

    if (!name || !email || !password || !phone) {
        return response.status(404).json({message: "Please provide all required fields"})
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const partner = await prisma.deliveryPartner.create( {
        data: {
            name, 
            email: email.toLowerCase(), 
            password: hashedPassword, 
            phone, 
            vehicleType
        }
    })

    return response.status(201).json({partner});
}

// Update delivery partner
// PUT api/admin/partners/:id
export const updateDeliveryPartner = async (request: Request, response: Response) => {
    const { name, phone, vehicleType, isActive } = request.body;

    const data: any = {};

    if (name) data.name = name;
    if (phone) data.phone = phone;
    if (vehicleType) data.vehicleType = vehicleType;
    if (isActive) data.isActive = isActive;
    
    try {
        const partner = await prisma.deliveryPartner.update({
            where: {
                id: request.params.id as string
            }, 
            data
        })

        return response.status(200).json({partner})
    } catch (error: any) {
        return response.status(404).json({message: "Partner not found"});
    }
}


// Assign Delivery Partner for Order
// PUT /api/admin/ordes/:id/assign
export const assignDeliveryPartner = async (request: Request, response: Response) => {
    const { partnerId } = request.body;

    const order = await prisma.order.findUnique({
        where: {id: request.params.id as string},
    })

    const partner = await prisma.deliveryPartner.findUnique({
        where: {id: partnerId},
    })

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    let status = order!.status;

    const history: any[] = Array.isArray(order!.statusHistory) ? order!.statusHistory : [];

    if (order!.status === "Placed" || order!.status === "Confirmed") {
        status = "Assigned";
        history.push({
            status: "Assogmed",
            note: `Assigned to ${partner!.name}`,
            timestamp: new Date()
        })
    }

    await prisma.order.update({
        where: { id: order!.id },
        data: {
            deliveryPartnerID: partner!.id,
            deliveryOtp: otp,
            status,
            statusHistory: history
        }
    })

    return response.status(401).json({order})
}

