import React from "react";
import { redirect } from "next/navigation";
import dbConnect from "@/lib/dbConnect";
import Notebook from "@/models/notebook.model";
import Source from "@/models/source.model";
import WorkspaceClientView from "@/components/Notebook/WorkspaceClientView";

interface PageProps { params: Promise<{ id: string }> }

export default async function WorkspacePage({ params }: PageProps) {
  const { id } = await params;
  
  await dbConnect();
  
  // 1. Fetch data
  const notebook = await Notebook.findById(id).lean();
  if (!notebook) redirect("/notebook");

  const sources = await Source.find({ notebookId: id }).sort({ createdAt: -1 }).lean();

  // 2. Safe serialization for Client Component
  const safeNotebook = JSON.parse(JSON.stringify(notebook));
  const safeSources = JSON.parse(JSON.stringify(sources));

  return (
    // 3. Pass data to our new dynamic layout component
    <WorkspaceClientView 
      notebook={safeNotebook} 
      initialSources={safeSources} 
    />
  );
}