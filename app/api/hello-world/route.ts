/**
 * 【第3阶段 · 入门】/api/hello-world
 *
 * 最简单的 API：导出 GET 函数 → 浏览器访问 /api/hello-world 看到 JSON（不是网页）。
 * 这里没有 async，因为不需要 await 等任何操作。
 * 可用 debug/apitest.http 或浏览器地址栏直接测试 GET 接口。
 */
export function GET(req: Request) {
  // Response.json：把 JS 对象转成 JSON 返回给前端
  return Response.json({
    code: 1,
    message: "ok",
  });
}
