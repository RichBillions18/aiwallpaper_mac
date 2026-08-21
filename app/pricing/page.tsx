/**
 * 【第2阶段 · 路由 /pricing】app/pricing/page.tsx
 *
 * 文件路径 app/pricing/page.tsx → 网址 /pricing（Header 里「付费」链接指向这里）
 *
 * 本页是服务端组件（没有 "use client"）：只负责把 Header / Pricing / Footer 拼在一起。
 * 交互逻辑在子组件里各自处理：
 *   - Header  自带 "use client"，未传 credits 时会自己拉积分
 *   - Pricing 自带 "use client"，点击购买时调 /api/checkout
 *   - Footer  纯展示，无 state、无 API
 *
 * 和首页 app/page.tsx 的区别：首页要管壁纸列表和登录，所以 page 本身是客户端组件；
 * 定价页只做组装，更薄一层。
 */
import Footer from "@/components/footer";
import Header from "@/components/header";
import Pricing from "@/components/pricing";

export default function Home() {
  return (
    <div className="w-screen h-screen">
      <Header />
      <Pricing />
      <Footer />
    </div>
  );
}
