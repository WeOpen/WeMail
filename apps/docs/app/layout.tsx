import { RootProvider } from "fumadocs-ui/provider/next";
import "./global.css";
import { Inter } from "next/font/google";
import type { Metadata, Viewport } from "next";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "WeMail Docs",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "WeMail Docs",
    template: "%s | WeMail Docs",
  },
  description: "WeMail deployment, development, and operations documentation.",
  icons: {
    icon: [{ url: "/brand/WeMail-favicon.png", type: "image/png" }],
    shortcut: ["/brand/WeMail-favicon.png"],
    apple: [{ url: "/brand/WeMail.png", type: "image/png" }],
  },
  manifest: "/brand/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#ff7a00",
};

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
