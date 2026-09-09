import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";

// Get user addresses
// GET api/addresses
export const getAddresses = async (request: Request, response: Response) => {
    const addresses = await prisma.address.findMany({
        where: {
            userId: request.user?.id
        },
        orderBy: { createdAt: "asc" },
    })

    if (addresses.length === 0) {
        return response.status(404).json({ message: "No Addresses Found" });
    }

    response.status(200).json({ addresses })
}

// Add Addresses
// POST api/addresses
export const addAddress = async (request: Request, response: Response) => {
    const { label, address, city, state, zip, isDefault, lat, lng } = request.body;

    // Required coordinates
    if (lat == null || lng == null) {
        return response.status(400).json({ message: "Location coordinates are required.  Please allow location access." });
    }

    const currentAddresses = await prisma.address.findMany({
        where: {
            userId: request.user?.id,
        }
    });

    let makeDefault = isDefault;

    if (currentAddresses.length === 0) makeDefault = true;


    if (makeDefault) {
        await prisma.address.updateMany({
            where: {
                userId: request.user!.id
            },
            data: {
                isDefault: false
            }
        })
    }

    await prisma.address.create({
        data: {
            userId: request.user!.id,
            label,
            address,
            city,
            state,
            zip,
            isDefault: makeDefault,
            lat: Number(lat),
            lng: Number(lng)
        }
    })

    const addresses = await prisma.address.findMany({
        where: {
            userId: request.user?.id
        },
        orderBy: {
            createdAt: "asc"
        }
    })

    response.status(201).json({ addresses });
}

// Update Address
// PUT /api/addresses/:id
export const updateAddress = async (request: Request, response: Response) => {
    const { label, address, city, state, zip, isDefault, lat, lng } = request.body;

    // Required Coordinates
    if (lat == null || lng == null) {
        return response.status(400).json({ message: "Location coordinates are required.  Please allow location access." });
    }

    if (isDefault) {
        await prisma.address.updateMany({
            where: {
                userId: request.user?.id
            },
            data: {
                isDefault: false
            }
        })
    }

    const data: any = {};

    if (label) data.label = label;
    if (address) data.address = address;
    if (city) data.city = city;
    if (state) data.state = state;
    if (zip) data.zip = zip;
    if (isDefault !== undefined) data.isDefault = isDefault;
    if (lat !== null) data.lat = Number(lat);
    if (lng !== null) data.lng = Number(lng);

    try {
        await prisma.address.update({
            where: {
                id: request.params.id as string
            },
            data,
        })
    } catch (error) {
        return response.status(404).json({ message: "Address not found" });
    }

    const addresses = await prisma.address.findMany({
        where: {
            userId: request.user!.id
        },
        orderBy: { createdAt: "asc" }
    })

    response.status(200).json({ addresses });
}

// Delete Address
// DELETE /api/addresses/:id
export const deleteAddress = async (request: Request, response: Response) => {
    try {
        await prisma.address.delete({
            where: {
                id: request.params.id as string
            }
        })
    } catch (error: any) {
        console.log(error.message)
    }

    const addresses = await prisma.address.findMany({
        where: {
            userId: request.user!.id
        },
        orderBy: {
            createdAt: "asc"
        }
    })

    response.status(200).json({ addresses })
}

