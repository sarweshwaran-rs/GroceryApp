import express from 'express'
import admin from '../middleware/admin.middleware.js';
import auth from '../middleware/auth.middleware.js';
import { assignDeliveryPartner, createDeliveryPartner, getAdminStats, getDeliveryPartners, updateDeliveryPartner } from '../controllers/admin.controller.js';

const adminRouter = express.Router();

adminRouter.get("/stats",auth, admin, getAdminStats)
adminRouter.get("/partners", auth, admin,getDeliveryPartners)
adminRouter.post("/partners", auth, admin, createDeliveryPartner)
adminRouter.put("/partners/:id", auth, admin,updateDeliveryPartner);
adminRouter.put("/orders/:id/assign", auth, admin,assignDeliveryPartner)

export default adminRouter;
