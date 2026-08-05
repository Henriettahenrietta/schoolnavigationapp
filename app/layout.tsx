import type { Metadata } from "next";
import "./globals.css";
import { APP_FULL, SCHOOL_NAME, LOGO_SRC } from "@/lib/branding";

export const metadata: Metadata = {
  title: APP_FULL,
  description: `${SCHOOL_NAME}. Conflict-aware course allocation and automatic timetable generation.`,
  icons: { icon: LOGO_SRC },
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
