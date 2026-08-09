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
    let qName = req.query.name;
    let qSet = req.query.set;
    let qEnergy = req.query.energy;
    let qMight = req.query.might;
    console.log(qMight);
    const filters = [];

    //validates against user errors & protects for maluse by defining the query
    if (!qName && !qSet && !qEnergy && !qMight) {
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
      console.log(energy);

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
