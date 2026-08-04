import express from "express";
import { getDB } from "../database.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const db = getDB();

    const cards = await db.collection("cards").find({}).toArray();

    res.send(cards);
  } catch (error) {
    res.status(500).send({
      error: error.message,
    });
  }
});

export default router;
