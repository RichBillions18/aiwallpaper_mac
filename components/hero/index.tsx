/**
 * 【第1阶段 · 第1课】Hero 组件 —— 最简单的「纯展示」组件
 *
 * 特点：
 *   - 没有 useState → 不存会变的数据
 *   - 没有 props → 不从父组件接收数据
 *   - 没有 "use client" → 不需要浏览器交互，默认就是服务端组件
 *
 * 组件 = 一个函数 + return 一段 JSX（看起来像 HTML 的结构）
 * className = Tailwind CSS 样式类，用来控制颜色、字号、间距等
 */
export default function Hero() {
  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-7xl px-5 pt-4">
        <div className="mx-auto mb-12 w-full max-w-3xl text-center md:mb-16 lg:mb-20">
          <h1 className="mb-4 text-primary text-4xl font-semibold md:text-6xl">
            AI 壁纸生成器
          </h1>
          <p className="mx-auto mb-5 max-w-[528px] text-xl text-[#636262] lg:mb-8">
            帮你生成好看的壁纸
          </p>
          <div className="flex justify-center"></div>
        </div>
      </div>
    </section>
  );
}
