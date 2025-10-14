const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withAndroidDrawables(config, props = {}) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      if (props.drawableFiles) {
        const androidResPath = path.join(
          config.modRequest.platformProjectRoot,
          "app/src/main/res/drawable"
        );

        if (!fs.existsSync(androidResPath)) {
          fs.mkdirSync(androidResPath, { recursive: true });
        }

        for (const file of props.drawableFiles) {
          const filename = path.basename(file);
          fs.copyFileSync(file, path.join(androidResPath, filename));
          console.log(`✔ Copied drawable: ${filename}`);
        }
      }
      return config;
    },
  ]);
};
