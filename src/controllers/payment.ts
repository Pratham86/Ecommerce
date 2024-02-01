import { stripe } from "../app.js";
import { TryCatch } from "../middlewares/error.js";
import { Coupon } from "../models/coupon.js";
import ErrorHandler from "../utils/utility-class.js";

export const createPaymentIntent = TryCatch(async (req,res,next) =>{
    const {amount} = req.body;

    console.log("Before pi");
    if(!amount){
        return next(new ErrorHandler("Please enter amount" , 401));
    }
    
    const paymentIntent = await stripe.paymentIntents.create({
        amount : Number(amount) * 100,
        currency:"inr"
    })
    console.log("After pi");
    

    return res.status(201).json({
        message : paymentIntent.client_secret
    })
    
});
export const newCoupon = TryCatch(async (req,res,next) =>{
    const {code,amount} = req.body;

    if(!code || !amount){
        return next(new ErrorHandler("Please enter all fields" , 401));
    }

    await Coupon.create({code:code , amount : amount});

    return res.status(201).json({
        message : `Coupon ${code} created successfully`
    })
    
});

export const applyDiscount = TryCatch(async (req,res,next) =>{
    const {code} = req.query;

    const discount = await Coupon.findOne({code : code});

    if(!discount){
        return next(new ErrorHandler("Invalid Coupon" , 401));
    }

    return res.status(201).json({
        message : `Coupon ${code} applied successfully`,
        discount: discount.amount
    })
    
});

export const getAllCoupons = TryCatch(async (req,res,next) =>{
    
    const coupons = await Coupon.find({});

    return res.status(200).json({
        coupons
    })
    
});
export const deleteCoupon = TryCatch(async (req,res,next) =>{
    const {id} = req.params;
    const coupon = await Coupon.findById(id);

    if(!coupon){
        return next(new ErrorHandler("Coupon not found" , 401));
    }

    await Coupon.findByIdAndDelete(id);

    return res.status(201).json({
        message : `Coupon deleted successfully`,
    })
    
});
export const getSingleCoupon = TryCatch(async (req,res,next) =>{
    const {id} = req.params;
    const coupon = await Coupon.findById(id);

    if(!coupon){
        return next(new ErrorHandler("Coupon not found" , 401));
    }

    return res.status(200).json({
        coupon
    })
    
});