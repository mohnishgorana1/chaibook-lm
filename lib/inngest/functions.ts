import { inngest } from "./client";
import dbConnect from "@/lib/dbConnect";
import Source from "@/models/source.model";
import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";
import { YoutubeLoader } from "@langchain/community/document_loaders/web/youtube";
import { YoutubeTranscript } from "youtube-transcript";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { Document } from "@langchain/core/documents";

export const processSourceDocument = inngest.createFunction(
  {
    id: "process-source-document",
    triggers: [{ event: "source/process.started" }],
  },
  async ({ event, step }) => {
    console.log("Inngest started");
    const { sourceId, fileUrl, type, notebookId } = event.data;

    // Phase 1: Update Status
    await step.run("update-status-processing", async () => {
      await dbConnect();
      await Source.findByIdAndUpdate(sourceId, { status: "PROCESSING" });
    });

    // Fetch original source title for metadata
    const sourceTitle = await step.run("get-source-title", async () => {
      await dbConnect();
      const src = await Source.findById(sourceId);
      return src ? src.title : "Unknown Source";
    });

    // Phase 2: Dynamic Extraction WITH METADATA PRESERVATION
    const rawDocs = await step.run("extract-docs", async () => {
      console.log(`🚀 Extracting text from ${type} URL: ${fileUrl}`);
      let docs: any[] = [];

      try {
        if (type === "YOUTUBE") {
          const transcript = await YoutubeTranscript.fetchTranscript(fileUrl);
          // Har line ke sath timestamp save kar rahe hain (in seconds)
          docs = transcript.map((t) => ({
            pageContent: t.text,
            metadata: { timestamp: Math.floor(t.offset / 1000) },
          }));
        } else if (type === "URL") {
          const loader = new CheerioWebBaseLoader(fileUrl);
          const loadedDocs = await loader.load();
          docs = loadedDocs.map(d => ({ pageContent: d.pageContent, metadata: {} }));
        } else if (type === "PDF") {
          const response = await fetch(fileUrl);
          const blob = await response.blob();
          const loader = new WebPDFLoader(blob);
          const loadedDocs = await loader.load();
          // WebPDFLoader already provides loc.pageNumber in metadata
          docs = loadedDocs.map(d => ({ pageContent: d.pageContent, metadata: d.metadata }));
        } else if (type === "TEXT" || type === "TRANSCRIPT") {
          const response = await fetch(fileUrl);
          const text = await response.text();
          docs = [{ pageContent: text, metadata: {} }];
        } else {
          throw new Error("Unsupported format type");
        }

        if (!docs || docs.length === 0) throw new Error("Extracted text is empty");
        return docs;
      } catch (error) {
        console.error(`🔥 ${type} Extraction Failed:`, error);
        throw new Error(`Failed to extract data from ${type}`);
      }
    });

    // Phase 3: Text Chunking
    const chunks = await step.run("chunk-text", async () => {
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      // Split while preserving metadata
      const documentObjects = rawDocs.map(d => new Document({ pageContent: d.pageContent, metadata: d.metadata }));
      const splitDocs = await splitter.splitDocuments(documentObjects);
      return JSON.parse(JSON.stringify(splitDocs));
    });

    // Phase 4: OpenAI Embeddings & Qdrant Upload
    await step.run("generate-embeddings-and-save", async () => {
      console.log(`⏳ Converting ${chunks.length} chunks into Vector Embeddings...`);

      const embeddings = new OpenAIEmbeddings({ modelName: "text-embedding-3-small" });

      // Injecting Global Metadata (Title, Type, URL) into every single chunk!
      const formattedChunks = chunks.map((chunk: any) => ({
        pageContent: chunk.pageContent,
        metadata: {
          ...chunk.metadata, // Contains pageNumber or timestamp from Phase 2
          sourceId: sourceId.toString(),
          notebookId: notebookId.toString(),
          title: sourceTitle,
          type: type,
          sourceUrl: fileUrl,
        },
      }));

      await QdrantVectorStore.fromDocuments(formattedChunks, embeddings, {
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY,
        collectionName: "chaibook_sources",
      });
      console.log("✅ Embeddings saved to Qdrant WITH ALL METADATA!");
    });

    // Phase 5: Status Ready
    await step.run("update-status-ready", async () => {
      await dbConnect();
      await Source.findByIdAndUpdate(sourceId, { status: "READY" });
    });

    return { success: true, sourceId };
  }
);