import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma.js";

const admin = async (request: Request, response: Response, next: NextFunction) => {
    try {
        const userId = request.user?.id;

        if (!userId) {
            return response.status(401).json({ message: "Unauthorized" })
        }

        const user = await prisma.user.findUnique({ where: { id: userId } })

        if (!user) {
            return response.status(404).json({ message: "User ot found" })
        }

        const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(",").map((email) => email.trim().toLowerCase()) : []

        if (adminEmails.includes(user.email.toLowerCase())) {
            if (request.user) request.user.isAdmin = true;
            next()
        } else {
            return response.status(403).json({ message: "Admin access required" })
        }
    } catch (error: any) {
        console.log(error);
        response.status(500).json({ message: "Admin verification failed: ", error: error.message })
    }
}

export default admin;
