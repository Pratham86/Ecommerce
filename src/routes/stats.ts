import express from "express";
import { amdinOnly } from "../middlewares/auth.js";
import { getBarCharts, getDashboardStats, getLineCharts, getPieCharts } from "../controllers/stats.js";

const app = express.Router();

app.get("/stats", amdinOnly, getDashboardStats);

app.get("/pie" , amdinOnly , getPieCharts);
app.get("/bar" , amdinOnly , getBarCharts);
app.get("/line" , amdinOnly , getLineCharts);


export default app; 