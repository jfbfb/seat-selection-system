# 公网部署指南（Render）

代码仓库：https://github.com/jfbfb/seat-selection-system

## 一、一键创建服务（推荐）

1. 打开：**https://render.com/deploy?repo=https://github.com/jfbfb/seat-selection-system**
2. 用 GitHub 登录 Render，并授权访问仓库 `jfbfb/seat-selection-system`
3. 按下面「环境变量」表格填写（`DATABASE_URL` 从你本地 `.env` 复制）
4. 点击 **Apply** / **Deploy Blueprint** 或 **Create Web Service**
5. 等待首次构建（约 3～8 分钟）

## 二、手动创建 Web Service（若一键链接不可用）

1. 打开 https://dashboard.render.com → **New +** → **Web Service**
2. 连接 GitHub，选择仓库 **`jfbfb/seat-selection-system`**
3. 填写：

| 配置项 | 填写内容 |
|--------|----------|
| Name | `seat-selection-system`（任意，影响域名） |
| Region | Singapore 或离你最近的区域 |
| Branch | `main` |
| Root Directory | 留空 |
| Runtime | `Node` |
| Build Command | `npm install && npm run build` |
| Start Command | `npx prisma migrate deploy && npm run db:seed && npm start` |
| Instance Type | **Free** |

4. 展开 **Environment Variables**，添加下表变量
5. 点击 **Create Web Service**

## 三、环境变量

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DATABASE_URL` | 从本地 `.env` 整行复制 | Neon 连接串，必须含 `sslmode=require` |
| `SESSION_SECRET` | 48 位以上随机字符串 | 生产环境不要用 `dev-secret...` |
| `ADMIN_USERNAME` | `admin` | 管理员登录名 |
| `ADMIN_PASSWORD` | 自行设置强密码 | 生产环境建议改掉 `admin123` |
| `NEXT_PUBLIC_APP_URL` | 见下方第四步 | 首次可先留空或填占位，部署后再改 |

## 四、部署完成后（重要）

1. 在 Render 服务页复制公网地址，形如：  
   `https://seat-selection-system-xxxx.onrender.com`
2. 进入 **Environment** → 把 `NEXT_PUBLIC_APP_URL` 设为该地址（不要末尾 `/`）
3. 点击 **Manual Deploy** → **Clear build cache & deploy** 重新部署一次
4. 浏览器打开公网地址，验证：
   - 首页能打开
   - `/admin/login` 能登录
   - 老师建班 → 邀请码 → **复制链接** 应为 `https://xxx.onrender.com/select/...`

## 五、费用说明

- Render **Free** 实例：$0，一段时间无访问会休眠，首次打开需等待约 30 秒
- Neon 免费档：小项目一般够用
- 数据库你已用 Neon 新加坡节点，**无需**在 Render 再建数据库

## 六、以后更新代码

```bash
git add .
git commit -m "更新说明"
git push
```

Render 会自动从 GitHub 拉取并重新部署，域名不变。

## 七、常见问题

| 现象 | 处理 |
|------|------|
| Build 失败 | 在 Render **Logs** 查看错误；常见为 `DATABASE_URL` 填错 |
| 打开很慢 | 免费实例冷启动，等 30～60 秒再刷新 |
| 邀请链接仍是 localhost | 检查 `NEXT_PUBLIC_APP_URL` 并重新部署 |
| 数据库迁移失败 | 确认 Neon 项目未暂停，连接串含 `sslmode=require` |
