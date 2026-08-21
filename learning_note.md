# AI Wallpaper 全栈学习笔记

> 基于 8 阶段系统学习整理，适合按章节复习、闭卷自测、部署前查漏补缺。
> 项目路径：`aiwallpaper_mac`

---

## 如何使用本笔记

| 复习方式 | 建议                                             |
| -------- | ------------------------------------------------ |
| 第一次过 | 按阶段 1→8 顺序读，配合源码对照                  |
| 第二次过 | 只看「三条用户旅程」+「速查表」                  |
| 自测     | 每阶段末尾「自测题」先写答案再展开看「标准答案」 |
| 部署前   | 重点看阶段 8 + 环境变量清单 + 部署检查表         |

---

## 0. 项目一句话

**AI 壁纸 SaaS**：用户 Clerk 登录 → 用积分生成壁纸（OpenAI + S3 + PostgreSQL）→ 积分不足 Stripe 付费 → 部署在 Vercel。

### 技术栈

| 层次   | 技术                                            |
| ------ | ----------------------------------------------- |
| 前端   | React 19 + Next.js 15 App Router + Tailwind CSS |
| 后端   | Next.js Route Handler（`app/api`）              |
| 数据库 | PostgreSQL（Supabase 托管）                     |
| 登录   | Clerk                                           |
| AI     | OpenAI DALL·E 3                                 |
| 图床   | AWS S3                                          |
| 支付   | Stripe Checkout                                 |
| 部署   | Vercel + Git                                    |

### 架构分层

```
浏览器（React 组件 + fetch + useUser）
    ↓ HTTP（/api/...，带 Clerk Cookie）
Next.js 服务器
    ├── middleware.ts（Clerk 会话）
    ├── app/api/*（API 编排）
    ├── service/*（业务逻辑，如积分）
    └── models/* + lib/*（DB / S3 / OpenAI）
    ↓
PostgreSQL | OpenAI | AWS S3 | Clerk | Stripe
```

| 层        | 目录                  | 职责                               |
| --------- | --------------------- | ---------------------------------- |
| 页面/组件 | `app/`、`components/` | UI、交互、fetch                    |
| API       | `app/api/`            | 收请求、鉴权、编排                 |
| Service   | `service/`            | 业务逻辑（不算积分以外的复杂规则） |
| Model/Lib | `models/`、`lib/`     | SQL、S3、OpenAI 客户端             |

---

## 1. 目录与路由地图

```
app/
├── layout.tsx                 根布局 + ClerkProvider
├── page.tsx                   / 首页
├── pricing/page.tsx           /pricing
├── pay-success/[session_id]/  /pay-success/xxx（动态路由）
├── blog/                      /blog、/blog/detail
└── api/
    ├── get-wallpapers/route.ts    GET
    ├── gen-wallpaper/route.ts     POST（核心）
    ├── get-user-info/route.ts     POST
    └── checkout/route.ts          POST

components/   header、input、wallpapers、pricing、hero、footer
models/       db、wallpaper、order、user
service/      openai、order
lib/          s3、utils
types/        wallpaper、user、order
data/         install.sql
middleware.ts
```

| 文件类型     | 作用                          |
| ------------ | ----------------------------- |
| `page.tsx`   | 页面（给人看）                |
| `layout.tsx` | 公共外壳                      |
| `route.ts`   | API（给 fetch 用，返回 JSON） |
| `[xxx]/`     | 动态路由，URL 中可变段        |

---

## 2. 数据库三表

```sql
-- data/install.sql
users      (email UNIQUE, nickname, avatar_url)
wallpapers (user_email, img_url, img_description, llm_name, created_at ...)
orders     (user_email, order_no, order_status, credits, expired_at, stripe_session_id ...)
```

**关联方式**：逻辑上用 `user_email` / `users.email` 字符串关联，无 SQL 外键。

