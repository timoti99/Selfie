import mongoose, { Schema, Document } from "mongoose";

export interface ITask extends Document {
  userId: string;
  title: string;
  startDate: Date; 
  dueDate: Date;
  completed: boolean;
}

const TaskSchema = new Schema<ITask>(
  {
    userId: { type: String, required: true },
    title: { type: String, required: true },
    startDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<ITask>("Task", TaskSchema);