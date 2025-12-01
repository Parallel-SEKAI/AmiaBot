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
      const data = await response.json();
      return data as Record<string, any>;
    } catch (error) {
      console.error('Failed to perform action:', error);
      throw error;
    }
  }
  public async run(): Promise<void> {
    const loginInfo = (await this.action('get_login_info')).data as Record<
      string,
      any
    >;
    this.qq = loginInfo.user_id;
    this.nickname = loginInfo.nickname;
    this.ws = new WebSocket(this.wsUrl, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });
    this.ws.onopen = () => {
      logger.info('[onebot] WebSocket connected');
    };
    this.ws.onmessage = (event) => {
      // console.debug('Received message:', event.data);
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
    };
  }
}
