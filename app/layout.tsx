import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DemoRibbon } from "@/components/DemoRibbon";
import { cartCount } from "@/lib/cart";

export const metadata: Metadata = {
  title: {
    default: "Aunty Hong — Design Demo",
    template: "%s · Aunty Hong Demo",
  },
  description:
    "A design demo of Aunty Hong, a Singapore CNY snack and corporate gifting house. Not the live store.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const count = await cartCount();
  return (
    <html lang="en">
      <head>
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
