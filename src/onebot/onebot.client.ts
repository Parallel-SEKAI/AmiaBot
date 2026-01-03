import { EventEmitter } from 'events';
import { RecvMessage } from './message/recv.entity';
import logger from '../config/logger';
import { config } from '../config';

/**
 * 指令处理器类型
 * @param data 原始事件数据
 * @param match 匹配结果（字符串或正则匹配数组）
 */
export type CommandHandler = (
  data: Record<string, any>,
  match: string | RegExpExecArray
) => Promise<void>;

interface RegisteredCommand {
  pattern: string | RegExp;
  handler: CommandHandler;
}

export class OneBotClient extends EventEmitter {
  public qq: number = 0;
  public nickname: string = '';
  private httpUrl: string;
  private wsUrl: string;
  private token: string;
  private ws: WebSocket | null = null;
  private isReconnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectDelay: number = 30000; // 最大重连延迟30秒

  // 存储注册的指令
  private registeredCommands: RegisteredCommand[] = [];

  constructor(httpUrl: string, wsUrl: string, token: string) {
    super();
    this.httpUrl = httpUrl;
    this.wsUrl = wsUrl;
    this.token = token;
  }

  /**
   * 注册一个新的指令
   * @param pattern 字符串或正则表达式
   * @param handler 触发后的回调函数
   */
  public registerCommand(pattern: string | RegExp, handler: CommandHandler) {
    this.registeredCommands.push({ pattern, handler });
    logger.info(
      '[onebot.command] Registered command: %s',
      pattern instanceof RegExp ? pattern.toString() : pattern
    );
  }

  public async action(
    action: string,
    params: Record<string, any> = {}
  ): Promise<Record<string, any>> {
    logger.debug('[onebot.action.%s] Send: %s', action, JSON.stringify(params));
    const url = `${this.httpUrl}/${action}`;
    const options = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    };

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = (await response.json()) as Record<string, any>;
      if (data.retcode !== 0) {
        logger.error(
          '[onebot.action.%s] Send: %s',
          action,
          JSON.stringify(params)
        );
        logger.error(
          '[onebot.action.%s] Recv: %s',
          action,
          JSON.stringify(data)
        );
      }
      logger.debug('[onebot.action.%s] Recv: %s', action, JSON.stringify(data));
      return data;
    } catch (error) {
      logger.error('[onebot.action.%s] Failed: %s', action, error);
      throw error;
    }
  }

  private connectWebSocket(): void {
    this.ws = new WebSocket(this.wsUrl, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    this.ws.onopen = () => {
      logger.info('[onebot] WebSocket connected');
      this.reconnectAttempts = 0; // 重置重连次数
      this.isReconnecting = false;
    };

    this.ws.onmessage = (event) => {
      // console.debug('Received message:', event.data);
      logger.debug('[onebot] Received message: %s', event.data);
      const eventData = JSON.parse(event.data) as Record<string, any>;
      if (
        eventData.post_type === 'message' &&
        eventData.message_type === 'private'
      ) {
        return;
      }
      this.emit('all', eventData);
      this.emit(eventData.post_type, eventData);
      this.emit(`${eventData.post_type}.${eventData.sub_type}`, eventData);
      if (eventData.post_type == 'message') {
        this.emit(`message.${eventData.message_type}`, eventData);
        const message = RecvMessage.fromMap(eventData);
        const text = message.content;

        let stripped = text;
        for (const prefix of config.prefixes) {
          if (text.startsWith(prefix)) {
            stripped = text.slice(prefix.length);
            break;
          }
        }

        // 尝试匹配注册的指令
        let matched = false;
        for (const cmd of this.registeredCommands) {
          if (typeof cmd.pattern === 'string') {
            if (stripped.toLowerCase().startsWith(cmd.pattern.toLowerCase())) {
              matched = true;
              cmd.handler(eventData, cmd.pattern).catch((err) => {
                logger.error(
                  '[onebot.command] Error executing command handler for %s:',
                  cmd.pattern,
                  err
                );
              });
              break;
            }
          } else if (cmd.pattern instanceof RegExp) {
            const match = cmd.pattern.exec(stripped);
            if (match) {
              matched = true;
              cmd.handler(eventData, match).catch((err) => {
                logger.error(
                  '[onebot.command] Error executing command handler for %s:',
                  cmd.pattern,
                  err
                );
              });
              break;
            }
          }
        }

        // 如果没有匹配到注册指令，回退到旧的指令检测机制（基于空格分隔）
        if (!matched) {
          const command = stripped.split(' ')[0].toLowerCase();
          if (command) {
            this.emit(`message.command.${command}`, eventData);
          }
        }
      } else if (eventData.post_type == 'notice') {
        this.emit(`notice.${eventData.notice_type}`, eventData);
      }
    };

    this.ws.onclose = (event) => {
      logger.warn(
        '[onebot] WebSocket disconnected, code: %d, reason: %s',
        event.code,
        event.reason
      );
      this.ws = null;
      this.reconnect();
    };

    this.ws.onerror = (error) => {
      logger.error('[onebot] WebSocket error:', error);
      this.ws = null;
    };
  }

  private reconnect(): void {
    if (this.isReconnecting) {
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    // 计算重连延迟，1秒开始，每次翻倍，最大30秒
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    logger.info(
      '[onebot] Attempting to reconnect in %dms (attempt %d)',
      delay,
      this.reconnectAttempts
    );

    setTimeout(() => {
      try {
        logger.info(
          '[onebot] Reconnecting... (attempt %d)',
          this.reconnectAttempts
        );
        this.connectWebSocket();
      } catch (error) {
        logger.error('[onebot] Reconnect failed:', error);
        this.isReconnecting = false;
        // 使用setTimeout确保非递归调用，避免栈溢出
        setTimeout(() => this.reconnect(), 0);
      }
    }, delay);
  }

  public async run(): Promise<void> {
    const loginInfo = (await this.action('get_login_info')).data as Record<
      string,
      any
    >;
    this.qq = loginInfo.user_id;
    this.nickname = loginInfo.nickname;

    this.on('all', this.echoMessage);
    this.connectWebSocket();
  }

  public async echoMessage(eventData: Record<string, any>) {
    switch (eventData.post_type) {
      case 'message':
        switch (eventData.message_type) {
          case 'group':
            logger.info(
              '[onebot.recv][Group: %d][User: %d] %s',
              eventData.group_id,
              eventData.user_id,
              eventData.raw_message
            );
        }
    }
  }
}
