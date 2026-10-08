import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sitebook — Construction cost control",
  description: "Project → BOQ → Estimate → Procurement → Site → Measurements → Billing → Cost → Profit forecast → Alerts",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Sitebook", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#efeff1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${inter.variable} antialiased`}>
      <body>
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
