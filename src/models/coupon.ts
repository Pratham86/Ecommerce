import mongoose from "mongoose";

const schema = new mongoose.Schema(
    {
        code : {
            type :String,

            unique : [true,"Coupon already exists"],

            required:[true , "Please enter the coupon code"],
        },
        amount : {
            type :Number,
            
            required:[true , "Please enter the discount amount"]
        },
    }
)
export const Coupon = mongoose.model("Coupon" , schema);