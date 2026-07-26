import { NextRequest } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { BytesOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import dbConnect from "@/lib/dbConnect";
import Source from "@/models/source.model";
import { ROADMAP_SYSTEM_PROMPT } from "@/lib/rag/prompts";

const formatTime = (seconds: number | string) => {
  const num = typeof seconds === "string" ? parseInt(seconds, 10) : seconds;
  if (isNaN(num)) return seconds;
  const m = Math.floor(num / 60).toString().padStart(2, "0");
  const s = (num % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, notebookId } = body;

    const currentMessage = messages[messages.length - 1].content;

    if (!notebookId) return new Response("Notebook ID is required", { status: 400 });

    await dbConnect();
    // 1. Fetch ALL sources (PDF, YT, Web, etc.)
    const sources = await Source.find({ notebookId, status: "READY" });

    if (sources.length === 0) {
      return new Response(JSON.stringify({ error: "Add some sources to build a roadmap!" }), { status: 400 });
    }

    console.log(`🗺️ Generating Multi-Source Roadmap for query: "${currentMessage}"`);

    const embeddings = new OpenAIEmbeddings({ modelName: "text-embedding-3-small" });
    const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: "chaibook_sources",
    });

    // 2. Fetch Top chunks from EACH source to build a comprehensive map
    const retrievalPromises = sources.map((source) => {
      const retriever = vectorStore.asRetriever({
        k: 5, // Fetch top 5 chunks per source
        filter: { must: [{ key: "metadata.sourceId", match: { value: source._id.toString() } }] },
      });
      return retriever.invoke(currentMessage);
    });

    const resultsArray = await Promise.all(retrievalPromises);
    const finalDocs = resultsArray.flat();

    // 3. Build Context with smart metadata
    const contextText = finalDocs.map((doc, index) => {
      const rawUrl = doc.metadata?.sourceUrl || doc.metadata?.url || doc.metadata?.source || "";
      const rawTitle = doc.metadata?.title || doc.metadata?.name || "Document";
      const inferredType = doc.metadata?.type || "TEXT";
      
      let metaString = `[Source ID: ${index + 1} | Title: ${rawTitle} | Type: ${inferredType}`;
      
      if (inferredType === "YOUTUBE" && doc.metadata?.timestamp !== undefined) {
        metaString += ` | Timestamp: ${formatTime(doc.metadata.timestamp)}`;
      } else if (inferredType === "PDF" && (doc.metadata?.loc?.pageNumber || doc.metadata?.pageNumber)) {
        metaString += ` | Page: ${doc.metadata?.loc?.pageNumber || doc.metadata?.pageNumber}`;
      }
      metaString += `]`;
      return `${metaString}\n${doc.pageContent}`;
    }).join("\n\n---\n\n");

    // 4. Generate Roadmap via LLM
    const model = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.3, // Slight creativity for curriculum design
      streaming: true,
    });

    const prompt = PromptTemplate.fromTemplate(ROADMAP_SYSTEM_PROMPT);
    const chain = RunnableSequence.from([prompt, model, new BytesOutputParser()]);
    const stream = await chain.stream({ 
      context: contextText, 
      topic: currentMessage 
    });

    // 5. Package Citations
    const serializedDocs = Buffer.from(
      JSON.stringify(
        finalDocs.map((d) => ({
          sourceId: d.metadata?.sourceId || d.metadata?.id,
          title: d.metadata?.title || "Document",
          type: d.metadata?.type || "TEXT",
          url: d.metadata?.sourceUrl || d.metadata?.url || "",
          pageNumber: d.metadata?.loc?.pageNumber || d.metadata?.pageNumber,
          timestamp: d.metadata?.timestamp,
          snippet: d.pageContent.substring(0, 150) + "...",
        }))
      )
    ).toString("base64");

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "x-sources": serializedDocs,
      },
    });
  } catch (error: any) {
    console.error("🔥 Roadmap API Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}