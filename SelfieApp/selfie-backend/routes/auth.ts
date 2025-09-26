import User from "../models/user";
import Evento from "../models/evento";
import Task from "../models/task";
import Note from "../models/note";
import Pomodoro from "../models/pomodoro";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import express, { RequestHandler } from "express";
import mongoose from "mongoose";
import dayjs from "dayjs";

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
    const decoded: any = jwt.verify(token, jwtSecret!) as { id: string};
    (req as any).user = { id: decoded.id, userId: decoded.id };
    next();
  } catch (err) {
    res.status(403).json({ message: "Token non valido o scaduto" });
  }
}

interface AuthenticatedRequest extends Request {
  user?: { id?: string; userId?: string };
}

function getUserIdOr401(req: AuthenticatedRequest, res: Response): string | null {
  const userId = (req as any).user?.id || (req as any).user?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return userId;
}

//funzione per generare le ricorrenze
function generaOccorrenze(evento: any, fineFinestra: Date) {
  const occorrenze: any[] = [];
  let current = new Date(evento.start);

  while (current <= fineFinestra) {
    occorrenze.push({
      ...evento.toObject(),
      start: new Date(current),
      end: new Date(new Date(current).getTime() + (new Date(evento.end).getTime() - new Date(evento.start).getTime())),
    });

    if (evento.recurrence?.frequency === "daily") {
      current.setDate(current.getDate() + 1);
    } else if (evento.recurrence?.frequency === "weekly") {
      current.setDate(current.getDate() + 7);
    } else if (evento.recurrence?.frequency === "monthly") {
      current.setMonth(current.getMonth() + 1);
    } else {
      break;
    }
  }
  return occorrenze;
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
router.post("/eventi", authenticateToken, async (req: Request, res: Response): Promise<void> => {
   try {
    const userId = (req as any).user.userId;
    const { title, start, end, location, isRecurring, recurrence, allDay } = req.body;

    if (!title || !start || !end) {
      res.status(400).json({ error: "Dati mancanti" });
      return;
    }

    if (!isRecurring) {
      // Evento singolo
      const nuovoEvento = new Evento({
        title,
        start,
        end,
        allDay: allDay || false,
        location: location || "",
        isRecurring: false,
        recurrence: null,
        recurrenceId: null,
        userId
      });

      const eventoSalvato = await nuovoEvento.save();
       res.json(eventoSalvato);
       return;
    }

    // Evento ricorrente
    if (!recurrence?.frequency || !recurrence?.repeatUntil) {
       res.status(400).json({ error: "Dati di ricorrenza mancanti" });
       return;
    }

    const recurrenceId = new mongoose.Types.ObjectId();
    const startDate = new Date(start);
    const endDate = new Date(end);
    const untilDate = new Date(recurrence.repeatUntil);

    const occorrenze = [];
    let currentStart = new Date(startDate);
    let currentEnd = new Date(endDate);

    while (currentStart <= untilDate) {
      occorrenze.push({
        title,
        start: new Date(currentStart),
        end: new Date(currentEnd),
        allDay: allDay || false,
        location: location || "",
        isRecurring: true,
        recurrence,
        recurrenceId,
        userId
      });

      if (recurrence.frequency === "daily") {
        currentStart.setDate(currentStart.getDate() + 1);
        currentEnd.setDate(currentEnd.getDate() + 1);
      } else if (recurrence.frequency === "weekly") {
        currentStart.setDate(currentStart.getDate() + 7);
        currentEnd.setDate(currentEnd.getDate() + 7);
      } else if (recurrence.frequency === "monthly") {
        currentStart.setMonth(currentStart.getMonth() + 1);
        currentEnd.setMonth(currentEnd.getMonth() + 1);
      }
    }

    const eventiSalvati = await Evento.insertMany(occorrenze);
    res.json(eventiSalvati);

  } catch (error) {
    console.error("Errore nel salvataggio dell’evento:", error);
    res.status(500).json({ message: "Errore nel salvataggio dell’evento." });
  }
});


router.put("/eventi", authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
     const userId = (req as any).user.userId;
    const { id, title, start, end, location, allDay, recurrenceId, overridesOriginalId } = req.body;

    const evento = await Evento.findOne({ _id: id, userId });
    if (!evento) {
      res.status(404).json({ message: "Evento non trovato" });
      return;
    }

    // Override per evento ricorrente
    if (evento.isRecurring && overridesOriginalId && recurrenceId) {
      const override = new Evento({
        ...evento.toObject(),
        _id: undefined,
        title,
        start: new Date(start),
        end: new Date(end),
        location,
        allDay,
        isRecurring: false,
        overridesOriginalId: id,
        recurrenceId: evento.recurrenceId,
        userId,
      });

      await override.save();
      res.status(200).json({ message: "Override creato", override });
      return;
    }

    // Modifica evento singolo
    evento.title = title;
    evento.start = new Date(start);
    evento.end = new Date(end);
    evento.location = location;
    evento.allDay = allDay;

    await evento.save();
    res.status(200).json({ message: "Evento aggiornato", evento });
  } catch (error) {
    console.error("Errore durante l'aggiornamento", error);
    res.status(500).json({ message: "Errore del server" });
  }
});

