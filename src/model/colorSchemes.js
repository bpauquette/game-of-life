// colorSchemes.js

// Color scheme animation and positioning constants
const SPECTRUM_TIME_DIVISOR = 20;
const SPECTRUM_X_MULTIPLIER = 10;
const SPECTRUM_Y_MULTIPLIER = 5;
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
  spectrum: {
    name: "Spectrum Pulse",
    background: "#000",
    getCellColor: (x, y, t = Date.now()) =>
      `hsl(${(t / SPECTRUM_TIME_DIVISOR + x * SPECTRUM_X_MULTIPLIER + y * SPECTRUM_Y_MULTIPLIER) % HUE_FULL_CIRCLE}, ${SATURATION_HIGH}%, ${LIGHTNESS_MEDIUM}%)`,
  },
  neon: {
    name: "Neon Grid",
    background: "#0a0a1a",
    getCellColor: (x, y) =>
      `hsl(${(x * NEON_X_MULTIPLIER + y * NEON_Y_MULTIPLIER) % HUE_FULL_CIRCLE}, ${SATURATION_HIGH}%, ${LIGHTNESS_BRIGHT}%)`,
  },
  bio: {
    name: "BioLife",
    background: "#0e1a12",
    getCellColor: () => "#4aff6c",
  },
  ember: {
    name: "Ember Field",
    background: "#1a0b0b",
    getCellColor: (x, y) =>
      `hsl(${EMBER_HUE_BASE + ((x + y) % EMBER_HUE_VARIATION)}, ${SATURATION_EMBER}%, ${LIGHTNESS_MEDIUM}%)`,
  },
  retro: {
    name: "Retro Vector",
    background: "#001f3f",
    getCellColor: () => "#39ff14",
  },
};
