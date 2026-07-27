import { inngest } from "./client";
import dbConnect from "@/lib/dbConnect";
import Source from "@/models/source.model";
import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";

import { YoutubeLoader } from "@langchain/community/document_loaders/web/youtube";
import { YoutubeTranscript } from "youtube-transcript";
import { Innertube } from "youtubei.js";

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
    
    // 🔥 SMART TITLE FETCHER: Agar title URL hai, toh asli Title fetch karo
    const sourceTitle = await step.run("get-source-title", async () => {
      await dbConnect();
      const src = await Source.findById(sourceId);
      let title = src ? src.title : "Unknown Source";

      // Check if title is basically the URL
      if (src && (title === src.sourceUrl || title.startsWith("http"))) {
        try {
          // 🔥 YOUTUBE SPECIFIC TITLE FETCHER (Bypasses Vercel Block)
          if (
            src.sourceUrl.includes("youtube.com") ||
            src.sourceUrl.includes("youtu.be")
          ) {
            const oembedRes = await fetch(
              `https://www.youtube.com/oembed?url=${encodeURIComponent(src.sourceUrl)}&format=json`,
            );
            if (oembedRes.ok) {
              const oembedData = await oembedRes.json();
              title = oembedData.title || title;
            }
          }
          // 🔥 NORMAL WEBSITE TITLE FETCHER
          else {
            const res = await fetch(src.sourceUrl);
            const html = await res.text();
            const match = html.match(/<title>([^<]*)<\/title>/i);
            if (match && match[1]) {
              title = match[1].trim();
            }
          }

          // Clean up YouTube default suffix
          if (title.endsWith("- YouTube")) {
            title = title.replace("- YouTube", "").trim();
          }

          // Update the Database with the real name!
          await Source.findByIdAndUpdate(sourceId, { title });
          console.log(`✅ Fixed Title from URL to: ${title}`);
        } catch (e) {
          console.error("Could not fetch real title, keeping original.");
        }
      }
      return title;
    });

    // Phase 2: Dynamic Extraction WITH METADATA PRESERVATION
    const rawDocs = await step.run("extract-docs", async () => {
      console.log(`🚀 Extracting text from ${type} URL: ${fileUrl}`);
      let docs: any[] = [];

      try {
        if (type === "YOUTUBE") {
          try {
            console.log("Fetching via RapidAPI to bypass Vercel Blocks...");

            // Note: Tumhari screenshot wali API puri URL maang rahi hai, isliye hum fileUrl bhejenge
            const encodedUrl = encodeURIComponent(fileUrl);
            const apiUrl = `https://youtube-transcript3.p.rapidapi.com/api/transcript-with-url?url=${encodedUrl}&flat_text=true&lang=en`;

            const options = {
              method: "GET",
              headers: {
                "x-rapidapi-key": process.env.RAPIDAPI_KEY as string,
                "x-rapidapi-host": "youtube-transcript3.p.rapidapi.com",
              },
            };

            const response = await fetch(apiUrl, options);
            const data = await response.json();

            if (!response.ok) {
              throw new Error(`API Error: ${JSON.stringify(data)}`);
            }

            // Is screenshot wali API me agar "flat_text=true" hota hai to data normally ek transcript string return karta hai.
            // Lekin agar wo array return karta hai toh hum usko map karenge.
            if (Array.isArray(data)) {
              docs = data.map((item: any) => ({
                pageContent: item.text,
                metadata: {
                  timestamp: Math.floor(item.start || item.offset || 0),
                },
              }));
            } else if (data && data.transcript) {
              // In case it returns an object with a flat transcript string
              docs = [
                { pageContent: data.transcript, metadata: { timestamp: 0 } },
              ];
            } else {
              // Fallback
              docs = [
                {
                  pageContent: JSON.stringify(data),
                  metadata: { timestamp: 0 },
                },
              ];
            }

            if (docs.length === 0) {
              throw new Error("RapidAPI returned an empty transcript.");
            }

            console.log(`✅ Extracted chunks successfully via RapidAPI!`);
          } catch (err: any) {
            console.error("RapidAPI Extractor Failed:", err);
            throw new Error(`REAL_YOUTUBE_ERROR: ${err.message}`);
          }
        } else if (type === "URL" || type === "WEBSITE") {
          const loader = new CheerioWebBaseLoader(fileUrl);
          const loadedDocs = await loader.load();
          docs = loadedDocs.map((d) => ({
            pageContent: d.pageContent,
            metadata: {},
          }));
        } else if (type === "PDF") {
          const response = await fetch(fileUrl);
          const blob = await response.blob();
          const loader = new WebPDFLoader(blob);
          const loadedDocs = await loader.load();
          docs = loadedDocs.map((d) => ({
            pageContent: d.pageContent,
            metadata: d.metadata,
          }));
        } else if (type === "TEXT" || type === "TRANSCRIPT") {
          const response = await fetch(fileUrl);
          const text = await response.text();
          docs = [{ pageContent: text, metadata: {} }];
        } else {
          throw new Error("Unsupported format type");
        }

        if (!docs || docs.length === 0)
          throw new Error("Extracted text is empty");
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

      const documentObjects = rawDocs.map(
        (d) =>
          new Document({ pageContent: d.pageContent, metadata: d.metadata }),
      );
      const splitDocs = await splitter.splitDocuments(documentObjects);
      return JSON.parse(JSON.stringify(splitDocs));
    });

    // Phase 4: OpenAI Embeddings & Qdrant Upload
    await step.run("generate-embeddings-and-save", async () => {
      console.log(
        `⏳ Converting ${chunks.length} chunks into Vector Embeddings...`,
      );
      const embeddings = new OpenAIEmbeddings({
        modelName: "text-embedding-3-small",
      });

      const formattedChunks = chunks.map((chunk: any) => ({
        pageContent: chunk.pageContent,
        metadata: {
          ...chunk.metadata,
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
  },
);
