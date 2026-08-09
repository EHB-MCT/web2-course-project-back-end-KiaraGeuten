//help retrieving from database used in server.js > line 54 > https://www.mongodb.com/docs/php-library/current/crud/query/retrieve/
// read me file from chatgpt

import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";

//db conncect
import { connectDB } from "./database.js";

await connectDB();

//server app setup
import express from "express";
const app = express();
const port = 3000;

//TO FIX images public, later
app.use(express.static("public"));

//handled as json
app.use(express.json());

//routes

app.get("/", async (req, res) => {
  try {
    const readmePath = path.join(process.cwd(), "README.md");
    const content = await fs.promises.readFile(readmePath, "utf8");

    res.send(`
      <!doctype html>
      <html>
        <head>
          <title>API Documentation</title>
          <style>
            body { font-family: system-ui; padding: 2rem; line-height: 1.5; }
            pre { white-space: pre-wrap; background: #f6f8fa; padding: 1rem; border-radius: 6px; }
          </style>
        </head>
        <body>
          <h1>API Documentation</h1>
          <pre>${content}</pre>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send("README not found");
  }
});

//get cards
import cardRoutes from "./routes/cards.js";
app.use("/cards", cardRoutes);
import importRoutes from "./routes/import.js";
app.use("/import", importRoutes);

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
      { projection: { username: 1, password: 1 } },
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
app.post("/sign-up", async (req, res) => {
  try {
    const users = await database("webApp", "users");
    const {
      profile_picture,
      first_name,
      last_name,
      mail,
      username,
      password,
      major,
      code,
      tags,
      my_concerts,
      my_groups,
    } = req.body;
    const user = await users.findOne({ username });
    if (user) {
      return res.status(401).json({
        signup: false,
        message: "Username already taken. Please choose another one",
      });
    }
    //encrypt password
    const hashedPassword = await bcrypt.hash(password, 10);
    //create user and insert in database
    await users.insertOne({
      profile_picture,
      first_name,
      last_name,
      mail,
      username,
      password: hashedPassword,
      major,
      code,
      tags,
      my_concerts,
      my_groups,
    });

    res.send({
      signup: true,
      message: "Account created successfully",
      username,
    });
  } catch (error) {
    res.status(500).send(`error:${JSON.stringify(error)}`);
  }
});
app.put("/update-user-info/:username", async (req, res) => {
  try {
    const users = await database("webApp", "users");
    const { username } = req.params;
    const updateData = req.body;

    if (updateData.password) {
      const hashedPassword = await bcrypt.hash(updateData.password, 10);
      updateData.password = hashedPassword;
    }
    const result = await users.updateOne(
      { username }, // filter by username
      { $set: updateData }, // update only the fields provided
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.send("updated data succesfully");
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

//port
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

//debug read me
app.get("/debug", (req, res) => {
  res.json({
    cwd: process.cwd(),
    files: fs.readdirSync(process.cwd()),
  });
});
