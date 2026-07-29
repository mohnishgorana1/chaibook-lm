// /lib/actions/podcast/podcast.actions.ts
"use server";

import dbConnect from "@/lib/dbConnect";
import Notebook from "@/models/notebook.model";
import { inngest } from "@/lib/inngest/client"; 

export async function generatePodcastAction(notebookId: string, topic: string) {
  try {
    console.log(`🎙️ Triggering Async Background Podcast Pipeline for: "${topic}"`);
    await dbConnect();

    // Pehle hi check kar lo ki notebook valid hai ya nahi
    const notebook = await Notebook.findById(notebookId);
    if (!notebook) throw new Error("Notebook not found");

    // Inngest Event trigger karo background processing ke liye
    await inngest.send({
      name: "podcast/generate.started",
      data: {
        notebookId,
        topic
      }
    });

    return {
      success: true,
      asyncProcessing: true,
      message: "Podcast generation started in background."
    };
  } catch (error: any) {
    console.error("❌ Podcast Action Trigger Error:", error);
    throw new Error(error.message || "Failed to initiate background podcast pipeline");
  }
}















// // /lib/actions/podcast/podcast.actions.ts
// "use server";

// import OpenAI from "openai";
// import { supabase } from "@/lib/supabase/client";
// import { QdrantClient } from "@qdrant/js-client-rest";
// import { optimizeQuery, generateHyDE } from "@/lib/rag/query-utils";
// import { OpenAIEmbeddings } from "@langchain/openai";
// import Notebook from "@/models/notebook.model";
// import dbConnect from "@/lib/dbConnect";

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// export async function generatePodcastAction(notebookId: string, topic: string) {
//   try {
//     console.log(`🎙️ Generating Podcast for: "${topic}"`);
//     await dbConnect();

//     // 1. Get relevant context using RAG
//     const [optimizedQuery, hydeDoc] = await Promise.all([
//       optimizeQuery(topic),
//       generateHyDE(topic),
//     ]);
//     const combinedSearchQuery = `${optimizedQuery}\n\n${hydeDoc}`;

//     const embeddings = new OpenAIEmbeddings({
//       modelName: "text-embedding-3-small",
//     });
//     const queryVector = await embeddings.embedQuery(combinedSearchQuery);

//     const qdrantClient = new QdrantClient({
//       url: process.env.QDRANT_URL,
//       apiKey: process.env.QDRANT_API_KEY,
//     });

//     // TODO: Change 'limit' to 15 if you need more data for the Long Version
//     const searchResult = await qdrantClient.search("chaibook_sources", {
//       vector: queryVector,
//       filter: {
//         must: [{ key: "metadata.notebookId", match: { value: notebookId } }],
//       },
//       limit: 10, 
//     });

//     // TODO: Change 'slice' from 1200 to 6000 if you need more context for the Long Version
//     const contextText =
//       searchResult.length > 0
//         ? searchResult
//             .map((p: any) => p.payload?.pageContent || p.payload?.content || "")
//             .join("\n\n")
//             .slice(0, 1200) 
//         : "Summarize general concepts briefly.";

//     console.log("got context search result");

//     // ==========================================================
//     // 2. GENERATE SCRIPT VIA LLM (CHOOSE EITHER SHORT OR LONG)
//     // ==========================================================

//     // 🟢 TODO 1: SHORT DURATION VERSION (~1 MINUTE | LOW COST)
//     // Uncomment this block (and comment the Long Version below) to save API billing.
//     /*
//     const chatCompletion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [
//         {
//           role: "system",
//           content: `You write 2-person micro podcast scripts between Alice and Bob.
//             STRICT RULES:
//             1. Total script length MUST be UNDER 150 words (3-4 quick turns each).
//             2. Output ONLY a valid JSON array. No markdown, no commentary.
//             Format:
//             [
//               {"speaker": "Alice", "text": "Short intro line..."},
//               {"speaker": "Bob", "text": "Short response..."}
//             ]`,
//         },
//         {
//           role: "user",
//           content: `Context:\n${contextText}\n\nTopic: ${topic}`,
//         },
//       ],
//     });
//     */

