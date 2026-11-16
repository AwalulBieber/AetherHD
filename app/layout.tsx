import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AetherHD — Image & Video Studio",
  description: "A considered workspace for sharper images and cleaner video.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
