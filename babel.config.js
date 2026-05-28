module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          unstable_transformImportMeta: true,
          // hermes-stable (hermes-v1) skips private class field transforms,
          // but the embedded Hermes binary rejects them at runtime. Force
          // hermes-v0 profile which includes the class-properties plugins with
          // correct ordering (after Flow type stripping).
          unstable_transformProfile: "hermes-v0",
        },
      ],
    ],
  };
};
