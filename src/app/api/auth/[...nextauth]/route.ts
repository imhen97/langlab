import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Ensure this route is always dynamic and runs on the Node.js runtime in Vercel
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

// Test endpoint to verify the route is working
export async function OPTIONS() {
  return new Response("OK", { status: 200 });
}
