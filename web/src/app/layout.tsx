import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppFrame } from "@/components/shell/AppFrame";
import { MouseEffects } from "@/components/MouseEffects";
import { ScrollToTop } from "@/components/ScrollToTop";
import { SkipLink } from "@/components/SkipLink";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#b9470e",
};

export const metadata: Metadata = {
  title: "SGA — Automotive Management System",
  description: "Sistema de Gestión Automotriz — Reception, Diagnosis, Quoting & Client Approval",
  manifest: "/manifest.json",
  icons: { icon: "/sga-mark.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{__html:`try{var p=localStorage.getItem('app-theme')||'system';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.dataset.theme=d?'dark':'light'}catch(e){}`}} /></head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <ScrollToTop />
              <MouseEffects />
              <SkipLink />
              <AppFrame>{children}</AppFrame>
              <Toaster
                richColors
                position="top-right"
                offset={{ top: 72, right: 16 }}
                mobileOffset={{ top: 72, right: 16, left: 16 }}
              />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
