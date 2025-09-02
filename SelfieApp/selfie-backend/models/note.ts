import mongoose, { Schema, Document } from "mongoose";

export interface INote extends Document {
  userId: string;
  title: string;
  content: string;
  categories: string[];
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    userId: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    categories: { type: [String], default: [] },
  },
  { timestamps: true } // genera automaticamente createdAt e updatedAt
);

export default mongoose.model<INote>("Note", NoteSchema);