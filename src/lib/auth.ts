import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import KakaoProvider from "next-auth/providers/kakao";
import CredentialsProvider from "next-auth/providers/credentials";
// import EmailProvider from "next-auth/providers/email";
import { prisma } from "./prisma";
import { compare } from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development",
  debug: process.env.NODE_ENV !== "production",
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.passwordHash) {
          return null;
        }
        const isValid = await compare(credentials.password, user.passwordHash);
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
    ...(process.env.KAKAO_CLIENT_ID
      ? [
          KakaoProvider({
            clientId: process.env.KAKAO_CLIENT_ID,
            // Kakao 콘솔에서 "Client Secret 사용"이 OFF인 경우 빈 문자열 허용
            clientSecret: process.env.KAKAO_CLIENT_SECRET || "",
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
    session: async ({ session, token }) => {
      if (session?.user && token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    jwt: async ({ user, token }) => {
      if (user) {
        token.uid = user.id;
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
};
