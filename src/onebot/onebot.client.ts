import { EventEmitter } from 'events';

export class OneBotClient extends EventEmitter {
  public qq: number = 0;
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
    this.qq = (await this.action('get_login_info')).data.user_id;
    this.ws = new WebSocket(this.wsUrl, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });
    this.ws.onmessage = (event) => {
      // console.debug('Received message:', event.data);
      const eventData = JSON.parse(event.data) as Record<string, any>;
      this.emit('all', eventData);
      switch (eventData.post_type) {
        case 'message':
          this.emit('message', eventData);
          switch (eventData.message_type) {
            case 'group':
              this.emit('message.group', eventData);
              break;
            case 'private':
              this.emit('message.private', eventData);
              break;
          }
          break;
      }
    };
  }
}
