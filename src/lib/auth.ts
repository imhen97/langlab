import type { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import KakaoProvider from "next-auth/providers/kakao";
import CredentialsProvider from "next-auth/providers/credentials";
// import EmailProvider from "next-auth/providers/email";
import { prisma } from "./prisma";
import { compare } from "bcryptjs";

export const authOptions: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development",
  // Enable verbose debug logs in production when NEXTAUTH_DEBUG=true
  debug:
    process.env.NEXTAUTH_DEBUG === "true" ||
    process.env.NODE_ENV !== "production",
  useSecureCookies: process.env.NODE_ENV === "production",
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: any) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user || !user.passwordHash) {
          return null;
        }
        const isValid = await compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!isValid) {
          return null;
        }
        return { id: user.id, name: user.name ?? undefined, email: user.email };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    ...(process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET
      ? [
          KakaoProvider({
            clientId: process.env.KAKAO_CLIENT_ID,
            clientSecret: process.env.KAKAO_CLIENT_SECRET,
            authorization: {
              params: {
                scope: "profile_nickname account_email",
              },
            },
            profile(profile) {
              const p: any = profile;
              const kakaoAccount = p?.kakao_account ?? {};
              const kakaoProfile = kakaoAccount?.profile ?? {};
              return {
                id: String(p?.id),
                name: kakaoProfile?.nickname ?? "Kakao User",
                email:
                  kakaoAccount?.email ??
                  (p?.id ? `${p.id}@kakao.local` : undefined),
                image: kakaoProfile?.profile_image_url ?? null,
              } as any;
            },
          }),
        ]
      : []),
    // EmailProvider는 나중에 설정
    // EmailProvider({
    //   server: {
    //     host: process.env.EMAIL_SERVER_HOST,
    //     port: process.env.EMAIL_SERVER_PORT,
    //     auth: {
    //       user: process.env.EMAIL_SERVER_USER,
    //       pass: process.env.EMAIL_SERVER_PASSWORD,
    //     },
    //   },
    //   from: process.env.EMAIL_FROM,
    // }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("[next-auth][signIn] Starting signIn callback", {
        userId: user?.id,
        email: user?.email,
        provider: account?.provider,
      });

      try {
        // Allow OAuth sign-ins
        if (account?.provider === "google" || account?.provider === "kakao") {
          console.log(
            "[next-auth][signIn] OAuth sign-in allowed for provider:",
            account.provider
          );
          return true;
        }
        // For credentials, user is already validated in authorize()
        console.log("[next-auth][signIn] Credentials sign-in allowed");
        return true;
      } catch (error) {
        console.error("[next-auth][signIn] Error in signIn callback:", error);
        return false;
      }
    },
    session: async ({ session, user }) => {
      if (session?.user && user?.id) {
        session.user.id = user.id;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  // Surface NextAuth errors to Vercel logs for easier debugging
  logger: {
    error(error: Error) {
      // eslint-disable-next-line no-console
      console.error("[next-auth][error]", error);
    },
    warn(message: string) {
      // eslint-disable-next-line no-console
      console.warn("[next-auth][warn]", message);
    },
    debug(message: string) {
      if (process.env.NEXTAUTH_DEBUG === "true") {
        // eslint-disable-next-line no-console
        console.log("[next-auth][debug]", message);
      }
    },
  },
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/auth/signin",
  },
};
