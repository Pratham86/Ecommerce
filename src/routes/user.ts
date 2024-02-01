import express from "express";
import { newUser,getAllUsers,getUser, deleteUser } from "../controllers/user.js";
import { amdinOnly } from "../middlewares/auth.js";

const app = express.Router();

app.post("/new" , newUser);

app.get("/all" ,amdinOnly, getAllUsers);

app.route("/:id")
.get(getUser)
.delete(amdinOnly , deleteUser);

export default app; 