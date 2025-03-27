import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Definizione della porta con valore predefinito
const PORT: string = process.env.PORT || "3000";

// Controllo della variabile MONGO_URI prima di usarla
if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI non è definito. Verifica il file .env");
}
const MONGO_URI: string = process.env.MONGO_URI;

// Connessione a MongoDB (senza opzioni obsolete)
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("Errore connessione MongoDB:", err));

app.use("/api/auth", authRoutes);

// Avvio del server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));