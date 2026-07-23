import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/user/user.model";

export async function getMongoUserId() {
  console.log("getting mongo user")
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  let mongoUserId = sessionClaims?.userMongoId as string;

  // Fallback: Agar session token abhi tak refresh nahi hua hai, tabhi DB query karo
  if (!mongoUserId) {
    console.log("⚠️ Fallback: Fetching Mongo ID from DB");
    await dbConnect(); // Ensure DB connection before querying
    const mongoUser = await User.findOne({ clerkId: userId });

    if (!mongoUser) {
      throw new Error("User not found in DB");
    }

    mongoUserId = mongoUser._id.toString();
  }

  return mongoUserId;
}

export async function getFullMongoUser() {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  let mongoUserId = sessionClaims?.userMongoId as string;
  let mongoUser;

  // Ensure DB connection before any query
  await dbConnect();

  if (!mongoUserId) {
    console.log("⚠️ Fallback: Fetching Mongo ID from DB");
    const currentUser = await User.findOne({ clerkId: userId });

    if (!currentUser) {
      throw new Error("User not found in DB");
    }

    mongoUserId = currentUser._id.toString();
    mongoUser = currentUser;
  } else {
    mongoUser = await User.findById(mongoUserId);

    // Safety check: agar sessionClaims ka ID galat nikla toh clerkId se fetch karo
    if (!mongoUser) {
      console.log("⚠️ SessionClaims ID invalid, fallback to clerkId");
      mongoUser = await User.findOne({ clerkId: userId });
    }
  }

  // console.log("mongoUser", mongoUser);

  return JSON.parse(JSON.stringify(mongoUser)); // Safe serialization
}
