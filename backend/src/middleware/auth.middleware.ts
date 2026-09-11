import { NextFunction, Request, Response } from "express";
import jwt from 'jsonwebtoken'
import 'dotenv/config'

const auth = (request: Request, response: Response, next: NextFunction) => {
    try {
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return response.status(401).json({ message: "No token provided, authorizatio denied" });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return response.status(401).json({ message: "No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };

        if (!decoded.id) {
            return response.status(401).json({ message: "Invalid token" });
        }

        request.user = { id: decoded.id }
        next()
    } catch (error) {
        console.log(error);
        if (error instanceof jwt.TokenExpiredError) {
            console.log("JWT EXPIRED:", error.expiredAt);

            return response.status(401).json({
                message: "Token expired"
            });
        }

        if (error instanceof jwt.JsonWebTokenError) {
            console.log("JWT INVALID:", error.message);

            return response.status(401).json({
                message: "Invalid token"
            });
        }

        console.error("AUTH ERROR:", error);

        return response.status(500).json({
            message: "Authentication error"
        });
    }
}

export default auth;
