import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { generatePodcastBackgroundFunc, processSourceDocument } from "@/lib/inngest/functions";


export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processSourceDocument, // Hamara function yahan register hoga
    generatePodcastBackgroundFunc
  ],
});