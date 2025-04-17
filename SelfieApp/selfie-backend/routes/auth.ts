import User from "../models/user";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import express from "express";
import { Router, Request, Response } from "express";

dotenv.config();

const router = Router();

// Controllo che JWT_SECRET sia definito
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("JWT_SECRET non definito nel file .env!");
}

// Registrazione utente
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const { nome, cognome, username, email, password, dataNascita } = req.body;

    // Verifica se l'utente esiste già
    const existingUser = await User.findOne({ username });
    if (existingUser){
       res.status(400).json({ message: "Username già in uso" });
      return;
      }

    // Cripta la password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crea l'utente
    const newUser = new User({
      nome,
      cognome,
      username,
      email,
      password: hashedPassword,
      dataNascita,
    });

    await newUser.save();

    res.status(201).json({ message: "Registrazione completata" });
  } catch (error) {
    console.error("Errore nella registrazione:", error);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

// Login utente
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    // Trova l'utente nel database
    const user = await User.findOne({ username });
    if (!user) {
     res.status(400).json({ message: "Username non trovato" });
    return;
    }

    // Confronta la password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch){ res.status(400).json({ message: "Password errata" });
    return;  
  }

    // Genera un token JWT con una chiave segreta valida
    const token = jwt.sign({ id: user._id }, jwtSecret, { expiresIn: "1h" });

    res.json({ token, user: { username: user.username, email: user.email } });
  } catch (error) {
    console.error("Errore nel login:", error);
    res.status(500).json({ message: "Errore interno del server" });
  }
});

// Endpoint per ottenere i dati dell'utente loggato
router.get("/me", async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Token mancante o non valido" });
      return;
    }

    const token = authHeader.split(" ")[1];

    // Verifica il token
    const decoded: any = jwt.verify(token, jwtSecret);
    const userId = decoded.id;

    const user = await User.findById(userId).select("nome cognome username email dataNascita");

    if (!user) {
      res.status(404).json({ message: "Utente non trovato" });
      return;    
    }

    res.json(user);
  } catch (error) {
    console.error("Errore nel recupero dell'utente:", error);
    res.status(500).json({ message: "Errore del server" });
  }
});

router.put("/update", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Token mancante o non valido" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded: any = jwt.verify(token, jwtSecret);
    const userId = decoded.id;

    const { username, nome, cognome, dataNascita, email } = req.body;

    await User.findByIdAndUpdate(userId, {
      username, nome, cognome, dataNascita, email
    });

    res.json({ message: "Dati aggiornati con successo" });
  } catch (error) {
    console.error("Errore nell'aggiornamento dell'utente:", error);
    res.status(500).json({ message: "Errore del server" });
  }
});

export default router;