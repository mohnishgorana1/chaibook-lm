"use server";

import dbConnect from "@/lib/dbConnect";
import Notebook from "@/models/notebook.model";
import { getMongoUserId } from "@/lib/helpers/auth";
import { revalidatePath } from "next/cache";
import Source from "@/models/source.model";
import { QdrantClient } from "@qdrant/js-client-rest";
import { createClient } from "@supabase/supabase-js";

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



export async function renameNotebookAction(notebookId: string, newTitle: string) {
  console.log("Renaming notebook: ", notebookId, " to ", newTitle);
  try {
    const mongoUserId = await getMongoUserId();
    await dbConnect();

    // Find and Update (Security: matching userId too)
    const updatedNotebook = await Notebook.findOneAndUpdate(
      { _id: notebookId, userId: mongoUserId },
      { title: newTitle },
      { new: true } // Return updated document
    );

    if (!updatedNotebook) {
      throw new Error("Notebook not found or you don't have permission");
    }

    // Cache clear
    revalidatePath("/notebook");

    return { success: true, notebook: JSON.parse(JSON.stringify(updatedNotebook)) };
  } catch (error) {
    console.error("Error renaming notebook:", error);
    throw new Error("Failed to rename notebook");
  }
}


export async function deleteNotebookAction(notebookId: string) {
  console.log(`Starting cascade delete for notebook: ${notebookId}`);
  try {
    const mongoUserId = await getMongoUserId();
    await dbConnect();

    // 0. Check Notebook exists & belongs to the user
    const notebook = await Notebook.findOne({ _id: notebookId, userId: mongoUserId });
    if (!notebook) {
      throw new Error("Notebook not found or you don't have permission to delete it.");
    }

    // Fetch all sources related to this notebook
    const sources = await Source.find({ notebookId });

    // ==========================================
    // STEP 1: SUPABASE STORAGE DELETE (BULK)
    // ==========================================
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL;
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (sbUrl && sbKey && sources.length > 0) {
      const supabase = createClient(sbUrl, sbKey);
      const filesToDelete: string[] = [];

      for (const source of sources) {
        if (source.sourceUrl && source.sourceUrl.includes("supabase.co")) {
          try {
            const urlObj = new URL(source.sourceUrl);
            const pathSegments = urlObj.pathname.split("/");
            const bucketIndex = pathSegments.indexOf("chaibook-sources");

            if (bucketIndex !== -1 && pathSegments.length > bucketIndex + 1) {
              const fileName = pathSegments.slice(bucketIndex + 1).join("/");
              if (fileName) filesToDelete.push(fileName);
            }
          } catch (err) {
            console.warn(`Failed to parse URL for source ${source._id}:`, err);
          }
        }
      }
      
      if (filesToDelete.length > 0) {
        // Bulk remove array of filenames
        const { error } = await supabase.storage
          .from("chaibook-sources")
          .remove(filesToDelete);

        if (error) {
          console.error("❌ Supabase bulk deletion error:", error.message);
          // Note: Hum yahan error throw nahi kar rahe taaki baaki ka data clean ho jaye
        } else {
          console.log(`🗑️ Deleted ${filesToDelete.length} files from Supabase storage.`);
        }
      }
    }

    // ==========================================
    // STEP 2: QDRANT VECTOR DB DELETE
    // ==========================================
    const qdrantUrl = process.env.QDRANT_URL;
    const qdrantKey = process.env.Qdrant_API_KEY || process.env.QDRANT_API_KEY;

    if (qdrantUrl && qdrantKey) {
      const qdrantClient = new QdrantClient({
        url: qdrantUrl,
        apiKey: qdrantKey,
      });

      try {
        // Direct Filter Delete (Yeh zyada fast aur safe hai bina scroll kiye)
        await qdrantClient.delete("chaibook_sources", {
          wait: true,
          filter: {
            must: [
              {
                key: "metadata.notebookId",
                match: { value: notebookId },
              },
            ],
          },
        });
        console.log(`🗑️ Deleted all vector embeddings for notebook ${notebookId} from Qdrant.`);
      } catch (qdrantError: any) {
        console.error("❌ Qdrant deletion error:", qdrantError.message);
        throw new Error(`Qdrant deletion failed: ${qdrantError.message}`);
      }
    }

    // ==========================================
    // STEP 3: MONGODB RECORDS DELETE
    // ==========================================
    // A. Delete all sources inside this notebook
    const deletedSources = await Source.deleteMany({ notebookId });
    console.log(`🗑️ Deleted ${deletedSources.deletedCount} source records from MongoDB.`);

    // B. Delete the Notebook itself
    await Notebook.findByIdAndDelete(notebookId);
    console.log(`🗑️ Deleted Notebook record: ${notebookId}`);

    // Revalidate list
    revalidatePath("/notebook");

    return { success: true };
  } catch (error: any) {
    console.error("❌ Cascade Delete Aborted:", error.message);
    throw new Error(error.message || "Failed to completely delete the notebook");
  }
}