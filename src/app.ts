import { log } from "console";
import express from "express";
import { connectDB } from "./utils/features.js";
import { errorMiddleware } from "./middlewares/error.js";
import NodeCache from "node-cache";
import {config} from "dotenv";
import morgan from "morgan";
import Stripe from "stripe";
import cors from "cors"

// Routes
import userRoute from './routes/user.js';
import productRoute from './routes/product.js';
import orderRoute from './routes/orders.js';
import paymentRoute from './routes/payment.js';
import dashboardRoute from './routes/stats.js';

config({
    path : "./.env"
});

console.log(process.env.PORT);

const port = process.env.PORT || 4000;
const url = process.env.MONGODB_URL || "";
const stripeKey = process.env.STRIPE_KEY || "";

connectDB(url);

export const stripe = new Stripe(stripeKey);
export const myCache = new NodeCache();

const app = express();
app.use(express.json());
app.use(morgan("dev"));
app.use(cors());

app.get("/" , (req,res) =>{
    res.send("API working with /api/v1")
});
app.use("/uploads", express.static("./uploads"));
app.use("/api/v1/user" , userRoute);
app.use("/api/v1/product" , productRoute);
app.use("/api/v1/order" , orderRoute);
app.use("/api/v1/payment" , paymentRoute);
app.use("/api/v1/dashboard" , dashboardRoute);

app.use("/uplaods", express.static("uploads"));

app.use(errorMiddleware)

app.listen(port , () =>{
    log("Server is working");
})