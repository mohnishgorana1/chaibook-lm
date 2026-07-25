"use server";

import dbConnect from "@/lib/dbConnect";
import Notebook from "@/models/notebook.model";
import { getMongoUserId } from "@/lib/helpers/auth";
import { revalidatePath } from "next/cache";

export async function createNotebookAction(title: string) {
  console.log("Creating notebok: ", title);
  try {
    const mongoUserId = await getMongoUserId();

    await dbConnect();

    // Random colors for the notebook card UI
    const colors = [
      {
        color: "text-orange-500",
        bg: "bg-orange-500/10",
        border: "group-hover:border-orange-500/50",
      },
      {
        color: "text-blue-500",
        bg: "bg-blue-500/10",
        border: "group-hover:border-blue-500/50",
      },
      {
        color: "text-emerald-500",
        bg: "bg-emerald-500/10",
        border: "group-hover:border-emerald-500/50",
      },
      {
        color: "text-rose-500",
        bg: "bg-rose-500/10",
        border: "group-hover:border-rose-500/50",
      },
    ];
    const randomTheme = colors[Math.floor(Math.random() * colors.length)];

    const newNotebook = await Notebook.create({
      userId: mongoUserId, // MongoDB Object Id
      title,
      sourcesCount: 0,
      accentColor: randomTheme.color,
      accentBg: randomTheme.bg,
      borderColor: randomTheme.border,
    });

    // Cache clear taaki list turant refresh ho
    revalidatePath("/notebook");

    console.log("Success: ", JSON.parse(JSON.stringify(newNotebook)));

    return { success: true, notebook: JSON.parse(JSON.stringify(newNotebook)) };
  } catch (error) {
    console.error("Error creating notebook:", error);
    throw new Error("Failed to create notebook");
  }
}
