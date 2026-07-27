# 二手书微信小程序

该目录是二手书项目的独立微信小程序用户端。论文写作平台保持独立部署，小程序仅通过 `WebView` 提供跳转入口，不共享后端、账户或业务数据。

## 环境配置

所有外部服务地址集中在 `config.js`。页面继续从该文件导入 `host`，因此替换配置不需要改动任何请求代码。

`activeEnvironment` 默认是 `production`。未配置时，生产 API 使用保留域名 `https://api.example.invalid`，不会误连开发者局域网中的真实设备；论文地址为空时会显示配置提示，不会打开未知页面。

正式发布前修改 `environments.production`：

```js
production: Object.freeze({
  apiBaseUrl: 'https://api.books.example.com',
  paperSiteUrl: 'https://paper.example.com'
})
```

要求：

1. `apiBaseUrl` 只填写源站地址；配置模块会自动移除尾部 `/`，现有页面会继续拼接 `/api/*`。
2. `paperSiteUrl` 必须是独立论文网站的完整 HTTPS 地址。
3. 在微信公众平台把 API 加入 request/uploadFile/downloadFile 合法域名，把论文网站加入业务域名；配置修改后需重新构建并发布小程序。
4. 开发者工具联调时可以将 `activeEnvironment` 临时改为 `development`；真机不能通过 `127.0.0.1` 访问电脑服务，需要显式填写可访问且受控的开发地址。
5. 发布审查时确认 `activeEnvironment` 已恢复为 `production`，且不包含个人局域网 IP、测试 token 或密钥。

## 论文平台入口

“我的”页面包含醒目的“论文写作平台”入口，跳转到已注册的 `pages/paper-site/index`。该页面直接读取 `paperSiteUrl`；未配置或生产环境使用非 HTTPS 地址时只展示安全提示。
