const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken')
const stripe = require('stripe')(process.env.STRIPE_SK)
const { MongoClient, ServerApiVersion, ObjectId, } = require('mongodb');
const port = process.env.PORT || 5000


app.use(cors());
app.use(express.json());
const verifyJwt = (req, res, next)=>{
    const authHeader = req.headers.authorization
    if(!authHeader){
        return res.status(401).send({message:'Unauthorized access'})
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token,process.env.TOKEN_SECRET,(err, decode)=>{
        if(err){
            return res.status(403).send({ message: "Unauthorized access" });
        }
        req.decoded = decode;
    })
    next()
}


const uri = `mongodb+srv://${process.env.DATABASE_USER}:${process.env.DATABASE_PASSWORD}@cluster0.5ki2fpf.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

app.get('/', (req, res)=>{
    res.send('welcome to black market server')
})

const db = async () =>{
    try {
        // collections
        const productsCollection = client.db('BlackMarket').collection('products');
        const categoriesCollection = client.db('BlackMarket').collection('categories')
        const advertiseCollection = client.db('BlackMarket').collection('advertiseProducts');
        const userCollection = client.db('BlackMarket').collection('users');
        const bookingProductsCollection = client.db('BlackMarket').collection('bookingProducts')
        const reportedProductsCollection = client.db('BlackMarket').collection('reportedProducts')
        const paymentInfoCollection = client.db('BlackMarket').collection('paymentInfo');


        //products 
        app.get('/products', async(req, res)=>{
            const products = await productsCollection.find({}).toArray();
            res.send(products)
        })
        app.get('/sellerProducts', async(req, res)=>{
            const email = req.query.email;
            const filter = {email:email};
            const products = await productsCollection.find(filter).toArray() 
            res.send(products)
        })
        app.post('/products', async(req, res)=>{
            const product = req.body;
            const result = await productsCollection.insertOne(product)
            res.send(result)
        })
        app.delete('/products/:id', async(req, res)=>{
            const id = req.params.id;
            const filter = {_id:ObjectId(id)}
            const advertiseProductFilter = {productID:id};
            const advertiseResult = await advertiseCollection.deleteOne(advertiseProductFilter) 
            const result = await productsCollection.deleteOne(filter)
            res.send({
                acknowledged:true,
                 result,
                 advertiseResult
            })
        })
        //reported Products
        app.post('/reportedProducts', async(req, res)=>{
            const product = req.body;
            const result = await reportedProductsCollection.insertOne(product);
            res.send(result);
        })
        app.get('/reportedProducts', async(req, res)=>{
            const reportProducts = await reportedProductsCollection.find({}).toArray()
            res.send(reportProducts)
        })
        app.delete('/reportedProducts/:id', async(req, res)=>{
            const id = req.params.id;
            const productFilter = { _id:ObjectId(id) }
            const productDeleteResult = await productsCollection.deleteOne(productFilter);
            const deleteFilter = { productID:id }
            const result = await reportedProductsCollection.deleteMany(deleteFilter);
            res.send({delete:true,result1:result,result2:productDeleteResult})
        })

        // categories
        app.get('/categories', async(req, res)=>{
            const categories = await categoriesCollection.find({}).toArray();
            res.send(categories)
        })
        //category items
        app.get('/products/:name', async(req, res)=>{
            const name = req.params.name;
            const filter = { category:name };
            const products = await productsCollection.find(filter).toArray()
            res.send(products)
        })

        //advertise  apply jwt here
        app.get('/advertiseProducts', async(req, res)=>{
            // const email = req.query.email;
            // const verifyEmail = req.decoded.email;
            // if(verifyEmail !== email){
                // res.status(403).send({message:'Forbidden access'})
            // }{
                const products = await advertiseCollection.find({}).toArray();
                res.send(products)
            // }
        })
        app.post('/advertiseProducts', async(req, res)=>{
            const product = req.body;
            const currentProductID = product.productID
            const previousProducts = await advertiseCollection.find({}).toArray() 

            const previousProduct = previousProducts.filter(pro => pro.productID === currentProductID)
            if(!previousProduct.length){
                const result = await advertiseCollection.insertOne(product)
                res.send(result)
            }else{
                res.send({message:'already in advertise section'})
            }
        })

        //users
        app.post('/users', async(req, res)=>{
            const user = req.body;
            const previousUser = await userCollection.findOne({email:user.email})
            if(!previousUser){
                const result = await userCollection.insertOne(user);
                res.send(result)
            }else{
                res.send({message:'previous user'})
            }
        })
        app.get('/users', async(req, res)=>{
            const userEmail = req.query.email;
            const filter = { email:userEmail };
            const user = await userCollection.findOne(filter);
            if(user){
                if(user?.type === 'Buyer'){
                    res.send({
                        acknowledged:true,
                        isBuyer: user?.type === 'Buyer',
                        userType:user?.type
                    }) 
                }else if(user?.type === 'Seller'){
                    res.send({
                        acknowledged:true,
                        isSeller: user?.type === 'Seller',
                        userType:user?.type
                    }) 
                }else{
                    res.send({
                        acknowledged:true,
                        isAdmin:true,
                        userType:user?.type
                    })
                }
            }else{
                res.send({message:'Forbidden user. your account has been deleted by admin.You are crossing our policy limits',acknowledged:false})
            }
        })
        app.get('/buyers', verifyJwt, async(req, res)=>{
            const email = req.query.email;
            const verifyEmail = req.decoded.email;
            if(verifyEmail !== email){
                res.status(403).send({message:'Forbidden access'})
            }else{
                const filter = { type:'Buyer' }
                const users = await userCollection.find(filter).toArray();
                res.send(users)
            }
        })
        app.delete('/buyers/:id', async(req, res)=>{
            const id = req.params.id;
            const filter = {_id:ObjectId(id)}
            const result = await userCollection.deleteOne(filter);
            res.send(result)
        })
        app.get('/seller', async(req, res)=>{
            const filter = { type:'Seller' }
            const users = await userCollection.find(filter).toArray();
            res.send(users)
        })
        app.delete('/seller/:id', async(req, res)=>{
            const id = req.params.id;
            const filter = {_id:ObjectId(id)}
            const result = await userCollection.deleteOne(filter);
            res.send(result)
        })

        //booking products
        app.post('/bookingProducts', async(req, res)=>{
            const product = req.body;
            const currentProductID = product.productID
            const previousProducts = await bookingProductsCollection.find({}).toArray()

            const previousProduct = previousProducts.filter(pro => pro.productID === currentProductID)
            if(!previousProduct.length){
                const result = await bookingProductsCollection.insertOne(product);
                res.send(result)
            }else{
                res.send({message:'already added'})
            }

        })
        app.get('/bookingProducts/:email',verifyJwt, async(req, res)=>{
            const email = req.params.email;
            const verifyEmail = req.decoded.email;
            if(verifyEmail !== email){
                res.status(403).send({message:'Forbidden access'})
            }else{
                const filter = {email: email}
                const products = await bookingProductsCollection.find(filter).toArray()   
                res.send(products)
            }
        })
        app.delete('/deleteBookingProduct/:id', async(req, res)=>{
            const id = req.params.id;
            const filter = {_id:ObjectId(id)};
            const result = await bookingProductsCollection.deleteOne(filter)
            res.send(result)
        })
        //jwt---
        app.get('/jwt', async(req, res)=>{
            const email = req.query.email;
            const filter = {email:email}
            const user = await userCollection.findOne(filter);
            if(user){
                const token = jwt.sign({email:user.email},process.env.TOKEN_SECRET,{expiresIn:'1d'})
                res.send({token:token});
            }else{
                res.status(401).send({message:'Unauthorized access'})
            }
        })
        //verifyAccount 
        app.put('/verifyAccount', async(req, res)=>{
            const email = req.query.email;
            const filter = {email:email}
            const updateDoc = {
                $set:{
                    userVerified:true
                }
            }
            const option = {upsert:true};
            const updateUser = await userCollection.updateOne(filter,updateDoc,option)
            const updateProductState = await productsCollection.updateMany(filter,updateDoc, option)
            res.send({update:true, result1:updateUser, result2:updateProductState})
        })
        app.get('/isVerify', async(req ,res)=>{
            const email = req.query.email;
            const filter = {email:email};
            const user = await userCollection.findOne(filter)
            if(user.userVerified){
                res.send({isVerify:true})
            }else{
                res.send({isVerify:false})
            }
        })
        //payment
        app.get('/paymentItem/:id', async(req,res)=>{
            const id = req.params.id;
            const filter = {_id:ObjectId(id)};
            const product = await productsCollection.findOne(filter)
            res.send(product)
        })
        app.post('/paymentIntent', async(req, res)=>{ 
            const product = req.body;
            const price = product.resalePrice;
            const amount = +price * 100;

            const paymentIntent = await stripe.paymentIntents.create({ 
                currency:'usd',
                amount:amount || 320,
                payment_method_types:['card'] 
            })
            res.send({
                clientSecret: paymentIntent.client_secret,
              });
        })
        app.post('/confirmPayment', async(req, res)=>{
            const paymentInfo = req.body;
            const result = paymentInfoCollection.insertOne(paymentInfo)
            res.send(result)
        })
        app.put('/updateBooking/:id', async(req, res)=>{
            const id = req.params.id;
            const filter = {productID:id}
            const updateDoc = {
                $set:{
                    isPaid:true
                }
            }
            const option = {upsert:true}
            const result = await bookingProductsCollection.updateOne(filter, updateDoc, option)
            res.send(result)
        })
        app.delete('/deleteProduct/:id', async(req, res)=>{
            const id = req.params.id;
            const filter = {_id:ObjectId(id)};
            const result = await productsCollection.deleteOne(filter)
            res.send(result);
        })
        app.delete('/deleteAdvertiseProduct/:id', async(req, res)=>{
            const id = req.params.id;
            const filter = {productID:id}
            const result = await advertiseCollection.deleteOne(filter)
            res.send(result);
        })

    } catch (e) {
        console.log(e.message);
    }
}
db().catch(console.dir)


app.listen(port,()=>{
    console.log('server is running');
})
