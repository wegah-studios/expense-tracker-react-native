/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: [
    "./app/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        urbanist: ["Urbanist-Regular"],
        urbanistMedium: ["Urbanist-Medium"],
        urbanistBold: ["Urbanist-Bold"],
      },
      colors: {
        primary: "#D8DFE9",
        secondary: "#CFDECA",
        accent: "#EFF0A3",
        paper: {
          light: "#EFEFEF",
          dark: "#252525",
        },
        background: {
          light: "#FFFFFF",
          dark: "#000000",
        },
        error: "#ff3d00",
        warning: "#ff9100",
        success: "#00BA00",
        info: "#00b0ff",
        divider: "#808080",
      },
    },
  },
  plugins: [],
};
