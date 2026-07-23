import type { Metadata, Viewport } from "next";
import { newsreader, hanken, jetbrainsMono } from "@/lib/fonts";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastStack } from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orbit — Family Command Center",
  description: "The calm center of a busy home: schedules, chores, meals, lists, and photos, shared by everyone.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Orbit",
  },
  icons: {
    apple: "/icons/icon-180.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#bf6544",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="calm"
      suppressHydrationWarning
      className={`${newsreader.variable} ${hanken.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col font-sans antialiased">
        <QueryProvider>
          <ThemeProvider>
            {children}
            <ToastStack />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
