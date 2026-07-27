import dbConnect from "@/lib/dbConnect";
import Notebook from "@/models/notebook.model";
import Source from "@/models/source.model"; // 🔥 Source model import kiya
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

  await dbConnect();
  const notebooks = await Notebook.find({ userId: mongoUserId }).sort({ updatedAt: -1 }).lean();

  const notebooksWithCounts = await Promise.all(
    notebooks.map(async (notebook) => {
      const count = await Source.countDocuments({ notebookId: notebook._id });

      return {
        ...notebook,
        sourcesCount: count,
      };
    })
  );

  const serializedNotebooks = JSON.parse(JSON.stringify(notebooksWithCounts));

  return (
    <NotebookClientView initialNotebooks={serializedNotebooks} />
  );
}