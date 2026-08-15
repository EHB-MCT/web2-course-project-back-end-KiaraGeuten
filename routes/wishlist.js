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

router.post("/", async (req, res) => {
  try {
    const db = getDB();
    let { card_id, card_ids } = req.body;

    // Allow either one card or multiple cards
    if (card_id) {
      card_ids = [card_id];
    }

    if (!Array.isArray(card_ids) || card_ids.length === 0) {
      return res.status(400).json({
        message: "card_id or card_ids is required",
      });
    }
    // Remove duplicate IDs from the request
    card_ids = [...new Set(card_ids)];

    // Check that the cards actually exist
    const cards = await db
      .collection("cards")
      .find({
        id: { $in: card_ids },
      })
      .toArray();

    const foundIds = new Set(cards.map((card) => card.id));

    const invalidIds = card_ids.filter((id) => !foundIds.has(id));

    if (invalidIds.length > 0) {
      return res.status(400).json({
        message: "One or more card IDs do not exist",
        invalid_cards: invalidIds,
      });
    }

    // Check which cards are already in wishlist
    const existing = await db
      .collection("wishlist")
      .find({
        card_id: { $in: card_ids },
      })
      .toArray();

    const existingIds = new Set(existing.map((card) => card.card_id));

    // Only add cards that aren't already there
    const newIds = card_ids.filter((id) => !existingIds.has(id));

    if (newIds.length > 0) {
      await db.collection("wishlist").insertMany(
        newIds.map((id) => ({
          card_id: id,
        })),
      );
    }

    return res.status(201).json({
      message: "Wishlist updated successfully",
      added_cards: newIds,
      already_in_wishlist: [...existingIds],
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
});

router.delete("/:cardId", async (req, res) => {
  try {
    const db = getDB();
    const cardId = req.params.cardId;

    if (!cardId || !cardId.trim()) {
      return res.status(400).json({
        message: "Card ID is required",
      });
    }

    const result = await db.collection("wishlist").deleteOne({
      card_id: cardId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "Card is not in your wishlist",
      });
    }

    return res.status(200).json({
      message: "Card removed from wishlist",
      card_id: cardId,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
});

export default router;
