import express from "express";
import { getDB } from "../database.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const db = getDB();

    const trades = await db.collection("trades").find({}).toArray();

    return res.status(200).json(trades);
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const db = getDB();
    const { offering, receiving } = req.body;

    // Validate request
    if (!Array.isArray(offering) || offering.length === 0) {
      return res.status(400).json({
        message: "Offering must contain at least one card",
      });
    }

    if (!Array.isArray(receiving) || receiving.length === 0) {
      return res.status(400).json({
        message: "Receiving must contain at least one card",
      });
    }

    // Validate quantities
    for (const item of [...offering, ...receiving]) {
      if (
        typeof item.card_id !== "string" ||
        !item.card_id.trim() ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        return res.status(400).json({
          message: "Every card must have a valid card_id and quantity",
        });
      }
    }

    // Get IDs
    const offeringIds = offering.map((item) => item.card_id);
    const receivingIds = receiving.map((item) => item.card_id);

    // Prevent duplicate cards
    if (new Set(offeringIds).size !== offeringIds.length) {
      return res.status(400).json({
        message: "A card cannot appear more than once in offering",
      });
    }

    if (new Set(receivingIds).size !== receivingIds.length) {
      return res.status(400).json({
        message: "A card cannot appear more than once in receiving",
      });
    }

    // Cannot offer and receive the same card
    const offeringSet = new Set(offeringIds);

    const sameCards = receivingIds.filter((id) => offeringSet.has(id));

    if (sameCards.length > 0) {
      return res.status(400).json({
        message: "You cannot offer and receive the same card",
        cards: [...new Set(sameCards)],
      });
    }

    // Check if offering cards are in trade list
    const trade = await db.collection("trade").findOne({});

    if (!trade) {
      return res.status(400).json({
        message: "You have no cards available for trade",
      });
    }

    if (!Array.isArray(trade.cards)) {
      return res.status(500).json({
        message: "Trade list is incorrectly formatted",
      });
    }

    for (const item of offering) {
      const tradeCard = trade.cards.find(
        (card) => card.card_id === item.card_id,
      );

      if (!tradeCard || tradeCard.quantity < item.quantity) {
        return res.status(400).json({
          message: `You do not have enough ${item.card_id} available for trade`,
        });
      }
    }

    // Check receiving cards exist
    const cards = await db
      .collection("cards")
      .find({
        id: { $in: receivingIds },
      })
      .toArray();

    const foundIds = new Set(cards.map((card) => card.id));

    const invalidIds = receivingIds.filter((id) => !foundIds.has(id));

    if (invalidIds.length > 0) {
      return res.status(400).json({
        message: "One or more receiving cards do not exist",
        invalid_cards: [...new Set(invalidIds)],
      });
    }

    // Check receiving cards are not already owned
    const ownedCards = await db
      .collection("collections")
      .find({
        card_id: { $in: receivingIds },
      })
      .toArray();

    const ownedIds = new Set(ownedCards.map((card) => card.card_id));

    const alreadyOwned = receivingIds.filter((id) => ownedIds.has(id));

    if (alreadyOwned.length > 0) {
      return res.status(400).json({
        message: "You already own one or more receiving cards",
        already_owned: [...new Set(alreadyOwned)],
      });
    }

    //remove offered from trade
    for (const item of offering) {
      await db.collection("trade").updateOne(
        {
          _id: trade._id,
          "cards.card_id": item.card_id,
        },
        {
          $inc: {
            "cards.$.quantity": -item.quantity,
          },
        },
      );
      // Remove trade entry if quantity reaches zero
      await db.collection("trade").updateOne(
        {
          _id: trade._id,
        },
        {
          $pull: {
            cards: {
              card_id: item.card_id,
              quantity: 0,
            },
          },
        },
      );
    }

    //add receved cards to collection
    for (const item of receiving) {
      await db
        .collection("collections")
        .insertOne({ card_id: item.card_id, quantity: item.quantity });
    }

    //remove from wishlist
    for (const item of receiving) {
      await db.collection("wishlist").deleteMany({ card_id: item.card_id });
    }

    // Create trade proposal
    const now = new Date();

    const result = await db.collection("trades").insertOne({
      offering,
      receiving,
      created_at: now,
      updated_at: now,
    });

    return res.status(201).json({
      message: "Trade proposal created successfully",
      trade_id: result.insertedId,
      offering,
      receiving,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
});

export default router;
