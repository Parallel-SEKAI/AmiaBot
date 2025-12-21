# 部署方式

> [!IMPORTANT]
> 此页面未经审核,为AI生成

本页面将详细介绍 AmiaBot 的部署方式,包括部署环境要求,部署步骤,配置说明和常见问题解决方案.

## 1. 部署环境要求

### 1.1 操作系统
- **推荐**:Windows 10 (64位) 及以上版本
- **支持**:Linux (Ubuntu 20.04 及以上),macOS (10.15 及以上)

### 1.2 硬件要求
- **CPU**:至少 2 核
- **内存**:至少 4 GB RAM
- **磁盘空间**:至少 10 GB 可用空间

### 1.3 软件要求
- **Node.js**:版本 18 及以上
- **npm**:版本 9 及以上
- **Git**:用于克隆代码仓库
- **OneBot 实现**:推荐使用 NapCat (https://github.com/NapNeko/NapCatQQ)

### 1.4 网络要求
- 能够访问互联网
- 能够连接到 QQ 服务器
- 能够访问以下 API:
  - Gemini AI API
  - 网易云音乐 API
  - B站 API
  - GitHub API
  - Sekai World API
  - 其他第三方 API

## 2. 部署步骤

### 2.1 克隆代码仓库

```bash
git clone https://github.com/your-username/amiabot.git
cd amiabot
```

### 2.2 安装依赖

```bash
npm install
```

### 2.3 配置 OneBot

1. 安装并配置 OneBot 实现(如 NapCat)
2. 确保 OneBot 服务正常运行
3. 记录 OneBot 的 IP 地址和端口号

### 2.4 配置 AmiaBot

1. 复制 `.env.example` 文件为 `.env`
2. 编辑 `.env` 文件,配置必要的环境变量:
   ```
   # OneBot 配置
   ONEBOT_WS_URL=ws://localhost:3653
   ONEBOT_QQ=123456789
   
   # Gemini AI 配置
   GEMINI_API_KEY=your-gemini-api-key
   
   # 其他配置
   # ...
   ```

### 2.5 初始化数据库

```bash
# 创建数据库并执行初始化脚本
mysql -u root -p < db/init.sql
```

### 2.6 构建和运行

```bash
# 构建项目
npm run build

# 运行项目
npm start
```

### 2.7 验证部署

1. 检查日志输出,确保没有错误
2. 将 AmiaBot 添加到您的 QQ 群
3. 发送测试消息,如 `amia 你好`,检查是否有响应

## 3. 配置说明

### 3.1 环境变量配置

| 环境变量名 | 说明 | 默认值 | 示例值 |
|------------|------|--------|--------|
| ONEBOT_WS_URL | OneBot WebSocket 连接地址 | ws://localhost:3653 | ws://192.168.1.100:3653 |
| ONEBOT_QQ | 机器人 QQ 号 | - | 123456789 |
| GEMINI_API_KEY | Gemini AI API 密钥 | - | your-gemini-api-key |
| DATABASE_URL | 数据库连接字符串 | mysql://root:password@localhost:3306/amiabot | mysql://user:pass@localhost:3306/amiabot |
| LOG_LEVEL | 日志级别 | info | debug, info, warn, error |

### 3.2 功能配置

AmiaBot 支持通过数据库配置各个功能的开启/关闭状态.您可以使用以下命令在群聊中配置:

```
@Amia /bot feat list  # 查看所有功能状态
@Amia /bot feat on <功能名>  # 开启特定功能
@Amia /bot feat off <功能名>  # 关闭特定功能
@Amia /bot feat on all  # 开启所有功能
@Amia /bot feat off all  # 关闭所有功能
```

### 3.3 高级配置

#### 3.3.1 日志配置

日志文件默认存储在 `logs/` 目录下,您可以在 `src/config/logger.ts` 中修改日志配置.

#### 3.3.2 AI 模型配置

您可以在 `src/config/index.ts` 中修改 Gemini AI 模型的配置,包括模型名称,温度,最大输出 tokens 等.

## 4. 常见问题解决方案

### 4.1 连接 OneBot 失败

**问题现象**:日志中显示 "Failed to connect to OneBot"

**解决方案**:
1. 检查 OneBot 服务是否正常运行
2. 检查 `ONEBOT_WS_URL` 环境变量是否正确
3. 检查网络连接是否正常
4. 确保防火墙允许连接到 OneBot 端口

### 4.2 AI 聊天无响应

**问题现象**:发送 `amia 你好` 后,AmiaBot 没有回应

**解决方案**:
1. 检查 `GEMINI_API_KEY` 环境变量是否正确
2. 检查网络连接是否正常
3. 检查 Gemini AI 服务是否可用
4. 查看日志,检查是否有相关错误信息

### 4.3 数据库连接失败

**问题现象**:日志中显示 "Failed to connect to database"

**解决方案**:
1. 检查 `DATABASE_URL` 环境变量是否正确
2. 检查数据库服务是否正常运行
3. 检查数据库用户权限是否正确
4. 检查防火墙是否允许连接到数据库端口

### 4.4 功能无法使用

**问题现象**:发送命令后,AmiaBot 没有回应或提示功能未开启

**解决方案**:
1. 使用 `@Amia /bot feat list` 检查功能是否已开启
2. 使用 `@Amia /bot feat on <功能名>` 开启功能
3. 检查日志,查看是否有相关错误信息

## 5. 部署架构

### 5.1 单服务器部署

**架构说明**:将 AmiaBot,OneBot 实现和数据库部署在同一台服务器上.

**适用场景**:小型部署,用户数量较少.

**优势**:
- 部署简单,维护成本低
- 网络延迟低

**劣势**:
- 性能瓶颈明显,无法支持大量用户
- 单点故障风险高

### 5.2 分布式部署

**架构说明**:将 AmiaBot,OneBot 实现和数据库部署在不同的服务器上.

**适用场景**:大型部署,用户数量较多.

**优势**:
- 性能高,可支持大量用户
- 高可用性,降低单点故障风险
- 易于扩展

**劣势**:
- 部署复杂,维护成本高
- 网络延迟较高

## 6. 监控和维护

### 6.1 日志监控

AmiaBot 会生成详细的日志文件,您可以通过监控日志来了解系统运行状态:

```bash
# 实时查看日志
tail -f logs/amiabot.log
```

### 6.2 性能监控

您可以使用以下工具监控 AmiaBot 的性能:

- **PM2**:进程管理和监控
- **Prometheus + Grafana**:系统性能监控
- **Node.js 内置监控工具**:如 `node --inspect`

### 6.3 定期维护

1. **更新代码**:定期拉取最新代码并更新
2. **备份数据库**:定期备份数据库,防止数据丢失
3. **清理日志**:定期清理旧日志,释放磁盘空间
4. **检查依赖**:定期更新依赖,修复安全漏洞

## 7. 自动化部署

### 7.1 使用 Docker 部署

**待补充**:Docker 镜像构建和部署步骤

### 7.2 使用 CI/CD 部署

**待补充**:GitHub Actions,GitLab CI 等 CI/CD 配置

### 7.3 自动化脚本

**待补充**:自动化部署脚本编写和使用

## 8. 扩展部署

### 8.1 多机器人部署

**待补充**:多机器人部署方案

### 8.2 负载均衡

**待补充**:负载均衡配置方案

### 8.3 高可用性

**待补充**:高可用性部署方案

## 9. 安全配置

### 9.1 网络安全

**待补充**:网络安全配置

### 9.2 数据安全

**待补充**:数据加密和备份策略

### 9.3 API 安全

**待补充**:API 密钥管理和访问控制

## 10. 常见部署场景

### 10.1 个人使用部署

**待补充**:个人使用场景下的简化部署步骤

### 10.2 小型群组部署

**待补充**:小型群组场景下的部署建议

### 10.3 大型群组部署

**待补充**:大型群组场景下的部署优化建议

## 11. 升级指南

### 11.1 从旧版本升级

**待补充**:版本升级步骤和注意事项

### 11.2 数据迁移

**待补充**:数据迁移方案

## 12. 卸载指南

### 12.1 停止服务

```bash
# 停止 AmiaBot 服务
npm stop

# 停止 OneBot 服务
# 停止数据库服务
```

### 12.2 清理文件

```bash
# 删除项目目录
rm -rf amiabot

# 删除数据库
mysql -u root -p -e "DROP DATABASE amiabot;"
```

## 13. 联系支持

如果您在部署过程中遇到问题,可以通过以下方式联系支持:

- **GitHub Issues**:https://github.com/your-username/amiabot/issues
- **Discord**:待补充
- **QQ 群**:待补充

## 14. 附录

### 14.1 术语表

**待补充**:部署相关术语解释

### 14.2 参考链接

**待补充**:相关文档和资源链接

---

**注**:本页面内容正在持续更新中,部分章节标注 "待补充" 的内容将在后续版本中完善.
