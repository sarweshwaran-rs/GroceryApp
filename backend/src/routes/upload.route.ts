import express, { Request, Response } from 'express'
import auth from '../middleware/auth.middleware.js';
import multer from 'multer'
import cloudinary from '../config/cloudinary.config.js';

const uploadRouter = express.Router();

const stroage = multer.memoryStorage();
const upload = multer({storage: stroage});

uploadRouter.post('/', auth, upload.single('image'), async(request: Request, response: Response) => {
    try {
        if (!request.file) {
            return response.status(400).json({message: "No image file provided"});
        }
        const b64 = Buffer.from(request.file.buffer).toString("base64")
        const dataURI = "data:" + request.file.mimetype + ";base64," + b64;

        const result = await cloudinary.uploader.upload(dataURI, {folder: "grocery-delivery", resource_type: "auto",})

        response.json({url: result.secure_url})
    } catch (error: any) {
        response.status(500).json({message: error.message})
    }
})

export default uploadRouter
