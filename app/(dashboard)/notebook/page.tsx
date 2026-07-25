import dbConnect from "@/lib/dbConnect";
import Notebook from "@/models/notebook.model"; 
import NotebookClientView from "@/components/Notebook/NotebookClientView"; 
import { getMongoUserId } from "@/lib/helpers/auth";
import { redirect } from "next/navigation";

export default async function NoteBookListingPage() {
  let mongoUserId;
  
  try {
    mongoUserId = await getMongoUserId();
  } catch (error) {
    redirect("/login");
  }

  // 1. Database se data lao
  await dbConnect();
  const notebooks = await Notebook.find({ userId: mongoUserId }).sort({ updatedAt: -1 }).lean();

  // 2. Client component ko pass karne ke liye serialize karo
  const serializedNotebooks = JSON.parse(JSON.stringify(notebooks));

  return (
    <NotebookClientView initialNotebooks={serializedNotebooks} />
  );
}