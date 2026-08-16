// Collection
// total_quantity = copies the user owns
// in_binder = whether this card is in the binder
// decks = copies currently allocated to decks
// available/trade = total_quantity - copies in binder - copies currently in decks

//user id -> 2.0.0

import express from "express";
import { getDB } from "../database.js";
import { log } from "console";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const db = getDB();

    const cards = await db.collection("collections").find({}).toArray();

    const result = cards.map(function (card) {
      return {
        ...card,
        available: calculateAvailable(card),
      };
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const db = getDB();
    const collection = db.collection("collections");

    // Check card ID
    if (!req.body.card_id) {
      return res.status(400).send("Card ID is required");
    }

    // Check quantity
    if (!req.body.quantity || req.body.quantity < 1) {
      return res.status(400).send("Quantity must be at least 1");
    }

    // Check if card exists in master collection
    const card = await db.collection("cards").findOne({
      id: req.body.card_id,
    });

    if (!card) {
      return res.status(404).send("Card does not exist");
    }

    // Check if user already owns this card
    const existingCard = await collection.findOne({
      card_id: req.body.card_id,
    });

    if (existingCard) {
      await collection.updateOne(
        { card_id: req.body.card_id },
        {
          $inc: {
            total_quantity: Number(req.body.quantity),
          },
          $set: {
            in_binder: Boolean(req.body.in_binder),
          },
        },
      );

      return res.send("Card quantity successfully updated");
    }

    // CARD DOES NOT EXIST YET
    await collection.insertOne({
      user_id: "",
      card_id: req.body.card_id,
      in_binder: Boolean(req.body.in_binder),
      decks: [],
      total_quantity: Number(req.body.quantity),
    });

    res.send("You have successfully added the card to your database");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/:cardId", async (req, res) => {
  try {
    const db = getDB();
    const collection = db.collection("collections");

    const card_id = req.params.cardId;
    if (card_id === "poro") {
      return res.status(200).json({
        valid: true,
        message: "You have found the Ol'Poro. Welcome. Have a Poro Snack",
      });
    }

    if (!card_id) {
      return res.status(400).send("Card ID is required");
    }

    const existingCard = await collection.findOne({
      card_id: card_id,
    });

    if (!existingCard) {
      return res.status(404).send("Card does not exist in collection");
    }

    if (req.body.total_quantity === undefined || req.body.total_quantity < 1) {
      return res.status(400).send("Total quantity must be at least 1");
    }

    const newQuantity = Number(req.body.total_quantity);
    const newBinder = Boolean(req.body.in_binder);

    const copiesInDecks = Array.isArray(existingCard.decks)
      ? existingCard.decks.reduce(function (total, deck) {
          return total + (deck.quantity || 0);
        }, 0)
      : 0;

    const copiesInBinder = newBinder ? 1 : 0;

    if (newQuantity < copiesInDecks + copiesInBinder) {
      return res
        .status(400)
        .send(
          `You cannot own ${newQuantity} copies because ${
            copiesInDecks + copiesInBinder
          } are already allocated to decks/binder`,
        );
    }

    await collection.updateOne(
      { card_id: card_id },
      {
        $set: {
          total_quantity: newQuantity,
          in_binder: newBinder,
        },
      },
    );

    res.send("Collection card successfully updated");
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

//delete everything in colelction
router.delete("/", async (req, res) => {
  try {
    const db = getDB();
    const collection = db.collection("collections");

    const result = await collection.deleteMany({});

    res.status(200).json({
      message: "Collection successfully emptied",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
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

//helper function for calcuating copies
function calculateAvailable(card) {
  const copiesInBinder = card.in_binder ? 1 : 0;

  const copiesInDecks = Array.isArray(card.decks)
    ? card.decks.reduce(function (total, deck) {
        return total + (deck.quantity || 0);
      }, 0)
    : 0;

  return Math.max(0, card.total_quantity - copiesInBinder - copiesInDecks);
}

export default router;
