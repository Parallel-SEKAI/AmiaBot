import { EventEmitter } from 'events';
import { RecvMessage } from './message/recv.entity';
import { PREFIXES } from '../const';
import logger from '../config/logger';

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

  constructor(httpUrl: string, wsUrl: string, token: string) {
    super();
    this.httpUrl = httpUrl;
    this.wsUrl = wsUrl;
    this.token = token;
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
      logger.debug(
        '[onebot.action.%s] Recv: %s',
        action,
        JSON.stringify(data)
      );
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
      this.emit('all', eventData);
      this.emit(eventData.post_type, eventData);
      this.emit(`${eventData.post_type}.${eventData.sub_type}`, eventData);
      if (eventData.post_type == 'message') {
        this.emit(`message.${eventData.message_type}`, eventData);
        const message = RecvMessage.fromMap(eventData);
        let text = message.content;
        for (const prefix of PREFIXES) {
          if (text.startsWith(prefix)) {
            text = text.slice(prefix.length);
            break;
          }
        }
        const command = text.split(' ')[0].toLowerCase();
        this.emit(`message.command.${command}`, eventData);
      }
      else if (eventData.post_type == 'notice') {
        this.emit(`notice.${eventData.notice_type}`, eventData);
      }
    };

    this.ws.onclose = (event) => {
      logger.warn(
        '[onebot] WebSocket disconnected, code:',
        event.code,
        'reason:',
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
      `[onebot] Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    setTimeout(() => {
      try {
        logger.info(
          `[onebot] Reconnecting... (attempt ${this.reconnectAttempts})`
        );
        this.connectWebSocket();
      } catch (error) {
        logger.error(`[onebot] Reconnect failed:`, error);
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
