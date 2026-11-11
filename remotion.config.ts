import path from "node:path";
import { Config } from "@remotion/cli/config";

Config.setEntryPoint("./remotion/index.ts");
Config.setPublicDir("./public");
Config.setVideoImageFormat("jpeg");

// The video reuses site code, which imports through the "@/..." alias.
Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: { ...(config.resolve?.alias ?? {}), "@": path.resolve(process.cwd()) },
  },
}));
