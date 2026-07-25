import mongoose, { Schema, Document } from "mongoose";

export interface ISource extends Document {
  notebookId: mongoose.Types.ObjectId;
  title: string;
  type: "PDF" | "URL" | "YOUTUBE" | "TEXT" | "TRANSCRIPT";
  sourceUrl: string;
  status: "PENDING" | "INDEXING" | "PROCESSING" | "READY" | "ERROR";
  createdAt: Date;
  updatedAt: Date;
}

const SourceSchema = new Schema<ISource>(
  {
    notebookId: {
      type: Schema.Types.ObjectId,
      ref: "Notebook",
      required: true,
    },
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ["PDF", "URL", "YOUTUBE", "TEXT", "TRANSCRIPT"],
      required: true,
    },
    sourceUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ["PENDING", "INDEXING", "PROCESSING", "READY", "ERROR"],
      default: "PENDING",
    },
  },
  { timestamps: true },
);

const Source =
  mongoose.models.Source || mongoose.model<ISource>("Source", SourceSchema);
export default Source;
