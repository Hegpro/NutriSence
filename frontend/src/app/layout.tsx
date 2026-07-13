import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "NutriSense AI - AI Nutrition Coach & Graph Workspace",
  description: "Personalized nutrition planning using customizable LangGraph workflow architectures.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} h-full antialiased dark`} suppressHydrationWarning>
      <body className="min-h-full bg-[#06060c] text-[#f4f4f7] flex flex-col antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
