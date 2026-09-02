import type { Metadata } from "next";
import { Libre_Caslon_Text, Plus_Jakarta_Sans, JetBrains_Mono, Caveat } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";

const libreCaslonText = Libre_Caslon_Text({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-hero',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-script',
});

export const metadata: Metadata = {
  title: "VEKTOR - We Don't Hire. We Select.",
  description: "A student society that ships real, funded, campus-deployed systems - not portfolio pieces.",
  openGraph: {
    title: "VEKTOR - We Don't Hire. We Select.",
    description: "A student society that ships real, funded, campus-deployed systems - not portfolio pieces.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${libreCaslonText.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} ${caveat.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <SmoothScroll>
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}