//route per recuperare/modificare gli eventi salvati
router.get("/eventi", authenticateToken, async (req: Request, res: Response) => {
  try {
   const userId = (req as any).user.userId;

    // Prende tutti gli eventi dell'utente
    const eventiOriginali = await Evento.find({ userId });

  
    const fineFinestra = new Date();
    fineFinestra.setMonth(fineFinestra.getMonth() + 3);

    let eventiEspansi: any[] = [];

    for (const evento of eventiOriginali) {
      if (evento.isRecurring && evento.recurrence?.frequency) {
        if (evento.recurrenceId && eventiOriginali.some(ev => ev.recurrenceId?.toString() === evento.recurrenceId?.toString() && ev._id.toString() !== evento._id.toString())) {
          // Se esistono già occorrenze per questo recurrenceId non generiamo nulla 
          continue;
        } else {
          eventiEspansi.push(...generaOccorrenze(evento, fineFinestra));
        }
      } else {
        // Evento singolo
        eventiEspansi.push(evento.toObject());
      }
    }

    // Aggiunge tutte le occorrenze ricorrenti già salvate in DB
    const occorrenzeSalvate = eventiOriginali.filter(ev => ev.isRecurring && ev.recurrenceId && !ev.overridesOriginalId);
    eventiEspansi.push(...occorrenzeSalvate.map(ev => ev.toObject()));

    // Gestione override (modifiche singole ad eventi ricorrenti)
    const overrideOccurrences = await Evento.find({
      overridesOriginalId: { $exists: true },
      userId
    });

    for (const override of overrideOccurrences) {
      const index = eventiEspansi.findIndex(e =>
        e.recurrenceId?.toString() === override.recurrenceId?.toString() &&
        new Date(e.start).getTime() === new Date(override.start).getTime()
      );

      if (index !== -1) {
        eventiEspansi[index] = override.toObject();
      } else {
        eventiEspansi.push(override.toObject());
      }
    }

    // rimuovi occorrenze generate che sono state cancellate
    const cancellazioni = await Evento.find({ isCancelled: true, userId });

    if (cancellazioni && cancellazioni.length) {
      eventiEspansi = eventiEspansi.filter(ev =>
        !cancellazioni.some(c =>
          String(c.recurrenceId) === String(ev.recurrenceId) &&
          new Date(c.start).getTime() === new Date(ev.start).getTime()
        )
      );
    }

    // Filtra le cancellazioni
    const eventiFinali = eventiEspansi.filter(ev => !ev.isCancelled);

    res.status(200).json(eventiFinali);
  } catch (error) {
    console.error("Errore nel recuperare gli eventi", error);
    res.status(500).json({ message: "Errore del server" });
  }
});


//modifica un evento esistente
router.put("/eventi/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
       const userId = (req as any).user.userId;
    const recurringId = req.params.id;
    const { overrideDate, updateData } = req.body;

    const eventoRicorrente = await Evento.findOne({ recurrenceId: recurringId, userId });
    if (!eventoRicorrente) {
      res.status(404).json({ message: "Evento ricorrente non trovato" });
      return;
    }

    const overrideEvento = new Evento({
      ...eventoRicorrente.toObject(),
      ...updateData,
      location: updateData.location || eventoRicorrente.location,
      _id: undefined,
      userId,
      overridesOriginalId: recurringId,
      isRecurring: false,
      recurrenceId: recurringId,
      start: new Date(overrideDate),
      end: new Date(updateData.end),
    });

    await overrideEvento.save();
    res.status(200).json({ message: "Occorrenza modificata", evento: overrideEvento });
  } catch (error) {
    console.error("Errore nella modifica singola:", error);
    res.status(500).json({ message: "Errore del server" });
  }
});

