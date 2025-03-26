import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";


const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://thomasbernardi2:LRjmdpjyJya5joWj@selfieapp.iffb6wt.mongodb.net/?retryWrites=true&w=majority&appName=SelfieApp"

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

app.listen(3001, () => console.log("Server running on port 3001"));