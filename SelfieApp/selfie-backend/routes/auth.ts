import User from "../models/user";
import Evento from "../models/evento"
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import express from "express";
import { Router, Request, Response, NextFunction } from "express";

dotenv.config();

const router = Router();


// Controllo che JWT_SECRET sia definito
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("JWT_SECRET non definito nel file .env!");
}

function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Token mancante o non valido" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded: any = jwt.verify(token, jwtSecret!);
    (req as any).user = { userId: decoded.id };
    next();
  } catch (err) {
    res.status(403).json({ message: "Token non valido o scaduto" });
  }
}


function generaOccorrenze(evento: any, fineFinestra: Date): any[] {
  const risultati = [];
  const freq = evento.recurrence.frequency;
  const repeatUntil = evento.recurrence.repeatUntil
    ? new Date(evento.recurrence.repeatUntil)
    : fineFinestra;

  let current = new Date(evento.start);
  const duration = (evento.durationMinutes ?? 60) * 60000;
  let endTime = new Date(current.getTime() + duration);

  while (current <= repeatUntil && current <= fineFinestra) {
    risultati.push({
      ...evento.toObject(),
      start: new Date(current),
      end: new Date(endTime),
      _id: undefined,
      recurrenceId: evento._id,
    });

    switch (freq) {
      case "daily":
        current.setDate(current.getDate() + 1);
        endTime.setDate(endTime.getDate() + 1);
        break;
      case "weekly":
        current.setDate(current.getDate() + 7);
        endTime.setDate(endTime.getDate() + 7);
        break;
      case "monthly":
        current.setMonth(current.getMonth() + 1);
        endTime.setMonth(endTime.getMonth() + 1);
        break;
      default:
        break;
    }
  }

  return risultati;
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
router.get("/me", authenticateToken,  async (req: Request, res: Response) => {
  try {
     const userId = (req as any).user.userId;

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
//route per aggiornare i dati personali
router.put("/update", authenticateToken, async (req: Request, res: Response) => {
  try {
      const userId = (req as any).user.userId;

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

//route per cambiare la password
router.put('/change-password', authenticateToken, async (req, res): Promise<void> => {
  const userId = (req as any).user.userId;
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) { res.status(404).json({ message: 'Utente non trovato' });
  return;
  }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) { res.status(400).json({ message: 'Password attuale errata' });
  return;  
  }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password aggiornata con successo' });
  } catch (err) {
    res.status(500).json({ message: 'Errore del server', error: err });
  }
});

//route per salvare un nuovo evento
router.post("/eventi", authenticateToken, async (req, res) => {
  console.log("Ricevuto nuovo evento:", req.body);
  try {
    const userId = (req as any).user.userId;
    const {
      title,
      start,
      end,
      isRecurring,
      recurrence,
      overridesOriginalId,
      allDay,
    } = req.body;

    if (!title || !start || !end) {
       res.status(400).json({ error: "Dati mancanti" });
       return;
    } 

    const nuovoEvento = new Evento({
      title,
      start,
      end,
      allDay,
      isRecurring,
      recurrence,
      overridesOriginalId: overridesOriginalId || null,
      userId: userId,
    });

    const eventoSalvato = await nuovoEvento.save();
    res.json(eventoSalvato);
  } catch (error) {
    console.error("Errore nel salvataggio dell’evento:", error);
    res.status(500).json({ message: "Errore nel salvataggio dell’evento." });
  }
});


router.put("/eventi", authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
    const userId = (req as any).user.userId;
    const { id, title, start, end, location, allDay, recurrenceId, overridesOriginalId } = req.body;
    

    const evento = await Evento.findById(id);
    if (!evento) {
      res.status(404).json({ message: "Evento non trovato" });
      return;
    }

    // Se l'evento è ricorrente, crea override
    if (evento.isRecurring && overridesOriginalId && recurrenceId) {
      const override = new Evento({
        ...evento.toObject(),
        _id: undefined,
        title,
        start,
        end,
        location,
        allDay,
        isRecurring: false,
        overridesOriginalId: id,
        userId,
      });

      await override.save();
      res.status(200).json({ message: "Override creato", override });
    } else {
      // Modifica evento normale
      evento.title = title;
      evento.start = start;
      evento.end = end;
      evento.location = location;
      evento.allDay = allDay;

      await evento.save();
      res.status(200).json({ message: "Evento aggiornato", evento });
    }

  } catch (error) {
    console.error("Errore durante l'aggiornamento", error);
    res.status(500).json({ message: "Errore del server" });
  }
});

//route per recuperare/modificare gli eventi salvati
router.get("/eventi", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const eventiOriginali = await Evento.find({ userId: userId });
    const fineFinestra = new Date();
    fineFinestra.setMonth(fineFinestra.getMonth() + 3);

    const eventiEspansi: any[] = [];

    for (const evento of eventiOriginali) {
      if (evento.isRecurring && evento.recurrence?.frequency) {
        const ricorrenze = generaOccorrenze(evento, fineFinestra);
        eventiEspansi.push(...ricorrenze);
      } else {
        eventiEspansi.push(evento.toObject());
      }
    }

    // Cerca override delle occorrenze
    const overrideOccurrences = await Evento.find({
      overridesOriginalId: { $exists: true },
      userId: userId
    });

    // Applica override: sostituisci o aggiungi
    for (const override of overrideOccurrences) {
      const index = eventiEspansi.findIndex(e =>
        e.recurrenceId?.toString() === override.overridesOriginalId?.toString() &&
        new Date(e.start).getTime() === new Date(override.start).getTime()
      );

      if (index !== -1) {
        eventiEspansi[index] = override.toObject();
      } else {
        eventiEspansi.push(override.toObject());
      }
    }

    res.status(200).json(eventiEspansi);
  } catch (error) {
    console.error("Errore nel recuperare gli eventi", error);
    res.status(500).json({ message: "Errore del server" });
  }
});


