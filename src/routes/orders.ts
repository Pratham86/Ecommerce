import express from "express";
import { amdinOnly } from "../middlewares/auth.js";
import { allOrders, deleteOrder, getSingleOrder, myOrder, newOrder, processOrder } from "../controllers/order.js";

const app = express.Router();

app.post("/new" , newOrder);

app.get("/my" , myOrder);

app.get("/all" ,amdinOnly, allOrders);

app.route("/:id")
.get(getSingleOrder)
.patch(amdinOnly,processOrder)
.delete(amdinOnly ,deleteOrder);



export default app; 