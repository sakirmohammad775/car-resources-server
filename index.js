const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken');
const cookieParser=require('cookie-parser')
const app = express()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb'); 
require('dotenv').config()

//middleware
app.use(cors({
  origin:['http://localhost:5173'],//send token
  credentials:true 
}))
app.use(express.json())
app.use(cookieParser())

//middlewares jwt token
const logger=async(req,res,next)=>{
  console.log('called:',req.host,req.originalUrl);
  next()
}

const verifyToken=async(req,res,next)=>{
  const token=req.cookies?.token
  console.log('value of token in middleware',token);
  if(!token){
    return res.status(401).send({message:'not authorized'})
  }
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
    //error
    if(err){
      console.log(err);
      return res.status(401).send({message:'unauthorized'})
    }
    //if token is valid then it would be decoded
    console.log('value in the token',decoded);
    next()
  })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mfnurby.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    const serviceCollection = client.db('carServer').collection('services')
    const bookingCollection = client.db('carServer').collection('bookings')
    console.log(bookingCollection)

    //auth related api
    app.post('/jwt',async(req,res)=>{
      const user=req.body
      console.log('user for token',user);
      const token=jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn:'2h'})
      res.cookie('token',token,{
        httpOnly:true,
        secure:true,
        sameSite:'none'
      })
      .send({success:true})
    })

    //auth related api
    app.post('/logout',async(req,res)=>{
      const user=req.body
      console.log('logging out',user);
      res.clearCookie('token',{maxAge:0}).send({success:true})
    })
 

    app.get('/services', async (req, res) => {
      const cursor = serviceCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get('/services/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const options = {
        projection: { title: 1, price: 1, service_id: 1 }
      }
      const result = await serviceCollection.findOne(query, options)
      res.send(result)
    })

    //show the some query data
    //bookings
    app.get('/bookings',logger,verifyToken, async (req, res) => {
      console.log(req.query.email);
      console.log('tok tok token',req.cookies.token);
      let query = {}
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await bookingCollection.find(query).toArray()
      res.send(result)
    })

    app.post('/bookings', async (req, res) => {
      const booking = req.body
      const result = await bookingCollection.insertOne(booking)
      res.send(result)
    })

    app.delete('/bookings/:id',async(req,res)=>{
      const id =req.params.id
      const query={_id: new ObjectId(id)}
      const result=await bookingCollection.deleteOne(query)
      res.send(result)
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);









app.get('/', (req, res) => {
  res.send('doctor is running in website')
})
app.listen(port, () => {
  console.log(`car server ${port}`);
})