import express from "express";
import { getDB } from "../database.js";

const router = express.Router();

// Import all cards from RiftCodex
router.post("/", async (req, res) => {
  try {
    const db = getDB();
    const cards = db.collection("cards");

    let allCards = [];

    // --------------------------------------------------
    // 1. Get first page
    // --------------------------------------------------

    const firstResponse = await fetch(
      "https://api.riftcodex.com/cards?page=1&size=50",
    );

    if (!firstResponse.ok) {
      throw new Error(`RiftCodex error: ${firstResponse.status}`);
    }

    const firstData = await firstResponse.json();
    const totalPages = firstData.pages;

    console.log(`Total pages: ${totalPages}`);

    // --------------------------------------------------
    // 2. Fetch every page
    // --------------------------------------------------

    for (let page = 1; page <= totalPages; page++) {
      console.log(`Fetching page ${page}/${totalPages}`);

      const response = await fetch(
        `https://api.riftcodex.com/cards?page=${page}&size=50`,
      );

      if (!response.ok) {
        throw new Error(`RiftCodex error: ${response.status}`);
      }

      const data = await response.json();

      if (Array.isArray(data.items)) {
        allCards.push(...data.items);
      }
    }

    console.log(`Fetched ${allCards.length} cards`);

    // --------------------------------------------------
    // 3. Remove duplicates from the API response
    // --------------------------------------------------

    const uniqueCards = new Map();

    for (const card of allCards) {
      if (!card.riftbound_id) {
        console.warn("Skipping card without riftbound_id:", card.id);
        continue;
      }

      uniqueCards.set(card.riftbound_id, card);
    }

    const cardsToImport = Array.from(uniqueCards.values());

    console.log(`Unique cards to import: ${cardsToImport.length}`);

    console.log(
      `Duplicates removed from API response: ${
        allCards.length - cardsToImport.length
      }`,
    );

    // --------------------------------------------------
    // 4. Upsert cards using riftbound_id
    // --------------------------------------------------

    const operations = cardsToImport.map((card) => ({
      updateOne: {
        filter: {
          riftbound_id: card.riftbound_id,
        },

        update: {
          $set: {
            ...card,
          },
        },

        upsert: true,
      },
    }));

    // --------------------------------------------------
    // 5. Write everything to MongoDB
    // --------------------------------------------------

    let result;

    if (operations.length > 0) {
      result = await cards.bulkWrite(operations, {
        ordered: false,
      });
    }

    // --------------------------------------------------
    // 6. Create unique index AFTER import
    // --------------------------------------------------

    await cards.createIndex({ riftbound_id: 1 }, { unique: true });

    // --------------------------------------------------
    // 7. Return result
    // --------------------------------------------------

    res.status(200).json({
      message: "All cards imported successfully",

      totalFetched: allCards.length,

      uniqueCards: cardsToImport.length,

      duplicatesRemovedFromResponse: allCards.length - cardsToImport.length,

      inserted: result?.upsertedCount || 0,

      updated: result?.modifiedCount || 0,

      matched: result?.matchedCount || 0,
    });
  } catch (error) {
    console.error("Card import error:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});
router.delete("/reset", async (req, res) => {
  try {
    const db = getDB();

    const cardsResult = await db.collection("cards").deleteMany({});
    const collectionsResult = await db.collection("collections").deleteMany({});

    res.status(200).json({
      message: "Database reset successfully",
      cardsDeleted: cardsResult.deletedCount,
      collectionsDeleted: collectionsResult.deletedCount,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  }
});
export default router;
