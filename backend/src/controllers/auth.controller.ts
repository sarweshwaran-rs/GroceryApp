import { Request, Response } from 'express'
import { prisma } from '../config/prisma.js';
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import 'dotenv/config'

// Generate JWT Token
const generateToekn = (id: string) => {
    return jwt.sign({id}, process.env.JWT_SECRET as string, {
        expiresIn: "30"
    })
}

// Check if user is admin
const getAdminStatus = (email: string | null | undefined): boolean => {
    if (!email) return false
    const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(",").map((email)=>email.trim().toLowerCase()) : [];

    return adminEmails.includes(email.toLowerCase())
}

// Controller for User Registration
// POST /api/auth/register
export const register = async (request: Request, response: Response) => {
    const { name, email, password } = request.body;

    if(!name || !email || !password) {
        return response.status(400).json({message: "Please provide all fields"})
    }

    const existingUser = await prisma.user.findUnique({where: email.toLowerCase()})
    
    if (existingUser) {
        return response.status(400).json({message: "User already exists with this email"})
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
        data: {
            name, 
            email: email.toLowerCase(), 
            password: hashedPassword
        }
    })

    const token = generateToekn(user.id)

    const userData: any = {...user};
    delete userData.password;
    userData.isAdmin = getAdminStatus(userData.email)

    response.status(201).json({user: userData, token})
}


// Controller for User Login
// POST /api/auth/login
export const login = async (request: Request, response: Response) => {
    const { email, password } = request.body;

    if(!email || !password) {
        return response.status(400).json({message: "Please provide email and password fields"})
    }

    const user = await prisma.user.findUnique({where: email.toLowerCase(), include: {addresses: true}})

    if (!user) {
        return response.status(401).json({message: "Invalid email or password"})
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
        return response.status(401).json({message: "Invalid email or password"})
    }

    const token = generateToekn(user.id)

    const userData: any = {...user};
    delete userData.password;
    userData.isAdmin = getAdminStatus(userData.email)

    response.status(200).json({user: userData, token})
}
