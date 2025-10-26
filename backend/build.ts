import { build } from "esbuild";

export function createBuildSettings() {
  return {
    entryPoints: ["src/main.ts"],
    outfile: "dist/bundle.js",
    bundle: true,
    plugins: [],
    minify: true,
    platform: "node",
    target: ["node16"],
  } satisfies Parameters<typeof build>[0];
}
build(createBuildSettings());