//modifica tutti gli eventi ricorrenti
router.put("/eventi/ricorrenti/:recurrenceId", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const recurrenceId = req.params.recurrenceId;
    const { updateData } = req.body;

    const eventi = await Evento.find({ recurrenceId, userId, isCancelled: { $ne: true } });
    if (!eventi.length) {
     res.status(404).json({ message: "Eventi ricorrenti non trovati" });
     return;
    }

    for (let ev of eventi) {
      const startDate = new Date(ev.start ?? new Date());
      startDate.setHours(updateData.startTime.hours, updateData.startTime.minutes, 0, 0);

      const endDate = new Date(ev.end ?? ev.start ?? new Date());
      endDate.setHours(updateData.endTime.hours, updateData.endTime.minutes, 0, 0);

      ev.title = updateData.title || ev.title;
      ev.location = updateData.location || ev.location;
      ev.allDay = updateData.allDay ?? ev.allDay;
      ev.start = startDate;
      ev.end = endDate;

      await ev.save();
    }

    res.status(200).json({ message: "Tutti gli eventi ricorrenti aggiornati" });
  } catch (error) {
    console.error("Errore aggiornamento ricorrenti", error);
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

    if (evento.isRecurring) {
      await Evento.deleteMany({ overridesOriginalId: eventId, userId });
    }

    await evento.deleteOne();
    res.status(200).json({ message: "Evento eliminato" });
  } catch (error) {
    console.error("Errore cancellazione evento", error);
    res.status(500).json({ message: "Errore del server" });
  }
});

//route per eliminare un solo evento tra quelli ricorrenti
router.delete("/eventi/ricorrenti/:recurrenceId/occurrence", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { recurrenceId } = req.params;
    const { date } = req.query;

    if (!date) {
     res.status(400).json({ message: "Data dell'occorrenza mancante" });
     return;
    }

    const masterEvent = await Evento.findOne({ recurrenceId, userId });
    if (!masterEvent) {
      res.status(404).json({ message: "Evento ricorrente non trovato" });
      return;
    }

    const cancelStart = new Date(String(req.query.date));
    if (isNaN(cancelStart.getTime())) {
      res.status(400).json({ message: "Data non valida" });
      return;
    }

    const origStart = masterEvent.start ? new Date(masterEvent.start) : null;
    const origEnd = masterEvent.end ? new Date(masterEvent.end) : null;

    let durationMs = 60 * 60000;
    if (origStart && origEnd && !isNaN(origStart.getTime()) && !isNaN(origEnd.getTime())) {
      durationMs = origEnd.getTime() - origStart.getTime();
    }

    const cancelEnd = new Date(cancelStart.getTime() + durationMs);

    const cancelOverride = new Evento({
      title: masterEvent.title,
      start: cancelStart,
      end: cancelEnd,
      allDay: masterEvent.allDay,
      isRecurring: false,
      overridesOriginalId: masterEvent._id,
      recurrenceId,
      isCancelled: true,
      userId
    });

    await cancelOverride.save();

    res.status(200).json({ message: "Occorrenza cancellata" });
  } catch (error) {
    console.error("Errore cancellazione occorrenza ricorrente", error);
    res.status(500).json({ message: "Errore del server" });
  }
});

// route per eliminare tutta la serie ricorrente
router.delete("/eventi/ricorrenti/:recurrenceId", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
   const userId = (req as any).user.userId;
    const { recurrenceId } = req.params;

    const deleted = await Evento.deleteMany({ recurrenceId, userId });
    res.status(200).json({ message: "Tutta la serie ricorrente eliminata", deletedCount: deleted.deletedCount });
  } catch (error) {
    console.error("Errore nell'eliminazione di tutta la serie:", error);
    res.status(500).json({ message: "Errore del server" });
  }
});


