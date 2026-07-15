import type { Metadata } from "next";
import { Poppins, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://storeit.vedanshu.dev"),
  title: "StoreIt",
  description: "StoreIt - The only storage solution you need.",
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
    <html lang="en" className={cn("font-poppins", "antialiased", poppins.variable, "font-sans", geist.variable)}>
      <body className="flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
