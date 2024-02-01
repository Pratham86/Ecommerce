import { Request } from "express";
import { TryCatch } from "../middlewares/error.js";
import { BaseQuery, NewProductRequestBody, SearchRequestQuery } from "../types/types.js";
import {Product} from "../models/product.js";
import ErrorHandler from "../utils/utility-class.js";
import { rm } from "fs";
import { log } from "console";
import { myCache } from "../app.js";
import { invalidateCache } from "../utils/features.js";
// import {faker} from "@faker-js/faker";

// Get Request Controllers....
export const getProducts = TryCatch(async(req,res,next) => {

    let products;

    // Revalidate on new ,update ,delete of products and on new order

    if(myCache.has("latest-product"))
        products = JSON.parse(myCache.get("latest-product") as string);

    else{
        products = await Product.find({}).sort({createdAt : -1}).limit(5);

        if(!products) return next(new ErrorHandler("Products cannot be fetched" , 404));

        myCache.set("latest-product" , JSON.stringify(products));
    }


    return res.status(200).json({
        message : products
    })
});

export const getAllCategories = TryCatch(async(req,res,next) => {

    let categories;

    // Revalidate on new ,update ,delete of products and on new order

    if(myCache.has("categories")){
        categories = JSON.parse(myCache.get("categories") as string);
    }
    else{
        categories = await Product.distinct("category");
        myCache.set("categories" , JSON.stringify(categories));

    }
    
    return res.status(200).json({
        message: categories
    })
});

// Revalidate on new ,update ,delete of products and on new order
export const getAdminProducts = TryCatch(async(req,res,next) => {

    let products;

    if(myCache.has("all-product"))
        products = JSON.parse(myCache.get("all-product") as string);

    else{
        products = await Product.find({});

        if(!products) return next(new ErrorHandler("Products cannot be fetched" , 404));

        myCache.set("all-product" , JSON.stringify(products));
    }


    return res.status(200).json({
        message : products
    })
});

export const getSingleProduct = TryCatch(async(req,res,next) => {
    let product;
    const id = req.params.id;

    if(myCache.has(`product-${id}`)){
        product = JSON.parse(myCache.get(`product-${id}`) as string)
    }

    else{
        product = await Product.findById(req.params.id);

        if(!product) return next(new ErrorHandler("Product not found" , 404));

        myCache.set(`product-${id}` , JSON.stringify(product))
    }

    
    return res.status(200).json({
        message : product
    })
});

// Update or new Product Controllers...
// revalidation in these controllers
export const newProduct = TryCatch(async(req : Request<{} , {} , NewProductRequestBody>,res,next) => {
    const {name , price , stock , category} = req.body;

    const photo = req.file;

    if(!photo) return next(new ErrorHandler("Please attach a photo" , 401));

    if(!name || !price || stock <= 0 || !category) {
        rm(photo.path , () => {
            log("Deleted.");
        })

        return next(new ErrorHandler("Please enter all fields" , 401));
    }
    await Product.create({
        name , price , stock , category : category.toLowerCase() , 
        photo : photo?.path,
    });

    invalidateCache({product : true , admin : true}); 

    return res.status(201).json({
        message : "Product created successfully"
    })
});


export const updateProduct = TryCatch(async(req, res , next) => {
    const _id = req.params.id;
    
    const {name , price , stock , category} = req.body;

    const photo = req.file;
    console.log(photo);
    
    const product = await Product.findById(_id);

    if(!product) return next(new ErrorHandler("Product not found" , 404));

    

    if(photo) {
        rm(product.photo , () => {
            log("Deleted.");
        })
        await Product.findByIdAndUpdate(_id , {photo : photo?.path});
        
    }

    if(name) await Product.findByIdAndUpdate(_id , {name : name});

    if(price) await Product.findByIdAndUpdate(_id , {price : price});

    if(category) await Product.findByIdAndUpdate(_id , {category : category});

    if(stock) await Product.findByIdAndUpdate(_id , {stock : stock});

    invalidateCache({product : true , productId : String(product._id) , admin : true}); 

    // await product.save();

    return res.status(201).json({
        message : "Product updated successfully"
    })
});

export const deleteProduct = TryCatch(async(req,res,next) => {
    const product = await Product.findById(req.params.id);

    if(!product){
        return next(new ErrorHandler("Product not found" , 404));
    }

    rm(product.photo , () =>{
        log("Product photo deleted");
    });

    await Product.findByIdAndDelete(req.params.id);

    invalidateCache({product : true, productId : String(product._id) , admin : true}); 

    return res.status(200).json({
        message : "Product Deleted Successfully"
    })
});

export const searchProducts = TryCatch(async(req : Request<{},{},{},SearchRequestQuery>,res,next) => {

    const{search , sort , category , price} = req.query;

    const page = Number(req.query.page) || 1;

    const limit = Number(process.env.PRODUCT_PER_PAGE) || 8;

    const skip = limit * (page - 1);
    const baseQuery : BaseQuery = {};

    if(search)
        baseQuery.name = {
            $regex : search,
            $options : "i",
        };

    if(price)
        baseQuery.price = {
            $lte:Number(price)
        };
    
    if(category) baseQuery.category = category;
    

    const [products , filterOnlyProducts] = await Promise.all([
        
        Product.find(baseQuery).sort(
            sort && { price : sort === "asc" ? 1 : -1}
        ).limit(limit).skip(skip) ,

        Product.find(baseQuery)
    ]);



    const totalPage = Math.ceil(filterOnlyProducts.length / limit);

    return res.status(200).json({
        products,
        totalPage
    })
});
// const generateRandomProducts = async(count: number = 10) =>{

//     const products = [];

//     for(let i = 0; i < count; i++){

//         const product = {
//             name : faker.commerce.productName(),
//             photo : "uploads\\6dac0bea-0528-4f13-9836-289b52b15317.png",
//             price : faker.commerce.price({min : 1500 , max : 80000 , dec : 0 }),
//             stock : faker.commerce.price({min:0 , max: 100 , dec : 0}),
//             category: faker.commerce.department(),
//             createdAt : new Date(faker.date.past()),

//             updatedAt : new Date(faker.date.recent()),

//             __v:0,

//         };

//         products.push(product);
//     }

//     await Product.create(products);
//     log({
//         products
//     })
// }

// const deleteRandomProducts = async() => {
//     const products = await Product.find().skip(2);

//     for(let i = 0; i < products.length; i++){
//         const product = products[i];
//         await product.deleteOne();
//     }

//     log({products});
// }
// deleteRandomProducts()