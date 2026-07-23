// middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  '/', 
  "/risk-analyzer/chat/risk",
  "/api/risk-analyzer/risk",
  '/login(.*)', 
  '/signup(.*)', 
  '/api/clerk-webhook(.*)' // Webhook ko public rakhna zaroori hai!
]);

export default clerkMiddleware(async (auth, req) => {
  // Agar route public nahi hai, toh user ko login karne force karo
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};