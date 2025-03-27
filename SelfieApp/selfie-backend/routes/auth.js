import express from "express";
import User from "../models/user";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// Registrazione utente
router.post("/register", async (req, res) => {
  try {
    const { nome, cognome, username, email, password, dataNascita } = req.body;

    // Verifica se l'utente esiste già
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: "Username già in uso" });

    // Cripta la password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crea l'utente
    const newUser = new User({ nome, cognome, username, email, password: hashedPassword, dataNascita });
    await newUser.save();

    res.status(201).json({ message: "Registrazione completata" });
  } catch (err) {
    res.status(500).json(err);
  }
});

// Login utente
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Trova l'utente nel database
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "Username non trovato" });

    // Confronta la password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Password errata" });

    // Genera un token JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({ token, user: { username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json(err);
  }
});

export default router;