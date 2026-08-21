/**
 * 【第8阶段 · 样式构建】postcss.config.mjs
 *
 * 让 Tailwind CSS v4 参与构建；平时改 className 即可，一般不用动本文件。
 */
const config = {
  plugins: ["@tailwindcss/postcss"],
};

export default config;