| 表           | 作用                                        |
| ------------ | ------------------------------------------- |
| `wallpapers` | 存壁纸；COUNT 统计已用积分                  |
| `orders`     | 存订单；status=2 且未过期计入 total_credits |
| `users`      | 可选；Clerk 为主，insertUser 当前被注释     |

### 积分公式

```
left_credits = total_credits - used_credits

used_credits  = COUNT(wallpapers WHERE user_email = ?)
total_credits = SUM(orders.credits WHERE order_status=2 AND 未过期)
                无有效订单时默认 3 次免费
```

### SQL 三种操作（本项目）

| 操作   | 例子                                                 |
| ------ | ---------------------------------------------------- |
| INSERT | insertWallpaper、insertOrder                         |
| SELECT | getWallpapers、getUserOrders、getUserWallpapersCount |
| UPDATE | updateOrderStatus、updateOrderSession                |

**参数占位符** `$1, $2...`：防 SQL 注入，值放在第二个数组里按序传入。

---

## 3. 三条核心用户旅程（必背）

### 旅程 A：登录 → 看列表 → 生成壁纸

```
/ → useUser 未登录 → RedirectToSignIn
登录后 → fetch get-wallpapers + get-user-info
用户输入 → POST gen-wallpaper
  → currentUser 鉴权 → getUserCredits 查积分
  → OpenAI 生图 → S3 上传 → insertWallpaper
  → 返回 data → setWallpapers([data, ...list])
```

### 旅程 B：积分不足 → 付费

```
/pricing → POST checkout
  → insertOrder(status=1) → Stripe Session → updateOrderSession
  → redirectToCheckout → Stripe 付款
  → /pay-success/[session_id] → updateOrderStatus(status=2) → redirect /
  → getUserCredits → left_credits 增加
```

### 旅程 C：部署上线

```
pnpm build 验证 → git push → Vercel 导入 + 环境变量
→ 更新 Clerk 线上域名 + WEB_BASE_URL 为 Vercel 地址
→ 全链路测试
```

---

## 4. API 速查

| API                   | 方法 | 鉴权        | 作用         |
| --------------------- | ---- | ----------- | ------------ |
| `/api/get-wallpapers` | GET  | 无          | 拉壁纸列表   |
| `/api/get-user-info`  | POST | currentUser | 查积分       |
| `/api/gen-wallpaper`  | POST | currentUser | 生图+S3+写库 |
| `/api/checkout`       | POST | currentUser | 建单+Stripe  |

### 统一响应格式

```json
{ "code": 0, "message": "ok", "data": ... }
```

| code | 含义（gen-wallpaper） |
| ---- | --------------------- |
| 0    | 成功                  |
| -1   | 积分不足              |
| -2   | 未登录                |
| 400  | 参数错误              |
| 500  | 服务器错误            |

**GET vs POST**：GET 不读 body、常用来查；POST 用 `await req.json()` 读 body。

---

## 5. 登录与安全（Clerk）

### 三层结构

```
ClerkProvider（layout.tsx）  全站登录总开关
        ↓
middleware（clerkMiddleware）  每请求校验会话
        ↓
useUser（页面）               控制 UI
currentUser（API）            控制权限、取 user_email
```

|          | useUser            | currentUser             |
| -------- | ------------------ | ----------------------- |
| 运行位置 | 浏览器             | 服务器                  |
| 典型用途 | 跳转登录、显示按钮 | API 鉴权、写 user_email |

**原则**：前端登录管体验；**API 必须 currentUser()**，防 bypass。

**Cookie 传递**：同源 fetch 自动带 Clerk Cookie → API 用 currentUser() 识别用户；**不要**在 body 里传 email。

### 页面策略对比

| 页面 | 未登录处理                               |
| ---- | ---------------------------------------- |
| 首页 | `RedirectToSignIn` 强制跳转              |
| 博客 | `SignInButton mode="modal"` 留页弹窗登录 |

---

## 6. OpenAI + S3 流水线

