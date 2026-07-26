import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

// Evaluator ke liye strict aur fast model
const evaluatorModel = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0,
});

// ==========================================
// 1. QDRANT RETRIEVER (Fetch raw documents)
// ==========================================
export async function retrieveDocuments(query: string, notebookId: string) {
  console.log("🔍 Searching Qdrant Vector DB for:", query.substring(0, 50) + "...");

  const embeddings = new OpenAIEmbeddings({
    modelName: "text-embedding-3-small",
  });

  const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    collectionName: "chaibook_sources",
  });

  // Top 6 chunks nikalenge, sirf is specific notebook ke
  const retriever = vectorStore.asRetriever({
    k: 6,
    filter: {
      must: [
        {
          key: "metadata.notebookId",
          match: { value: notebookId },
        },
      ],
    },
  });

  const docs = await retriever.invoke(query);
  console.log(`📥 Retrieved ${docs.length} raw chunks from Qdrant.`);
  return docs;
}

// ==========================================
// 2. CRAG EVALUATOR (Corrective RAG Filter)
// ==========================================
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

  // Promise.all use kar rahe hain taaki saare chunks parallel me check ho jaye (Fast Speed!)
  const evaluationPromises = documents.map(async (doc) => {
    try {
      const grade = await chain.invoke({ question, document: doc.pageContent });
      const isRelevant = grade.trim().toLowerCase() === "yes";
      return { doc, isRelevant };
    } catch (error) {
      console.error("CRAG Evaluation Error for a chunk:", error);
      return { doc, isRelevant: false }; // Agar error aaya toh safe side pe discard kar do
    }
  });

  const results = await Promise.all(evaluationPromises);
  
  // Sirf 'yes' wale chunks ko aage bhejenge
  const relevantDocs = results.filter((r) => r.isRelevant).map((r) => r.doc);

  console.log(`✅ CRAG Filtered: Kept ${relevantDocs.length} out of ${documents.length} chunks.`);
  return relevantDocs;
}