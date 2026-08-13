///card restrictions ( 1 legend, champion unit, amount of bttlefields, minimum/max qmount of cards etc),post deck, put deck/:cardId, delete deck/:cardId

//TODO: add helper function overall

//TODO: if deck post -> check if name is in use throw error

// Serve the right data (owned cards vs. master collection)
// Save decks
// Determine "complete" vs. "incomplete" status

import express from "express";
import { getDB } from "../database.js";

const router = express.Router();

//TODO: calc avg power cost and energy cost:  loop through and compute the averages ->  sending  response.

//get all decks
router.get("/", async (req, res) => {
  try {
    const db = getDB();
    const deck = await db.collection("decks").find({}).toArray();
    res.send(deck);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//TODO: add helper function
//TODO: add status
// when deck is loaded, check which id's dont exist in owned collection -> deck = incomplete
router.get("/:name", async (req, res) => {
  try {
    const db = getDB();
    let deck_name = req.params.name;
    console.log(deck_name);
    const deck = await db
      .collection("decks")
      .find({ deck_name: new RegExp(`^${deck_name}$`, "i") })
      .toArray();
    console.log(deck);
    res.send(deck);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//store card ids -> essentially deck + time
//use create() for storing it in mongo db
//call helper
//return to frontend

//TODO: add helper function
//TODO: check for fault entery /saftey
//TODO: add error mess
router.post("/", async (req, res) => {
  try {
    const db = getDB();
    const { deck_name, card_ids } = req.body;
    const now = new Date();
    let deck = await db.collection("decks").insertOne({
      user_id: "",
      deck_name: deck_name,
      card_ids: card_ids,
      created: now,
      updated: now,
    });

    res.status(201).json({
      message: "Deck created",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//helped that get and post can call to ccheck which card ids are from which collection
//find deck -> argument
async function checkCardLocation(deck) {
  const db = getDB();
  let ownedCardList = [];
  let missingcardList = [];

  //finds all ids in owned
  const ownedCards = await db
    .collection("collections")
    .find({
      card_id: { $in: deck.card_ids },
    })
    .toArray();

  //finds all ids in master
  const masterCards = await db
    .collection("cards")
    .find({
      card_id: { $in: deck.card_ids },
    })
    .toArray();

  //make list of card ids you own
  const ownedIds = new Set(ownedCards.map((card) => card.card_id));

  //make list of card id that exists
  const masterIds = new Set(masterCards.map((card) => card.card_id));

  //loop through lists
  for (const item of deck.card_ids) {
    if (ownedIds.has(item)) {
      ownedCardList.push(item);
    } else if (masterIds.has(item)) {
      missingcardList.push(item);
    } else {
      throw new Error(`Invalid card ID: ${item}`);
    }
  }

  return {
    owned: ownedCardList,
    missing: missingCardList,
  };
}

export default router;