//     // 🔴 TODO 2: LONG DURATION VERSION (~3-4 MINUTES | DEMO PURPOSE)
//     // Only use this when you need an in-depth podcast (Consumes more tokens and time).
//     const chatCompletion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [
//         {
//           role: "system",
//           content: `You write an in-depth 2-person educational podcast script between Alice and Bob.
//              STRICT RULES:
//              1. Total script length MUST be between 500 to 600 words (approx 3-4 minutes of audio).
//              2. If the provided context is short or lacks details, use your expert internal knowledge to deeply expand the topic, provide real-world examples, and make the conversation engaging.
//              3. Output ONLY a valid JSON array. No markdown, no commentary.
//              Format:
//              [
//                {"speaker": "Alice", "text": "Detailed intro line..."},
//                {"speaker": "Bob", "text": "Detailed response..."}
//              ]`,
//         },
//         {
//           role: "user",
//           content: `Context:\n${contextText}\n\nTopic: ${topic}`,
//         },
//       ],
//     });

//     const rawResponse = chatCompletion.choices[0].message.content || "[]";
//     const cleanJson = rawResponse
//       .replace(/```json/g, "")
//       .replace(/```/g, "")
//       .trim();
//     const scriptArray = JSON.parse(cleanJson);

//     // 3. Convert Script to Speech
//     const audioBuffers = [];
//     let readableScript = "";

//     for (const line of scriptArray) {
//       readableScript += `**${line.speaker}:** ${line.text}\n\n`;
//       const voiceId = line.speaker === "Alice" ? "nova" : "onyx";

//       const mp3 = await openai.audio.speech.create({
//         model: "tts-1", // cheapest & fastest TTS model
//         voice: voiceId,
//         input: line.text,
//       });

//       const arrayBuffer = await mp3.arrayBuffer();
//       audioBuffers.push(Buffer.from(arrayBuffer));
//     }

//     const finalAudioBuffer = Buffer.concat(audioBuffers);
//     const blob = new Blob([finalAudioBuffer], { type: "audio/mpeg" });
//     const fileName = `podcast-${notebookId}-${Date.now()}.mp3`;

//     console.log(
//       "OPENAI TTS 2-Person mp3 generated || uploading Blob via REST to bucket: ",
//       fileName,
//     );

//     // 🔥 4. DIRECT REST API UPLOAD (Bypasses the Supabase SDK hanging bug for large files)
//     const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL;
//     const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

//     if (!supabaseUrl || !supabaseKey) {
//         throw new Error("Supabase environment variables are missing.");
//     }

//     const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/chaibook-podcasts/${fileName}`, {
//       method: "POST",
//       headers: {
//         "Authorization": `Bearer ${supabaseKey}`,
//         "apikey": supabaseKey,
//         "Content-Type": "audio/mpeg",
//       },
//       body: blob as any,
//       // @ts-ignore - Required for Node.js fetch with binary bodies to prevent hanging
//       duplex: "half", 
//     });

//     if (!uploadRes.ok) {
//       const errText = await uploadRes.text();
//       throw new Error(`Supabase REST upload failed: ${errText}`);
//     }

//     console.log("✅ Successfully uploaded to Supabase!");

//     // Construct the public URL manually
//     const audioUrl = `${supabaseUrl}/storage/v1/object/public/chaibook-podcasts/${fileName}`;

//     const newPodcast = {
//       title: topic,
//       audioUrl: audioUrl,
//       script: readableScript,
//       createdAt: new Date(),
//     };

//     await Notebook.findByIdAndUpdate(notebookId, {
//       $push: { podcasts: newPodcast },
//     });

//     return {
//       success: true,
//       audioUrl,
//       script: readableScript,
//       podcastObj: newPodcast,
//     };
//   } catch (error: any) {
//     console.error("❌ Podcast Action Error:", error);
//     throw new Error(error.message || "Failed to generate podcast");
//   }
// }






// // /lib/actions/podcast/podcast.actions.ts
// "use server";

// import OpenAI from "openai";
// import { supabase } from "@/lib/supabase/client";
// import { QdrantClient } from "@qdrant/js-client-rest";
// import { optimizeQuery, generateHyDE } from "@/lib/rag/query-utils";
// import { OpenAIEmbeddings } from "@langchain/openai";
// import Notebook from "@/models/notebook.model";
// import dbConnect from "@/lib/dbConnect";

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// export async function generatePodcastAction(notebookId: string, topic: string) {
//   try {
//     console.log(`🎙️ Generating Cost-Optimized Podcast for: "${topic}"`);
//     await dbConnect();

//     // 1. Get relevant context using RAG
//     const [optimizedQuery, hydeDoc] = await Promise.all([
//       optimizeQuery(topic),
//       generateHyDE(topic),
//     ]);
//     const combinedSearchQuery = `${optimizedQuery}\n\n${hydeDoc}`;

//     const embeddings = new OpenAIEmbeddings({
//       modelName: "text-embedding-3-small",
//     });
//     const queryVector = await embeddings.embedQuery(combinedSearchQuery);

