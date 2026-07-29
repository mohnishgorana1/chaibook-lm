# ⬛ ChaiBookLM


ChaiBookLM abandons the traditional chat interface for a deterministic, grid-based knowledge workspace. It forces unstructured data—PDFs, YouTube videos, and web streams—into strict, isolated vector knowledge graphs. 

**Parse. Index. Synthesize.**

---

## ⚡ Core Mechanisms

- **[01] Universal Ingestion:** Feed the engine raw PDF literature, web URLs, YouTube streams, and VTT transcripts. Everything is unified into a semantic vector state.

- **[02] Isolated Workspaces:** No shared context. Each notebook acts as an independent sandbox, guaranteeing zero cross-contamination of ideas.

- **[03] Granular Citations & Source Viewer:** Answers are grounded in sources. Every node generated links directly back to the exact paragraph, document page, or video timestamp. Selecting a citation immediately opens the corresponding source view.

- **[04] Podcast Engine (Bonus):** Convert dense logic into two-person conversational podcasts. Synthesize knowledge audibly using advanced TTS models.

- **[05] Roadmap Architect (Bonus):** Generate structured, personalized learning roadmaps directly from your isolated vector index (e.g., from a curated list of YouTube videos).

---

## 🛠️ The Architecture (Tech Stack)

### Frontend Layer
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (Strict Swiss Design / Minimalist aesthetic)
- **State Management:** React Hooks (`useOptimistic`, `startTransition`)
- **Icons & Animations:** Lucide React & Framer Motion

### Backend & AI Processing Pipeline
- **LLM & Embeddings:** OpenAI (`gpt-4o-mini`, `text-embedding-3-small`, `tts-1`)
- **Vector Database:** [Qdrant](https://qdrant.tech/)
- **Database & Storage:** [Supabase](https://supabase.com/) (PostgreSQL & Object Storage)
- **Asynchronous Workflows:** [Inngest](https://www.inngest.com/) (Prevents Serverless timeouts during heavy RAG and TTS compilation)
- **RAG Orchestration:** Langchain (Document Loaders, Text Splitters, Recursive Chunking)

---

## 🏗️ Retrieval Flow & System Design

1. **Ingestion & Processing:** 
   - A user uploads a source (PDF, URL, YouTube). The status is immediately marked as `INDEXING`.
   - Inngest handles the background job: extracting text, applying `RecursiveCharacterTextSplitter`, and generating embeddings via OpenAI.
   - Embeddings and extensive metadata (timestamps, page numbers) are pushed to Qdrant. The status updates to `READY`.
2. **Querying (RAG Pipeline):**
   - Natural language queries undergo query optimization and HyDE (Hypothetical Document Embeddings) generation to improve search recall.
   - The query vector retrieves the top-K relevant chunks strictly filtered by the active `notebookId`.
3. **Synthesis & Streaming:**
   - The context is injected into the LLM prompt. The system streams the response back to the client while simultaneously emitting a custom `x-sources` header containing the precise citation metadata.
4. **Inspection:**
   - The UI parses citations. Clicking a citation triggers the Source Viewer to open the exact PDF page, YouTube timestamp, or highlighted text segment.

---
## Enviroment Variables


MONGODB_URI=your_mongodb_connection_string

OPENAI_API_KEY=your_openai_api_key

QDRANT_URL=your_qdrant_cluster_url
QDRANT_API_KEY=your_qdrant_api_key

NEXT_PUBLIC_SUPABASE_PROJECT_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key

RAPIDAPI_KEY=your_rapidapi_key

INNGEST_EVENT_KEY=local
INNGEST_SIGNING_KEY=local