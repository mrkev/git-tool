// rollup.config.js
import json from "@rollup/plugin-json";
import typescript from "@rollup/plugin-typescript";
import { globSync } from "glob";
import { basename } from "path";
import nativePlugin from "rollup-plugin-natives";
import { preserveShebangs } from "rollup-plugin-preserve-shebangs";

const plugins = [
  preserveShebangs(),
  typescript(),
  json(),
  nativePlugin({
    // Where we want to physically put the extracted .node files
    copyTo: "dist/libs",

    // Path to the same folder, relative to the output bundle js
    destDir: "./libs",

    // Use `dlopen` instead of `require`/`import`.
    // This must be set to true if using a different file extension that '.node'
    dlopen: false,

    // Modify the final filename for specific modules
    // A function that receives a full path to the original file, and returns a desired filename
    // map: (modulePath) => 'filename.node',

    // Or a function that returns a desired file name and a specific destination to copy to
    // map: (modulePath) => { name: 'filename.node', copyTo: 'C:\\Dist\\libs\\filename.node' },

    // Generate sourcemap
    sourcemap: false,
  }),
];

const cmds = globSync("src/cmd/gg*.ts").map((path) => basename(path, ".ts"));

/** @type {import('rollup').RollupOptions} */
export default cmds.map((cmd) => ({
  input: `src/cmd/${cmd}.ts`,
  output: {
    // dir: "dist",
    file: `dist/${cmd}`,
    format: "esm",
  },
  plugins,
}));
