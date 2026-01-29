# AmiaBot 社交与好感度系统 (SFS) 设计规范

本文件定义了 AmiaBot 的社交与好感度系统 (Social & Favorability System, SFS) 的核心架构、数据模型及交互逻辑。系统旨在通过量化的社交维度增强群聊活跃度。

## 1. 数据架构 (Database Schema)

基于 PostgreSQL 构建持久化层，确保关系数据的原子性与一致性。

### 1.1 `user_relationships` (对等社交关系表)

存储用户间的双向好感度。采用 `(user_id_a, user_id_b, group_id)` 的唯一性约束。

| 字段           | 类型      | 约束          | 描述                                            |
| :------------- | :-------- | :------------ | :---------------------------------------------- |
| `id`           | SERIAL    | PRIMARY KEY   | 自增主键                                        |
| `user_id_a`    | BIGINT    | NOT NULL      | 用户 A QQ 号 (存储时强制 $A < B$)               |
| `user_id_b`    | BIGINT    | NOT NULL      | 用户 B QQ 号                                    |
| `group_id`     | BIGINT    | NOT NULL      | 隔离不同群组的社交环境                          |
| `favorability` | INT       | DEFAULT 0     | 双向好感值 (范围: -1000 到 5000)                |
| `tags`         | JSONB     | DEFAULT '[]'  | 特殊关系标签 (如：`["married", "best_friend"]`) |
| `updated_at`   | TIMESTAMP | DEFAULT NOW() | 最后互动时间                                    |

_索引优化_：`CREATE UNIQUE INDEX idx_user_rel_unique ON user_relationships (LEAST(user_id_a, user_id_b), GREATER(user_id_a, user_id_b), group_id);`

### 1.2 `user_daily_interactions` (每日互动状态表)

记录每日限次行为（如：娶群友、签到）。

| 字段               | 类型        | 约束                 | 描述                    |
| :----------------- | :---------- | :------------------- | :---------------------- |
| `id`               | SERIAL      | PRIMARY KEY          |                         |
| `group_id`         | BIGINT      | NOT NULL             |                         |
| `user_id`          | BIGINT      | NOT NULL             |                         |
| `interaction_type` | VARCHAR(20) | NOT NULL             | `MARRY` 或 `GIFT_LIMIT` |
| `target_id`        | BIGINT      |                      | 被匹配者或接收者 ID     |
| `record_date`      | DATE        | DEFAULT CURRENT_DATE | 确保每日重置            |

---

## 2. 核心协议 (Core Protocols)

### 2.1 随机配对协议 (/娶群友)

- **幂等性保证**：系统首先检索 `user_daily_interactions` 中当日是否存在 `interaction_type = 'MARRY'` 的记录。
- **互惠逻辑**：
  1. 若用户 A 已被 B 匹配，A 再次发起时直接返回 B。
  2. 若 A 尚未匹配，则在当前群组成员缓存中排除 `A`、`Bot` 及 `已匹配用户`，随机抽取 `T`。
- **权重算法**：好感度 > 100 的用户被抽中的权重提升 20%。
- **副作用**：双方好感度 $+ \text{random}(1, 5)$。

### 2.2 物质交换协议 (/送礼物)

- **解析器**：支持 `@用户` 提取，直接将其后的文本作为礼物名称（不进行类别与 ID 匹配）。
- **增量机制**：
  - 基础增量：$+ \text{random}(1, 15)$ 好感度。
  - 惊喜效果：10% 概率触发“诚意满满”，增量提升至 $+ \text{random}(20, 50)$，并触发卡片特殊特效。
- **冷却控制**：每人每小时限送 3 次，记录于 `GIFT_LIMIT`（需在数据库增加时间戳校验）。

### 2.3 关系解体协议 (/闹离婚)

- **触发条件**：用户发送 `/闹离婚` 或 `/分手`。
- **处理流程**：
  1.  **检索当日配对**：若存在 `MARRY` 记录，则将其删除。
  2.  **检索特殊标签**：若 `user_relationships.tags` 包含 `married`，则移除该标签。
  3.  **惩罚机制**：双方好感度扣减 20% 或固定值 50 点（取大者），最后互动时间重置。
- **交互反馈**：渲染破碎的心形视觉效果。

### 2.4 社交检索协议 (/好感度列表)

- **功能描述**：展示当前用户在该群组内的社交圈层。
- **查询逻辑**：
  1.  从 `user_relationships` 中检索所有涉及 `current_user_id` 且 `group_id` 匹配的记录。
  2.  按 `favorability` 降序排列，取 Top 10。
- **视觉呈现**：使用 `StatsCard` 变体，展示好友头像、当前好感数值、关系等级标签及进度条。

---

## 3. 表现层规范 (UI/UX Strategy)

系统完全接入 `src/service/render/react.tsx` SSR 引擎，遵循 **Material Design 3 (M3)** 规范。

### 3.1 好感度等级 (Status States)

根据 `favorability` 数值动态渲染卡片配色方案（Tokens）：

- **(-∞, -1)**：`Error` 色调 (深红/灰)。标签：**【恶交】**
- **[0, 99]**：`SurfaceVariant` 色调 (冷灰)。标签：**【萍水相逢】**
- **[100, 499]**：`Secondary` 色调 (淡蓝)。标签：**【志同道合】**
- **[500, 999]**：`Primary` 色调 (明紫)。标签：**【情投意合】**
- **[1000, ∞)**：`Tertiary` 色调 (暖粉/金)。标签：**【生死与共】**

### 3.2 组件选型

- **头像组件**：带有交互光圈，光圈颜色与等级对齐。
- **进度条**：展示距下一等级的数值差距。
- **背景图**：高级关系解锁动态毛玻璃效果背景。

---

## 4. 安全与扩展性 (Security & Extensibility)

1.  **隐私控制**：提供 `/社交设置` 命令，允许用户关闭“被娶”权限或隐藏好感度排名。
2.  **数据库完整性**：所有好感度变更必须通过存储过程或事务块执行，防止并发导致的数据不一致。
3.  **异步渲染**：卡片生成过程不阻塞 OneBot 消息循环，利用 Node.js 事件循环异步生成图片。
