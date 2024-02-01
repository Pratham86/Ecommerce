import { myCache } from "../app.js";
import { TryCatch } from "../middlewares/error.js";
import { Order } from "../models/order.js";
import { Product } from "../models/product.js";
import { User } from "../models/user.js";
import { calculatePerc, getCategories, getChartData } from "../utils/features.js";

export const getDashboardStats = TryCatch(async(req,res,next) =>{

    let stats = {};

    if(myCache.has("admin-stats")){
        stats = JSON.parse(myCache.get("admin-stats") as string);
    }

    else{
        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const thisMonth = {
            start :  new Date(today.getFullYear() , today.getMonth() , 1),

            end : today,
        }
        
        const lastMonth= {
            start :  new Date(today.getFullYear() , today.getMonth()-1 , 1),

            end : new Date(today.getFullYear() , today.getMonth() , 0),
        }

        const thisMonthProductsPromise = Product.find({
            createdAt : {
                $gte : thisMonth.start,
                $lte : thisMonth.end
            }
        });

        const lastMonthProductsPromise = Product.find({
            createdAt : {
                $gte : lastMonth.start,
                $lte : lastMonth.end
            }
        });




        const thisMonthUserPromise = User.find({
            createdAt : {
                $gte : thisMonth.start,
                $lte : thisMonth.end
            }
        });

        const lastMonthUserPromise = User.find({
            createdAt : {
                $gte : lastMonth.start,
                $lte : lastMonth.end
            }
        });
        
        
        
        const thisMonthOrderPromise = Order.find({
            createdAt : {
                $gte : thisMonth.start,
                $lte : thisMonth.end
            }
        });

        const lastMonthOrderPromise = Order.find({
            createdAt : {
                $gte : lastMonth.start,
                $lte : lastMonth.end
            }
        });
        const lastSixMonthOrderPromise = Order.find({
            createdAt : {
                $gte : sixMonthsAgo,
                $lte : today
            }
        });

        const latestTransactionPromise
         = Order.find({}).select(["orderItems" , "discount" , "total" , "status"]).limit(4);


        const [thisMonthProducts , thisMonthUsers , thisMonthOrders , lastMonthProducts , lastMonthUsers , lastMonthOrders,
        productCount,
        userCount,
        allOrders,
        lastSixMonthOrder,
        categories,
        femaleUsers,
        latestTransaction
        ] = await Promise.all([
            thisMonthProductsPromise,
            thisMonthUserPromise,
            thisMonthOrderPromise,
            lastMonthProductsPromise,
            lastMonthUserPromise,
            lastMonthOrderPromise,
            Product.countDocuments(),
            User.countDocuments(),
            Order.find({}).select("total"),
            lastSixMonthOrderPromise,
            Product.distinct("category"),
            User.countDocuments({gender : "female"}),
            latestTransactionPromise
        ]);

        const thisMonthRevenue = thisMonthOrders.reduce((total , order) => total + (order.total || 0) , 0)
        const lastMonthRevenue = lastMonthOrders.reduce((total , order) => total + (order.total || 0) , 0);


        const percent = {

            revenue : calculatePerc(thisMonthRevenue , lastMonthRevenue), 

            product : calculatePerc(thisMonthProducts.length , lastMonthProducts.length),

            user :  calculatePerc(thisMonthUsers.length , lastMonthUsers.length),

            order : calculatePerc(thisMonthOrders.length , lastMonthOrders.length)
        }

        const revenue = allOrders.reduce((total , order) => total + (order.total || 0) , 0);

        const count = {
            revenue,
            product: productCount,
            user : userCount,
            order: allOrders.length
        }

        const orderMonthCounts =  getChartData({length : 6, docArr : lastSixMonthOrder });

        const orderMonthRevenue =  getChartData({length : 6, docArr : lastSixMonthOrder , property : "total" });

        const categoryCountObj = await getCategories({categories , productCount});


        const genderRatio = {
            male : userCount - femaleUsers,
            femal : femaleUsers
        }

        const modifiedTrans = latestTransaction.map( i => (
            {
                _id : i._id,
                discount : i.discount,
                amount : i.total,
                quantity : i.orderItems.length,
                status : i.status,
            }
        ))

        stats = {
            categoryCountObj,
            percent,
            count,
            chart:{
               order: orderMonthCounts,
               revenue:orderMonthRevenue 
            },
            genderRatio,
            lastestTransactions : modifiedTrans
        }
        
        myCache.set("admin-stats" , JSON.stringify(stats));
    }

    return res.status(200).json({
        stats
    })
});


