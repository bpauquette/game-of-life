// colorSchemes.js
export const colorSchemes = {
  spectrum: {
    name: "Spectrum Pulse",
    background: "#000",
    getCellColor: (x, y, t = Date.now()) => 
      `hsl(${(t / 20 + x * 10 + y * 5) % 360}, 100%, 50%)`
  },
  neon: {
    name: "Neon Grid",
    background: "#0a0a1a",
    getCellColor: (x, y) => `hsl(${(x * 50 + y * 90) % 360}, 100%, 60%)`
  },
  bio: {
    name: "BioLife",
    background: "#0e1a12",
    getCellColor: () => "#4aff6c"
  },
  ember: {
    name: "Ember Field",
    background: "#1a0b0b",
    getCellColor: (x, y) => `hsl(${20 + ((x + y) % 20)}, 90%, 50%)`
  },
  retro: {
    name: "Retro Vector",
    background: "#001f3f",
    getCellColor: () => "#39ff14"
  }
};
