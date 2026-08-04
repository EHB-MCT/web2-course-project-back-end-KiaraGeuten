import { MongoClient } from "mongodb";
import "dotenv/config";

const uri = process.env.MONGO_URI;

const client = new MongoClient(uri);

let db;

export async function connectDB() {
  try {
    await client.connect();

    db = client.db("riftboundApiDB");

    await db.command({ ping: 1 });

    console.log("Connected to MongoDB successfully");
  } catch (error) {
    console.error("Database connection error:", error.message);
    throw error;
  }
}

export function getDB() {
  return db;
}