```
description
  → prompt: "generate a desktop wallpaper about: {description}"
  → DALL·E 3 (1792x1024) → 临时 URL（会过期）
  → downloadAndUploadImage：fetch 下载 → Upload 到 S3
  → s3Result.Location → 写入 wallpapers.img_url
```

| 文件                     | 职责                               |
| ------------------------ | ---------------------------------- |
| `service/openai.ts`      | getOpenAIClient（apiKey, baseURL） |
| `lib/s3.ts`              | downloadAndUploadImage（AWS\_\*）  |
| `gen-wallpaper/route.ts` | 串联全流程                         |

**切记**：数据库存 **S3 URL**，不是 OpenAI 临时链接。

---

## 7. 支付与订单

| order_status | 含义   | 何时设置                      |
| ------------ | ------ | ----------------------------- |
| 1            | 待支付 | checkout insertOrder          |
| 2            | 已支付 | pay-success updateOrderStatus |

只有 **status=2 且未过期** 的订单 credits 计入 total_credits。

### Stripe 流程

```
前端 handleCheckout → POST checkout
→ 返回 public_key + session_id
→ loadStripe + redirectToCheckout
→ 付完跳转 WEB_BASE_URL/pay-success/{SESSION_ID}
```

---

## 8. 环境变量清单（部署必备）

| 变量                                                    | 服务                       |
| ------------------------------------------------------- | -------------------------- |
| `POSTGRES_URL`                                          | PostgreSQL / Supabase      |
| `apiKey`, `baseURL`                                     | OpenAI                     |
| `AWS_REGION`, `AWS_AK`, `AWS_SK`, `AWS_BUCKET_NAME`     | S3                         |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk                      |
| `STRIPE_PRIVATE_KEY`, `STRIPE_PUBLIC_KEY`               | Stripe                     |
| `WEB_BASE_URL`                                          | 本站 URL（拼 Stripe 回调） |

- 私钥：**仅服务器**，不进 Git（`.env`\* 已在 `.gitignore`）
- 本地：`.env`；线上：Vercel Environment Variables

### 部署后必改

1. **Clerk Dashboard**：Allowed origins / Redirect URLs 加线上域名
2. **WEB_BASE_URL**：改为 `https://xxx.vercel.app`（不能仍是 localhost）

---

## 9. 工程命令

| 命令         | 作用                          |
| ------------ | ----------------------------- |
| `pnpm dev`   | 开发（热更新）                |
| `pnpm build` | 生产构建（部署前必跑）        |
| `pnpm start` | 跑 build 产物（本地模拟线上） |
| `pnpm lint`  | ESLint 检查                   |

**Vercel 部署 ≈ 远程执行** `pnpm build` **+ 托管产物。**

### 路径别名

```json
// tsconfig.json
"@/*": ["./*"]
```

`@/components/header` = 项目根目录下 `components/header`。

---

## 10. 关键文件速查

| 想理解…  | 打开                                                  |
| -------- | ----------------------------------------------------- |
| 首页整体 | `app/page.tsx`                                        |
| 生成壁纸 | `components/input` → `api/gen-wallpaper`              |
| 列表数据 | `api/get-wallpapers` → `models/wallpaper`             |
| 积分计算 | `service/order.ts`                                    |
| 支付     | `components/pricing` → `api/checkout` → `pay-success` |
| 连数据库 | `models/db.ts`                                        |
| 登录     | `layout.tsx` + `middleware.ts`                        |
| 表结构   | `data/install.sql`                                    |

---

## 11. 分阶段学习要点 + 自测

---

### 阶段 1：前端基础

**要点**

- 组件 = 函数 + return JSX
- `useState`：会变的数据（description、wallpapers、loading）
- `useEffect`：时机到了自动执行（登录后拉列表）
- `props`：父传子（wallpapers 下发，setWallpapers 传给 Input）
- `"use client"`：要 hooks / 交互时必须写
- `[data, ...wallpapers]`：新图插到列表最前面

**状态提升**

