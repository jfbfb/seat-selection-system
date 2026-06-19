# 公网部署指南

代码仓库：https://github.com/jfbfb/seat-selection-system

## 推荐：Vercel + Neon（免费、最适合本项目）

本项目是 **Next.js + Prisma + Neon PostgreSQL**，用 Vercel 部署最省事：**不用买服务器、不用绑信用卡**，和 Render 不同，也比重定向到 Zeabur 买 VPS 更划算。

### 一、注册 Vercel

1. 打开 https://vercel.com
2. 用 **GitHub** 登录（账号 `jfbfb`）
3. 授权 Vercel 读取你的仓库

### 二、导入项目

1. 控制台点 **Add New… → Project**
2. 选择 **`seat-selection-system`** 仓库
3. Framework 会自动识别为 **Next.js**，保持默认即可
4. **先不要点 Deploy**，展开 **Environment Variables**，添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DATABASE_URL` | 从本地 `.env` 复制 | Neon 连接串 |
| `SESSION_SECRET` | 48 位以上随机字符串 | 生产环境不要用 `dev-secret...` |
| `ADMIN_USERNAME` | `admin` | 管理员用户名 |
| `ADMIN_PASSWORD` | 自行设置强密码 | 改掉默认 `admin123` |

5. 点击 **Deploy**，等待构建（约 2～5 分钟）

构建时会自动执行 `prisma migrate deploy`（见 `package.json` 的 `vercel-build` 脚本）。

### 三、首次初始化管理员（仅第一次）

部署成功后，在本地项目目录执行一次种子数据（连的是同一个 Neon 库）：

```bash
npm run db:seed
```

如果管理员账号已存在，可跳过。

### 四、获取公网地址

部署完成后会得到域名，形如：

`https://seat-selection-system-xxx.vercel.app`

用手机打开 `https://你的域名/teacher/login` 测试。老师端「复制链接」应显示 Vercel 域名，而不是 localhost。

可选：在 Vercel 环境变量里设 `NEXT_PUBLIC_APP_URL` 为该域名（无末尾 `/`），再 Redeploy。

### 五、验证清单

- [ ] 首页可打开
- [ ] `/admin/login` 管理员能登录
- [ ] `/teacher/login` 老师能登录
- [ ] 邀请链接以 `https://你的域名/select/...` 开头
- [ ] 手机 4G 能打开并选座

### 六、费用

| 项目 | 说明 |
|------|------|
| Vercel Hobby | **$0/月**，个人/课程项目够用 |
| Neon | 继续用现有免费档（0.5GB 存储） |

### 七、以后更新

```bash
git push
```

Vercel 自动重新部署，域名不变。

### 八、注意事项

| 现象 | 说明 |
|------|------|
| 国内访问偏慢 | Vercel 节点在海外；可绑自己的域名，或以后迁到国内服务器 |
| 座位不是秒级同步 | Vercel 是无服务器架构，多人同时选座时老师端刷新可能稍慢；**选座互斥仍由数据库保证**，不会重复占座 |
| Build 失败 | 检查 `DATABASE_URL` 是否正确、Neon 是否 Active |

---

## 备选：Zeabur（需买服务器，约 ¥22/月起）

Zeabur 自 2026 年起取消免费共享集群，新建项目必须先购买 VPS。若你更看重国内机房速度、愿意每月付费，可参考以下流程。

1. https://zeabur.com 用 GitHub 登录
2. **购买新服务器**（火山引擎/腾讯云海外最低约 $3/月）
3. **创建新项目** → 选已有服务器
4. **部署新服务 → GitHub** → 选 `seat-selection-system`
5. 配置与上表相同的环境变量
6. 使用 `*.zeabur.app` 域名访问

详见项目内 [`zbpack.json`](zbpack.json)（含 migrate + seed 启动命令）。
