# 公网部署指南

代码仓库：https://github.com/jfbfb/seat-selection-system

## Render 一键部署（推荐）

1. 打开 [Render Deploy 链接](https://render.com/deploy?repo=https://github.com/jfbfb/seat-selection-system)
2. 登录 Render 并授权 GitHub
3. 在环境变量中填写：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | Neon PostgreSQL 连接串（含 `sslmode=require`） |
| `SESSION_SECRET` | 32 位以上随机字符串 |
| `ADMIN_USERNAME` | 管理员用户名 |
| `ADMIN_PASSWORD` | 管理员密码 |
| `NEXT_PUBLIC_APP_URL` | 部署完成后的公网地址，如 `https://seat-selection-system.onrender.com` |

4. 点击 Deploy，等待构建完成
5. 将 `NEXT_PUBLIC_APP_URL` 改为 Render 实际域名后，**Clear build cache & deploy** 重新部署一次

> 邀请链接会从请求头自动识别域名；设置 `NEXT_PUBLIC_APP_URL` 可确保所有场景一致。

## 部署后验证

- 电脑浏览器打开公网 URL，首页可访问
- 管理员登录 → 创建老师 → 老师建班 → 生成邀请码
- 复制邀请链接，确认不是 `localhost`
- 手机浏览器（4G/5G）打开邀请链接完成选座
