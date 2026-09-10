import "dotenv/config"
import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { delimiter } from "node:path";

const generateToken = (id: string) => {
    return jwt.sign({ id, role: "delivery" }, process.env.JWT_SECRET as string, { expiresIn: "30d" })
}

// Login Delivery Partner
// POST /api/delivery/login
export const loginPartner = async (request: Request, response: Response) => {
    const { email, password } = request.body;

    if (!email || !password) {
        return response.status(400).json({ message: "Please provide email and password" });
    }

    const partner = await prisma.deliveryPartner.findUnique({
        where: { email: email.toLowerCase() }
    })

    if (!partner) {
        return response.status(401).json({ message: "Invalid email or password" });
    }

    if (!partner.isActive) {
        return response.status(403).json({ message: "Your account has been deactivated" });
    }

    const isMatch = await bcrypt.compare(password, partner.password)

    if (!isMatch) {
        return response.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(partner.id)
    const { password: _, ...partnetData } = partner;

    response.json(200).json({
        partner: partnetData,
        token
    })
}

// Get Assigned Deliveries
// GET /api/delivery/my-deliveries
export const getMyDeliveries = async (request: Request, response: Response) => {
    const { status } = request.query;

    const where: any = { deliveryPartnerId: request.partner!.id };

    if (status == "active") {
        where.status = { in: ["Assigned", "Packed", "Out for Delivery"] }
    } else if (status == "completed") {
        where.status = { in: ["Delivered", "Cancelled"] }
    }

    const orders = await prisma.order.findMany({
        where,
        include: {
            user: {
                select: {
                    name: true,
                    email: true,
                    phone: true,
                }
            },
        },
        orderBy: {
            createdAt: "desc"
        }
    })

    return response.status(200).json({ orders })
}

// Get Single delivery detail
// GET /api/delivery/my-deliveries/:id
export const getSingleDelivery = async (request: Request, response: Response) => {
    const order = await prisma.order.findFirst({
        where: { id: request.params.id as string, deliveryPartnerId: request.partner!.id },
        include: {
            user: {
                select: {
                    name: true,
                    email: true,
                    phone: true,
                }
            }
        }
    })

    if (!order) {
        return response.status(404).json({ message: "Delivery Not Found" });
    }

    response.status(200).json({ order })
}

// Complete Delivery with OTP
// PUT /api/delivery/my-deliveries/:id/complete
export const completeDelivery = async (request: Request, response: Response) => {
    const { otp } = request.body;
    const order = await prisma.order.findFirst({
        where: {
            id: request.params.id as string,
            deliveryPartnerId: request.partner!.id
        }
    })

    if (!order || order.status === "Cancelled" || order.status === "Delivered") {
        return response.status(400).json({ message: "Invalid request" });
    }

    if (order.deliveryOtp !== otp) {
        return response.status(500).json({ message: "Invalid OTP" });
    }

    const history = order.statusHistory as any[];

    history.push({
        status: 'Delivered',
        note: "Delivered by partner",
        timestamp: new Date()
    });

    const updatedOrder = await prisma.order.update({
        where: {
            id: order!.id
        },
        data: {
            status: "Delivered",
            statusHistory: history,
            deliveryOtp: ""
        }
    })

    return response.status(200).json({
        updatedOrder,
        message: "Delivery completed successfully"
    });
}

// Cancel Delivery
// PUT /api/delivery/my-deliveries/:id/cancel
export const cancelDelivery = async (request: Request, response: Response) => {
    const { reason } = request.body;

    const order = await prisma.order.findFirst({
        where: {
            id: request.params.id as string,
            deliveryPartnerId: request.partner!.id
        }
    });

    if (order!.status === "Delivered") {
        return response.status(400).json({message: "Cannot Cancel a delivered order"});
    } 

    const history = order!.statusHistory as any[];

    history.push({
        status: "Cancelled",
        note: reason || "",
        timestamp: new Date()
    });

    const updatedOrder = await prisma.order.update({
        where: {
            id: order!.id
        },
        data: {
            status: "Cancelled",
            statusHistory: history
        }
    });

    return response.status(200).json({updatedOrder, message: "Delivery cancelled"})
}

// Update Order Status
// PUT /api/delivery/my-deliveries/:id/status
export const updateDeliveryStatus = async (request: Request, response: Response) => {
    const { status } = request.body;
    const allowedStatuses = ['Packed', 'Out for Delivery'];

    if (!allowedStatuses.includes(status)) {
        return response.status(400).json({message: "Invalid status update"});
    }

    const order = await prisma.order.findFirst({
        where: {
            id: request.params.id as string,
            deliveryPartnerId: request.partner!.id,
        }
    });

    const history = order!.statusHistory as any[];

    history.push({
        status,
        note: `Status updated to ${status}`,
        timestamp: new Date()
    });

    const updatedOrder = await prisma.order.update({
        where: {
            id: order!.id
        }, 
        data: {
            status,
            statusHistory: history
        }
    });

    return response.status(200).json({updatedOrder})
}

// Update Live Location
// PUT /api/delivery/my-deliveries/:id/location
export const updateLiveocation = async (request: Request, response: Response) => {
    const { lat, lng } = request.body;

    const order = await prisma.order.findFirst({
        where: {
            id: request.params.id as string,
            deliveryPartnerId: request.partner!.id,
            status: {in: ["Assigned", "Packed", "Out for Delivery"]}
        }
    });

    await prisma.order.update({
        where: {
            id: order!.id
        },
        data: {
            liveLocation: {
                lat,
                lng,
                updatedAt: new Date()
            }
        }
    });

    return response.status(200).json({success: true});
}
