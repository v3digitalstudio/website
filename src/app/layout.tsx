import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import "./globals.css";
import "./variants.css";
import "./navigation-footer.css";
import "./editorial-layouts.css";
import "./field-motion.css";
import "./field-content.css";
import "./booking-contact.css";

const mona = localFont({
  src: "../fonts/Mona-Sans.final.woff2",
  variable: "--font-mona",
  display: "swap",
});
export const metadata: Metadata = {
  metadataBase: new URL("https://v3digital.studio"),
  alternates: { canonical: "/" },
  title: "V3 Digital Studio — Design and development for the AI generation",
  description:
    "We design and develop websites and digital products for the AI generation. From the first idea to launch, V3 brings design and engineering together.",
  openGraph: {
    title: "V3 Digital Studio",
    description:
      "Websites and products for the AI generation. Designed and built by V3.",
    type: "website",
    url: "https://v3digital.studio",
    siteName: "V3 Digital Studio",
  },
  icons: {
    icon: [
      {
        url: "/company/logo-light.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/company/logo-dark.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: dark)",
      },
    ],
  },
};
export default function RootLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  return (
    <html lang="en" className={mona.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
