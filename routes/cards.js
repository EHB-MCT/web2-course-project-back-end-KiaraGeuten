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

    const filters = [];

    //validates against user errors & protects for maluse by defining the query
    if (!qName && !qSet && !qEnergy && !qMight && !qPower) {
      return res.status(400).json("Please enter a valid parameter");
    }
    if (qName && typeof qName !== "string") {
      return res.status(400).json({
        message: "Invalid name",
      });
    }

    if (qSet && typeof qSet !== "string") {
      return res.status(400).json({
        message: "Invalid set",
      });
    }

    if (qName?.length > 100 || qSet?.length > 100) {
      return res.status(400).json({
        message: "Search query is too long",
      });
    }

    if (qName) {
      filters.push({
        name: new RegExp(qName, "i"),
      });
    }

    if (qSet) {
      filters.push({
        "set.set_id": new RegExp(qSet, "i"),
      });
    }

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
      console.log(power, ": not null");
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
