---
title: 二次开发
---

# 二次开发指南

AmiaBot 拥有一个基于插件的模块化架构，这使得添加新功能变得非常简单和直观。本指南将引导你完成创建和集成一个全新功能模块的整个流程。

## 项目结构概览

所有与机器人核心功能相关的代码都位于 `src/features` 目录下。每个子目录都代表一个独立的功能模块。

```
src/
└── features/
    ├── feature-manager.ts  # 功能模块管理器
    ├── index.ts            # 注册所有功能模块的地方
    ├── chat/               # 聊天功能模块
    │   └── index.ts
    ├── bilibili/           # B站解析模块
    │   └── index.ts
    └── ...                 # 其他功能模块
```

## 功能模块 (FeatureModule)

一个功能模块本质上是一个实现了 `FeatureModule` 接口的对象，它包含以下属性：

- `name` (string): 功能的唯一标识符，用于内部管理和数据库记录。
- `description` (string): 功能的简短描述。
- `init` (() => `Promise<void>`): 功能的初始化函数。所有事件监听和启动逻辑都应在此函数中完成。
- `needEnable` (boolean): 指示该功能是否需要由管理员在群内手动开启。
  - `true`: 功能默认关闭，需要使用 `/bot feat on <功能名>` 开启后才能使用。
  - `false`: 功能默认全局开启，无法通过指令关闭。

## 创建一个新的功能模块

以下是添加一个名为 `my-feature` 的新功能的步骤。

### 1. 创建模块目录和文件

在 `src/features/` 目录下创建一个新的文件夹 `my-feature`，并在其中创建一个 `index.ts` 文件。

```
src/features/
└── my-feature/
    └── index.ts
```

### 2. 编写功能逻辑

在 `src/features/my-feature/index.ts` 文件中，编写你的功能代码。核心是导出一个 `init` 函数，你将在这里注册事件监听器。

```typescript
// src/features/my-feature/index.ts

import logger from '../../config/logger';
import { onebot } from '../../main';
import { RecvMessage } from '../../onebot/message/recv.entity';
import { SendMessage, SendTextMessage } from '../../onebot/message/send.entity';
import { checkFeatureEnabled } from '../../service/db';

// 功能初始化函数
export async function init() {
  logger.info('[feature] Init My-Feature');

  // 监听一个自定义指令，例如 /mycommand
  onebot.on('message.command.mycommand', async (data) => {
    // 检查功能是否在当前群组启用（如果 needEnable 为 true）
    if (await checkFeatureEnabled(data.group_id, 'my-feature')) {
      // 解析收到的消息
      const message = RecvMessage.fromMap(data);

      // 记录日志
      logger.info(
        '[feature.my-feature][Group: %d][User: %d] Triggered with: %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );

      // 执行你的逻辑...
      const replyText = `Hello from My Feature! You said: ${message.content}`;

      // 回复消息
      new SendMessage({
        message: new SendTextMessage(replyText),
      }).reply(message);
    }
  });

  // 你也可以监听其他类型的事件，例如群消息
  onebot.on('message.group', async (data) => {
    // ...你的逻辑...
  });
}
```

### 3. 注册功能模块

最后，打开 `src/features/index.ts` 文件，导入并注册你新创建的模块。

```typescript
// src/features/index.ts

import { FeatureManager } from './feature-manager';
import * as myFeature from './my-feature/index'; // 1. 导入你的模块

// ... 其他模块的导入 ...

export const featureManager = FeatureManager.getInstance();

// ... 其他模块的注册 ...

// 2. 注册你的新模块
featureManager.registerFeature({
  name: 'my-feature', // 确保这个名字是唯一的
  description: '我的第一个新功能',
  init: myFeature.init,
  needEnable: true, // 设置为 true 表示需要管理员手动开启
});

export async function init() {
  await featureManager.initializeAllFeatures();
}
```

### 4. 完成！

现在，重新启动机器人，你的新功能就已经集成到 AmiaBot 中了！如果 `needEnable` 设置为 `true`，记得在群里使用控制器指令开启它。

```
@AmiaBot /bot feat on my-feature
```

然后就可以通过 `/mycommand` 来触发它了。
