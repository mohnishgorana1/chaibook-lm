import { inngest } from "./client";
import dbConnect from "@/lib/dbConnect";
import Source from "@/models/source.model";
import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";

export const processSourceDocument = inngest.createFunction(
  {
    id: "process-source-document",
    triggers: [{ event: "source/process.started" }],
  },

  async ({ event, step }) => {
    console.log("Inngest started");
    const { sourceId, fileUrl, type, notebookId } = event.data;

    console.log(
      "event data: ",
      "\nsourceID: ",
      sourceId,
      "\nfileurl: ",
      fileUrl,
      "\ntype: ",
      type,
      "\nnotebookId: ",
      notebookId,
    );

    // Phase 1: Status ko "PROCESSING" kardo taaki UI me ghoomega
    await step.run("update-status-processing", async () => {
      await dbConnect();
      await Source.findByIdAndUpdate(sourceId, { status: "PROCESSING" });
    });

    console.log("check source: PROCESSING⏳");

    // Phase 2: LangChain Extraction (PDF Se Text Nikalna)
    const rawText = await step.run("extract-text", async () => {
      console.log(`🚀 Extracting text from ${type} URL: ${fileUrl}`);

      let extractedText = "";

      if (type === "PDF") {
        try {
          // 1. Supabase se PDF fetch karo
          const response = await fetch(fileUrl);
          const blob = await response.blob();

          // 2. LangChain Loader me daalo
          const loader = new WebPDFLoader(blob);
          const docs = await loader.load();

          // 3. Har page ka text jod lo
          extractedText = docs.map((doc) => doc.pageContent).join("\n");
          console.log(`✅ Extracted ${docs.length} pages of text.`);
        } catch (error) {
          console.error("PDF Extraction Failed:", error);
          throw new Error("Failed to extract PDF text"); // Inngest automatically retry karega
        }
      } else {
        // Baad me yahan YOUTUBE aur TEXT/URL ka logic aayega
        extractedText = "Placeholder for non-PDF files";
      }

      return extractedText;
    });

    // Phase 3: Text Chunking (Bade text ko chhote tukdo me todna)
    const chunks = await step.run("chunk-text", async () => {
      console.log(`🧠 Raw text length: ${rawText.length} characters`);

      // 1. Text Splitter setup karo (1000 chars ka ek chunk, 200 chars ka overlap)
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      // 2. Raw text ko chunks me tod do aur Metadata (sourceId) add kar do
      const documentChunks = await splitter.createDocuments(
        [rawText],
        [{ sourceId, notebookId }], // Yeh metadata har chunk ke sath attach ho jayega
      );

      console.log(
        `🔪 Successfully chopped text into ${documentChunks.length} chunks!`,
      );

      // Data ko serialize karke return kar rahe hain taaki next step me use ho sake
      return JSON.parse(JSON.stringify(documentChunks));
    });

    // Phase 4: OpenAI Embeddings & Qdrant Vector DB (Upgraded with proper metadata index support)
    await step.run("generate-embeddings-and-save", async () => {
      console.log(
        `⏳ Ready to convert ${chunks.length} chunks into Vector Embeddings...`,
      );

      const embeddings = new OpenAIEmbeddings({
        modelName: "text-embedding-3-small",
      });

      console.log("💾 Uploading Embeddings to Qdrant Cloud...");

      try {
        // LangChain ka QdrantVectorStore automatically chunks ke sath metadata attach karta hai.
        // Hum ensure kar rahe hain ki har chunk ke metadata me 'sourceId' direct top-level par ho.
        const formattedChunks = chunks.map((chunk) => ({
          pageContent: chunk.pageContent,
          metadata: {
            ...chunk.metadata,
            sourceId: sourceId.toString(), // Ensuring sourceId is explicitly stored
            notebookId: notebookId.toString(),
          },
        }));

        await QdrantVectorStore.fromDocuments(formattedChunks, embeddings, {
          url: process.env.QDRANT_URL,
          apiKey: process.env.QDRANT_API_KEY,
          collectionName: "chaibook_sources",
        });
        console.log(
          "✅ BINGO! Embeddings successfully saved to Qdrant with proper metadata!",
        );
      } catch (error) {
        console.error("❌ Failed to save to Qdrant:", error);
        throw new Error("Qdrant Save Failed");
      }
    });

    // Phase 5: Sab hone ke baad status "READY" kardo taaki UI green ho jaye
    await step.run("update-status-ready", async () => {
      await dbConnect();
      await Source.findByIdAndUpdate(sourceId, { status: "READY" });
      console.log("🟢 UI Status updated to READY!");
    });

    // Worker ko successfully close karo
    return { success: true, sourceId };
  },
);
