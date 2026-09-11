import express from 'express'
import { cancelDelivery, completeDelivery, getMyDeliveries, getSingleDelivery, loginPartner, updateDeliveryStatus, updateLiveocation } from '../controllers/delivery-partner.controller.js';
import deliveryAuth from '../middleware/deliveryAuth.middleware.js';

const deliveryPartnerRouter = express.Router();

deliveryPartnerRouter.post("/login", loginPartner);
deliveryPartnerRouter.get("/my-deliveries", deliveryAuth, getMyDeliveries);
deliveryPartnerRouter.get("/my-deliveries/:id", deliveryAuth, getSingleDelivery);
deliveryPartnerRouter.put("/my-deliveries/:id/complete", deliveryAuth, completeDelivery);
deliveryPartnerRouter.put("/my-deliveries/:id/cancel", deliveryAuth, cancelDelivery);
deliveryPartnerRouter.put("/my-deliveries/:id/status", deliveryAuth, updateDeliveryStatus);
deliveryPartnerRouter.put("/my-deliveries/:id/location", deliveryAuth, updateLiveocation);

export default deliveryPartnerRouter;
