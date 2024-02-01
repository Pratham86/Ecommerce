import express from "express";
import { amdinOnly } from "../middlewares/auth.js";
import { deleteProduct, getAdminProducts, getAllCategories, getProducts, getSingleProduct, newProduct, searchProducts, updateProduct } from "../controllers/product.js";
import { singleUpload } from "../middlewares/multer.js";

const app = express.Router();

// /api/v1/product
app.post("/new", amdinOnly,singleUpload , newProduct);

app.get("/all" , searchProducts);

app.get("/latest" , getProducts);

app.get("/category" , getAllCategories);
app.get("/admin-products" , amdinOnly,getAdminProducts);


app.route("/:id")
.get(getSingleProduct)
.patch(amdinOnly , singleUpload , updateProduct)
.delete(amdinOnly , deleteProduct);

export default app; 