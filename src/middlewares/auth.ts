import { User } from "../models/user.js";
import { ControllerType } from "../types/types.js";
import ErrorHandler from "../utils/utility-class.js";
import { TryCatch } from "./error.js";

export const amdinOnly = TryCatch( async (req , res , next) => {
    const { id } = req.query;
    if(!id) return next(new ErrorHandler("Please login" , 401));
    console.log(id);
    

    const user = await User.findById(id);
    if(!user){
        return next(new ErrorHandler("Enter valid ID" , 401));
    }

    if(user.role !== "admin"){
        return next(new ErrorHandler("You are not authorized!!!" , 401))
    }
    next()
});