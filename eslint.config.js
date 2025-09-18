export default [
  {
    files: ["**/*.js"], // áp dụng cho tất cả file JS
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        // các global Node phổ biến
        process: "readonly",
        console: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
      semi: ["error", "always"],
      quotes: ["error", "double"],
    },
  },
];
