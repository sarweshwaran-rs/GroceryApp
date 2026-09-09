import express from 'express'
import admin from '../middleware/admin.middleware.js';
import auth from '../middleware/auth.middleware.js';
import { assignDeliveryPartner, createDeliveryPartner, getAdminStats, getDeliveryPartners, updateDeliveryPartner } from '../controllers/admin.controller.js';

const adminRouter = express.Router();

adminRouter.get("/stats", admin, auth, getAdminStats)
adminRouter.get("/partners", admin, auth, getDeliveryPartners)
adminRouter.post("/partners", admin, auth, createDeliveryPartner)
adminRouter.put("/partners/:id", admin, auth, updateDeliveryPartner);
adminRouter.put("/ordes/:id/assign", admin, auth, assignDeliveryPartner)

export default adminRouter;
