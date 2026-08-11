//add/remove chase cards, later user specific

import express from "express";
import { getDB } from "../database.js";

//gets all chase cards added by the user, later the collection = user specific
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const db = getDB();
    const cards = await db.collection("chasecards").find({}).toArray();
    res.send(cards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//post card id of your chase card in db
router.post("/:cardId", async (req, res) => {
  try {
    const db = getDB();
    const chaseCard = req.params.cardId;

    if (!chaseCard) {
      return res.status(400).send("Card ID is required");
    }

    // Check if card exists
    const card = await db.collection("cards").findOne({
      id: chaseCard,
    });

    if (!card) {
      return res.status(404).send("Card does not exist");
    }

    // Add card to chasecards
    const collection = db.collection("chasecards");

    await collection.insertOne({
      card_id: chaseCard,
    });

    res.send("You have successfully added " + chaseCard + " to your database");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//delete a card aka remove tag
router.delete("/:cardId", async (req, res) => {
  try {
    const db = getDB();
    let collection = await db.collection("chasecards");
    let chaseCard = req.params.cardId;
    let chaseCards = await collection.deleteOne({ card_id: chaseCard });
    if (chaseCards.deletedCount === 0) {
      return res.status(404).send("Chase card not found");
    }
    res.send(
      "You have succesfully removed  " + chaseCard + " from your database",
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//
export default router;
