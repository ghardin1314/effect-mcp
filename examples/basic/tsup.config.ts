// tsup.config.ts
import { defineConfig } from "tsup";

export default defineConfig({
  format: ["esm"],
  entry: ["src/*.ts"],
  clean: true,
  target: "esnext",
  minify: true,
  sourcemap: false,
  tsconfig: "tsconfig.json",
});
