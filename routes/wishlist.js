///adding one (manual) or more cards (from deck save) to a user's wishlist

import express from "express";
import { getDB } from "../database.js";

const router = express.Router();
router.get("/", async (req, res) => {
  try {
    const db = getDB();
    const cards = await db.collection("wishlist").find({}).toArray();
    res.send(cards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
export default router;
