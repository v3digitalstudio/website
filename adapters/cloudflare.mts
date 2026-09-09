import { copyFile, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { NextAdapter } from "next";

const cloudflareAdapter = {
  name: "v3-cloudflare-static",
  modifyConfig(config, { phase }) {
    return phase === "phase-production-build"
      ? { ...config, output: "export", trailingSlash: true }
      : config;
  },
  async onBuildComplete({ projectDir, outputs }) {
    const assetDirectory = join(projectDir, ".cloudflare", "assets");
    await rm(assetDirectory, { recursive: true, force: true });
    await Promise.all(
      outputs.staticFiles.map(async (output) => {
        const pathname = output.filePath.endsWith(".html")
          ? `${output.pathname === "/" ? "/index" : output.pathname}.html`
          : output.pathname;
        const destination = join(assetDirectory, pathname);
        await mkdir(dirname(destination), { recursive: true });
        await copyFile(output.filePath, destination);
      }),
    );
  },
} satisfies NextAdapter;

export default cloudflareAdapter;
