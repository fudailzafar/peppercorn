// Dime's colour system, extracted from its asset catalogue.
export type ColorName = 'PrimaryBackground' | 'SecondaryBackground' | 'TertiaryBackground' | 'PrimaryText' | 'SubtitleText' | 'EvenLighterText' | 'DarkIcon' | 'LightIcon' | 'GreyIcon' | 'DarkBackground' | 'Outline' | 'IncomeGreen' | 'AlertRed' | 'Alert' | 'BudgetBackground' | 'BudgetRed' | 'Settings' | 'Yellow';

export const lightColors: Record<ColorName, string> = {
  "PrimaryBackground": "#FFFFFF",
  "SecondaryBackground": "#F6F6F6",
  "TertiaryBackground": "#A6A6A6",
  "PrimaryText": "#010101",
  "SubtitleText": "#A6A6A6",
  "EvenLighterText": "#C7C7CC",
  "DarkIcon": "#3D3D3D",
  "LightIcon": "#FFFFFF",
  "GreyIcon": "#DADADA",
  "DarkBackground": "#3C3C3C",
  "Outline": "#ECF0F4",
  "IncomeGreen": "#03CD86",
  "AlertRed": "#FE473A",
  "Alert": "#FDECED",
  "BudgetBackground": "#FBFBFB",
  "BudgetRed": "#F17879",
  "Settings": "#FBFBFB",
  "Yellow": "#FDCC41"
};

export const darkColors: Record<ColorName, string> = {
  "PrimaryBackground": "#060A07",
  "SecondaryBackground": "#3A3A3C",
  "TertiaryBackground": "#1C1C1E",
  "PrimaryText": "#FFFFFF",
  "SubtitleText": "#767676",
  "EvenLighterText": "#8E8E93",
  "DarkIcon": "#FBFBFB",
  "LightIcon": "#232626",
  "GreyIcon": "rgba(218,218,218,0.55)",
  "DarkBackground": "#FFFFFF",
  "Outline": "#2E2E2E",
  "IncomeGreen": "#0FFFA9",
  "AlertRed": "#FE473A",
  "Alert": "#FDECED",
  "BudgetBackground": "#1C1B1A",
  "BudgetRed": "#F17879",
  "Settings": "#191B20",
  "Yellow": "#FDCC41"
};

export const percentage = {
  "Light Green": {
    "light": "#EEFDF3",
    "dark": "#1D3021"
  },
  "Red": {
    "light": "#FE6940",
    "dark": "#FE6940"
  },
  "Green": {
    "light": "#34E15B",
    "dark": "#76EC95"
  },
  "Light Red": {
    "light": "#FFF2F0",
    "dark": "#FFF2F0"
  }
} as const;

/** Colours offered for a category (the app's colour picker). */
export const categoryColors: string[] = ["#279AF4", "#FE724E", "#B1638B", "#D364FE", "#6A7CF9", "#FDBC3B", "#FF78A3", "#FDD011", "#F73C60", "#23CAFF", "#7B01FE", "#FE6663", "#77B6F1", "#158AB1", "#B0D7FE", "#CD8A53", "#9DADFF", "#6BB2AA", "#FDD27D", "#859977", "#FEAB84", "#244C7F", "#3BB19F", "#E3667E", "#9EC983"];

/** Red to green gradient stops used for budget progress. */
export const budgetGradient: string[] = ["#EB485D", "#FE8155", "#FDAE58", "#9DE862", "#51DC99", "#5EECD5"];
