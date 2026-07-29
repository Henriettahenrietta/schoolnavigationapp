import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YIBS Course Allocation System",
  description:
    "Yaounde International Business School — conflict-aware course allocation and automatic timetable generation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
