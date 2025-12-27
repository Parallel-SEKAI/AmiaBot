---
description: Project Information
---

# AmiaBot Node.js 项目信息

## 项目概述

AmiaBot 是一个基于 OneBot 协议的多功能聊天机器人，使用 TypeScript 编写，采用模块化架构，支持多种功能如聊天、音乐、GitHub 集成等。

## 项目结构

### 项目根目录
- `package.json` - 项目配置和依赖
- `tsconfig.json` - TypeScript 配置
- `.env` - 环境变量配置
- `db/init.sql` - 数据库初始化脚本
- `assets/` - 静态资源文件
- `docs/` - 项目文档
- `dist/` - 编译后的文件

### src/ 源代码目录
- `config/` - 配置管理模块
- `features/` - 各种功能模块
- `onebot/` - OneBot 协议相关模块
- `service/` - 业务服务模块
- `types/` - 类型定义
- `utils/` - 工具函数
- `const.ts` - 常量定义
- `main.ts` - 项目入口文件

#### src/config/ - 配置管理
- `index.ts` - 项目配置管理，使用 Zod 验证环境变量
- `logger.ts` - 日志配置

#### src/features/ - 功能模块
- `feature-manager.ts` - 功能管理器，负责注册和初始化所有功能
- 各个功能模块如 `chat/`, `bilibili/`, `github/`, `netease/` 等

每个功能模块通常包含：
- `index.ts` - 功能主文件
- 其他辅助文件如 API 调用、数据库操作等

#### src/onebot/ - OneBot 协议实现
- `onebot.client.ts` - OneBot 客户端
- `group/` - 群组相关实体
- `message/` - 消息相关实体
- `user/` - 用户相关实体

#### src/service/ - 业务服务
- `db.ts` - PostgreSQL 数据库连接池
- `gemini.ts` - Google Gemini AI 服务
- `github.ts` - GitHub API 服务
- `enana.ts` - Enana 图片生成服务
- `netease/` - 网易云音乐服务

## 技术栈

- **TypeScript** - 主要编程语言
- **Node.js** - 运行时环境
- **PostgreSQL** - 数据库
- **OneBot** - 机器人协议
- **Winston** - 日志记录
- **Zod** - 运行时验证
- **Google Gemini** - AI 服务
- **Octokit** - GitHub API 客户端

## 编码规范和最佳实践

### TypeScript 使用
- 严格类型检查
- 使用接口定义数据结构
- 使用 Zod 进行运行时验证
- 异步函数使用 Promise<void> 返回类型
- 使用泛型提高代码复用性

### 数据库操作
- 使用 PostgreSQL 连接池
- 自动重连机制（重试 5 次，间隔 5 秒）
- 使用参数化查询防止 SQL 注入
- 事务处理和错误处理
- 连接池配置包括超时设置和最大连接数限制

### 日志记录
- 使用 Winston 日志库
- 结构化日志输出
- 包含功能模块标识和上下文信息（如 `[feature.chat][Group: %d][User: %d]`）

### 错误处理
- 异步操作的错误捕获
- 优雅降级处理
- 详细的错误日志记录
- 对外部 API 调用进行异常处理

### 异步编程
- 广泛使用 async/await
- 使用 Promise.all 进行并行操作
- 合理处理并发请求

## 消息处理架构

### 消息实体类
- `RecvMessage` - 接收消息基类，包含消息的完整信息
- `RecvBaseMessage` 和其子类 - 不同类型的消息（文本、图片、AT、回复、表情等）：
  - `RecvTextMessage` - 文本消息
  - `RecvImageMessage` - 图片消息
  - `RecvAtMessage` - AT 消息
  - `RecvReplyMessage` - 回复消息
  - `RecvFaceMessage` - 表情消息
  - `RecvRecordMessage` - 语音消息
  - `RecvVideoMessage` - 视频消息
  - 等等...

- `SendMessage` - 发送消息基类
- `SendTextMessage` 等具体消息类型

### 消息处理流程
1. OneBot 客户端接收消息事件
2. 消息数据转换为 RecvMessage 对象
3. 检查功能是否启用（基于 group_features 表）
4. 调用对应功能的处理逻辑
5. 生成响应消息并发送

## 功能模块开发指南

