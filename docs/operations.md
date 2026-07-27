# 运维说明

## 数据库

新环境只使用 Prisma migrations：

```powershell
npm --prefix apps/web run prisma:generate
npm --prefix apps/web run prisma:deploy
```

原目录的 `二手平台完整数据.sql` 包含真实业务数据，不进入 Git。确需迁移时，先在隔离环境脱敏、校验字符集和行数，再通过受控数据库工具导入；不要由 Web API 提供任意 SQL/修复入口。

## 环境变量

| 变量 | 作用 |
| --- | --- |
| `DATABASE_URL` | MySQL Prisma 连接串 |
| `JWT_SECRET` | 至少 32 字节随机密钥，Web 与小程序 API 共用这一项目自己的值 |
| `HOST_BASE_URL` | 二手书 Web/API 公网 HTTPS 地址 |
| `NEXT_PUBLIC_PAPER_SITE_URL` | 浏览器可见的独立论文站入口 |
| `WX_APPID` / `WX_APPSECRET` | 微信 code 换 session，Secret 仅在服务端 |
| `JISU_APPKEY` | 可选 ISBN 查询服务 |
| `MAILER_*` | 可选反馈邮件账户 |
| `AD_REWARD_ENABLED` | 默认 `false`，签名回调未集成前不能发积分 |
| `PRIVATE_UPLOAD_ROOT` | 学生证私有存储根目录；容器内固定为 `/app/.data` |

## Compose

```powershell
Copy-Item .env.example .env
docker compose config
docker compose up --build -d
docker compose ps
docker compose logs -f web mysql
```

首次部署的管理员必须先注册普通账号，再在 Web 容器内运行 `ADMIN_PHONE=手机号 npm run admin:promote`。不要提供公开的“创建管理员”接口，也不要在小程序中恢复管理员模式。

容器启动时执行 `prisma migrate deploy`。商品图、普通用户上传和学生证私有文件分别放在三个命名卷中，MySQL 使用独立命名卷；Redis、论文站数据库和论文站 JWT 都不在本 Compose 中。

## 备份

1. 每日使用 `mysqldump --single-transaction` 备份 MySQL，并加密异地保存。
2. 同步备份 `bookmarket_products`、`bookmarket_uploads` 与 `bookmarket_private` 三个卷；私有卷备份必须加密并限制管理员访问。
3. 每月在隔离环境演练：恢复数据库、恢复文件、启动 Web、抽查商品图/头像/审核记录。
4. 删除商品时文件清理失败只记录告警；通过定时作业核对数据库引用和孤儿文件，禁止依据用户输入直接拼接删除路径。

## 小程序发布

1. 在 `apps/miniapp/config.js` 配置 HTTPS API 和论文站地址。
2. 微信公众平台登记 `request`、`uploadFile`、`downloadFile` 与 WebView 业务域名。
3. 替换 `apps/miniapp/project.config.json` AppID，项目私有配置不提交。
4. 用普通用户验证所有页面；小程序中不应出现 `/pages/admin/*` 或管理员入口。
