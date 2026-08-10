import express from "express";
import { getDB } from "../database.js";

const router = express.Router();

//get all cards
router.get("/", async (req, res) => {
  try {
    const db = getDB();
    const cards = await db.collection("cards").find({}).toArray();
    res.send(cards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//look for a specific card
router.get("/search", async (req, res) => {
  try {
    const db = getDB();
    let qName = req.query.name?.trim();
    let qSet = req.query.set?.trim();
    let qEnergy = req.query.energy;
    let qMight = req.query.might;
    let qPower = req.query.power;
    let qDomain = req.query.domain?.split(",");
    let qType = req.query.type;
    let qRarity = req.query.rarity;

    const filters = [];

    //validates against user errors & protects for maluse by defining the query - overal
    if (
      !qName &&
      !qSet &&
      !qEnergy &&
      !qMight &&
      !qPower &&
      !qDomain &&
      !qType &&
      !qRarity
    ) {
      return res.status(400).json("Please enter a valid parameter");
    }

    if (
      qName?.length > 100 ||
      qSet?.length > 100 ||
      qDomain?.length > 2 ||
      qType?.length > 50 ||
      qRarity?.length > 100
    ) {
      return res.status(400).json({
        message: "Search query is too long",
      });
    }

    // -----------------------specific

    //name
    if (qName && typeof qName !== "string") {
      return res.status(400).json({
        message: "Invalid name",
      });
    }

    if (qName) {
      filters.push({
        name: new RegExp(qName, "i"),
      });
    }
    //set
    if (qSet && typeof qSet !== "string") {
      return res.status(400).json({
        message: "Invalid set",
      });
    }

    if (qSet) {
      filters.push({
        "set.set_id": new RegExp(qSet, "i"),
      });
    }

    //--------attributes
    if (qEnergy !== undefined) {
      const energy = Number(qEnergy);

      if (!Number.isInteger(energy) || energy < 0 || energy > 12) {
        return res.status(400).json({
          message: "Invalid energy",
        });
      } else {
        filters.push({
          "attributes.energy": energy,
        });
      }
    }

    if (qMight !== undefined) {
      const might = Number(qMight);

      if (!Number.isInteger(might) || might < 0 || might > 12) {
        return res.status(400).json({
          message: "Invalid might",
        });
      } else {
        filters.push({
          "attributes.might": might,
        });
      }
    }

    if (qPower !== undefined && qPower !== "null") {
      const power = Number(qPower);

      if (!Number.isInteger(power) || power < 0 || power > 5) {
        return res.status(400).json({
          message: "Invalid power",
        });
      } else {
        filters.push({ "attributes.power": power });
      }
    } else if (qPower == "null") {
      const power = null;
      filters.push({ "attributes.power": power });
    }

    //--------classification
    //domain
    if (qDomain) {
      filters.push({ "classification.domain": { $in: qDomain } });
    }
    //type
    if (qType && typeof qType !== "string") {
      return res.status(400).json({
        message: "Invalid set",
      });
    }

    if (qType) {
      filters.push({ "classification.type": new RegExp(`^${qType}$`, "i") });
    }
    //rarity

    if (qRarity && typeof qRarity !== "string") {
      return res.status(400).json({
        message: "Invalid set",
      });
    }

    if (qRarity) {
      filters.push({
        "classification.rarity": new RegExp(`^${qRarity}$`, "i"),
      });
    }
    //search in db
    const search = await db
      .collection("cards")
      .find({ $and: filters })
      .toArray();

    //if no matches found
    if (search.length === 0) {
      return res.status(404).json({
        message: "No cards matched your search. Please check your query",
      });
    }

    res.send(search);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
export default router;
