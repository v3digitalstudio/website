export const direction = {
  id: "field",
  path: "/",
  number: "04",
  name: "Field",
  description: "Give your next launch a reason to stand out.",
  headline: ["Build beyond", "what’s expected."],
  body: "V3 Digital Studio is a design and development studio for the AI generation. We use the latest web technology and AI to turn ambitious ideas into websites and products ready for their next chapter.",
  servicesTitle: "A strong idea, carried through.",
  servicesBody:
    "The identity, the interface, and the build work together to make your next launch recognizably yours.",
  studioTitle: "Make your next move unmistakable.",
  studioBody:
    "Templates can get you online. We help you define what comes next: a website with a point of view, a product with a purpose, and modern technology behind both.",
  contactTitle: "Start with what matters.",
  contactBody:
    "Tell us what your business is ready to do next. We’ll help you design and build it.",
} as const;

export type Direction = typeof direction;
