//make inst from class
import credentials from "./credentials.js";
const databaseAdmin = credentials.username;
const databasePassword = credentials.password;
//database
import { MongoClient, ServerApiVersion } from "mongodb";

const uri = `mongodb+srv://${databaseAdmin}:${databasePassword}@concert.c7w1mwc.mongodb.net/?appName=concert`;

//object for api
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}

//server app setup
import express from "express";
const app = express();
const port = 3000;
//TO FIX images public, later
// app.use(express.static("public"));

//handled as json
app.use(express.json());
//basic get route
app.get("/", (req, res) => {
  res.send("Hello World");
});
//port
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
