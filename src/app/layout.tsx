import type { Metadata } from "next";
import { Nunito, Nunito_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "TellMyTale - Customer Success Dashboard",
  description: "AI-powered customer success platform for TellMyTale. Monitor conversations, track orders, and manage escalations.",
  keywords: ["customer success", "AI support", "dashboard", "tellmytale"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${nunito.variable} ${nunitoSans.variable} antialiased`}
        style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