//ROUTE per le TASK
// GET task
router.get("/tasks", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
   console.log(" req.user in /tasks:", (req as any).user);
  const userId = getUserIdOr401(req, res);
  if (!userId) return;

  try {
    const tasks = await Task.find({ userId }).sort({ dueDate: 1, createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Errore caricamento task" });
  }
});
// route per aggiungere una nuova task
router.post("/tasks", authenticateToken, (async (req: AuthenticatedRequest, res: Response) => {
  console.log(" req.user:", req.user);
  const userId = getUserIdOr401(req, res);
  if (!userId) return;

  try {
    const { title, startDate, dueDate } = req.body;
    if (!title || !startDate || !dueDate) {
      return res.status(400).json({ error: "Titolo, inizio e scadenza obbligatori" });
    }

    const newTask = new Task({
      userId,
      title,
      startDate: new Date(startDate),
      dueDate: new Date(dueDate),
      completed: false,
    });

    await newTask.save();
    res.status(201).json(newTask);
  } catch (err) {
    res.status(500).json({ error: "Errore creazione task" });
  }
}) as RequestHandler
);


// route per aggiornare lo stato di una task
router.put("/tasks/:id", authenticateToken, (async (req: AuthenticatedRequest, res: Response) => {
  const userId = getUserIdOr401(req, res);
  if (!userId) return;

  try {
    const { id } = req.params;
    const update = req.body ?? {};
    const updated = await Task.findOneAndUpdate({ _id: id, userId }, update, { new: true });
    if (!updated) return res.status(404).json({ error: "Task non trovata" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Errore aggiornamento task" });
  }
}) as RequestHandler
);

// route per cancellare le task
router.delete("/tasks/:id", authenticateToken, (async (req: AuthenticatedRequest, res: Response) => {
  const userId = getUserIdOr401(req, res);
  if (!userId) return;

  try {
    const { id } = req.params;
    const deleted = await Task.findOneAndDelete({ _id: id, userId });
    if (!deleted) return res.status(404).json({ error: "Task non trovata" });
    res.json({ message: "Task eliminata" });
  } catch (err) {
    res.status(500).json({ error: "Errore eliminazione task" });
  }
}) as RequestHandler
);


//ROUTE per le note
//GET tutte le note
router.get("/notes", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = getUserIdOr401(req, res);
  if (!userId) return;

  try {
    const notes = await Note.find({ userId }).sort({ updatedAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: "Errore caricamento note" });
  }
});

// POST nuova nota
router.post("/notes", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = getUserIdOr401(req, res);
  if (!userId) return;

  try {
    const { title, content, categories, createdAt, updatedAt } = req.body;
    if (!title || !content) {
       res.status(400).json({ error: "Titolo e contenuto obbligatori" });
       return;
    }

    const newNote = new Note({
      userId,
      title,
      content,
      categories: categories || [],
        createdAt: createdAt ? new Date(createdAt) : new Date(),
      updatedAt: updatedAt ? new Date(updatedAt) : new Date(),
    });

    await newNote.save();
    res.status(201).json(newNote);
  } catch (err) {
    res.status(500).json({ error: "Errore creazione nota" });
  }
});

// PUT aggiornare una nota
router.put("/notes/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = getUserIdOr401(req, res);
  if (!userId) return;

  try {
    const { id } = req.params;
    const update = req.body ?? {};
   if (!update.updatedAt) {
      update.updatedAt = new Date();
    }
    const updated = await Note.findOneAndUpdate({ _id: id, userId }, update, { new: true });
    if (!updated) 
    res.status(404).json({ error: "Nota non trovata" });
    res.json(updated);
    return;
  } catch (err) {
    res.status(500).json({ error: "Errore aggiornamento nota" });
  }
});

// DELETE cancellare una nota
router.delete("/notes/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = getUserIdOr401(req, res);
  if (!userId) return;

  try {
    const { id } = req.params;
    const deleted = await Note.findOneAndDelete({ _id: id, userId });
    if (!deleted)
    res.status(404).json({ error: "Nota non trovata" });
    res.json({ message: "Nota eliminata" });
    return;
  } catch (err) {
    res.status(500).json({ error: "Errore eliminazione nota" });
  }
});

// POST duplicare una nota
router.post("/notes/:id/duplicate", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = getUserIdOr401(req, res);
  if (!userId) return;

  try {
    const { id } = req.params;
    const original = await Note.findOne({ _id: id, userId }).exec();

    if (!original) {
       res.status(404).json({ error: "Nota non trovata" });
       return;
    }

    
    const title = original.title ?? "Senza titolo";
    const content = original.content ?? "";
    const categories = original.categories ?? [];

    const duplicate = new Note({
      userId,
      title: `${title} (Copia)`,
      content,
      categories,
    });

    await duplicate.save();
    res.status(201).json(duplicate);
  } catch (err) {
    console.error("Errore duplicazione nota", err);
    res.status(500).json({ error: "Errore duplicazione nota" });
  }
});

