/// get, post, put, delete, count + import
//user id left in so if needed filter on user id for their collection
// trade/extra — derived (total − 4)

import express from "express";
import { getDB } from "../database.js";
import { log } from "console";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const db = getDB();
    const cards = await db.collection("collections").find({}).toArray();
    if (cards.length === 0) {
      return res.status(404).json({ message: "collection empty" });
    }

    res.send(cards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const db = getDB();

    //no id given
    if (!req.body.card_id) {
      return res.status(400).send("Card ID is required");
    }
    // Check if card exists in master collection
    const card = await db.collection("cards").findOne({
      id: req.body.card_id,
    });

    //throws error if card doesnt exist in master collection
    if (!card) {
      return res.status(404).send("Card does not exist");
    }

    // Add card to owned collection
    const collection = db.collection("collections");

    await collection.insertOne({
      user_id: "",
      card_id: req.body.card_id,
      in_binder: req.body.in_binder,
      decks: [
        {
          deck_name: req.body.deck_name,
          quantity: req.body.deck_quantity,
        },
      ],
      total_quantity: req.body.total_quantity,
    });
    res.send("You have successfully added the card to your database");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/:cardId", async (req, res) => {
  try {
    const db = getDB();
    let card_id = req.params.cardId;
    //no id given
    if (!card_id) {
      return res.status(400).send("Card ID is required");
    }

    // collection is empty
    const collection = db.collection("collections");
    const count = await collection.countDocuments();
    if (count === 0) {
      return res.status(404).json({ message: "Collection is empty" });
    }

    // Check if card exists in owned collection
    const card = await db.collection("collections").findOne({
      card_id: card_id,
    });
    //throws error if card doesnt exist in  collection
    if (!card) {
      return res.status(404).send("Card does not exist");
    }

    // update card to owned collection
    const deckIndex = req.body.deck_index;
    await collection.updateOne(
      { card_id: card_id },
      {
        $set: {
          user_id: "",
          card_id: card_id,
          in_binder: req.body.in_binder,
          [`decks.${deckIndex}.deck_name`]: req.body.deck_name,
          [`decks.${deckIndex}.quantity`]: req.body.deck_quantity,
          total_quantity: req.body.total_quantity,
        },
      },
    );
    res.send("You have successfully updated the card to your database");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:cardId", async (req, res) => {
  try {
    const db = getDB();
    let collection = await db.collection("collections");
    let card = req.params.cardId;
    let ownedCards = await collection.deleteOne({ card_id: card });
    if (ownedCards.deletedCount === 0) {
      return res.status(404).send("Card not found");
    }
    res.send("You have succesfully removed  " + card + " from your database");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/count", async (req, res) => {
  try {
    const db = getDB();
    let totalCards = await db.collection("cards").countDocuments();

    let ownedCards = await db.collection("collections").countDocuments();

    // let progress = (ownedCards / totalCards) * 100;
    res.send("Your have currently collected: " + ownedCards + "/" + totalCards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/count/set", async (req, res) => {
  try {
    const db = getDB();
    let totalCards = await db.collection("cards").countDocuments();
    let ownedCards = await db.collection("collections").countDocuments();

    //different stages for looking up cards and grouping them by set
    const pipelineOwned = [
      {
        $lookup: {
          from: "cards",
          localField: "card_id",
          foreignField: "id",
          as: "card",
        },
      },
      {
        $unwind: "$card",
      },
      {
        $group: {
          _id: "$card.set.set_id",
          amount: { $sum: 1 },
        },
      },
    ];

    const pipelineTotal = [
      {
        $group: {
          _id: "$set.set_id",
          amount: { $sum: 1 },
        },
      },
    ];
    //convert cursor to array so can be displayed
    const groupTotal = await db
      .collection("cards")
      .aggregate(pipelineTotal)
      .toArray();

    const groupOwned = await db
      .collection("collections")
      .aggregate(pipelineOwned)
      .toArray();

    //match them
    const matched = groupTotal.map((totalItem) => {
      let owned = groupOwned.find((item) => item._id === totalItem._id);
      if (owned === undefined) {
        owned = {
          _id: totalItem._id,
          amount: 0,
        };
      }
      console.log("owned:", groupOwned);
      console.log("looking for:", totalItem._id);
      return {
        set_id: totalItem._id,
        amount: "You have collected " + owned.amount + "/" + totalItem.amount,
      };
    });

    res.send(matched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
export default router;
