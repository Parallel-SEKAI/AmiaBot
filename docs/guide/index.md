# 使用指南

欢迎使用 AmiaBot!本指南将详细介绍 AmiaBot 的各种功能和使用方法,帮助您快速上手并充分利用 AmiaBot 的强大功能.

## 核心功能介绍

### 🤖 智能聊天

AmiaBot 提供基于 Gemini AI 的智能聊天功能,您可以通过输入 `Amia` 加上您想要说的话来触发聊天.AmiaBot 能够理解上下文,进行情感交互,并能学习和记忆用户的偏好.

**使用示例**:
```
amia 你好呀
```

### 📖 漫画查询

使用 `/comic` 命令可以获取随机漫画图片,为您的群聊增添乐趣.

**使用示例**:
```
/comic
```

### 🎵 网易云音乐功能

AmiaBot 支持多种网易云音乐相关功能,包括生成表情歌词,搜索歌曲,播放歌曲和下载歌曲.

**主要命令**:
- `/emojilyric`:生成带表情的歌词
- `/search`:搜索歌曲
- `/play`:播放歌曲(需要引用搜索结果)
- `/download`:下载歌曲(需要引用搜索结果)

**使用示例**:
```
/emojilyric 晴天
/search 晴天
/play 1 (引用搜索结果后使用)
/download 1 (引用搜索结果后使用)
```

### 🎮 猜卡片功能

使用 "猜卡面" 命令可以开始猜卡片游戏,AmiaBot 会发送一张裁剪过的 Project Sekai 卡面图片,您需要猜出对应的角色.

**支持的难度**:ez(简单),no(普通),hd(困难),ex(专家),ma(大师),apd(噩梦)

**使用示例**:
```
猜卡面
猜卡面 ex(使用专家难度)
```

### 🎵 猜歌曲功能

使用 "听歌识曲" 命令可以开始猜歌曲游戏,AmiaBot 会发送一段裁剪过的 Project Sekai 歌曲片段,您需要猜出对应的歌曲.

**支持的难度**:ez(简单),no(普通),hd(困难),ex(专家),ma(大师),apd(噩梦)

**使用示例**:
```
听歌识曲
听歌识曲 ma (使用大师难度)
```

### 📅 猜活动功能

使用 "猜活动" 命令可以开始猜活动游戏,AmiaBot 会发送一张裁剪过的 Project Sekai 活动背景图,您需要猜出对应的活动.

**支持的难度**:ez(简单),no(普通),hd(困难),ex(专家),ma(大师),apd(噩梦)

**支持的服务器(语言)**:cn(国服),jp(日服)

**使用示例**:
```
猜活动
猜活动 ex jp (使用专家难度,日服活动)
```

### 📺 B站功能

AmiaBot 能够自动解析B站视频链接,显示视频的详细信息,包括标题,UP主,播放量,点赞数等.

**使用方式**:
直接在群聊中发送B站视频链接(支持AV号和BV号),AmiaBot 会自动识别并发送视频信息.

**使用示例**:
```
https://www.bilibili.com/video/BV1xx411c7mN/ (随便写的)
av123456789
```

### 🐱 GitHub功能

AmiaBot 能够自动解析GitHub链接,显示仓库,用户,Issue,PR等信息.

**支持的链接类型**:
- 仓库链接:`https://github.com/user/repo`
- 用户链接:`https://github.com/user`
- Issue链接:`https://github.com/user/repo/issues/123`
- PR链接:`https://github.com/user/repo/pull/123`

**使用方式**:
直接在群聊中发送GitHub链接,AmiaBot 会自动识别并发送相应信息.

**使用示例**:
```
https://github.com/vuejs/vitepress
https://github.com/vuejs/vitepress/issues/1
https://github.com/vuejs/vitepress/pull/1
```

### 🎭 PJSK贴纸功能

发送相关关键词可以获取 Project Sekai 角色贴纸,为您的聊天增添乐趣.

**使用示例**:
```
/pjsk (获取帮助)
/pjsk 你好
/pjsk miku 你好
```

### 👆 戳一戳功能

AmiaBot 支持戳一戳互动,当您戳一戳 AmiaBot 时,它会给出相应的回应.

**使用方式**:
直接在QQ客户端戳一戳 AmiaBot.

### 📊 消息统计功能

AmiaBot 可以统计群消息并生成报告,帮助您了解群聊的活跃情况.

### 🎯 自动撤回功能

当群成员撤回消息时,AmiaBot 会自动撤回与之相关的所有消息,保持群聊的整洁.

## 功能控制

AmiaBot 支持通过命令开启/关闭特定功能,以及查看功能状态.

**主要命令**:
- `@Amia /bot feat list`:查看所有功能的状态
- `@Amia /bot feat on <功能名/all>`:开启特定功能或所有功能
- `@Amia /bot feat off <功能名/all>`:关闭特定功能或所有功能

**使用示例**:
```
@Amia /bot feat list
@Amia /bot feat on all
@Amia /bot feat off chat
```

## 开始使用

1. 将 AmiaBot 添加到您的QQ群
2. 查看 [指令格式说明](/guide/commands) 了解详细的命令使用方法
3. 如果遇到问题,可以联系管理员或查看相关文档

## 常见问题

### AmiaBot 支持哪些平台?

AmiaBot 基于 OneBot(NapCat) 接口开发,主要支持QQ平台.

### 如何添加 AmiaBot 到我的群?

请联系 AmiaBot 的管理员获取邀请链接或直接邀请 AmiaBot 加入您的群.

### 如何开启或关闭特定功能?

使用 `@Amia /bot feat on/off <功能名>` 命令可以开启或关闭特定功能.

### AmiaBot 是免费使用的吗?

是的,AmiaBot 是一个开源项目,免费供大家使用.

### 如何贡献代码或提出建议?

欢迎您提交 Issue 或 Pull Request 来贡献代码或提出建议.

## 后续计划

AmiaBot 正在不断发展和完善中,我们计划在未来添加更多功能,包括:

- 更多游戏和互动功能
- 更智能的聊天体验
- 更多实用工具
- 更好的可定制性

感谢您的支持和使用!
