"use server";

import dbConnect from "@/lib/dbConnect";
import { inngest } from "@/lib/inngest/client";
import Source from "@/models/source.model";
import { QdrantClient } from "@qdrant/js-client-rest";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

export async function createSourceAction({
  notebookId,
  title,
  type,
  sourceUrl,
}: {
  notebookId: string;
  title: string;
  type: "PDF" | "URL" | "YOUTUBE" | "TEXT" | "TRANSCRIPT";
  sourceUrl: string;
}) {
  try {
    await dbConnect();

    const newSource = await Source.create({
      notebookId,
      title,
      type,
      sourceUrl,
      status: "INDEXING",
    });

    await inngest.send({
      name: "source/process.started",
      data: {
        sourceId: newSource._id.toString(),
        notebookId,
        fileUrl: sourceUrl,
        type,
      },
    });

    revalidatePath(`/notebook/${notebookId}`);

    return { success: true, source: JSON.parse(JSON.stringify(newSource)) };
  } catch (error) {
    console.error("❌ Failed to create source:", error);
    throw new Error("Failed to create source");
  }
}

export async function deleteSourceAction(sourceId: string, notebookId: string) {
  try {
    await dbConnect();

    const source = await Source.findById(sourceId);
    if (!source) throw new Error("Source not found in MongoDB");

    // ==========================================
    // STEP 1: SUPABASE STORAGE DELETE
    // ==========================================
    if (source.type === "PDF" && source.sourceUrl) {
      try {
        const urlObj = new URL(source.sourceUrl);
        const pathSegments = urlObj.pathname.split("/");
        const bucketIndex = pathSegments.indexOf("chaibook-sources");

        if (bucketIndex !== -1 && pathSegments.length > bucketIndex + 1) {
          const fileName = pathSegments.slice(bucketIndex + 1).join("/");
          const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL;
          const sbKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

          if (fileName && sbUrl && sbKey) {
            const supabase = createClient(sbUrl, sbKey);
            const { error } = await supabase.storage
              .from("chaibook-sources")
              .remove([fileName]);

            if (error) {
              throw new Error(`Supabase deletion failed: ${error.message}`);
            }
            console.log(`🗑️ Deleted file from Supabase storage: ${fileName}`);
          }
        }
      } catch (err: any) {
        console.error("❌ Supabase deletion error:", err.message);
        throw new Error(err.message || "Failed to delete file from Supabase");
      }
    }

    // ==========================================
    // STEP 2: QDRANT VECTOR DB DELETE
    // ==========================================
    if (process.env.QDRANT_URL && process.env.QDRANT_API_KEY) {
      const qdrantClient = new QdrantClient({
        url: process.env.QDRANT_URL,
        apiKey: process.env.Qdrant_API_KEY || process.env.QDRANT_API_KEY,
      });

      try {
        const searchResult = await qdrantClient.scroll("chaibook_sources", {
          filter: {
            must: [
              {
                key: "metadata.sourceId",
                match: { value: sourceId },
              },
            ],
          },
          limit: 200,
        });

        const pointIds = searchResult.points.map((p) => p.id);

        if (pointIds.length > 0) {
          await qdrantClient.delete("chaibook_sources", {
            wait: true,
            points: pointIds,
          });
          console.log(`🗑️ Deleted ${pointIds.length} vector embeddings from Qdrant`);
        }
      } catch (qdrantError: any) {
        console.error("❌ Qdrant deletion error:", qdrantError.message);
        throw new Error(`Qdrant deletion failed: ${qdrantError.message}`);
      }
    }

    // ==========================================
    // STEP 3: MONGODB RECORD DELETE
    // ==========================================
    await Source.findByIdAndDelete(sourceId);
    console.log(`🗑️ Deleted source record from MongoDB: ${sourceId}`);

    revalidatePath(`/notebook/${notebookId}`);

    return { success: true };
  } catch (error: any) {
    console.error("❌ Strict Delete Aborted:", error.message);
    throw new Error(error.message || "Failed to delete source completely");
  }
}