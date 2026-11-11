import localFont from "next/font/local";

// Labs type, scoped to /labs. Only the faces visible on the first slide preload.
const display = localFont({
  src: "../../fonts/labs/poppins-600-latin.woff2",
  weight: "600",
  variable: "--font-labs-display",
  display: "swap",
});
const pixel = localFont({
  src: "../../fonts/labs/geist-pixel-square.woff2",
  weight: "500",
  variable: "--font-labs-pixel",
  display: "swap",
});
const syne = localFont({
  src: "../../fonts/labs/syne-700.ttf",
  weight: "700",
  variable: "--font-labs-syne",
  display: "block",
  preload: false,
});
const geist = localFont({
  src: "../../fonts/labs/geist-latin.woff2",
  weight: "400 600",
  variable: "--font-labs-geist",
  display: "swap",
  preload: false,
});
const geistMono = localFont({
  src: "../../fonts/labs/geist-mono-latin.woff2",
  weight: "400 500",
  variable: "--font-labs-geist-mono",
  display: "swap",
  preload: false,
});
const bitcount = localFont({
  src: "../../fonts/labs/bitcount-prop-single-600-latin.woff2",
  weight: "600",
  variable: "--font-labs-bitcount",
  display: "block",
  preload: false,
});
const spaceGrotesk = localFont({
  src: "../../fonts/labs/space-grotesk-latin.woff2",
  weight: "300 700",
  variable: "--font-labs-space-grotesk",
  display: "swap",
  preload: false,
});
const plexMono = localFont({
  src: "../../fonts/labs/ibm-plex-mono-regular-latin.woff2",
  weight: "400",
  variable: "--font-labs-plex-mono",
  display: "swap",
  preload: false,
});

export const labsFontVariables = [
  display,
  pixel,
  syne,
  geist,
  geistMono,
  bitcount,
  spaceGrotesk,
  plexMono,
]
  .map((font) => font.variable)
  .join(" ");
