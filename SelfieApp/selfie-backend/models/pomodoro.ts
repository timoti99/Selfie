import mongoose, { Schema, Document } from "mongoose";

export interface PomodoroCycle extends Document {
  userId: string;
  date: Date;
  cyclesPlanned: number;
  cyclesCompleted: number;
  studyMinutes: number;
  breakMinutes: number;
}

const PomodoroSchema = new Schema<PomodoroCycle>(
  {
    userId: { type: String, required: true },
    date: { type: Date, required: true },
    cyclesPlanned: { type: Number, required: true },
    cyclesCompleted: { type: Number, default: 0 },
    studyMinutes: { type: Number, required: true },
    breakMinutes: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<PomodoroCycle>("Pomodoro", PomodoroSchema);