//Parte Pomodoro
router.get("/pomodoro", authenticateToken, async (req, res) => {
  const userId = getUserIdOr401(req, res);
  if (!userId) return;

  try {
    
    const clientDate = req.query.currentDate as string | undefined;
    const today = clientDate ? dayjs(clientDate).startOf("day") : dayjs().startOf("day");

    const pomodoros = await Pomodoro.find({ userId });

    for (const p of pomodoros) {
      const date = dayjs(p.date);
      if (date.isBefore(today) && (p.cyclesPlanned - p.cyclesCompleted) > 0) {
        const notDone = p.cyclesPlanned - p.cyclesCompleted;
        const nextDay = today.toDate();

        let nextPomodoro = await Pomodoro.findOne({ userId, date: nextDay }).exec();
        if (nextPomodoro) {
          nextPomodoro.cyclesPlanned += notDone;
          await nextPomodoro.save();
        } else {
          nextPomodoro = new Pomodoro({
            userId,
            date: nextDay,
            cyclesPlanned: notDone,
            studyMinutes: p.studyMinutes,
            breakMinutes: p.breakMinutes,
          });
          await nextPomodoro.save();
        }

        await p.deleteOne();
      }
    }

    const updated = await Pomodoro.find({ userId }).sort({ date: 1 });
    res.json(updated);
  } catch (err) {
    console.error("Errore caricamento pomodoro:", err);
    res.status(500).json({ error: "Errore server" });
  }
});

router.post("/pomodoro", authenticateToken, async (req, res) => {
 const userId = getUserIdOr401(req, res);
  if (!userId) return;

  const { date, cyclesPlanned, studyMinutes, breakMinutes } = req.body;


  if (!date) {
    res.status(400).json({ error: "Inserire una data obbligatoriamente" });
    return;
  }
  if (!cyclesPlanned || !studyMinutes || !breakMinutes) {
    res.status(400).json({ error: "Tutti i campi sono obbligatori" });
    return;
  }

  try {
    const newPomodoro = new Pomodoro({
      userId,
      date,
      cyclesPlanned,
      studyMinutes,
      breakMinutes,
    });
    await newPomodoro.save();
    res.status(201).json(newPomodoro);
  } catch (err) {
    console.error("Errore creazione pomodoro:", err);
    res.status(500).json({ error: "Errore server" });
  }
});

router.put("/pomodoro/:id/complete", authenticateToken, async (req, res) => {
  const userId = getUserIdOr401(req, res);
  if (!userId) return;

  const updated = await Pomodoro.findOneAndUpdate(
    { _id: req.params.id, userId },
    { $inc: { cyclesCompleted: 1 } },
    { new: true }
  );
  res.json(updated);
});

router.put("/pomodoro/completeDayAll", authenticateToken, async (req, res) => {
  const userId = getUserIdOr401(req, res);
  if (!userId) return;

  try {
    
    const today = req.body.currentDate
      ? dayjs(req.body.currentDate).startOf("day")
      : dayjs().startOf("day");

    const pomodoros = await Pomodoro.find({ userId });
    let moved = 0;

    for (const p of pomodoros) {
      const pDate = dayjs(p.date);
      const notDone = (p.cyclesPlanned ?? 0) - (p.cyclesCompleted ?? 0);

      if (pDate.isBefore(today) && notDone > 0) {
        
        const newP = new Pomodoro({
          userId,
          date: today.toDate(),
          cyclesPlanned: notDone,
          studyMinutes: p.studyMinutes,
          breakMinutes: p.breakMinutes,
        });
        await newP.save();
        await p.deleteOne();
        moved++;
      } else if (pDate.isBefore(today) && notDone <= 0) {
        await p.deleteOne();
        moved++;
      }
    }

    res.json({ success: true, moved });
  } catch (err) {
    console.error("Errore spostamento pomodoro:", err);
    res.status(500).json({ error: "Errore server" });
  }
});

//route per eliminare gli eventi pomodoro
router.delete("/pomodoro/:id", authenticateToken, async (req, res) => {
  const userId = getUserIdOr401(req, res);
  if (!userId) return;

  try {
    const deleted = await Pomodoro.findOneAndDelete({ _id: req.params.id, userId });
    if (!deleted) {
      res.status(404).json({ error: "Pomodoro non trovato" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Errore eliminazione pomodoro:", err);
    res.status(500).json({ error: "Errore server" });
  }
});



export default router;