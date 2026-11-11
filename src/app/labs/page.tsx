import type { Metadata } from "next";
import { Labs } from "../../components/labs/labs";
import { labsFontVariables } from "./fonts";
import "./labs.css";
import "./labs-showcases.css";

const description =
  "Products built by V3 Digital Studio: Quipthread, Spritedeck, primecms and openprexo.";

export const metadata: Metadata = {
  title: "Labs — V3 Digital Studio",
  description,
  alternates: { canonical: "/labs/" },
  openGraph: {
    title: "V3 Labs",
    description,
    type: "website",
    url: "https://v3digital.studio/labs/",
    siteName: "V3 Digital Studio",
  },
};

export default function LabsPage() {
  return <Labs fontClassName={labsFontVariables} />;
}
