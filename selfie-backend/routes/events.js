import express from "express";
import Event from "../models/Event.js"; // Creiamo il modello Event

const router = express.Router();

// Aggiungere un evento
router.post("/add", async (req, res) => {
  try {
    const newEvent = new Event(req.body);
    await newEvent.save();
    res.status(201).json(newEvent);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Ottenere tutti gli eventi
router.get("/", async (req, res) => {
  try {
    const events = await Event.find();
    res.json(events);
  } catch (err) {
    res.status(500).json(err);
  }
});

export default router;