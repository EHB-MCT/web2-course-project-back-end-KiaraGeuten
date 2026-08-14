///post deck, put deck/:cardId, delete deck/:cardId

// Serve the right data (owned cards vs. master collection)

//version 1.1.0: side board
// Save decks
// Determine "complete" vs. "incomplete" status

import express from "express";
import { getDB } from "../database.js";
import multer from "multer";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
});

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
    const { deck_name, card_ids } = req.body;
    const result = await createDeck(deck_name, card_ids);
    res.status(201).json({
      message:
        "You have succesfully created " +
        deck_name +
        " & counted your missing cards",
      missing_cards: result.missing,
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

//deck imported txt
router.post("/import", upload.single("deck"), async (req, res) => {
  try {
    let deckName;
    let deckText;
    //no file to read deck from -> look for json
    if (req.file) {
      // TXT upload
      deckName = req.body.deck_name;
      deckText = req.file.buffer.toString("utf-8");
    } else {
      // JSON
      deckName = req.body.deck_name;
      deckText = req.body.deck_text;
    }
    //  required data exists
    if (typeof deckName !== "string" || !deckName.trim()) {
      return res.status(400).json({
        message: "Deck name is required",
      });
    }

    if (typeof deckText !== "string" || !deckText.trim()) {
      return res.status(400).json({
        message: "Deck text is required",
      });
    }
    // Turn the file into individual lines
    const lines = deckText
      .split(/\r?\n/)
      .map((line) => line.trim())
      //remove empty strings etc
      .filter(Boolean);

    //get db
    const db = getDB();
    // Store cards
    const cardIds = [];

    //loop through
    for (const line of lines) {
      //look for number "" card
      const match = line.match(/^(\d+)\s+(.+)$/);

      //skip headers
      if (!match) {
        continue;
      }

      //get numbers and name out of the line and turn them into number/ no spaces
      const quantity = Number(match[1]);
      const cardName = match[2].trim();

      //catching absurd numbers
      if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 100) {
        return res.status(400).json({
          message: `Invalid quantity for "${cardName}"`,
        });
      }
      //look card in master collection
      const card = await db.collection("cards").findOne({
        name: cardName,
        "metadata.alternate_art": false,
        "metadata.overnumbered": false,
        "metadata.signature": false,
      });

      // Card doesn't exist
      if (!card) {
        return res.status(400).json({
          message: `Card "${cardName}" was not found in the card database`,
        });
      }

      // Add  card ID  for every copy
      for (let i = 0; i < quantity; i++) {
        cardIds.push(card.id);
      }
    }
    // Make sure we actually found cards
    if (cardIds.length === 0) {
      return res.status(400).json({
        message: "No cards were found in the TXT file",
      });
    }

    const result = await createDeck(deckName, cardIds);

    return res.status(201).json({
      message: "Deck imported successfully",
      missing_cards: result.missing,
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

async function createDeck(deck_name, card_ids) {
  const db = getDB();

  //errors
  if (!deck_name || !card_ids) {
    throw new Error("The request is missing, request body is required");
  }
  // Deck name must be a string
  if (typeof deck_name !== "string") {
    throw new Error("Deck name must be a string");
  }

  // Deck name cannot be empty
  if (!deck_name.trim()) {
    throw new Error("Deck name is required");
  }

  //name is too long
  if (deck_name.length > 25) {
    throw new Error(
      "Deck name is too long. It must be under 25 characters. Try to aim at 3 to 5 words",
    );
  }

  const normalizedName = deck_name.trim().toLowerCase();
  //check if name exists
  const existingDeck = await db.collection("decks").findOne({
    deck_name_normalized: normalizedName,
  });

  if (existingDeck) {
    throw new Error("Deck name already exists. Please choose another name.");
  }
  // if card_id is no array
  if (!Array.isArray(card_ids)) {
    throw new Error("card_ids must be an array");
  }
  // no card ids
  if (card_ids.length === 0) {
    throw new Error("card_ids cannot be empty");
  }
  if (card_ids.length > 100) {
    throw new Error("Too many card IDs");
  }

  // Every card ID must be a string and non-empty
  for (const cardId of card_ids) {
    if (typeof cardId !== "string") {
      throw new Error("Items inserted in card_ids must be strings");
    }
    if (!cardId.trim()) {
      throw new Error("card_ids contains an empty card ID");
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
  return cards;
}

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

  const db = getDB();
  //look at card in db and get whole card from id
  const cards = await db
    .collection("cards")
    .find({
      id: { $in: ids },
    })
    .toArray();

  // connect cardid to card
  const cardById = new Map(cards.map((card) => [card.id, card]));
  //categorize
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

  //check one legend
  if (legend.length !== 1) {
    throw new Error("Your deck must contain exactly one Legend");
  }
  //Not enough main-deck cards
  if (mainDeck.length < 40) {
    throw new Error("Your deck must contain at least 40 cards");
  }
  // Wrong number of Battlefields
  if (battlefields.length !== 3) {
    throw new Error("Your deck must contain exactly three Battlefields");
  }

  // Wrong number of Runes
  if (runes.length !== 12) {
    throw new Error("Your deck must contain exactly twelve Runes");
  }

  //get legend card
  const legendCard = cardById.get(legend[0]);
  //get legend tag &domains
  const legendTag = legendCard.tags[0];
  const legendDomains = legendCard.classification.domain;

  //get CU in decklist
  // Find Champion Units in the submitted deck
  const champions = ids
    .map((id) => cardById.get(id))
    .filter(
      (card) =>
        card.classification.type === "Unit" &&
        card.classification.supertype === "Champion",
    );

  //correct cu
  if (champions.length === 0) {
    throw new Error("Your deck must contain a Champion Unit");
  }

  const matchingChampion = champions.find((champion) =>
    champion.tags.includes(legendTag),
  );

  if (!matchingChampion) {
    throw new Error(
      `Your deck must contain a Champion Unit that belongs to ${legendCard.name}`,
    );
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

  //makes sure deck has correct domains
  for (const id of mainDeck) {
    const card = cardById.get(id);

    const cardDomains = card.classification.domain;

    const hasMatchingDomain = cardDomains.some((domain) =>
      legendDomains.includes(domain),
    );

    if (!hasMatchingDomain) {
      throw new Error(
        `${card.name} does not belong to the domains of ${legendCard.name}`,
      );
    }
  }

  //correct runes
  for (const id of runes) {
    const rune = cardById.get(id);

    const runeDomain = rune.classification.domain[0];

    if (!legendDomains.includes(runeDomain)) {
      throw new Error(
        `${rune.name} does not belong to the domains of ${legendCard.name}`,
      );
    }
  }
}
export default router;

//im a teapot (418) easter egg, poro
