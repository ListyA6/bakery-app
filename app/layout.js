import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PWARegister from "./components/PWARegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "🥖 Bakery Management System",
  description: "Manage your bakery inventory, recipes, and production",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  manifest: "/manifest.json",  // 👈 ADD THIS LINE
  appleWebApp: {                // 👈 ADD THIS SECTION
    capable: true,
    statusBarStyle: "default",
    title: "Bakery App",
  },
  formatDetection: {            // 👈 ADD THIS SECTION
    telephone: false,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" /> {/* 👈 ADD THIS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />      {/* 👈 ADD THIS */}
        <meta name="apple-mobile-web-app-status-bar-style" content="default" /> {/* 👈 ADD THIS */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <PWARegister /> {/* 👈 ADD THIS */}
      </body>
    </html>
  );
}