| 数据          | 放哪            | 原因                       |
| ------------- | --------------- | -------------------------- |
| `description` | Input           | 只有输入框用               |
| `wallpapers`  | Home (page.tsx) | Input 和 Wallpapers 都要用 |

**自测 1**：画首页组件树和 props 流向。  
**自测 2**：为什么新图在最上？→ `[data, ...wallpapers]`。  
**自测 3**：description 和 wallpapers 为何分开存？

📎 阶段 1 答案摘要

- Home → Header/Hero/Input/Wallpapers/Footer；wallpapers 向下传，setWallpapers 传给 Input
- 新对象在数组 index 0，map 先渲染
- 谁用谁存；共享数据放共同父组件

---

### 阶段 2：Next.js 路由

**要点**

- 文件夹 = URL；`page.tsx` 页面，`route.ts` API
- `layout.tsx` 包外壳；`{children}` 是当前页内容
- 服务端组件：无 `"use client"`，可 async、可用密钥
- 客户端组件：有 `"use client"`，可用 hooks
- `[session_id]` 动态路由 → `params.session_id`
- middleware：请求先进门卫，再进 page/API

**自测 1**：至少 5 个 URL 与文件对应。  
**自测 2**：首页为何要 use client，pay-success 为何不要？  
**自测 3**：访问 `/` 和 `/api/get-wallpapers` 各经过哪些文件？

📎 阶段 2 答案摘要

- `/`→page.tsx，`/pricing`→pricing/page.tsx，`/pay-success/xxx`→动态 page，API→route.ts
- 首页要 hooks；pay-success 在服务器用 Stripe 私钥 + redirect
- `/`：middleware→layout→page（浏览器再 fetch API）；API：middleware→route.ts

---

### 阶段 3：API 与异步

**要点**

- Route Handler：导出 `GET` / `POST` 函数
- POST 读 body：`await req.json()`
- 返回：`Response.json({ code, message, data })`
- gen-wallpaper 流水线：鉴权→积分→OpenAI→S3→insertWallpaper
- try/catch → code 500
- apitest.http：单独测 API

**自测 1**：gen-wallpaper 至少 6 步。  
**自测 2**：GET get-wallpapers vs POST gen-wallpaper 区别。  
**自测 3**：积分不足 API 返回什么？前端应如何处理？

📎 阶段 3 答案摘要

- 读参→鉴权→积分→OpenAI→S3→insert→返回
- GET 不读 body 返回数组；POST 读 description 返回单条
- `{ code:-1, message:... }` 无 data；应读 code 提示并引导 /pricing（项目已优化）

---

### 阶段 4：数据库

**要点**

- `getDb()` + Pool 连接 PostgreSQL
- models 封装 SQL，API 不直接写 SQL
- insertWallpaper / getWallpapers / getUserWallpapersCount
- orders：insert → updateSession → updateStatus(2)

**自测 1**：三表字段与 user_email 关联。  
**自测 2**：INSERT 与 SELECT 中 $1 $2 的作用。  
**自测 3**：点击生成到写库经过哪些文件？

📎 阶段 4 答案摘要

- users.email = wallpapers/orders.user_email
- 占位符防注入，值在数组按序传入
- Input→gen-wallpaper→getUserCredits→OpenAI→s3→insertWallpaper→PostgreSQL

---

### 阶段 5：Clerk 登录

**要点**

- ClerkProvider → middleware → useUser / currentUser
- Cookie 自动携带；currentUser 取 user_email
- 首页 RedirectToSignIn vs 博客 SignInButton

**自测 1**：画 Clerk 三层结构。  
**自测 2**：首页 vs 博客未登录策略。  
**自测 3**：登录信息如何传到 gen-wallpaper API？

📎 阶段 5 答案摘要

- Provider 注入→middleware 校验会话→页面/API 分别用 useUser/currentUser
- 首页强制跳转；博客留页弹窗
- Cookie 自动带→currentUser()→emailAddresses[0]

---