//     const qdrantClient = new QdrantClient({
//       url: process.env.QDRANT_URL,
//       apiKey: process.env.QDRANT_API_KEY,
//     });

//     const searchResult = await qdrantClient.search("chaibook_sources", {
//       vector: queryVector,
//       filter: {
//         must: [{ key: "metadata.notebookId", match: { value: notebookId } }],
//       },
//       limit: 10, // TODO : change it to 15 if need more data
//     });

//     const contextText =
//       searchResult.length > 0
//         ? searchResult
//             .map((p: any) => p.payload?.pageContent || p.payload?.content || "")
//             .join("\n\n")
//             .slice(0, 1200)
//         : "Summarize general concepts briefly.";

//     console.log("got context search result");

//     // 2. Generate 2-Person Script via LLM

//     /*

//     const chatCompletion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [
//         {
//           role: "system",
//           content: `You write 2-person micro podcast scripts between Alice and Bob.
//             STRICT RULES:
//             1. Total script length MUST be UNDER 150 words (3-4 quick turns each).

//             2. Output ONLY a valid JSON array. No markdown, no commentary.
//             Format:
//             [
//               {"speaker": "Alice", "text": "Short intro line..."},
//               {"speaker": "Bob", "text": "Short response..."}
//             ]`,
//         },
//         {
//           role: "user",
//           content: `Context:\n${contextText}\n\nTopic: ${topic}`,
//         },
//       ],
//     });

//    */

//     // TODO : Only use it when need more audio data
//     const chatCompletion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [
//         {
//           role: "system",
//           content: `You write an in-depth 2-person educational podcast script between Alice and Bob.
//              STRICT RULES:
//              1. Total script length MUST be between 500 to 600 words (approx 3-4 minutes of audio).
//              2. If the provided context is short or lacks details, use your expert internal knowledge to deeply expand the topic, provide    real-world examples, and make the conversation engaging.
//              3. Output ONLY a valid JSON array. No markdown, no commentary.
//              Format:
//              [
//                {"speaker": "Alice", "text": "Detailed intro line..."},
//                {"speaker": "Bob", "text": "Detailed response..."}
//              ]`,
//         },
//         {
//           role: "user",
//           content: `Context:\n${contextText}\n\nTopic: ${topic}`,
//         },
//       ],
//     });

//     const rawResponse = chatCompletion.choices[0].message.content || "[]";
//     const cleanJson = rawResponse
//       .replace(/```json/g, "")
//       .replace(/```/g, "")
//       .trim();
//     const scriptArray = JSON.parse(cleanJson);

//     // 3. Convert Script to Speech
//     const audioBuffers = [];
//     let readableScript = "";

//     for (const line of scriptArray) {
//       readableScript += `**${line.speaker}:** ${line.text}\n\n`;
//       const voiceId = line.speaker === "Alice" ? "nova" : "onyx";

//       const mp3 = await openai.audio.speech.create({
//         model: "tts-1", // cheapest & fastest TTS model
//         voice: voiceId,
//         input: line.text,
//       });

//       const arrayBuffer = await mp3.arrayBuffer();
//       audioBuffers.push(Buffer.from(arrayBuffer));
//     }

//     const finalAudioBuffer = Buffer.concat(audioBuffers);
//     const blob = new Blob([finalAudioBuffer], { type: "audio/mpeg" });
//     const fileName = `podcast-${notebookId}-${Date.now()}.mp3`;

//     console.log(
//       "OPENAI TTS 2-Person mp3 generated || uploading Blob to bucket: ",
//       fileName,
//     );

//     // 4. Upload Audio to Supabase
//     const { error } = await supabase.storage
//       .from("chaibook-podcasts")
//       .upload(fileName, blob, {
//         contentType: "audio/mpeg",
//         upsert: true,
//       });

//     if (error) throw new Error(`Supabase upload failed: ${error.message}`);

//     console.log("✅ Successfully uploaded to Supabase!");

//     const { data: publicUrlData } = supabase.storage
//       .from("chaibook-podcasts")
//       .getPublicUrl(fileName);

//     const audioUrl = publicUrlData.publicUrl;

//     const newPodcast = {
//       title: topic,
//       audioUrl: audioUrl,
//       script: readableScript,
//       createdAt: new Date(),
//     };

//     await Notebook.findByIdAndUpdate(notebookId, {
//       $push: { podcasts: newPodcast },
//     });

//     return {
//       success: true,
//       audioUrl,
//       script: readableScript,
//       podcastObj: newPodcast,
//     };
//   } catch (error: any) {
//     console.error("❌ Podcast Action Error:", error);
//     throw new Error(error.message || "Failed to generate podcast");
//   }
// }
