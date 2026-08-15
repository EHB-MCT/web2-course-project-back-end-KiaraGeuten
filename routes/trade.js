///search query over collection so up to date and not seperate collection just card >4 Your trade page would run that query on load and render whatever comes back

import express from "express";
import { getDB } from "../database.js";

const router = express.Router();

//get all tarde cards
router.get("/", async (req, res) => {
  try {
    const db = getDB();

    const cards = await db.collection("trade").find({}).toArray();

    return res.status(200).json(cards);
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
});

//add a COPY of a card to trade
router.post("/", async (req, res) => {
  try {
    const db = getDB();
    const { card_ids } = req.body;

    if (!Array.isArray(card_ids) || card_ids.length === 0) {
      return res.status(400).json({
        message: "card_ids must be a non-empty array",
      });
    }

    // Make sure every ID is a string
    if (card_ids.some((id) => typeof id !== "string" || !id.trim())) {
      return res.status(400).json({
        message: "Every card ID must be a non-empty string",
      });
    }

    // Check that all cards exist
    const cards = await db
      .collection("cards")
      .find({
        id: { $in: card_ids },
      })
      .toArray();

    const foundIds = new Set(cards.map((card) => card.id));

    const invalidIds = [...new Set(card_ids.filter((id) => !foundIds.has(id)))];

    if (invalidIds.length > 0) {
      return res.status(400).json({
        message: "One or more card IDs do not exist",
        invalid_cards: invalidIds,
      });
    }

    // Find the existing trade document
    let trade = await db.collection("trade").findOne({});

    // Create trade document if one doesn't exist
    if (!trade) {
      const cardsToTrade = [];

      for (const cardId of card_ids) {
        const existing = cardsToTrade.find((card) => card.card_id === cardId);

        if (existing) {
          existing.quantity++;
        } else {
          cardsToTrade.push({
            card_id: cardId,
            quantity: 1,
          });
        }
      }

      await db.collection("trade").insertOne({
        cards: cardsToTrade,
      });

      return res.status(201).json({
        message: "Cards added to tradelist",
        added_cards: cardsToTrade,
      });
    }

    // Add to existing trade document
    for (const cardId of card_ids) {
      const existing = trade.cards.find((card) => card.card_id === cardId);

      if (existing) {
        await db.collection("trade").updateOne(
          {
            _id: trade._id,
            "cards.card_id": cardId,
          },
          {
            $inc: {
              "cards.$.quantity": 1,
            },
          },
        );
      } else {
        await db.collection("trade").updateOne(
          {
            _id: trade._id,
          },
          {
            $push: {
              cards: {
                card_id: cardId,
                quantity: 1,
              },
            },
          },
        );
      }
    }

    return res.status(201).json({
      message: "Cards added to tradelist",
      added_cards: card_ids,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
});

//delete a card from tradr
router.delete("/:cardId", async (req, res) => {
  try {
    const db = getDB();
    const cardId = req.params.cardId;

    if (!cardId || !cardId.trim()) {
      return res.status(400).json({
        message: "Card ID is required",
      });
    }

    const result = await db.collection("trade").updateOne(
      {
        user_id: "",
        cards: {
          $elemMatch: {
            card_id: cardId,
            quantity: { $gt: 0 },
          },
        },
      },
      {
        $inc: {
          "cards.$.quantity": -1,
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "Card is not in your tradelist",
      });
    }

    // Remove the card from the array if quantity reached 0
    await db.collection("trade").updateOne(
      {
        user_id: "",
      },
      {
        $pull: {
          cards: {
            card_id: cardId,
            quantity: 0,
          },
        },
      },
    );

    return res.status(200).json({
      message: "One copy removed from tradelist",
      card_id: cardId,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
});
export default router;
