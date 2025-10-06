import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Correct structure for App Router API routes in NextAuth v5
const { handlers } = NextAuth(authOptions);

export const { GET, POST } = handlers;
