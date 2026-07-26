import { NextRequest } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { BytesOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";

// Apne custom RAG modules import karo
import { MASTER_SYSTEM_PROMPT } from "@/lib/rag/prompts";
import { routeQuery, optimizeQuery, generateHyDE } from "@/lib/rag/query-utils";
import { retrieveDocuments, evaluateDocumentsWithCRAG } from "@/lib/rag/retriever";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, notebookId } = body;
    
    // User ka sabse latest message nikal lo
    const currentMessage = messages[messages.length - 1].content;

    if (!notebookId) {
      return new Response("Notebook ID is required", { status: 400 });
    }

    console.log(`\n💬 NEW CHAT INITIATED: "${currentMessage}"`);

    // ==========================================
    // 1. ROUTER: Do we need Vector Search?
    // ==========================================
    const needsRAG = await routeQuery(currentMessage);
    
    let contextText = "No external context needed.";
    let finalDocs: any[] = []; // Store citations here

    if (needsRAG) {
      console.log("🛠️ Query needs RAG. Firing Advanced Engine...");
      
      // ==========================================
      // 2. OPTIMIZE & HyDE (Run parallel for speed)
      // ==========================================
      const [optimizedQuery, hydeDoc] = await Promise.all([
        optimizeQuery(currentMessage),
        generateHyDE(currentMessage)
      ]);

      // Combine original intent, optimized keywords, and hypothetical answer
      const combinedSearchQuery = `${optimizedQuery}\n\n${hydeDoc}`;

      // ==========================================
      // 3. RETRIEVE FROM QDRANT
      // ==========================================
      const rawDocs = await retrieveDocuments(combinedSearchQuery, notebookId);

      // ==========================================
      // 4. CRAG EVALUATOR (Filter the garbage)
      // ==========================================
      finalDocs = await evaluateDocumentsWithCRAG(currentMessage, rawDocs);

      if (finalDocs.length > 0) {
        contextText = finalDocs.map((doc) => doc.pageContent).join("\n\n---\n\n");
      } else {
        contextText = "No highly relevant context found in the provided sources.";
      }
    } else {
      console.log("⏩ Skipping RAG (Greeting or General Chat detected).");
    }

    // ==========================================
    // 5. FINAL GENERATION (GPT-4o-mini with Streaming)
    // ==========================================
    const model = new ChatOpenAI({
      modelName: "gpt-4o-mini", // Fast, smart, cost-effective
      temperature: 0.2, // Low temp for factual accuracy
      streaming: true,
    });

    const prompt = PromptTemplate.fromTemplate(MASTER_SYSTEM_PROMPT);
    
    const chain = RunnableSequence.from([
      prompt,
      model,
      new BytesOutputParser(), // Updated to BytesOutputParser
    ]);

    // Pass data to the final prompt
    const stream = await chain.stream({
      context: contextText,
      question: currentMessage,
    });

    // ==========================================
    // 6. CITATIONS HEADERS (Pro Feature)
    // ==========================================
    // Jo chunks CRAG pass kar chuke hain, unki details frontend ko bhej rahe hain
    const serializedDocs = Buffer.from(
      JSON.stringify(
        finalDocs.map((d) => ({
          sourceId: d.metadata.sourceId, // Frontend click pe file kholne ke kaam aayega
          snippet: d.pageContent.substring(0, 150) + "...", // Chhota sa preview
        }))
      )
    ).toString("base64");

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "x-sources": serializedDocs, // Custom header me citations bhej diye
      },
    });

  } catch (error: any) {
    console.error("🔥 Chat API Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to process chat" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}