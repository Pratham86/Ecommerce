import express from "express";
import { amdinOnly } from "../middlewares/auth.js";
import { applyDiscount, createPaymentIntent, deleteCoupon, getAllCoupons, getSingleCoupon, newCoupon } from "../controllers/payment.js";

const app = express.Router();

app.post("/create" , createPaymentIntent);
app.get("/discount" , applyDiscount);

app.post("/coupon/new" , amdinOnly , newCoupon);

app.get("/coupon/all" , amdinOnly,getAllCoupons);

app.route("/coupon/:id")
.delete(amdinOnly,deleteCoupon)
.get(amdinOnly , getSingleCoupon)

export default app; 