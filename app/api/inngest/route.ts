import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { processSourceDocument } from "@/lib/inngest/functions";


export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processSourceDocument, // Hamara function yahan register hoga
  ],
});