### 功能模块结构
每个功能模块应包含：
- `init()` 函数 - 功能初始化
- 事件监听器 - 监听 OneBot 事件
- 权限检查 - 检查功能是否在群组中启用
- 错误处理 - 适当的错误处理机制
- 日志记录 - 按规范记录相关信息

### 功能注册
- 在 `features/index.ts` 中导入功能模块
- 使用 `featureManager.registerFeature()` 注册功能
- 指定功能名称、描述、初始化函数和是否需要启用

### 功能模块示例
```typescript
import logger from '../../config/logger';
import { onebot } from '../../main';
import { RecvMessage } from '../../onebot/message/recv.entity';
import { SendMessage, SendTextMessage } from '../../onebot/message/send.entity';
import { checkFeatureEnabled } from '../../service/db';

export async function init() {
  logger.info('[feature] Init example feature');
  onebot.on('message.command.example', async (data) => {
    if (await checkFeatureEnabled(data.group_id, 'example')) {
      const message = RecvMessage.fromMap(data);
      logger.info(
        '[feature.example][Group: %d][User: %d] %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );
      // 处理逻辑
    }
  });
}
```

## API 调用方式

### OneBot 事件监听
```typescript
// 监听命令消息
onebot.on('message.command.{command}', async (data) => {
  // 处理命令
});

// 监听群组消息
onebot.on('message.group', async (data) => {
  // 处理群消息
});

// 监听私聊消息
onebot.on('message.private', async (data) => {
  // 处理私聊消息
});
```

### 数据库操作
```typescript
// 检查功能是否启用
await checkFeatureEnabled(groupId, featureName);

// 设置功能启用状态
await setFeatureEnabled(groupId, featureName, enabled);
```

### 消息发送
```typescript
// 发送文本消息
new SendMessage({
  message: new SendTextMessage('text')
}).send({ recvMessage: message });

// 回复消息
new SendMessage({
  message: new SendTextMessage('text')
}).reply(recvMessage);
```

### API 调用示例
- Gemini API: `gemini.models.generateContent()`
- GitHub API: 通过 octokit 客户端调用
- 数据库操作: 通过连接池 `pool.query()` 方法

## 环境变量配置

### 消息相关
- `PREFIXES` - 消息前缀数组，JSON 格式，默认为 ["./"]

### OneBot 配置
- `ONEBOT_HTTP_URL` - OneBot HTTP 接口地址
- `ONEBOT_WS_URL` - OneBot WebSocket 接口地址
- `ONEBOT_TOKEN` - OneBot 认证令牌

### 数据库配置
- `APP_DB_HOST` - 数据库主机地址
- `APP_DB_PORT` - 数据库端口
- `APP_DB_NAME` - 数据库名称
- `APP_DB_USER` - 数据库用户名
- `APP_DB_PASSWORD` - 数据库密码

### AI 服务配置
- `GEMINI_API_KEY` - Gemini API 密钥
- `GEMINI_BASEURL` - Gemini API 基础 URL
- `GEMINI_MODEL` - Gemini 模型名称

### 其他服务配置
- `ENANA_BASEURL` - Enana 图片生成服务基础 URL
- `ENANA_TOKEN` - Enana 服务认证令牌
- `ENANA_SCALE` - Enana 图片生成缩放比例
- `ENANA_FONT` - Enana 图片生成字体
- `GITHUB_TOKEN` - GitHub API 令牌
- `NETEASE_COOKIES` - 网易云音乐 Cookie

### 其他配置
- `HELP_TEXT` - 帮助文本

## 数据库表结构

### group_features 表
- `group_id` - 群组ID (BIGINT)
- `feature_name` - 功能名称 (VARCHAR)
- `is_enabled` - 是否启用 (BOOLEAN, 默认TRUE)
- 主键: (group_id, feature_name)
- 索引: idx_group_features_id (group_id)

### amia_chat_history 表
- `id` - 主键，自增 (BIGINT IDENTITY)
- `group_id` - 群组ID (BIGINT)
- `user_id` - 用户ID (BIGINT)
- `user_nick` - 用户昵称 (VARCHAR)
- `time` - 时间戳 (TIMESTAMP, 默认CURRENT_TIMESTAMP)
- `message` - 消息内容 (TEXT)
- 索引: idx_group_time (group_id, time)

