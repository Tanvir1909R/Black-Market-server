const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, Db } = require('mongodb');
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

        app.get('/products', async(req, res)=>{
            const products = await productsCollection.find({}).toArray();
            res.send(products)
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

    } catch (e) {
        console.log(e.message);
    }
}
db().catch(console.dir)


app.listen(port,()=>{
    console.log('server is running');
})