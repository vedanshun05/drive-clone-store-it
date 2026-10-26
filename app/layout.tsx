import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL("https://storeit.vedanshu.dev"),
  title: "StoreIt",
  description: "StoreIt - The only storage solution you need.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "StoreIt",
    description: "StoreIt - The only storage solution you need.",
    url: "https://storeit.vedanshu.dev",
    siteName: "StoreIt",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StoreIt",
    description: "StoreIt - The only storage solution you need.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("antialiased", "font-sans", geist.variable)}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
