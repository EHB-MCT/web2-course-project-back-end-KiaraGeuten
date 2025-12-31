//help retrieving from database used in server.js > line 54 > https://www.mongodb.com/docs/php-library/current/crud/query/retrieve/

//make inst from class
import credentials from "./credentials.js";
import { MongoClient, ServerApiVersion } from "mongodb";
const databaseAdmin = credentials.username;
const databasePassword = credentials.password;
const uri = `mongodb+srv://${databaseAdmin}:${databasePassword}@concert.c7w1mwc.mongodb.net/?appName=concert`;
const client = new MongoClient(uri);
let dB;
let collection;

//database connection
async function database(databaseName, collectionName) {
  try {
    await client.connect();
    dB = client.db(databaseName);
    collection = dB.collection(collectionName);
    await dB.command({ ping: 1 });
    console.log("Connected to MongoDB successfully");
    return collection;
  } catch (error) {
    console.error("Database connection error:", error.message);
    throw error;
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

//routes
app.get("/user", async (req, res) => {
  try {
    await database("webApp", "users"); // sees connection + conncts to right database/collection
    const users = await collection.find().toArray();
    res.send(users);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.post("/login", async (req, res) => {
  try {
    //database connection and retrieving
    const users = await database("webApp", "users");
    const { username, password } = req.body;
    const user = await users.findOne(
      { username: username },
      { projection: { username: 1, password: 1 } }
    );

    if (!user) {
      return res.status(401).json({
        login: false,
        message:
          "User not found, please check your username or click on forgot username",
      });
    }
    // password check
    if (user.password == password) {
      res.send("Login succesful");
    } else {
      res.status(401).json({
        login: false,
        message: "Invalid password. Please try again",
        data: { username: username, password: password },
      });
    }
  } catch (error) {
    res.status(500).send(`error:${JSON.stringify(error)}`);
  }
});
//port
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

//  // try {
//   // Connect the client to the server	(optional starting in v4.7)
//   await client.connect();
//   // Send a ping to confirm a successful connection
//   await dB.command({ ping: 1 });
//   console.log(
//     "Pinged your deployment. You successfully connected to MongoDB!"
//   );
//   message = "hello world: sucess";
//   res.send("Successfully retrieved user data.");
// // } catch {
//   res.status(500).send(`error:${JSON.stringify(error)}`);
// } finally {
//   // Ensures that the client will close when you finish/error
//   await client.close();
// }
