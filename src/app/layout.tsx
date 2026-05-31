import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { DiscordLaunchCapture } from "@/components/DiscordLaunchCapture";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Muel",
  description: "Muel Web App: Hub and Activities for the Muel Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <DiscordLaunchCapture />
        {children}
      </body>
    </html>
  );
}
