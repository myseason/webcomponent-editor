import { dirname } from "path";
import { fileURLToPath } from "url";

import { FlatCompat } from "@eslint/eslintrc";
import importPlugin from "eslint-plugin-import";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    plugins: {
      import: importPlugin,
      "react-hooks": reactHooks, // ✅
    },
    rules: {
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-explicit-any": "error", // ✅ any 금지
      "import/order": [
        "warn",
        {
          groups: [
            "builtin", // Node.js 내장 모듈
            "external", // npm 패키지
            "internal", // 내부 모듈
            "parent", // 상위 디렉토리
            "sibling", // 같은 디렉토리
            "index", // index 파일
          ],
          pathGroups: [
            {
              pattern: "{react,react-dom,react/**}",
              group: "external",
              position: "before",
            },
            {
              pattern: "{next,next/**}",
              group: "external",
              position: "before",
            },
            {
              pattern: "@/**",
              group: "internal",
            },
            {
              pattern: "../**",
              group: "parent",
            },
            {
              pattern: "./**",
              group: "sibling",
            },
            {
              pattern: "**/**hooks/**",
              group: "internal",
              position: "after",
            },
            {
              pattern: "**/**store*",
              group: "internal",
              position: "after",
            },
            {
              pattern: "**/**types*",
              group: "internal",
              position: "after",
            },
            {
              pattern: "**/**constants*",
              group: "internal",
              position: "after",
            },
            {
              pattern: "**/**consts*",
              group: "internal",
              position: "after",
            },
          ],
          pathGroupsExcludedImportTypes: [],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
    },
  },
];

export default eslintConfig;
