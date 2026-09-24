import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Indian Creek Psychological Services | Counseling & Therapy",
  description:
    "Professional counseling services focused on substance use recovery, trauma therapy, marriage and family counseling, mood disorders, autism, ADHD, and general mental health support.",
  metadataBase: new URL("https://indiancreekpsych.com"),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
