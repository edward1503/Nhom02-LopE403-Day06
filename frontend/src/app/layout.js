import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "AI Tutor - Lecture Q&A",
  description: "AI teaching assistant for your computer vision lectures",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="vi">
        <head>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" />
        </head>
        <body className={inter.className}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