export const getPieCharts = TryCatch(async(req,res,next) =>{

    let charts;
    if(myCache.has("admin-pie-charts")){
        console.log("Caching");
        
        charts = JSON.parse(myCache.get("admin-pie-charts") as string);
    } 

    else{
        const [processingOrder,shippedOrder, deliveredOrder , categories, productCount,productOutStock, allOrders , allUsers] = await Promise.all([
            Order.countDocuments({status : "Processing"}),
            Order.countDocuments({status : "Shipped"}),
            Order.countDocuments({status : "Delivered"}),
            Product.distinct("category"),
            Product.countDocuments(),
            Product.countDocuments({stock : 0}),
            Order.find({}).select(["total" , "discount" , "subtotal" , "tax" , "shippingCharges"]),

            User.find({}).select(["role" , "dob"])
        
        ]);

        const orderRatio = {
            processing:processingOrder,
            shipped:shippedOrder,
            delivered: deliveredOrder
        }

        const productCategories = await getCategories({categories , productCount});

        const stockAvailability = {
            outOfStock : productOutStock,
            inStock : productCount - productOutStock,
        }

        const totalIncome = allOrders.reduce((tsf , order) => tsf + (order.total || 0),0);

        const discount = allOrders.reduce((tsf , order) => tsf + (order.discount || 0),0);

        const productionCost = allOrders.reduce((tsf , order) => tsf + (order.shippingCharges || 0) , 0);

        const burnt = allOrders.reduce((tsf , order) => tsf + (order.tax || 0),0);

        const marketingCost = Math.round(totalIncome * (30/100));

        const netMargin = totalIncome - discount - productionCost - burnt - marketingCost;

        const revenueDist = {
            netMargin,
            discount,
            productionCost,
            burnt,
            marketingCost,
        }
        const adminCount = allUsers.filter(user => user.role = "admin").length;

        const adminCust={
            admin : adminCount,
            customers : allUsers.length - adminCount
        }

        const userAge = {
            teen : allUsers.filter(i => i.age < 20).length,
            adult : allUsers.filter(i => i.age >= 20 && i.age <40).length,
            old:allUsers.filter(i => i.age >= 40).length
        }

        charts = {
            orderRatio,
            productCategories,
            stockAvailability,
            revenueDist,
            adminCust,
            userAge
        }

        myCache.set("admin-pie-charts", JSON.stringify(charts));
    }

    return res.status(200).json({
        charts
    })

})
export const getBarCharts = TryCatch(async(req,res,next) =>{

    let charts;
    const key = "admin-bar-charts";

    if(myCache.has(key)){
        charts = JSON.parse(myCache.get(key) as string);
    }
    else{
        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const lastSixMonthProductsPromise = Product.find({
            createdAt : {
                $gte : sixMonthsAgo,
                $lte : today
            }
        }).select("createdAt");
        const lastSixMonthUsersPromise = User.find({
            createdAt : {
                $gte : sixMonthsAgo,
                $lte : today
            }
        }).select("createdAt");
        const twelveMonthOrdersPromise = Order.find({
            createdAt : {
                $gte : twelveMonthsAgo,
                $lte : today
            }
        }).select("createdAt");

        const [products , users,orders] = await Promise.all([lastSixMonthProductsPromise,lastSixMonthUsersPromise,twelveMonthOrdersPromise]);

        const productCounts = getChartData({length : 6, docArr : products});

        const userCounts = getChartData({length : 6, docArr : users});
        
        const orderCounts = getChartData({length : 12, docArr : orders});

        charts = {
            users: userCounts,
            products: productCounts,
            orders: orderCounts
        }

        myCache.set(key,JSON.stringify(charts))
    }

    return res.status(200).json({
        charts
    });
})
export const getLineCharts = TryCatch(async(req,res,next) =>{
    let charts;
    const key = "admin-line-charts";

    if(myCache.has(key)){
        charts = JSON.parse(myCache.get(key) as string);
    }
    else{
        const today = new Date();
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const baseQuery= {
            createdAt : {
                $gte : twelveMonthsAgo,
                $lte : today
            }
        }


        const [products , users, orders] = await Promise.all([
            Product.find(baseQuery).select("createdAt"),
            User.find(baseQuery).select("createdAt"),
            Order.find(baseQuery).select(["createdAt" , "discount" , "total"])
        ]);

        const productCounts = getChartData({length : 12, docArr : products });

        const userCounts = getChartData({length : 12, docArr : users});
        
        const discount = getChartData({length : 12, docArr : orders, property : "discount"});

        const rev = getChartData({length : 12, docArr : orders, property : "total"});

        charts = {
            users: userCounts,
            products: productCounts,
            discount: discount,
            revenue: rev
        }

        myCache.set(key,JSON.stringify(charts));
    }

    return res.status(200).json({
        charts
    });
})