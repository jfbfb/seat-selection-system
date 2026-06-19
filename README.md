# 座位选择系统

老师创建班级座位表并发放邀请码，学生凭码选座（实时互斥），选座后可长期查看座位信息。

## 功能概览

- **管理员**：创建/禁用老师账号、重置密码
- **老师**：多班级管理、网格座位编辑、逐个生成邀请码、换座/改信息、导出 Excel、打印
- **学生**：邀请码选座（姓名+性别）、选座后 view token 长期查看

## 技术栈

- Next.js 16 + TypeScript + Tailwind CSS
- PostgreSQL + Prisma
- SSE 实时座位状态同步
- Session Cookie（管理员/老师登录）

## 本地开发

### 1. 启动数据库

```bash
docker compose up -d
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并按需修改：

```bash
cp .env.example .env
```

### 3. 安装依赖并初始化数据库

```bash
npm install
npx prisma migrate dev
npm run db:seed
```

种子账号（默认）：
- 管理员：`admin` / `admin123`

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 使用流程

1. 管理员登录 → 创建老师账号
2. 老师登录 → 新建班级 → 编辑座位布局 → 逐个生成邀请码
3. 将邀请链接发给学生 → 学生选座
4. 学生保存查看链接；老师可随时调整座位、导出/打印

## 云端部署（Vercel + Neon，推荐）

详细步骤见 **[DEPLOY.md](./DEPLOY.md)**。

1. 打开 https://vercel.com ，用 GitHub 登录
2. **Import** 仓库 `jfbfb/seat-selection-system`
3. 配置环境变量：`DATABASE_URL`（Neon）、`SESSION_SECRET`、`ADMIN_USERNAME`、`ADMIN_PASSWORD`
4. Deploy 完成后使用 `*.vercel.app` 域名访问；首次在本地执行 `npm run db:seed` 初始化管理员

数据库继续使用 Neon 免费档，无需另购。

## API 概览

| 路径 | 说明 |
|------|------|
| `POST /api/auth/login` | 管理员/老师登录 |
| `GET /api/classes/{id}/events` | SSE 座位状态推送 |
| `GET /api/select/{code}` | 校验邀请码 |
| `POST /api/select/{code}/select` | 提交选座 |
| `GET /api/view/{token}` | 查看座位信息 |

## 项目结构

```
prisma/schema.prisma   # 数据模型
src/app/admin/         # 管理员端
src/app/teacher/       # 老师端
src/app/select/        # 学生选座
src/app/view/          # 学生查看
src/components/        # 共用组件（SeatGrid 等）
src/lib/               # 业务逻辑（选座事务、导出等）
```
