# 座位选择系统 · 学习指南

适合按「数据 → 后端 → 前端 → 实时同步」顺序阅读代码。

## 技术栈一览

| 层级 | 技术 | 作用 |
|------|------|------|
| 框架 | Next.js 16 App Router | 页面 + API 一体 |
| 语言 | TypeScript | 类型安全 |
| 样式 | Tailwind CSS | 界面样式 |
| 数据库 | PostgreSQL + Prisma | 存班级/座位/选座记录 |
| 认证 | JWT Cookie（jose） | 管理员/老师登录 |
| 实时 | SSE（Server-Sent Events） | 多人同时看座位变化 |

## 目录结构（先看这些）

```
prisma/schema.prisma          # 数据表设计（学习起点）
src/lib/
  seat-lock.ts                # 选座核心：防抢座、事务
  class-service.ts            # 班级/座位 CRUD、座位状态聚合
  session.ts                  # 登录 Session（JWT Cookie）
  events.ts                   # 内存事件总线（触发 SSE 推送）
  codes.ts                    # 邀请码、查看链接生成
src/app/
  page.tsx                    # 首页入口
  admin/                      # 管理员：创建老师
  teacher/                    # 老师：班级、邀请码、换座
  select/[code]/              # 学生：凭邀请码选座
  view/[token]/               # 学生：查看自己的座位
  api/                        # 所有后端接口
src/components/
  SeatGrid.tsx                # 座位网格 UI（共用）
src/hooks/
  useClassEvents.ts           # 前端订阅 SSE，刷新座位图
```

---

## 学习路线图

```mermaid
flowchart TD
  start[开始学习] --> schema[1. 读 prisma/schema.prisma]
  schema --> roles[2. 理解三种角色]
  roles --> adminFlow[管理员流程]
  roles --> teacherFlow[老师流程]
  roles --> studentFlow[学生流程]
  adminFlow --> session[3. 读 session.ts + api/auth/login]
  teacherFlow --> classService[4. 读 class-service.ts]
  classService --> seatLock[5. 读 seat-lock.ts 选座事务]
  studentFlow --> selectPage[6. 读 select 页面 + API]
  selectPage --> seatGrid[7. 读 SeatGrid.tsx]
  seatLock --> sse[8. 读 events.ts + useClassEvents.ts]
  sse --> deploy[9. 读 DEPLOY.md 部署架构]
  deploy --> done[能独立改一个小功能]
```

---

## 角色与页面流程

```mermaid
flowchart LR
  subgraph adminSide [管理员]
    A1["/admin/login"] --> A2["/admin"]
    A2 --> A3["创建/禁用老师账号"]
  end

  subgraph teacherSide [老师]
    T1["/teacher/login"] --> T2["/teacher"]
    T2 --> T3["新建班级"]
    T3 --> T4["编辑座位布局"]
    T4 --> T5["生成邀请码"]
    T5 --> T6["复制链接发给学生"]
    T6 --> T7["/teacher/classes/id"]
    T7 --> T8["换座 / 导出 / 打印"]
  end

  subgraph studentSide [学生]
    S1["/select/邀请码"] --> S2["选座位 + 填姓名"]
    S2 --> S3["POST 选座 API"]
    S3 --> S4["/view/viewToken"]
    S4 --> S5["长期查看座位"]
  end

  A3 -.-> T1
  T6 --> S1
```

---

## 数据表关系

```mermaid
erDiagram
  Teacher ||--o{ Class : owns
  Class ||--o{ Seat : has
  Class ||--o{ InviteCode : issues
  Class ||--o{ Selection : records
  Seat ||--o| Selection : "最多一人"
  InviteCode ||--o| Selection : "一码一座"
  Selection }o--|| Seat : occupies
```

**关键约束（防 bug 的重点）：**

- `Seat` 与 `Selection` 一对一：一个座位最多一个学生
- `InviteCode` 与 `Selection` 一对一：一个邀请码只能用一次
- `viewToken`：学生无需登录，凭 token 永久查看座位

---

## 学生选座完整流程（最重要）

