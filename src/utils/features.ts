import { log } from "console"
import mongoose from "mongoose"
import { InvalidateCacheProps, OrderItemType } from "../types/types.js"
import { myCache } from "../app.js"
import { Product } from "../models/product.js"
import { Order } from "../models/order.js"
import { stringify } from "querystring"
import { Document } from "mongodb"

export const connectDB = (url: string) =>{
    mongoose.connect(url).then(db =>{
        log(`DB connected to ${db.connection.host}`)
    }).catch((e) =>{
        log(e)
    })
}

export const invalidateCache = ({
    product,
    order,
    admin,
    userId,
    orderId ,
    productId
} : InvalidateCacheProps) =>{
    if(product){
        const productKeys = ["latest-product" , "categories" , "all-product" ];

        if (typeof productId === "string" ){
            productKeys.push(`product-${productId}`);
        }
        
        if(typeof productId === "object"){
            productId.forEach(id => productKeys.push(`product-${id}`))
        }
        myCache.del(productKeys);
    }
    if(order){
        const ordersKeys = ["all-orders" , `my-orders-${userId}` , `order-${orderId}`];

        myCache.del(ordersKeys);
    }
    if(admin){
        myCache.del(["admin-stats" , "admin-bar-charts","admin-pie-charts","admin-line-charts"])
    }
}

export const reduceStock = async (orderItems : OrderItemType[]) =>{

    for (let i = 0; i < orderItems.length; i++){
        const order = orderItems[i];
        const product = await Product.findById(order.productId);
        if(!product){
            throw new Error("Product not found");
        }

        product.stock -= order.quantity;
        await product.save();
    }
}

export const calculatePerc = (thisMonth : number , lastMonth : number) => {
    if(lastMonth === 0){
        return thisMonth * 100;
    }

    const percentage = (thisMonth /lastMonth) * 100;

    return Number(percentage.toFixed(0));
}

export const getCategories = async ({categories, productCount} : {categories : string[], productCount : number } ) =>{

    const categoryCountPromise = categories.map(category => Product.countDocuments({category})); 

    const categoryCount = await Promise.all(categoryCountPromise);

    const categoryCountObj:Record<string , number>[] = [];

    categories.forEach((category , i) =>{
        categoryCountObj.push({
             
            [category] : Math.round((categoryCount[i] / productCount) * 100),
        })
    });

    return categoryCountObj
}

interface MyDocument extends Document{
    createdAt: Date;
    discount? : number;
    total? : number;
}

export const getChartData =({length ,docArr , property} : {length : number , docArr : MyDocument[], property? : string}) =>{
    const today = new Date();
    const data = new Array(length).fill(0);

        docArr.forEach((i) =>{
            
            const creationDate = i.createdAt;

            const monthDiff = (today.getMonth() - creationDate.getMonth() + 12 ) % 12;

            if(monthDiff < length){
                data[length - monthDiff -1] += property ? i[property] : 1;
                
            }
        });

    return data;
}