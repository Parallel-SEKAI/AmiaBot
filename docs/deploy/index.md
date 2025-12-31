---
title: 部署指南
---

# 部署指南

你可以通过两种主要方式部署 AmiaBot：使用 Docker（推荐）或直接在 Node.js 环境中运行。

## 前置准备

在开始之前，请确保你已经准备好以下信息，并将在后续步骤中配置到 `.env` 文件中：

-   **PostgreSQL 数据库**: AmiaBot 需要一个 PostgreSQL 数据库来存储数据。请准备好数据库的地址、端口、用户名、密码和数据库名。
-   **OneBot (NapCat) 连接信息**: AmiaBot 通过 WebSocket 连接到一个 OneBot 实现（如 NapCat）。你需要准备好 OneBot 的 `accessToken`、`host` 和 `port`。
-   **API Keys (可选)**: 如果你需要使用与外部服务集成的功能（如 AI 聊天、GitHub 查询等），请准备好相关的 API 密钥。
    -   `OPENAI_API_KEY`: 用于 `chat`, `gemini`, `message-statistics` 等功能。
    -   `GITHUB_TOKEN`: 用于 `github` 功能。
    -   `ENANA_TOKEN`: 用于生成各种信息卡片图片。

## 方式一：使用 Docker 部署 (推荐)

使用 Docker 是最简单、最推荐的部署方式。`docker-compose.yml` 文件已经为你配置好了所有需要的服务。

### 步骤

1.  **克隆仓库**:
    ```bash
    git clone https://github.com/your-username/AmiaBot.git
    cd AmiaBot
    ```

2.  **创建并配置 `.env` 文件**:
    从 `.env.example` 复制一份配置文件。
    ```bash
    cp .env.example .env
    ```
    然后，使用你喜欢的文本编辑器（如 `vim` 或 `nano`）打开 `.env` 文件，并填入你的配置信息。

3.  **启动服务**:
    使用 `docker-compose` 启动 AmiaBot 和数据库服务。
    ```bash
    docker-compose up -d
    ```
    `-d` 参数会使服务在后台运行。如果你想查看实时日志，可以去掉 `-d` 参数或使用 `docker-compose logs -f` 命令。

4.  **停止服务**:
    ```bash
    docker-compose down
    ```

## 方式二：手动部署 (Node.js)

如果你希望手动管理环境和依赖，可以按照以下步骤操作。

### 步骤

1.  **安装 Node.js**:
    请确保你的系统上已安装 Node.js (推荐 v18 或更高版本) 和 npm。

2.  **克隆仓库并安装依赖**:
    ```bash
    git clone https://github.com/your-username/AmiaBot.git
    cd AmiaBot
    npm install
    ```

3.  **创建并配置 `.env` 文件**:
    与 Docker 部署方式相同，复制并配置 `.env` 文件。
    ```bash
    cp .env.example .env
    ```
    编辑 `.env` 文件，填入你的配置。

4.  **运行数据库**:
    你需要一个正在运行的 PostgreSQL 数据库实例，并将连接信息配置在 `.env` 文件中。

5.  **编译和启动机器人**:
    -   **开发模式 (带热重载)**:
        ```bash
        npm run dev
        ```
    -   **生产模式**:
        首先，编译 TypeScript 代码：
        ```bash
        npm run build
        ```
        然后，启动编译后的应用：
        ```bash
        npm run start
        ```

### 进程管理

在生产环境中，推荐使用进程守护工具（如 `pm2`）来管理 Node.js 进程，以确保其稳定运行。

**使用 pm2 启动:**
```bash
# 全局安装 pm2
npm install -g pm2

# 切换到项目目录
cd AmiaBot

# 编译项目
npm run build

# 使用 pm2 启动
pm2 start dist/main.js --name amiabot
```

**常用 pm2 命令:**
-   `pm2 list`: 查看所有进程状态。
-   `pm2 stop amiabot`: 停止应用。
-   `pm2 restart amiabot`: 重启应用。
-   `pm2 logs amiabot`: 查看日志。
