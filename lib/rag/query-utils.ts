import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { QUERY_REWRITER_PROMPT } from "./prompts";


// Fast & strict model for intermediate RAG steps
const fastModel = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0, 
});


// ==========================================
// 1. THE ROUTER (Does this need Vector Search?)
// ==========================================
export async function routeQuery(query: string): Promise<boolean> {
  const routerPrompt = PromptTemplate.fromTemplate(`
    You are an expert intent classifier. 
    Analyze the user's query and decide if it requires searching an external knowledge base/document database to answer.
    
    - Output "YES" if the query asks for facts, summaries, explanations, or specific details.
    - Output "NO" if the query is a simple greeting (e.g., "Hi", "Thanks"), a casual conversational filler, or a direct system command.

    Query: {query}
    Decision (YES/NO):
  `);

  const chain = routerPrompt.pipe(fastModel).pipe(new StringOutputParser());
  const response = await chain.invoke({ query });
  
  return response.trim().toUpperCase().includes("YES");
}

// ==========================================
// 2. QUERY REWRITER & STEP-BACK PROMPTING
// ==========================================
export async function optimizeQuery(query: string, chatHistory: string = ""): Promise<string> {
  const rewritePrompt = PromptTemplate.fromTemplate(QUERY_REWRITER_PROMPT); // Jo prompts.ts me banaya tha
  
  const stepBackPrompt = PromptTemplate.fromTemplate(`
    You are an expert in information retrieval.
    Take the user's specific query and generate a slightly broader, higher-level conceptual "Step-Back" query.
    This helps retrieve background context.
    
    Original Query: {query}
    Step-Back Conceptual Query:
  `);

  // Run both rewriting and step-back in parallel for speed
  const [rewrittenQuery, stepBackQuery] = await Promise.all([
    rewritePrompt.pipe(fastModel).pipe(new StringOutputParser()).invoke({ raw_query: query }),
    stepBackPrompt.pipe(fastModel).pipe(new StringOutputParser()).invoke({ query })
  ]);

  console.log("🔄 Optimized Query:", rewrittenQuery);
  console.log("🔙 Step-Back Query:", stepBackQuery);

  // Combine both for a massive recall boost in Qdrant
  return `${rewrittenQuery} \n ${stepBackQuery}`;
}

// ==========================================
// 3. HyDE (Hypothetical Document Embeddings)
// ==========================================
export async function generateHyDE(query: string): Promise<string> {
  const hydePrompt = PromptTemplate.fromTemplate(`
    You are an expert answering questions. 
    Please write a short, highly plausible, and factual hypothetical paragraph that perfectly answers the user's question.
    Do not use introductory phrases like "Here is the answer". Just write the raw factual paragraph.
    
    Question: {query}
    Hypothetical Answer:
  `);

  const chain = hydePrompt.pipe(fastModel).pipe(new StringOutputParser());
  const hypotheticalDocument = await chain.invoke({ query });
  
  console.log("🧠 HyDE Document Generated:", hypotheticalDocument.substring(0, 50) + "...");
  
  // Return the original query + hypothetical answer to embed both
  return `${query}\n\n${hypotheticalDocument}`;
}