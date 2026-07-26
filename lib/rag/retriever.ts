import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import dbConnect from "@/lib/dbConnect";
import Source from "@/models/source.model";

const evaluatorModel = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0,
});

// 1. QDRANT RETRIEVER (Federated Multi-Retrieval)
export async function retrieveDocuments(query: string, notebookId: string) {
  console.log("🔍 Searching Qdrant Vector DB for:", query.substring(0, 50) + "...");

  // 🔥 STEP 1: Get all READY sources for this notebook from MongoDB
  await dbConnect();
  const sources = await Source.find({ notebookId, status: "READY" });

  if (!sources || sources.length === 0) {
    console.log("No ready sources found for this notebook.");
    return [];
  }

  const embeddings = new OpenAIEmbeddings({
    modelName: "text-embedding-3-small",
  });

  const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    collectionName: "chaibook_sources",
  });

  // 🔥 STEP 2: Parallel Search for EVERY SINGLE SOURCE 🔥
  // Hum har source (PDF, YT, Web) ke andar alag se search karenge
  // taaki har source ko equal priority mile.
  const retrievalPromises = sources.map((source) => {
    const retriever = vectorStore.asRetriever({
      k: 3, // Har source me se Top 3 best chunks nikalenge
      filter: {
        must: [
          {
            key: "metadata.sourceId",
            match: { value: source._id.toString() },
          },
        ],
      },
    });
    return retriever.invoke(query);
  });

  // Wait for all searches to complete parallelly (Super Fast!)
  const resultsArray = await Promise.all(retrievalPromises);
  
  // Combine all chunks into one flat array
  const docs = resultsArray.flat();
  
  console.log(`📥 Retrieved ${docs.length} diverse chunks from ${sources.length} different sources.`);
  return docs;
}

// 2. CRAG EVALUATOR
export async function evaluateDocumentsWithCRAG(question: string, documents: any[]) {
  console.log("⚖️ Running CRAG Evaluator to filter out irrelevant chunks...");

  const prompt = PromptTemplate.fromTemplate(`
    You are a strict and highly accurate grader assessing the relevance of a retrieved document to a user's question.
    If the document contains ANY keyword, semantic meaning, or context that can help answer the question, grade it as relevant.
    Output EXACTLY 'yes' if relevant, or 'no' if not relevant. DO NOT include any other text, explanation, or punctuation.
    
    Question: {question}
    Document: {document}
    
    Grade (yes/no):
  `);

  const chain = prompt.pipe(evaluatorModel).pipe(new StringOutputParser());

  const evaluationPromises = documents.map(async (doc) => {
    try {
      const grade = await chain.invoke({ question, document: doc.pageContent });
      const isRelevant = grade.trim().toLowerCase() === "yes";
      return { doc, isRelevant };
    } catch (error) {
      console.error("CRAG Evaluation Error for a chunk:", error);
      return { doc, isRelevant: false }; 
    }
  });

  const results = await Promise.all(evaluationPromises);
  
  const relevantDocs = results.filter((r) => r.isRelevant).map((r) => r.doc);

  console.log(`✅ CRAG Filtered: Kept ${relevantDocs.length} out of ${documents.length} chunks.`);
  return relevantDocs;
}