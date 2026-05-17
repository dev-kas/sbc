import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";

const plugins = [resolve(), commonjs(), json()];

export default [
  // cli build
  {
    input: "src/cli.js",
    output: {
      file: "dist/cli.js",
      format: "cjs",
      banner: "#!/usr/bin/env node",
    },
    plugins,
    external: ["fs", "path", "crypto", "fs-adapters", "commander", "jszip"],
  },

  // library build
  {
    input: "src/index.js",
    output: {
      file: "dist/index.js",
      format: "cjs",
    },
    plugins,
    external: ["fs-adapters", "jszip"],
  },
];