### 阶段 6：OpenAI + S3

**要点**

- OpenAI 返回临时 URL；S3 存永久 URL
- openai.ts：客户端；s3.ts：下载+上传
- img_url 存 s3Result.Location

**自测 1**：OpenAI 到 S3 至少 5 步 + 为何要 S3。  
**自测 2**：两个 lib 职责与环境变量。  
**自测 3**：img_url 是 OpenAI 还是 S3？为什么？

📎 阶段 6 答案摘要

- 生图→临时URL→download→upload→Location→写库；OpenAI 链接会过期
- openai: apiKey/baseURL；s3: AWS\_\*
- S3 URL；长期展示

---

### 阶段 7：Stripe 支付

**要点**

- checkout：建单(1)→Stripe Session→updateSession
- pay-success：retrieve session→updateStatus(2)
- getUserCredits：orders 提供 total，wallpapers 提供 used

**自测 1**：点付款到积分增加至少 8 步。  
**自测 2**：order_status 1 和 2。  
**自测 3**：left_credits 与两表关系。

📎 阶段 7 答案摘要

- pricing→checkout→Stripe→pay-success→getUserCredits
- 1=待支付(insertOrder)，2=已支付(pay-success)
- orders=买的，wallpapers COUNT=用的，相减=剩余

---

### 阶段 8：工程化与部署

**要点**

- dev 开发 / build 构建 / start 模拟线上
- 环境变量分组：DB、OpenAI、S3、Clerk、Stripe、WEB_BASE_URL
- .env 不提交；Vercel 配变量
- 部署后改 Clerk 域名 + WEB_BASE_URL

**自测 1**：至少 8 个环境变量及服务。  
**自测 2**：dev vs build vs Vercel。  
**自测 3**：部署后 Clerk 和 WEB_BASE_URL 还要做什么？

📎 阶段 8 答案摘要

- 见第 8 节环境变量表（12 个）
- dev 写代码；build 编译；Vercel≈远程 build
- Clerk 加线上域名；WEB_BASE_URL 改 Vercel 地址否则支付跳 localhost

---

## 12. 实现细节备忘（进阶可改）

| 项                                | 说明                           |
| --------------------------------- | ------------------------------ |
| get-wallpapers 无登录校验         | API 层未鉴权                   |
| plan `"subscribe"` vs `"monthly"` | 前后端不一致，实际走 payment   |
| 有订单时默认 3 次免费             | getUserCredits 可能被覆盖      |
| order_no 用毫秒                   | 高并发可能冲突                 |
| pay-success 未 await update       | 极端情况可能 redirect 早于写库 |
| insertUser 注释                   | users 表与 Clerk 未同步        |

---

## 13. 闭卷自测清单（总复习）

- [ ] 不看代码画出首页组件树和数据流
- [ ] 说出 `"use client"` 何时需要
- [ ] 解释 GET 与 POST API 的区别
- [ ] 写出 gen-wallpaper 完整 8 步
- [ ] 写出积分公式及两表分工
- [ ] 解释 useUser 与 currentUser 区别
- [ ] 解释为何需要 S3
- [ ] 写出支付流程 order_status 1→2
- [ ] 列出 8+ 环境变量
- [ ] 说明部署后 Clerk 与 WEB_BASE_URL 为何要改

---

## 14. 进阶学习方向

- Stripe Webhook 补充 pay-success 回调
- get-wallpapers 增加登录校验
- 壁纸分页 / 只看我的
- Header 移入 layout 减少重复
- E2E 测试（登录→生图→支付）
- `.env.example` 方便协作

---

## 15. 一句话总总结

> **Next.js 全栈 AI 产品**：Clerk 管身份，OpenAI+S3 管生图存图，PostgreSQL 管数据和积分，Stripe 管收钱；前端 fetch 自己的 API，API 编排外部服务，**user_email** 串联一切。

---

_笔记版本：与 8 阶段课程同步 | 含积分不足前端优化后的实现说明_
