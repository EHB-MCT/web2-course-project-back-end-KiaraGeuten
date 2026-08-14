///post deck, put deck/:cardId, delete deck/:cardId

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
// TODO: f you really require names to be unique, put a unique index on the name.
// when deck is loaded, check which id's dont exist in owned collection -> deck = incomplete
router.get("/:name", async (req, res) => {
  try {
    const db = getDB();
    let deck_name = req.params.name;
    const normalizedName = deck_name.trim().toLowerCase();
    const deck = await db
      .collection("decks")
      .find({ deck_name_normalized: normalizedName })
      .toArray();

    res.send(deck);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//groupDecks
router.post("/", async (req, res) => {
  try {
    const db = getDB();
    const { deck_name, card_ids } = req.body;

    //errors
    if (!req.body) {
      return res.status(400).json({
        message: "The request is missing, request body is required",
      });
    }
    // Deck name must be a string
    if (typeof deck_name !== "string") {
      return res.status(400).json({
        message: "Deck name must be a string",
      });
    }

    // Deck name cannot be empty
    if (!deck_name.trim()) {
      return res.status(400).json({
        message: "Deck name is required",
      });
    }

    //name is too long
    if (deck_name.length > 25) {
      return res.status(400).json({
        message:
          "Deck name is too long. It must be under 25 characters. Try to aim at 3 to 5 words",
      });
    }

    const normalizedName = deck_name.trim().toLowerCase();
    //check if name exists
    const existingDeck = await db.collection("decks").findOne({
      deck_name_normalized: normalizedName,
    });

    if (existingDeck) {
      return res.status(409).json({
        message: "Deck name already exists. Please choose another name.",
      });
    }
    // no card ids
    if (card_ids.length === 0) {
      return res.status(400).json({
        message: "card_ids cannot be empty",
      });
    }
    if (card_ids.length > 100) {
      return res.status(400).json({
        message: "Too many card IDs",
      });
    }
    // if card_id is no array
    if (!Array.isArray(card_ids)) {
      return res.status(400).json({
        message: "card_ids must be an array",
      });
    }
    // Every card ID must be a string and non-empty
    for (const cardId of card_ids) {
      if (typeof cardId !== "string") {
        return res.status(400).json({
          message: "Items inserted in card_ids must be strings",
        });
      }
      if (!cardId.trim()) {
        return res.status(400).json({
          message: "card_ids contains an empty card ID",
        });
      }
    }
    //Check where those card IDs exist with trimmed ids
    const cleanCardIds = card_ids.map((cardId) => cardId.trim());

    let cards = await checkCardLocation(cleanCardIds);
    await validateDeck(cleanCardIds);

    //create deck
    const now = new Date();
    let deck = await db.collection("decks").insertOne({
      user_id: "",
      deck_name: deck_name,
      deck_name_normalized: normalizedName,
      card_ids: cleanCardIds,
      created: now,
      updated: now,
    });

    console.log("deck is created");

    res.status(201).json({
      message:
        "You have succesfully created " +
        deck_name +
        " & counted your missing cards",
      missing_cards: cards.missing,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: error.message,
    });
  }
});

//helped that get and post can call to check which card ids are from which collection
//find deck -> argument
async function checkCardLocation(ids) {
  if (!ids) {
    throw new Error(`No Id passed, check again`);
  }

  if (!Array.isArray(ids)) {
    throw new Error("card_ids must be an array");
  }

  const db = getDB();
  let ownedCardList = [];
  let missingCardList = [];

  //finds all ids in owned
  const ownedCards = await db
    .collection("collections")
    .find({
      card_id: { $in: ids },
    })
    .toArray();

  //finds all ids in master
  const masterCards = await db
    .collection("cards")
    .find({
      id: { $in: ids },
    })
    .toArray();

  //make list of card ids you own
  const ownedIds = new Set(ownedCards.map((card) => card.card_id));

  //make list of card id that exists
  const masterIds = new Set(masterCards.map((card) => card.id));

  //loop through lists
  for (const item of ids) {
    if (ownedIds.has(item)) {
      ownedCardList.push(item);
    } else if (masterIds.has(item)) {
      missingCardList.push(item);
    } else {
      const error = new Error(`Invalid card ID: ${item}`);
      error.status = 400;
      throw error;
    }
  }

  return {
    owned: ownedCardList,
    missing: missingCardList,
  };
}

//is this a valid deck?
async function validateDeck(ids) {
  //TODO: do the cards match the domain?
  //TODO: sideboard

  const db = getDB();
  //look at card in db and get whole card from id
  const cards = await db
    .collection("cards")
    .find({
      id: { $in: ids },
    })
    .toArray();

  //card rules sections
  // connect cardid to card
  const cardById = new Map(cards.map((card) => [card.id, card]));
  // Count the actual cards in the deck
  const legend = [];
  const battlefields = [];
  const runes = [];
  const mainDeck = [];

  for (const id of ids) {
    const card = cardById.get(id);

    if (!card) {
      throw new Error(`Card ${id} does not exist`);
    }

    const type = card.classification.type;

    if (type === "Legend") {
      legend.push(id);
    } else if (type === "Battlefield") {
      battlefields.push(id);
    } else if (type === "Rune") {
      runes.push(id);
    } else {
      mainDeck.push(id);
    }
  }

  //deck structure

  //Not enough main-deck cards
  if (mainDeck.length < 40) {
    throw new Error("Your deck must contain at least 40 cards");
  }
  // one legend + correct cu
  if (legend.length !== 1) {
    throw new Error("Your deck must contain exactly one Legend");
  }
  if (champions.length !== 1) {
    throw new Error("Your deck must contain exactly one Champion Unit");
  }

  //get legend card
  const legendCard = cardById.get(legends[0]);
  //get legend tag
  const legendTag = legendCard.tags[0];
  //get CU in decklist
  // Find Champion Units in the submitted deck
  const champions = ids
    .map((id) => cardById.get(id))
    .filter(
      (card) =>
        card.classification.type === "Unit" &&
        card.classification.supertype === "Champion",
    );
  //check if cu and legend match
  for (const champion of champions) {
    if (!champion.tags.includes(legendTag)) {
      throw new Error(`${champion.name} does not belong to ${legendCard.name}`);
    }
  }

  // Wrong number of Battlefields
  if (battlefields.length !== 3) {
    throw new Error("Your deck must contain exactly three Battlefields");
  }

  // Wrong number of Runes
  if (runes.length !== 12) {
    throw new Error("Your deck must contain exactly twelve Runes");
  }

  //cards copies
  const cardCounts = new Map();
  for (const id of mainDeck) {
    const currentCount = cardCounts.get(id) || 0;
    cardCounts.set(id, currentCount + 1);
  }
  for (const [cardId, count] of cardCounts) {
    if (count > 3) {
      throw new Error(
        `Card ${cardId} has ${count} copies. Only 3 copies are allowed.`,
      );
    }
  }

  //And the Sideboard, which must be exactly 8 or 0 cards
}
export default router;

//im a teapot (418) easter egg, poro
