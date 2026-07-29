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

import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { optimizeQuery, generateHyDE } from "@/lib/rag/query-utils";
import Notebook from "@/models/notebook.model";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const processSourceDocument = inngest.createFunction(
  {
    id: "process-source-document",
    triggers: [{ event: "source/process.started" }],
  },
  async ({ event, step }) => {
    console.log("Inngest started");
    const { sourceId, fileUrl, type, notebookId } = event.data;

    // Phase 1: Update Status
    console.log("Starting Phase 1: Update Status ");
    await step.run("update-status-processing", async () => {
      await dbConnect();
      await Source.findByIdAndUpdate(sourceId, { status: "PROCESSING" });
    });

    console.log("Starting Phase 1.a: Fetce source title ");
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
    console.log(
      "Starting Phase 2: Dynamic Extraction WITH METADATA PRESERVATION ",
    );
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
    console.log("Starting Phase 3: Text Chunking ");
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
    console.log("Starting Phase 4: OpenAI Embeddings & Qdrant Upload ");
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
    console.log("Starting Phase 5: Status Ready ");
    await step.run("update-status-ready", async () => {
      await dbConnect();
      await Source.findByIdAndUpdate(sourceId, { status: "READY" });
    });

    return { success: true, sourceId };
  },
);

// 🔥 NAYA INNGEST FUNCTION PODCAST KE LIYE (Corrected Signatures)
export const generatePodcastBackgroundFunc = inngest.createFunction(
  {
    id: "generate-podcast-background",
    triggers: [{ event: "podcast/generate.started" }],
    retries: 1,
  },
  async ({ event, step }) => {
    // Yeh 3rd wala function ab 2nd argument ke andar handler ban gaya
    console.log("🎙️ Inngest started: Podcast Generation");
    const { notebookId, topic } = event.data;

    // ==========================================
    // Phase 1: Retrieve RAG Context
    // ==========================================
    const contextText = await step.run("retrieve-rag-context", async () => {
      console.log(`Starting Phase 1: Fetching Context for "${topic}"`);
      await dbConnect();

      const [optimizedQuery, hydeDoc] = await Promise.all([
        optimizeQuery(topic),
        generateHyDE(topic),
      ]);
      const combinedSearchQuery = `${optimizedQuery}\n\n${hydeDoc}`;

      const embeddings = new OpenAIEmbeddings({
        modelName: "text-embedding-3-small",
      });
      const queryVector = await embeddings.embedQuery(combinedSearchQuery);

      const qdrantClient = new QdrantClient({
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY,
      });

      // TODO: Change 'limit' to 15 if you need more data for the Long Version
      const searchResult = await qdrantClient.search("chaibook_sources", {
        vector: queryVector,
        filter: {
          must: [{ key: "metadata.notebookId", match: { value: notebookId } }],
        },
        limit: 10,
      });

      // TODO: Change 'slice' from 1200 to 6000 if you need more context for the Long Version
      const text =
        searchResult.length > 0
          ? searchResult
              .map(
                (p: any) => p.payload?.pageContent || p.payload?.content || "",
              )
              .join("\n\n")
              .slice(0, 1200)
          : "Summarize general concepts briefly.";

      return text;
    });

    // ==========================================
    // Phase 2: Generate Script via LLM
    // ==========================================
    const scriptArray = await step.run("generate-script", async () => {
      console.log("Starting Phase 2: Generating Script");

      // 🟢 TODO 1: SHORT DURATION VERSION (~1 MINUTE | LOW COST)
      // Uncomment this block (and comment the Long Version below) to save API billing.
      /*
      const chatCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You write 2-person micro podcast scripts between Alice and Bob.
              STRICT RULES:
              1. Total script length MUST be UNDER 150 words (3-4 quick turns each).
              2. Output ONLY a valid JSON array. No markdown, no commentary.
              Format:
              [
                {"speaker": "Alice", "text": "Short intro line..."},
                {"speaker": "Bob", "text": "Short response..."}
              ]`,
          },
          {
            role: "user",
            content: `Context:\n${contextText}\n\nTopic: ${topic}`,
          },
        ],
      });
      */

      // 🔴 TODO 2: LONG DURATION VERSION (~3-4 MINUTES | DEMO PURPOSE)
      const chatCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You write an in-depth 2-person educational podcast script between Alice and Bob.
               STRICT RULES:
               1. Total script length MUST be between 500 to 600 words (approx 3-4 minutes of audio).
               2. If the provided context is short or lacks details, use your expert internal knowledge to deeply expand the topic, provide real-world examples, and make the conversation engaging.
               3. Output ONLY a valid JSON array. No markdown, no commentary.
               Format:
               [
                 {"speaker": "Alice", "text": "Detailed intro line..."},
                 {"speaker": "Bob", "text": "Detailed response..."}
               ]`,
          },
          {
            role: "user",
            content: `Context:\n${contextText}\n\nTopic: ${topic}`,
          },
        ],
      });

      const rawResponse = chatCompletion.choices[0].message.content || "[]";
      const cleanJson = rawResponse
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      return JSON.parse(cleanJson);
    });

   // ==========================================
    // Phase 3: TTS Conversion & Supabase Upload (Optimized with Batching)
    // ==========================================
    await step.run("synthesize-and-save", async () => {
      console.log("Starting Phase 3: TTS Synthesis & DB Update");
      await dbConnect();

      const audioBuffers = [];
      let readableScript = "";

      // 🔥 Optimization: Long script ko handle karne ke liye chunk-by-chunk process karenge
      for (let i = 0; i < scriptArray.length; i++) {
        const line = scriptArray[i];
        readableScript += `**${line.speaker}:** ${line.text}\n\n`;
        const voiceId = line.speaker === "Alice" ? "nova" : "onyx";

        // Har ek line ke liye timeout se bachne ke liye safe try-catch
        try {
          const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: voiceId,
            input: line.text,
          });

          const arrayBuffer = await mp3.arrayBuffer();
          audioBuffers.push(Buffer.from(arrayBuffer));
        } catch (ttsError) {
          console.error(`Failed to synthesize line ${i}:`, ttsError);
          throw ttsError;
        }
      }

      const finalAudioBuffer = Buffer.concat(audioBuffers);
      const blob = new Blob([finalAudioBuffer], { type: "audio/mpeg" });
      const fileName = `podcast-${notebookId}-${Date.now()}.mp3`;

      console.log("Uploading generated audio to Supabase...");

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
          throw new Error("Supabase environment variables are missing.");
      }

      const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/chaibook-podcasts/${fileName}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseKey}`,
          "apikey": supabaseKey,
          "Content-Type": "audio/mpeg",
        },
        body: blob as any,
        // @ts-ignore
        duplex: "half", 
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`Supabase REST upload failed: ${errText}`);
      }

      const audioUrl = `${supabaseUrl}/storage/v1/object/public/chaibook-podcasts/${fileName}`;

      const newPodcast = {
        title: topic,
        audioUrl: audioUrl,
        script: readableScript,
        createdAt: new Date(),
      };

      await Notebook.findByIdAndUpdate(notebookId, {
        $push: { podcasts: newPodcast },
      });

      console.log("✅ Podcast processing complete and saved to DB!");
    });

    return { success: true, notebookId };
  },
);
