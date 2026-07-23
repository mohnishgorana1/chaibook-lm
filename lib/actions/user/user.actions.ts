"use server";

import User from "@/models/user/user.model";
import  dbConnect  from "@/lib/dbConnect";

export const createUser = async (user: {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
}) => {
  await dbConnect();

  try {
    console.log("🟡 Action :: createUser started. Incoming data:", user);

    // 1. Validate Input (Pehle check karo data aaya bhi hai ya nahi)
    if (!user.clerkId || !user.email) {
      console.error("❌ Action :: Missing required fields (clerkId or email)");
      throw new Error("clerkId and email are required to create a user.");
    }

    // 2. Check if user already exists (Webhook retries/duplicates bachane ke liye)
    const existingUser = await User.findOne({ clerkId: user.clerkId });
    if (existingUser) {
      console.log("⚠️ Action :: User already exists in DB:", existingUser._id);
      return { success: true, data: JSON.parse(JSON.stringify(existingUser)) };
    }

    // 3. Create User in DB
    console.log("🟡 Action :: Attempting to create user in MongoDB...");
    const newUser = await User.create(user);
    console.log(
      "✅ Action :: NEW Chai GPT User created successfully. MongoID:",
      newUser._id,
    );

    return { success: true, data: JSON.parse(JSON.stringify(newUser)) };
  } catch (error: any) {
    // Detailed Error Logging
    console.error("❌ Action :: ERROR in createUser:");
    console.error("Message:", error.message);
    if (error.code === 11000) {
      console.error("Duplicate Key Error (Email or ClerkId already exists)");
    }

    return { success: false, error: error.message };
  }
};

export const deleteUser = async (clerkId: string) => {
  try {
    console.log(`🟡 Action :: deleteUser started for ClerkID: ${clerkId}`);

    if (!clerkId) throw new Error("clerkId is required for deletion");

    await dbConnect();

    const deletedUser = await User.findOneAndDelete({ clerkId: clerkId });

    if (!deletedUser) {
      console.log(`⚠️ Action :: User with Clerk ID ${clerkId} not found in DB`);
      return { success: false, message: "User not found in database" };
    }

    console.log(
      `🗑️ Action :: User ${clerkId} deleted from database successfully`,
    );
    return { success: true, message: "User deleted successfully" };
  } catch (error: any) {
    console.error("❌ Action :: ERROR in deleteUser:", error.message);
    return { success: false, message: error.message };
  }
};
