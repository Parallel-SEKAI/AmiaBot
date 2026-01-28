import { featureManager } from '../feature-manager';
import logger from '../../config/logger';
import { onebot } from '../../onebot';
import { RecvAtMessage, RecvMessage } from '../../onebot/message/recv.entity';
import { SendMessage, SendTextMessage } from '../../onebot/message/send.entity';
import { parseCommandLineArgs } from '../../utils';
import { checkFeatureEnabled, setFeatureEnabled } from '../../service/db';

const HELP_CONTENT = `
请输入命令
feat on <feature-name>
feat off <feature-name>
feat list
使用示例
[AT] /bot feat on all
`.trim();

/**
 * 校验是否艾特了机器人
 */
function isAtBot(message: RecvMessage): boolean {
  const firstMsg = message.message?.[0];
  return (
    firstMsg?.type === 'at' &&
    (firstMsg as RecvAtMessage).qq === onebot.qq.toString()
  );
}

/**
 * 处理具体的 feat 相关指令
 */
async function handleFeatCommand(message: RecvMessage, args: string[]) {
  const groupId = message.groupId;
  if (!groupId) {
    void new SendMessage({
      message: new SendTextMessage('该命令仅支持群聊使用'),
    }).reply(message);
    return;
  }

  const action = args[2]; // on, off, list, ls
  const target = args[3]; // feature-name or 'all'
  const features = featureManager.getAllFeatures().filter((f) => f.needEnable);

  // 处理 list 指令
  if (action === 'list' || action === 'ls') {
    const statusList = await Promise.all(
      features.map(async (f) => ({
        name: f.name,
        description: f.description,
        enabled: await checkFeatureEnabled(groupId, f.name),
      }))
    );

    const enabled = statusList
      .filter((s) => s.enabled)
      .map((s) => `${s.name} (${s.description})`);
    const disabled = statusList
      .filter((s) => !s.enabled)
      .map((s) => `${s.name} (${s.description})`);

    const reply =
      `当前已加载功能模块：\n已开启：\n${enabled.length > 0 ? enabled.join('\n') : '无'}\n\n未开启：\n${disabled.length > 0 ? disabled.join('\n') : '无'}`.trim();
    void new SendMessage({ message: new SendTextMessage(reply) }).reply(
      message
    );
    return;
  }

  // 处理 on/off 指令
  if (action === 'on' || action === 'off') {
    if (!target) {
      void new SendMessage({
        message: new SendTextMessage(HELP_CONTENT),
      }).reply(message);
      return;
    }

    const isEnable = action === 'on';

    if (target === 'all') {
      await Promise.all(
        features.map((f) => setFeatureEnabled(groupId, f.name, isEnable))
      );
      void new SendMessage({
        message: new SendTextMessage(
          `已${isEnable ? '开启' : '关闭'}所有功能模块`
        ),
      }).reply(message);
    } else {
      const feature = features.find((f) => f.name === target);
      if (!feature) {
        void new SendMessage({
          message: new SendTextMessage(`未找到功能模块 ${target}`),
        }).reply(message);
      } else {
        await setFeatureEnabled(groupId, feature.name, isEnable);
        void new SendMessage({
          message: new SendTextMessage(
            `已${isEnable ? '开启' : '关闭'}功能模块 ${feature.name}`
          ),
        }).reply(message);
      }
    }
    return;
  }

  // 兜底回复帮助信息
  void new SendMessage({ message: new SendTextMessage(HELP_CONTENT) }).reply(
    message
  );
}

export async function init() {
  logger.info('[feature] Init controller feature');

  onebot.registerCommand('bot', async (data) => {
    const message = RecvMessage.fromMap(data);

    // 1. 基础校验：必须艾特机器人
    if (!isAtBot(message)) return;

    // 2. 解析参数并记录日志
    const [args] = parseCommandLineArgs(message.content);
    logger.info(
      '[feature.controller][Group: %d][User: %d] %s',
      message.groupId,
      message.userId,
      message.rawMessage
    );
    logger.debug('[feature.controller] Args: %j', args);

    // 3. 校验指令前缀 (必须是 /bot feat ...)
    // 假设 parseCommandLineArgs 返回的第一个元素是 "/bot" 或类似指令名
    if (args.length < 2 || args[1] !== 'feat') {
      void new SendMessage({
        message: new SendTextMessage(HELP_CONTENT),
      }).reply(message);
      return;
    }

    // 4. 进入具体业务逻辑
    await handleFeatCommand(message, args);
  });
}
