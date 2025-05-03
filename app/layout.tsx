import "./globals.css";
import type { Metadata } from "next";
import ClientProvider from "@/components/ClientProvider";

export const metadata: Metadata = {
  title: "GPTree - Branching Conversations",
  description: "Tree-structured GPT chat application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <ClientProvider>
          {children}
        </ClientProvider>
      </body>
    </html>
  );
}
