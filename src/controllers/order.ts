import { Request } from "express";
import { TryCatch } from "../middlewares/error.js";
import { NewOrderRequestBody } from "../types/types.js";
import { Order } from "../models/order.js";
import { invalidateCache, reduceStock } from "../utils/features.js";
import ErrorHandler from "../utils/utility-class.js";
import { myCache } from "../app.js";

export const newOrder = TryCatch(async (req : Request<{} , {} , NewOrderRequestBody> , res, next) =>{
    const {shippingInfo , orderItems , user, subtotal , tax , shippingCharges , discount , total} = req.body;

    if(!shippingInfo || !orderItems || !user || !subtotal || !tax || !total ){
        return next(new ErrorHandler("Please enter all fields" , 401));
    }

    const order = await Order.create({
        shippingInfo , orderItems , user, subtotal , tax , shippingCharges , discount , total
    });

    await reduceStock(orderItems);

    invalidateCache({product : true , order : true , admin : true , userId : user , productId : order.orderItems.map(i => String(i.productId)) });

    return res.status(201).json({
        message: "Order placed successfully"
    })
});

export const myOrder = TryCatch(async (req , res, next) =>{
    const {id : user} = req.query;
    let orders;

    if(myCache.has(`my-orders-${user}`)){
        orders = JSON.parse(myCache.get(`my-orders-${user}`) as string);
    }
    else{
        orders = await Order.find({user});
        myCache.set(`my-orders-${user}` , JSON.stringify(orders));
    }

    return res.status(200).json({
        orders
    })
});

export const allOrders = TryCatch(async (req , res, next) =>{
    let orders;

    if(myCache.has("all-orders")){
        orders = JSON.parse(myCache.get("all-orders") as string);
    }
    else{
        orders = await Order.find().populate("user" , "name _id");

        myCache.set("all-orders" , JSON.stringify(orders));
    }

    return res.status(200).json({
        orders
    })
});

export const getSingleOrder = TryCatch(async (req , res, next) =>{

    const {id} = req.params;

    const key = `order-${id}`;

    let order;

    if(myCache.has(key)){
        order = JSON.parse(myCache.get(key) as string);
    }
    else{
        order = await Order.findById(id).populate("user" , "name");

        if(!order)
            return next(new ErrorHandler("Order not found" , 401));

        myCache.set(key , JSON.stringify(order));
    }

    return res.status(200).json({
        order
    })
});

export const processOrder = TryCatch(async (req , res, next) =>{

    const {id} = req.params;

    const order = await Order.findById(id);

    if(!order){
        return next(new ErrorHandler("Order not found" , 404));
    }
    let st;
    switch (order.status) {
        case "Processing":
            st = "Shipped"
            break;
        
        case "Shipped":
            st = "Delivered"
            break;
        default:
            st = "Delivered"
            break;
    }

    await Order.findByIdAndUpdate(id , {status : st});

    invalidateCache({product : false , order : true , admin : true , userId : order.user , orderId : String(order._id)});

    return res.status(200).json({
        message : "Order has been processed",
    })
});

export const deleteOrder = TryCatch(async (req , res, next) =>{

    const {id} = req.params;

    const order = await Order.findById(id);

    if(!order){
        return next(new ErrorHandler("Order not found" , 404));
    }

    await Order.findByIdAndDelete(id);

    invalidateCache({product : false , order : true , admin : true , userId: order.user , orderId : String(order._id)});

    return res.status(200).json({
        message : "Order has been deleted" 
    })
});

