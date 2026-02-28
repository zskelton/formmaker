import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vinext Boilerplate",
  description: "Next.js app running with vinext"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}