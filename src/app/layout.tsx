import type { Metadata } from "next";
import { ThemeProvider } from "@/hooks/use-system-theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "HyperAnalyse",
  description:
    "HyperAnalyse — generative UI workspace powered by OpenUI Lang and Google Vertex AI.",
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body data-theme="dark">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
