import mongoose, { Document, models, Schema } from "mongoose";

// Naya interface podcast object ke liye
export interface IPodcast {
  title: string;
  audioUrl: string;
  script: string;
  createdAt: Date;
}

export interface INotebook extends Document {
  userId: string;
  title: string;
  accentColor: string;
  accentBg: string;
  borderColor: string;
  podcasts: IPodcast[]; // 🔥 Array of podcasts
  createdAt: Date;
  updatedAt: Date;
}

const notebookSchema = new Schema<INotebook>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    accentColor: { type: String, default: "text-orange-500" },
    accentBg: { type: String, default: "bg-orange-500/10" },
    borderColor: { type: String, default: "group-hover:border-orange-500/50" },
    
    // 🔥 Pura list save karne ke liye schema update
    podcasts: [
      {
        title: { type: String, required: true },
        audioUrl: { type: String, required: true },
        script: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

const Notebook = models?.Notebook || mongoose.model<INotebook>("Notebook", notebookSchema);
export default Notebook;