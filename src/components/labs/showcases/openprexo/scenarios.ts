// The three steps of openprexo's own site demo (packages/site/components/home/app-demo.tsx), with its real generations.

export type ScenarioId = "image" | "edit" | "video";

export type Scenario = {
  readonly chip: string;
  readonly mode: "image" | "video";
  readonly prompt: string;
  readonly model: string;
  readonly source: string;
  readonly params: string;
  readonly batch: boolean;
  readonly title: string;
  readonly meta: string;
  readonly finishedMeta?: string;
  readonly layout: "" | "is-single" | "is-wide";
  readonly tiles: readonly { readonly src: string; readonly alt: string }[];
  /** Edits start from this image instead of noise. */
  readonly from?: string;
  readonly video?: { readonly src: string; readonly alt: string };
  readonly toast: string;
};

const batchAlt = (n: number) =>
  `Generated image ${n}: a woman in a long coat in a neon-lit Tokyo alley at night`;

export const scenarios: Record<ScenarioId, Scenario> = {
  image: {
    chip: "Image batch",
    mode: "image",
    prompt:
      "street photograph of a woman in a long coat walking through a narrow Tokyo alley at night, glowing neon signs in Japanese, light rain, reflections on wet pavement, shallow depth of field, 35mm film",
    model: "FLUX.1 schnell",
    source: "fal",
    params: "1024×1024",
    batch: true,
    title: "4 images · fal",
    meta: "FLUX.1 schnell · 1024×1024",
    layout: "",
    tiles: [1, 2, 3, 4].map((n) => ({
      src: `/labs/tokyo-${n}.jpg`,
      alt: batchAlt(n),
    })),
    toast: "4 images saved to Tokyo nights",
  },
  edit: {
    chip: "Edit a result",
    mode: "image",
    prompt:
      "make it snowing heavily, keep the woman, the alley, and the neon signs",
    model: "FLUX.1 Kontext",
    source: "fal",
    params: "edit",
    batch: false,
    title: "Image edit · fal",
    meta: "FLUX.1 Kontext",
    layout: "is-single",
    tiles: [
      {
        src: "/labs/tokyo-snow.jpg",
        alt: "Edited image: the same alley and woman in heavy snow",
      },
    ],
    from: "/labs/tokyo-3.jpg",
    toast: "Edit saved as a new image",
  },
  video: {
    chip: "Make a video",
    mode: "video",
    prompt:
      "cinematic tracking shot following a woman in a long coat walking through a rain-soaked Tokyo street at night, neon reflections on wet asphalt, slow push in",
    model: "Wan 2.7",
    source: "fal",
    params: "5 s · 720p · 16:9",
    batch: false,
    title: "Video · fal",
    meta: "Wan 2.7 · 5 s · 720p",
    finishedMeta: "MP4 · 1280×720 · 5.0 s",
    layout: "is-wide",
    tiles: [{ src: "/labs/tokyo-walk-poster.jpg", alt: "" }],
    video: {
      src: "/labs/tokyo-walk.mp4",
      alt: "Generated video: a woman in a long coat walking through a rainy neon alley",
    },
    toast: "Video saved to Tokyo nights",
  },
};

export const order: readonly ScenarioId[] = ["image", "edit", "video"];
export const nextScenario: Record<ScenarioId, ScenarioId> = {
  image: "edit",
  edit: "video",
  video: "image",
};
export const preloadImages = [
  ...scenarios.image.tiles.map((tile) => tile.src),
  "/labs/tokyo-snow.jpg",
  "/labs/tokyo-walk-poster.jpg",
];
