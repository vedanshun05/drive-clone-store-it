import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
});

// Fredoka drives headings; kept under the --font-poppins var name so existing
// `font-poppins` / heading utilities pick it up with no component changes.
const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
    <html lang="en" className={cn("antialiased", fredoka.variable, "font-sans", nunito.variable)}>
      <body className="flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
