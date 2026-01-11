// colorSchemes.js

// Color scheme animation and positioning constants
const HUE_FULL_CIRCLE = 360;
const NEON_X_MULTIPLIER = 50;
const NEON_Y_MULTIPLIER = 90;
const EMBER_HUE_BASE = 20;
const EMBER_HUE_VARIATION = 20;
const SATURATION_HIGH = 100;
const LIGHTNESS_MEDIUM = 50;
const LIGHTNESS_BRIGHT = 60;
const SATURATION_EMBER = 90;

export const colorSchemes = {
  neon: {
    name: "Neon Grid",
    background: "#0a0a1a",
    gridColor: "#1d1f3d",
    cellColor: "#00ffff",
    getCellColor: (x, y) => `hsl(${(x * NEON_X_MULTIPLIER + y * NEON_Y_MULTIPLIER) % HUE_FULL_CIRCLE}, ${SATURATION_HIGH}%, ${LIGHTNESS_BRIGHT}%)`
  },
  bio: {
    name: "BioLife",
    background: "#0e1a12",
    gridColor: "#1c3a27",
    cellColor: "#4aff6c",
    getCellColor: () => "#4aff6c"
  },
  ember: {
    name: "Ember Field",
    background: "#1a0b0b",
    gridColor: "#3a1a1a",
    cellColor: "#ff4500",
    getCellColor: (x, y) => `hsl(${EMBER_HUE_BASE + ((x + y) % EMBER_HUE_VARIATION)}, ${SATURATION_EMBER}%, ${LIGHTNESS_MEDIUM}%)`
  },
  retro: {
    name: "Retro Vector",
    background: "#001f3f",
    gridColor: "#12345a",
    cellColor: "#39ff14",
    getCellColor: () => "#39ff14"
  },
  adaSafe: {
    name: "ADA Safe (Low Contrast)",
    background: "#1a1a1a",
    gridColor: "#2a2a2a",
    cellColor: "#4a4a4a",
    getCellColor: () => "#4a4a4a"
  }
};
