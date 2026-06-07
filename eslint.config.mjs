import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [".next/**", "convex/_generated/**", "node_modules/**"],
  },
  ...nextVitals,
];

export default config;
