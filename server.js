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
