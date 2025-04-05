import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";

dotenv.config();

const app = express();
const PORT: string = process.env.PORT || "3000";
const MONGO_URI: string | undefined = process.env.MONGO_URI;

app.use(cors());
app.use(express.json());


// Controllo della variabile MONGO_URI prima di usarla
if (!MONGO_URI) {
  console.error("Errore: MONGO_URI non è definito nel file .env")
  process.exit(1);
}

// Connessione a MongoDB (senza opzioni obsolete)
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => {
    console.error("Errore connessione MongoDB:", err);
    process.exit(1);
  });

  
app.use("/api/auth", authRoutes);

// Avvio del server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));