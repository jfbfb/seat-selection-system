# 公网部署指南（Zeabur）

代码仓库：https://github.com/jfbfb/seat-selection-system

推荐使用 **Zeabur** 部署：中文界面、免费档无需境外信用卡、固定公网域名，适合手机访问和发邀请链接。

## 一、注册 Zeabur

1. 打开 https://zeabur.com
2. 点击 **开始使用** / **Get Started**
3. 用 **GitHub** 登录（账号 `jfbfb`）
4. 授权 Zeabur 访问你的 GitHub 仓库

## 二、创建项目并部署

1. 进入 [Zeabur 控制台](https://zeabur.com/dashboard)
2. 点击 **创建项目** → 选择区域（建议选离用户近的，如东京/台湾等）
3. 在项目中点击 **部署新服务** → **GitHub**
4. 首次使用需 **配置 GitHub**，授权 Zeabur 读取仓库
5. 搜索并选择 **`seat-selection-system`** 仓库
6. 分支选 **`main`**，Root Directory **留空**
7. Zeabur 会自动识别为 **Next.js** 项目（已包含 [`zbpack.json`](zbpack.json) 启动命令）
8. 点击 **部署**，等待构建（约 3～8 分钟）

## 三、配置环境变量

部署前或部署中，进入该服务的 **配置（Configuration）** → **环境变量**，添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DATABASE_URL` | 从本地 `.env` 复制 | Neon 连接串，须含 `sslmode=require` |
| `SESSION_SECRET` | 48 位以上随机字符串 | 不要用 `dev-secret...` |
| `ADMIN_USERNAME` | `admin` | 管理员用户名 |
| `ADMIN_PASSWORD` | 自行设置强密码 | 生产环境请改掉 `admin123` |
| `NODE_ENV` | `production` | 可选，建议填写 |

`NEXT_PUBLIC_APP_URL` **可先不填**——项目会从请求头自动识别 Zeabur 域名生成邀请链接。

添加变量后点击 **重新部署（Redeploy）**。

## 四、获取公网地址

1. 构建成功后，在服务 **网络（Networking）** 或 **域名** 页面
2. 使用 Zeabur 提供的默认域名，形如：  
   `https://seat-selection-system-xxx.zeabur.app`
3. 浏览器打开该地址，确认首页可访问

可选：把 `NEXT_PUBLIC_APP_URL` 设为该域名（无末尾 `/`），再 Redeploy 一次。

## 五、验证清单

- [ ] `https://你的域名/` 首页可打开
- [ ] `/admin/login` 管理员能登录
- [ ] `/teacher/login` 老师能登录
- [ ] 生成邀请码 → **复制链接** 以 `https://你的域名/select/...` 开头（不是 localhost）
- [ ] 手机用 4G/5G 打开邀请链接能选座

## 六、费用说明

| 项目 | 说明 |
|------|------|
| Zeabur Free | $0/月，无需绑信用卡；空闲时会休眠，首次打开稍等几秒 |
| Neon 数据库 | 继续用现有免费档即可，无需迁移 |
| 升级 Dev Plan | $5/月，服务不休眠、更适合长期正式使用 |

## 七、以后更新代码

```bash
git add .
git commit -m "更新说明"
git push
```

Zeabur 会自动从 GitHub 拉取并重新部署，**域名不变**。

## 八、常见问题

| 现象 | 处理 |
|------|------|
| Build 失败 | 查看 Zeabur **日志**；常见为 `DATABASE_URL` 错误或 Neon 暂停 |
| 打开很慢 | 免费档休眠，等几秒后刷新 |
| 邀请链接是 localhost | 用 Zeabur 域名打开老师端再复制；或设置 `NEXT_PUBLIC_APP_URL` |
| 数据库表不存在 | 确认 `zbpack.json` 中启动命令含 `prisma migrate deploy`；手动在服务里执行该命令 |
| Prisma 相关错误 | 确认 `DATABASE_URL` 完整且 Neon 项目处于 Active 状态 |

## 附录：CLI 部署（可选）

已安装并登录 Zeabur CLI 时，可在项目目录执行：

```bash
npx zeabur@latest auth login
npx zeabur@latest deploy
```

日常使用 **GitHub 推送自动部署** 即可，不必每次用 CLI。
