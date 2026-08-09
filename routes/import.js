import express from "express";
import { getDB } from "../database.js";

const router = express.Router();

// Import all cards from RiftCodex
router.post("/", async (req, res) => {
  try {
    const db = getDB();
    const cards = db.collection("cards");

    let allCards = [];

    // Get first page to know how many pages exist
    const firstResponse = await fetch(
      `https://api.riftcodex.com/cards?page=1&size=50`,
    );

    if (!firstResponse.ok) {
      throw new Error(`RiftCodex error: ${firstResponse.status}`);
    }

    const firstData = await firstResponse.json();

    const totalPages = firstData.pages;

    console.log(`Total pages: ${totalPages}`);

    // Fetch every page
    for (let page = 1; page <= totalPages; page++) {
      console.log(`Fetching page ${page}/${totalPages}`);

      const response = await fetch(
        `https://api.riftcodex.com/cards?page=${page}&size=50`,
      );

      const data = await response.json();

      // Add items array into our list
      allCards.push(...data.items);
    }

    console.log(`Fetched ${allCards.length} cards`);

    // Insert cards in batches
    const batchSize = 500;
    let insertedTotal = 0;

    for (let i = 0; i < allCards.length; i += batchSize) {
      const batch = allCards.slice(i, i + batchSize).map((card) => ({
        _id: card.id,
        ...card,
      }));

      try {
        const result = await cards.insertMany(batch, {
          ordered: false,
        });

        insertedTotal += result.insertedCount;
      } catch (error) {
        // Ignore duplicates
        if (error.code !== 11000) {
          throw error;
        }
      }
    }

    res.status(201).json({
      message: "All cards imported",
      totalFetched: allCards.length,
      inserted: insertedTotal,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

export default router;
