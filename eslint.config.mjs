/**
 * 【第8阶段 · 代码检查】eslint.config.mjs
 *
 * pnpm lint 会跑这里的规则，帮助发现常见问题。
 * 部署前可选跑一次；Vercel 默认不阻塞 build，但本地 lint 有助于提前发现问题。
 */
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
