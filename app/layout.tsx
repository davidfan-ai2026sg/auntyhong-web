import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DemoRibbon } from "@/components/DemoRibbon";
import { cartCount } from "@/lib/cart";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Uncle Lan — Design Demo",
    template: "%s · Uncle Lan Demo",
  },
  description:
    "A design demo of Uncle Lan, a Singapore CNY snack and corporate gifting kitchen. Not a live store.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const count = await cartCount();
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Outfit:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <DemoRibbon />
        <Header cartCount={count} />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