### amia_chat_user 表
- `user_id` - 用户ID (BIGINT, 主键)
- `favor` - 好感度 (INT, 默认0)
- `memory` - 记忆 (TEXT)

## 数据库操作最佳实践

### 连接管理
- 使用连接池自动管理连接
- 配置连接超时和空闲超时
- 设置最大连接数限制
- 实现自动重连机制

### 错误处理
- 捕获数据库连接错误
- 处理查询执行错误
- 实现重连逻辑

### 查询优化
- 使用参数化查询
- 合理使用索引
- 避免 N+1 查询问题

## 常用工具函数

### 命令行参数解析
```typescript
import { parseCommandLineArgs } from '../utils';
const [args, kwargs] = parseCommandLineArgs(cmd);
```

### 图片处理
```typescript
import { imageToBase64DataURL, networkImageToBase64DataURL } from '../utils';
// 本地图片转 Base64
const base64 = await imageToBase64DataURL(filePath);
// 网络图片转 Base64
const base64 = await networkImageToBase64DataURL(url);
```

### 颜色转换
```typescript
import { hexToRgba } from '../utils';
const rgba = hexToRgba('#FF0000'); // [255, 0, 0, 255]
```

### 模板渲染
```typescript
import { renderTemplate } from '../utils';
const rendered = renderTemplate(template, data);
```

### 字符串处理
```typescript
import { extractAfterCaseInsensitive } from '../utils';
const result = extractAfterCaseInsensitive(source, searchString);
```

## 开发工作流

### 项目启动
```bash
# 安装依赖
npm install

# 开发模式启动
npm run dev

# 构建项目
npm run build

# 启动已构建项目
npm start
```

### 代码格式化
```bash
# 格式化代码
npm run format

# 检查格式
npm run format:check
```

### 文档
```bash
# 启动文档开发服务器
npm run docs:dev

# 构建文档
npm run docs:build
```

## 服务集成

### Google Gemini
- 使用 @google/genai 库
- 通过配置文件管理 API 密钥和模型
- 支持自定义基础 URL

### GitHub API
- 使用 Octokit 库
- 通过配置文件管理认证令牌

### PostgreSQL
- 使用 pg 库
- 实现连接池管理
- 包含错误处理和重连机制

## 实体类设计

### Group 实体
- 群组信息管理
- 包含群主、成员数量、群描述等信息
- 提供群历史记录获取功能

### User 实体
- 用户信息管理
- 包含昵称、性别、年龄、地区等信息
- 提供用户详细资料获取

### 消息实体
- 完整的消息解析和序列化
- 支持多种消息类型
- 提供便捷的消息内容提取

## 特殊功能实现

### Chat 功能
- 基于 Gemini 的智能对话
- 好感度和记忆系统
- 历史记录管理
- 用户信息集成

### Netease 音乐
- 网易云音乐 API 集成
- 歌曲搜索和播放
- 歌词获取功能

### GitHub 集成
- 仓库信息查询
- Issue 和 PR 查询
- 用户信息获取

### Bilibili 集成
- 视频信息获取
- 视频解析功能

## 项目配置文件

### tsconfig.json
- 严格类型检查
- 模块解析配置
- 输出路径设置

### package.json
- 依赖管理
- 脚本定义
- 项目元数据

## 测试和部署

### 开发环境
- nodemon 热重载
- ts-node 直接运行 TypeScript

### 生产环境
- TypeScript 编译为 JavaScript
- 生成到 dist 目录
- 配置生产环境变量

## 重要设计模式

### 单例模式
- `FeatureManager` 使用单例模式管理功能

### 工厂模式
- 消息实体的 `fromMap` 方法实现工厂模式

### 观察者模式
- OneBot 事件系统使用观察者模式

### 适配器模式
- OneBot 客户端适配不同协议实现

## 贡献指南

### 代码规范
- 使用 TypeScript 严格模式
- 遵循函数式和面向对象编程最佳实践
- 保持代码简洁性

### 功能开发
- 每个功能模块独立开发
- 遵循统一的初始化模式
- 实现适当的错误处理

### 文档更新
- 为新功能添加文档
- 保持 API 文档的同步更新
- 更新使用示例
