import "dotenv/config"
import { NextFunction, Request, Response } from "express";
import jwt from 'jsonwebtoken'
import { prisma } from "../config/prisma.js";

const deliveryAuth = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return response.status(401).json({message: "No Token Provided"});
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {id: string, role: string}

        if (decoded.role !== "delivery") {
            return response.status(403).json({message: "Access denied. Delivery partner only."});
        }

        const partner = await prisma.deliveryPartner.findUnique({
            where: {
                id: decoded.id
            }
        });

        if (!partner || !partner.isActive) {
            return response.status(403).json({message: "Account is deactivated"});
        }

        request.partner = partner;

        next();
    } catch (error: any) {
        console.log(error);
        return response.status(401).json({message: "Token is not valid"});
    }
}

export default deliveryAuth;
