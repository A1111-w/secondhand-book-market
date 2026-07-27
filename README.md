# 校园二手集市

独立部署的校园二手交易项目，包含 Next.js 网页/API、网页版管理员后台和原生微信小程序。小程序不再包含管理员模式，所有审核操作集中在网页 `/admin`。

本仓库与“文核写作台”完全独立：数据库、JWT、用户、部署和受益人都不共享。两边只通过配置后的公网链接互相跳转。

## 目录

```text
apps/web       Next.js 15 网页端、管理员端与 API
apps/miniapp   原生微信小程序用户端
docs           安全与运维说明
```

原始 ZIP、`.env`、SQL 数据、`.next`、`node_modules`、用户上传头像/学生证/商品图和生成 Prisma Client 均未纳入仓库。数据库结构由 `apps/web/prisma/migrations` 维护。

## 本地运行

需要 Node.js 20+、npm 10+ 和 MySQL 8。

```powershell
Copy-Item .env.example apps/web/.env
npm --prefix apps/web install
npm --prefix apps/web run prisma:generate
npm --prefix apps/web run prisma:migrate
npm run dev
```

打开 `http://127.0.0.1:3000`。网页用户登录使用手机号/密码；管理员账号仍在同一用户表中，但只有数据库 `role=admin` 的账号能进入 `/admin` 并调用审核 API。

首次创建管理员时，先正常注册账号，再在服务端执行：

```powershell
$env:ADMIN_PHONE='已注册手机号'
npm --prefix apps/web run admin:promote
```

该命令只连接当前项目的 `DATABASE_URL`，不会在网页或小程序暴露角色提升入口。

## 功能

- 网页商品浏览、搜索、分类、商品详情、登录和发布管理入口。
- 网页管理员后台：待审核学生资料、通过/驳回操作与权限校验。
- 小程序商品、收藏、消息、积分、学生认证和发布流程。
- 小程序管理员页面、路由、入口和 handler 已删除。
- 网页与小程序均保留文核写作台跳转入口，地址通过环境/配置注入。
- API 使用 JWT 对资源所有者和管理员角色鉴权；商品/头像/学生证上传限制类型、大小和路径。学生证写入私有卷，只能通过管理员鉴权接口读取。

## 跨项目链接

网页端设置：

```dotenv
NEXT_PUBLIC_PAPER_SITE_URL=https://write.example.com
PAPER_SITE_URL=https://write.example.com
```

小程序端在 `apps/miniapp/config.js` 设置论文站 HTTPS 业务域名。论文站反向入口分别使用 `VITE_BOOK_SITE_URL` 和 `TARO_APP_BOOKSTORE_*`，不要把两个仓库或数据库合并。

## 验证

```powershell
npm run typecheck
npm test
npm run build
docker compose --env-file .env.example config
```

小程序没有 npm 构建链，使用微信开发者工具导入 `apps/miniapp`，执行“代码质量 -> JSON/JS 校验”，再用真机检查微信登录、上传、下载和 WebView 域名。

## 部署

```powershell
Copy-Item .env.example .env
# 替换数据库/JWT/公网 URL 等配置
docker compose up --build -d
```

详见 [运维说明](docs/operations.md) 与 [安全基线](docs/security.md)。