//modifica un evento esistente
router.put("/eventi/:id", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    const recurringId = req.params.id;
    const { overrideDate, updateData } = req.body; // overrideDate è la data specifica della ricorrenza

    // Trova l'evento ricorrente
    const eventoRicorrente = await Evento.findOne({ _id: recurringId, userId });
    if (!eventoRicorrente || !eventoRicorrente.isRecurring) {
      res.status(404).json({ message: "Evento ricorrente non trovato" });
      return;
    }

    // Crea l'override
    const overrideEvento = new Evento({
      ...eventoRicorrente.toObject(),
      ...updateData,
      _id: undefined, // per creare un nuovo documento
      userId,
      overridesOriginalId: recurringId,
      isRecurring: false,
      start: new Date(overrideDate),
    });

    await overrideEvento.save();
    res.status(200).json({ message: "Occorrenza modificata", evento: overrideEvento });
  } catch (error) {
    console.error("Errore nella modifica singola:", error);
    res.status(500).json({ message: "Errore del server" });
  }
});

//elimina evento esistente
router.delete("/eventi/:id", authenticateToken, async (req: Request, res: Response): Promise<void> => {
 try {
    const userId = (req as any).user.userId;
    const eventId = req.params.id;

    const evento = await Evento.findOne({ _id: eventId, userId });

    if (!evento) {
      res.status(404).json({ message: "Evento non trovato" });
      return;
    }

    // Se è un evento ricorrente, elimina anche gli override
    if (evento.isRecurring) {
      await Evento.deleteMany({ overridesOriginalId: eventId, userId });
    }

    await evento.deleteOne();
    res.status(200).json({ message: "Evento eliminato con successo" });
  } catch (error) {
    console.error("Errore nella cancellazione dell'evento:", error);
    res.status(500).json({ message: "Errore del server" });
  }
});


export default router;