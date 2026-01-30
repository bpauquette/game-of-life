module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  plugins: ["react", "react-hooks"],
  rules: {
    "react-hooks/exhaustive-deps": "error"
  },
  settings: {
    react: {
      version: "detect"
    }
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  }
};