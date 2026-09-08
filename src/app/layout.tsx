import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Task Management | Task & Attendance Management System",
  description: "Enterprise task management with dual-tier approvals, task timers, attendance tracking, and Gmail EOD reporting.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
