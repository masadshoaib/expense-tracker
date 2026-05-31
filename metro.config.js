const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enableSymlinks = true;

// Force transformation of react-native DOM API packages that use private class fields
const defaultBlockList = config.resolver.blockList || [];
// pnpm stores packages at node_modules/.pnpm/{pkg}@{ver}/node_modules/{pkg}/
// The regex must handle both direct and pnpm-nested paths.
const TRANSFORM_ALLOWLIST = [
  "react-native",
  "@react-native",
  "expo",
  "@expo",
  "react-navigation",
  "@react-navigation",
  "react-native-reanimated",
  "react-native-worklets",
  "react-native-gesture-handler",
  "react-native-screens",
  "react-native-safe-area-context",
  "@react-native-community",
  "@tanstack",
].join("|");
config.transformer.transformIgnorePatterns = [
  `node_modules/(?!(.pnpm/[^/]+/node_modules/)?(${TRANSFORM_ALLOWLIST})/)`,
];

// Required for expo-sqlite on web: SharedArrayBuffer needs cross-origin isolation
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
      middleware(req, res, next);
    };
  },
};

module.exports = config;