```mermaid
sequenceDiagram
  participant Student as 学生浏览器
  participant SelectPage as select/code/page.tsx
  participant GetAPI as GET /api/select/code
  participant PostAPI as POST /api/select/code/select
  participant SeatLock as seat-lock.ts
  participant DB as PostgreSQL
  participant SSE as SSE /api/classes/id/events

  Student->>SelectPage: 打开邀请链接
  SelectPage->>GetAPI: 校验邀请码
  GetAPI->>DB: 查 InviteCode + Class
  GetAPI-->>SelectPage: seatState 座位状态
  SelectPage->>SSE: EventSource 订阅实时更新
  Student->>SelectPage: 点座位 + 填姓名
  SelectPage->>PostAPI: 提交选座
  PostAPI->>SeatLock: selectSeat()
  SeatLock->>DB: 事务：占座 + 标记邀请码已用
  SeatLock->>SSE: emitClassEvent 通知其他人刷新
  PostAPI-->>SelectPage: viewToken + viewUrl
  SelectPage-->>Student: 跳转查看页
```

---

## 防抢座：事务怎么工作

```mermaid
flowchart TD
  req[学生提交 seatId] --> checkCode{邀请码有效且未使用?}
  checkCode -->|否| err1[返回错误]
  checkCode -->|是| checkOpen{班级选座开放?}
  checkOpen -->|否| err2[选座已关闭]
  checkOpen -->|是| tx[开启数据库事务]
  tx --> findSeat["查找 seatId 且 selection=null"]
  findSeat -->|找不到| err3[座位已被选 SEAT_TAKEN]
  findSeat -->|找到| create[创建 Selection 记录]
  create --> mark[邀请码 status=used]
  mark --> commit[提交事务]
  commit --> autoClose{还有空座?}
  autoClose -->|无| closeClass[自动关闭选座]
  autoClose -->|有| emit[emitClassEvent 推送 SSE]
  closeClass --> emit
```

核心代码在 [`src/lib/seat-lock.ts`](src/lib/seat-lock.ts) 的 `selectSeat()`。

---

## 登录与权限

```mermaid
flowchart LR
  login[POST /api/auth/login] --> verify[bcrypt 校验密码]
  verify --> jwt[生成 JWT]
  jwt --> cookie[写入 httpOnly Cookie seat_session]
  cookie --> api[后续 API 调用 getSession]
  api --> adminAPI[admin/* 需 role=admin]
  api --> teacherAPI[teacher/* 需 role=teacher 且班级归属正确]
```

学生端**不需要登录**，只靠 `邀请码` 和 `viewToken`。

---

## 实时同步（SSE）

```mermaid
flowchart TD
  change[座位变化：选座/换座/改布局] --> emit[emitClassEvent classId]
  emit --> bus[内存 ClassEventBus]
  bus --> sseRoute[GET /api/classes/id/events]
  sseRoute --> push[推送最新 seatState JSON]
  push --> hook[useClassEvents 前端 Hook]
  hook --> grid[SeatGrid 重新渲染]
```

注意：事件总线在**单进程内存**中。Vercel 多实例时，实时性可能略差，但数据库仍是权威来源，不会重复占座。

---

## 建议学习顺序（约 2～3 天）

| 天数 | 任务 | 阅读文件 |
|------|------|----------|
| 第 1 天 | 搞懂数据模型和角色 | `schema.prisma` → `page.tsx` → `session.ts` |
| 第 2 天 | 搞懂选座核心 | `seat-lock.ts` → `select/[code]/` → `SeatGrid.tsx` |
| 第 3 天 | 搞懂老师端和实时 | `class-service.ts` → `teacher/classes/[id]/` → `useClassEvents.ts` |

## 小练习（巩固用）

1. 在老师端邀请码列表加「未使用数量」统计
2. 选座成功页显示「X 排 X 列」而不只是链接
3. 给 `SeatGrid` 空座位加长按提示
4. 阅读 `export.ts`，理解 Excel 导出流程

## 本地运行

```bash
cp .env.example .env   # 配置 DATABASE_URL
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

默认管理员：`admin` / `admin123`（见 `prisma/seed.ts`）
