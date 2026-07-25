// /model/notebook.ts
import mongoose, { Document, models, Schema } from "mongoose";

export interface INotebook extends Document {
  userId: string; 
  title: string;
  accentColor: string;
  accentBg: string;
  borderColor: string;
  createdAt: Date;
  updatedAt: Date;
}

const notebookSchema = new Schema<INotebook>(
  {
    userId: {
      type: String,
      required: true,
      index: true, 
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    accentColor: { type: String, default: "text-orange-500" },
    accentBg: { type: String, default: "bg-orange-500/10" },
    borderColor: { type: String, default: "group-hover:border-orange-500/50" },
  },
  {
    timestamps: true,
  }
);

const Notebook = models?.Notebook || mongoose.model<INotebook>("Notebook", notebookSchema);

export default Notebook;