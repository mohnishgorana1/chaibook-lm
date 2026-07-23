// /app/api/clerk-webhook/route.ts

import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { WebhookEvent } from "@clerk/nextjs/server";
import { createUser, deleteUser } from "@/lib/actions/user/user.actions"

export async function POST(req: Request) {
  console.log("⚡ WEBHOOK INIT");

  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("❌ Missing Clerk Webhook Secret"); 
    return new NextResponse("Missing Clerk Webhook Secret", { status: 500 });
  }

  try {
    const payload = await req.text();
    const headerPayload = await headers();

    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new NextResponse("Missing svix headers", { status: 400 });
    }

    const wh = new Webhook(WEBHOOK_SECRET);
    let evt: WebhookEvent;

    try {
      evt = wh.verify(payload, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as WebhookEvent;
    } catch (err) {
      console.error("❌ Error verifying webhook:", err);
      return new NextResponse("Error verifying webhook", { status: 400 });
    }

    const { id } = evt.data;
    const eventType = evt.type;

    // ✅ HANDLE user.created
    if (eventType === "user.created") {
      console.log("Creating new user in MongoDB...");

      const { email_addresses, image_url, first_name, last_name } = evt.data;

      const email = email_addresses[0]?.email_address;

      // Smart Fallbacks
      const fallbackFirstName = email
        ? email.split("@")[0]
        : "unknown@collabkit.com";
      const fallbackLastName = email ? "User" : "";

      const user = {
        clerkId: id!,
        email: email,
        firstName: first_name || fallbackFirstName,
        lastName: last_name || fallbackLastName,
        avatarUrl: image_url || "",
      };

      const result = await createUser(user);

      if (result.success && result.data) {
        // 🚀 SUPER IMPORTANT: Clerk ke user publicMetadata mein apna MongoDB ID set karna
        const client = await clerkClient();

        try {
          // ✅ FIX 1: Use updateUserMetadata instead of updateUser
          await client.users.updateUserMetadata(id as string, {
            publicMetadata: {
              userMongoId: result.data._id,
            },
          });
          console.log("✅ Clerk Metadata Updated for:", result.data._id);
        } catch (clerkErr: any) {
          // ✅ FIX 2: Handle the "Ghost User" 404 Error gracefully
          if (clerkErr.status === 404) {
            console.warn(
              `⚠️ Clerk user ${id} already deleted (transient OAuth user). Skipping metadata update.`,
            );
            // Hum isko crash nahi hone denge, success return karenge
          } else {
            console.error("❌ Failed to update Clerk Metadata:", clerkErr);
            return new NextResponse("Failed to update metadata", {
              status: 500,
            });
          }
        }

        return NextResponse.json(
          { message: "New User Created", user: result.data },
          { status: 201 },
        );
      }

      // ✅ FIX 3: Agar DB mein save fail ho jaye, toh 500 return karo taaki Clerk baad mein retry kare
      console.error("❌ Failed to save user in MongoDB");
      return new NextResponse("Failed to create user in DB", { status: 500 });
    }

    // 🗑️ HANDLE user.deleted
    if (eventType === "user.deleted") {
      console.log("Deleting user from MongoDB...");

      if (!id) return new NextResponse("Missing Clerk ID", { status: 400 });

      const data = await deleteUser(id);

      if (data?.success) {
        return NextResponse.json(
          { message: data.message, success: true },
          { status: 200 },
        );
      } else {
        return NextResponse.json(
          { message: data?.message, success: false },
          { status: 500 },
        );
      }
    }

    // 🚫 Ignore other events
    return new NextResponse(`Webhook received for event: ${eventType}`, {
      status: 200,
    });
  } catch (err: any) {
    console.error("❌ Webhook processing error:", err);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 500 });
  }
}
