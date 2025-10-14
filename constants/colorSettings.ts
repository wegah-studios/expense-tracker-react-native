export const colorCycle: Record<number, string> = {
  0: "primary",
  1: "secondary",
  2: "accent",
  3: "paper-light",
};

export const tintColors = {
  light: "#FFFFFF",
  dark: "#000000",
  error: "#ff3d00",
  warning: "#ff9100",
  success: "#00BA00",
  info: "#00b0ff",
  divider: "#808080",
  primary: "#D8DFE9",
  secondary: "#CFDECA",
  accent: "#EFF0A3",
  paper: {
    light: "#EFEFEF",
    dark: "#252525",
  },
};

export const getPercentColor = (percent: number) => {
  let colors: { text: string | undefined; chart: string } = {
    text: undefined,
    chart: "0, 0, 0",
  };

  if (percent >= 0.9) {
    colors.text = tintColors.error;
    colors.chart = "255, 61, 0";
  } else if (percent > 0.8) {
    colors.text = tintColors.warning;
    colors.chart = "255, 145, 0";
  }

  return colors;
};
