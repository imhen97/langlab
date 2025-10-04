import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import StarfieldBackground from "@/components/ui/StarfieldBackground";
import { ThemeProvider } from "@/components/ui/theme-provider";
import SessionProvider from "@/components/providers/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "랭귀지랩 - Space Research Lab",
  description:
    "Explore languages through the cosmos. Your space research lab for language learning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-space bg-deepSpaceNavy text-starWhite min-h-screen relative`}
      >
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <StarfieldBackground />
            <div className="relative z-10">{children}</div>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
