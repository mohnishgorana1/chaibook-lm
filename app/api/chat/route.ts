import { NextRequest } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { BytesOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";

import { MASTER_SYSTEM_PROMPT } from "@/lib/rag/prompts";
import { routeQuery, optimizeQuery, generateHyDE } from "@/lib/rag/query-utils";
import { retrieveDocuments, evaluateDocumentsWithCRAG } from "@/lib/rag/retriever";

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

    if (!notebookId) {
      return new Response("Notebook ID is required", { status: 400 });
    }

    console.log(`\n💬 NEW CHAT INITIATED: "${currentMessage}"`);

    const needsRAG = await routeQuery(currentMessage);
    let contextText = "No external context needed.";
    let finalDocs: any[] = [];

    if (needsRAG) {
      console.log("🛠️ Query needs RAG. Firing Advanced Engine...");
      const [optimizedQuery, hydeDoc] = await Promise.all([
        optimizeQuery(currentMessage),
        generateHyDE(currentMessage),
      ]);

      const combinedSearchQuery = `${optimizedQuery}\n\n${hydeDoc}`;
      const rawDocs = await retrieveDocuments(combinedSearchQuery, notebookId);
      finalDocs = await evaluateDocumentsWithCRAG(currentMessage, rawDocs);

      if (finalDocs.length > 0) {
        contextText = finalDocs.map((doc, index) => {
            const title = doc.metadata?.title || "Unknown Source";
            const type = doc.metadata?.type || "TEXT";
            let metaString = `[Source ID: ${index + 1} | Title: ${title} | Type: ${type}`;

            if (type === "YOUTUBE" && doc.metadata?.timestamp !== undefined) {
              metaString += ` | Timestamp: ${formatTime(doc.metadata.timestamp)}`;
            } else if (type === "PDF" && (doc.metadata?.loc?.pageNumber || doc.metadata?.pageNumber)) {
              const page = doc.metadata?.loc?.pageNumber || doc.metadata?.pageNumber;
              metaString += ` | Page: ${page}`;
            }
            metaString += `]`;

            return `${metaString}\n${doc.pageContent}`;
          }).join("\n\n---\n\n");
      } else {
        contextText = "No highly relevant context found in the provided sources.";
      }
    }

    const model = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.2,
      streaming: true,
    });

    const prompt = PromptTemplate.fromTemplate(MASTER_SYSTEM_PROMPT);
    const chain = RunnableSequence.from([prompt, model, new BytesOutputParser()]);
    const stream = await chain.stream({ context: contextText, question: currentMessage });

    const serializedDocs = Buffer.from(
      JSON.stringify(
        finalDocs.map((d) => ({
          sourceId: d.metadata?.sourceId,
          title: d.metadata?.title || "Unknown Document",
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
    console.error("🔥 Chat API Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to process chat" }), { status: 500 });
  }
}