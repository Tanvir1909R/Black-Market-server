const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId, } = require('mongodb');
const port = process.env.PORT || 5000


app.use(cors());
app.use(express.json());


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

        //products 
        app.get('/products', async(req, res)=>{
            const products = await productsCollection.find({}).toArray();
            res.send(products)
        })
        app.get('/products', async(req, res)=>{
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
            const result = await productsCollection.deleteOne(filter)
            res.send(result)
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

        //advertise
        app.get('/advertiseProducts', async(req, res)=>{
            const products = await advertiseCollection.find({}).toArray();
            res.send(products)
        })
        app.post('/advertiseProducts', async(req, res)=>{
            const product = req.body;
            const currentProductID = product.productID
            const previousProducts = await advertiseCollection.find({}).toArray() 

            const previousProduct = previousProducts.filter(pro => pro.productID === currentProductID)
            console.log(previousProduct, currentProductID);
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
            if(userEmail){
                if(user?.type === 'Buyer'){
                    res.send({
                        isBuyer: user?.type === 'Buyer',
                        userType:user?.type
                    }) 
                }else if(user?.type === 'Seller'){
                    res.send({
                        isSeller: user?.type === 'Seller',
                        userType:user?.type
                    }) 
                }else{
                    res.send({
                        isAdmin:true,
                        userType:user?.type
                    })
                }
            }else{
                res.send({message:'no user'})
            }
        })

        //booking products
        app.post('/bookingProducts', async(req, res)=>{
            const product = req.body;
            const result = await bookingProductsCollection.insertOne(product);
            res.send(result)
        })
        app.get('/bookingProducts/:email', async(req, res)=>{
            const email = req.params.email;
            const filter = {email: email}
            const products = await bookingProductsCollection.find(filter).toArray()
            res.send(products)
        })

    } catch (e) {
        console.log(e.message);
    }
}
db().catch(console.dir)


app.listen(port,()=>{
    console.log('server is running');
})
