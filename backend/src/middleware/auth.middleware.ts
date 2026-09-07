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
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string }

        request.user = { id: decoded.id }
        next()
    } catch (error) {
        console.log(error);
        return response.status(401).json({ message: "Token is not valid" })
    }
}

export default auth;
