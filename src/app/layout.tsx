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
    icon: [
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
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
      <body className="min-h-full flex flex-col font-sans antialiased bg-paper text-ink">
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
