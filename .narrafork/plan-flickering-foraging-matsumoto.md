# 表情回应功能增强计划

## 目标

增强表情回应功能，使其能够检测消息内容中的 Emoji 表情，并支持一次性设置/取消多个表情。

## 修改内容

### 1. 新增 Emoji ID 转换工具

在 `src/utils/index.ts` 中实现两个函数 `emojiToFaceId(emoji: string): string` 和 `faceIdToEmoji(faceId: string): string`。

**`emojiToFaceId` (正向转换):**

- 移除 `\ufe0f` 和 `\ufe0e` 变体选择符。
- 将结果转换为 UTF-32 BE 编码的字节流，并视为一个大端序整数。
- 返回其字符串表示。

**`faceIdToEmoji` (反向还原):**

- 将 `faceId` 字符串转换为 BigInt。
- 将 BigInt 还原为大端序字节流。
- 将字节流按 4 字节一组解码为 UTF-32 码点。
- 使用 `String.fromCodePoint` 还原为 Emoji 字符串。

**实现逻辑 (TypeScript):**

```typescript
export function emojiToFaceId(emoji: string): string {
  const cleaned = emoji.replace(/\ufe0f|\ufe0e/g, '');
  const codePoints = Array.from(cleaned).map((c) => c.codePointAt(0)!);
  let id = BigInt(0);
  for (const cp of codePoints) {
    id = (id << 32n) | BigInt(cp);
  }
  return id.toString();
}

export function faceIdToEmoji(faceId: string): string {
  try {
    let id = BigInt(faceId);
    const bytes = [];
    while (id > 0n) {
      bytes.unshift(Number(id & 0xffn));
      id >>= 8n;
    }
    while (bytes.length % 4 !== 0) bytes.unshift(0);
    const codePoints = [];
    for (let i = 0; i < bytes.length; i += 4) {
      const cp =
        (bytes[i] << 24) |
        (bytes[i + 1] << 16) |
        (bytes[i + 2] << 8) |
        bytes[i + 3];
      if (cp !== 0) codePoints.push(cp);
    }
    return String.fromCodePoint(...codePoints);
  } catch {
    return `[${faceId}]`;
  }
}
```

### 2. 增强 `/回应 on` 命令

- **多表情检测**：
  - 提取所有 `type === 'face'` 的消息段 $\rightarrow$ `faceIds`。
  - 使用正则 `/\p{Emoji_Presentation}/gu` 提取 `message.content` 中的所有 Emoji $\rightarrow$ 使用 `emojiToFaceId` 转换为 `emojiIds`。
  - 将两者合并并去重 $\rightarrow$ `finalFaceIds`。
- **批量操作**：
  - 遍历 `finalFaceIds`，对每一个 ID 调用 `addReplyFace(userId, faceId)`。
- **反馈优化**：
  - 告知用户所有已设置的回应表情。对于能够还原为 Emoji 或使用 `SendFaceMessage` 发送的表情，直接在消息中显示该表情。

### 3. 增强 `/回应 off` 命令

- **多表情检测**：逻辑与 `on` 命令一致，提取所有 `face` 消息段和 `content` 中的 Emoji。
- **批量操作**：
  - 遍历 `finalFaceIds`，对每一个 ID 调用 `removeReplyFace(userId, faceId)`。
- **反馈优化**：
  - 告知用户所有已关闭的回应表情，同样进行表情还原显示。

### 4. 增强 `/回应 list` 命令 (还原显示)

- **还原逻辑**：
  - 遍历 `getUserReplyFaces` 返回的列表。
  - 首先尝试判断 `face_id` 是否为标准表情 ID (例如：数值较小且为整数)。如果是，使用 `SendFaceMessage`。
  - 否则，调用 `faceIdToEmoji(face_id)` 尝试将其还原为 Emoji 字符。
  - 如果还原失败，显示 `[ID: face_id]`。
- **输出优化**：将所有还原后的表情拼接在一条消息中发送。

### 5. 兼容性与鲁棒性

- **ID 类型**：由于 `face_id` 在数据库中是 `string`，且算法可能产生大整数，统一使用 `string` 处理 ID。
- **正则支持**：确保环境支持 `u` 标志和 `\p{Emoji_Presentation}` (Node.js 10+)。

## 依赖关系与并行计划

1. **工具函数实现**：修改 `src/utils/index.ts` $\rightarrow$ **依赖项**。
2. **逻辑修改**：修改 `src/features/reply/feature.ts` 中的 `on` 和 `off` 分支 $\rightarrow$ **依赖 (1)**。
3. **测试与验证**：验证单表情、多表情、纯 Emoji、混合表情的设置与删除。

## UI/UX 布局 (反馈消息)

**设置成功时：**
`已设置对您的消息使用以下表情进行回应： [表情1] [表情2] [表情3]`

**取消成功时：**
`已关闭以下表情的回应功能： [表情1] [表情2]`
