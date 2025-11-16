const { withProjectBuildGradle } = require("@expo/config-plugins");

const KSP_CLASSPATH = `classpath("com.google.devtools.ksp:com.google.devtools.ksp.gradle.plugin:2.1.20-2.0.1")`;

module.exports = function withGradleKSPSetup(config) {
  return withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Find the buildscript { dependencies { ... } } block
    const buildscriptPattern =
      /buildscript\s*{[\s\S]*?dependencies\s*{([\s\S]*?)}/m;

    if (buildscriptPattern.test(contents)) {
      console.log(`✔ Build script found`);
      // Prevent duplicates
      if (!contents.includes(KSP_CLASSPATH)) {
        contents = contents.replace(buildscriptPattern, (match) => {
          return match.replace(
            /dependencies\s*{/,
            `dependencies {\n    ${KSP_CLASSPATH}`
          );
        });
        console.log(`✔ KSP setup complete`);
      } else {
        console.log(`✔ KSP setup already exists`);
      }
    } else {
      console.log(`❌ Build script not found, setup incomplete.`);
    }

    config.modResults.contents = contents;
    return config;
  });
};
