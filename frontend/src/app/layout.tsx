import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "DFA — Digital Forensics Assistant",
<<<<<<< HEAD
  description: "Agentic AI Digital Forensics Assistant",
=======
  description: "Agentic AI Digital Forensics Assistant — PT Teknologi Nasional Indonesia Siber",
>>>>>>> fbaf372c4c9f1776de00a740ef9f02dcfb1ede02
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
<<<<<<< HEAD
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
=======
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
>>>>>>> fbaf372c4c9f1776de00a740ef9f02dcfb1ede02
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}