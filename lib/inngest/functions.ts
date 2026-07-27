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
          const res = await fetch(src.sourceUrl);
          const html = await res.text();
          // Extract title tag using Regex
          const match = html.match(/<title>([^<]*)<\/title>/i);
          if (match && match[1]) {
            title = match[1].trim();
            // Clean up YouTube default suffix
            if (title.endsWith("- YouTube")) {
              title = title.replace("- YouTube", "").trim();
            }
            // Update the Database with the real name!
            await Source.findByIdAndUpdate(sourceId, { title });
            console.log(`✅ Fixed Title from URL to: ${title}`);
          }
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
          const getYouTubeId = (url: string) => {
            const regExp =
              /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
            const match = url.match(regExp);
            return match && match[2].length === 11 ? match[2] : null;
          };

          const videoId = getYouTubeId(fileUrl);
          if (!videoId) throw new Error("Invalid YouTube URL format");

          try {
            // 🔥 STEP 1: Fetch raw YouTube page HTML masquerading as a normal browser
            const response = await fetch(
              `https://www.youtube.com/watch?v=${videoId}`,
              {
                headers: {
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                  "Accept-Language": "en-US,en;q=0.9",
                },
              },
            );
            const html = await response.text();

            // 🔥 STEP 2: Extract the hidden subtitle URL using Regex
            const captionRegex =
              /"captionTracks":\s*\[\s*\{\s*"baseUrl":\s*"([^"]+)"/;
            const match = captionRegex.exec(html);

            if (!match || !match[1]) {
              throw new Error(
                "No captions found for this video. They might be disabled.",
              );
            }

            // Clean up the URL (YouTube escapes characters in JSON)
            const captionUrl = match[1]
              .replace(/\\u0026/g, "&")
              .replace(/\\\//g, "/");

            // 🔥 STEP 3: Fetch the actual XML transcript
            const transcriptResponse = await fetch(captionUrl);
            const transcriptXml = await transcriptResponse.text();

            // 🔥 STEP 4: Parse XML to extract text and timestamps
            const textRegex = /<text start="([^"]+)"[^>]*>([^<]+)<\/text>/g;
            let xmlMatch;
            docs = [];

            while ((xmlMatch = textRegex.exec(transcriptXml)) !== null) {
              const startStr = xmlMatch[1];
              let text = xmlMatch[2];

              // Clean HTML entities
              text = text
                .replace(/&amp;/g, "&")
                .replace(/&#39;/g, "'")
                .replace(/&quot;/g, '"');

              docs.push({
                pageContent: text,
                metadata: {
                  timestamp: Math.floor(parseFloat(startStr)),
                },
              });
            }

            if (docs.length === 0) {
              throw new Error("Failed to parse transcript XML.");
            }
          } catch (err: any) {
            console.error("Custom YouTube Extractor Failed:", err);
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
