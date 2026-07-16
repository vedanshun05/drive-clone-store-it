import type { Metadata } from "next";
import { Fredoka, Nunito, Poppins, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

// Both theme font pairs are loaded; globals.css maps --font-poppins / --font-sans
// to Fredoka+Nunito (cartoon, default) or Poppins+Geist (original) per data-theme.
const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fredoka",
});
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-nunito",
});
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins-orig",
});
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

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
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased font-sans",
        fredoka.variable,
        nunito.variable,
        poppins.variable,
        geist.variable,
      )}
    >
      <head>
        {/* No-flash theme bootstrap: set data-theme before first paint (default: cartoon). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.theme=localStorage.getItem("theme")||"cartoon"}catch(e){document.documentElement.dataset.theme="cartoon"}`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
