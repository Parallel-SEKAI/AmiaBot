/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { RecvMessage } from './message/recv.entity.js';
import logger from '../config/logger.js';
import { config } from '../config/index.js';
import { checkFeatureEnabled } from '../service/db.js';
import { convertToSimplified } from '../utils/t2s.js';

/**
 * 指令处理器类型
 * @param data 原始事件数据
 * @param match 匹配结果（字符串或正则匹配数组）
 */
export type CommandHandler = (
  data: Record<string, any>,
  match?: string | RegExpExecArray
) => Promise<void>;

export interface CommandOptions {
  suppressLike?: boolean;
  isGeneral?: boolean;
}

export interface RegisteredCommand {
  featureName?: string;
  pattern: string | RegExp;
  description?: string;
  example?: string;
  handler: CommandHandler;
  options?: CommandOptions;
}

interface MessageSegment {
  type: string;
  data: Record<string, any>;
}

const DEFAULT_CHUNK_SIZE = 512 * 1024; // 512KB chunks for better balance

function isGeneralPattern(pattern: string | RegExp): boolean {
  if (typeof pattern === 'string') {
    return pattern === '';
  }
  return pattern.source === '.*' || pattern.source === '^.*$';
}

/**
 * OneBot 客户端类，负责与 OneBot 实现端（如 NapCat）进行通信
 * 支持 HTTP API 调用、WebSocket 事件监听以及流式文件上传
 */
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

  // 指令触发频率限制与循环防止
  private commandCooldowns: Map<string, number> = new Map();
  private sentMessagesCache: Map<string, string[]> = new Map();
  private readonly COOLDOWN_MS = 1000;
  private readonly CACHE_LIMIT = 10;

  // 心跳检测相关
  private lastMessageTimestamp: number = Date.now();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private monitorTimer: NodeJS.Timeout | null = null;

  // 存储注册的指令
  private registeredCommands: RegisteredCommand[] = [];

  /**
   * 获取所有已注册的指令（只读）
   */
  public get commands(): ReadonlyArray<RegisteredCommand> {
    return this.registeredCommands;
  }

  constructor(httpUrl: string, wsUrl: string, token: string) {
    super();
    this.httpUrl = httpUrl;
    this.wsUrl = wsUrl;
    this.token = token;
  }

  /**
   * 注册一个新的指令
   * @param featureName 功能模块名称，会自动检查该功能是否在群聊中开启
   * @param pattern 触发指令的字符串或正则表达式
   * @param description 指令功能简述
   * @param example 指令使用示例
   * @param handler 触发后的异步回调函数
   * @param options 额外配置选项
   */
  public registerCommand(
    featureName: string | undefined,
    pattern: string | RegExp,
    description: string | undefined,
    example: string | undefined,
    handler: CommandHandler,
    options?: CommandOptions
  ) {
    const wrappedHandler = async (
      data: Record<string, any>,
      match?: string | RegExpExecArray
    ) => {
      if (featureName && data.group_id) {
        const enabled = await checkFeatureEnabled(data.group_id, featureName);
        if (!enabled) {
          logger.debug(
            '[onebot.command] Feature %s is disabled in group %d, skipping command %s',
            featureName,
            data.group_id,
            pattern
          );
          return;
        }
      }
      await handler(data, match);
    };

    this.registeredCommands.push({
      pattern,
      handler: wrappedHandler,
      featureName,
      description,
      example,
      options,
    });

    logger.debug(
      '[onebot.command] Details: %s - %s',
      description || 'No description',
      example || 'No example'
    );

    logger.info(
      '[onebot.command] Registered command: %s%s',
      pattern instanceof RegExp ? pattern.toString() : pattern,
      featureName ? ` (Feature: ${featureName})` : ''
    );
  }

  /**
   * 执行 OneBot HTTP API 动作
   * @param action 动作名称（如 'send_group_msg'）
   * @param params 动作参数
   * @returns 响应数据对象
   */
  public async action(
    action: string,
    params: Record<string, any> = {}
  ): Promise<Record<string, any>> {
    // 记录发送的消息内容以防止循环 (仅针对文本消息)
    if (action === 'send_group_msg' || action === 'send_private_msg') {
      const groupId = params.group_id || params.user_id;
      const messages = params.message as MessageSegment[];
      if (Array.isArray(messages)) {
        const textContent = messages
          .filter((m) => m.type === 'text')
          .map((m) => m.data.text)
          .join('');
        if (textContent) {
          // 这里的 groupId 在私聊时是 user_id
          const contextKey = `g${groupId}`;
          const cached = this.sentMessagesCache.get(contextKey) || [];
          cached.push(textContent);
          if (cached.length > this.CACHE_LIMIT) {
            cached.shift();
          }
          this.sentMessagesCache.set(contextKey, cached);
        }
      }
    }
    // ... (rest of the action method)
      logger.debug(
        '[onebot.action.%s] Send: %s',
        action,
        JSON.stringify(params)
      );
    const url = `${this.httpUrl}/${action}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

    const options = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      signal: controller.signal,
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
    } catch (error: any) {
      if (error.name === 'AbortError') {
        logger.error('[onebot.action.%s] Request timeout after 300s', action);
        throw new Error(
          `HTTP request timeout for action ${action} (AbortError)`
        );
      }
      logger.error('[onebot.action.%s] Failed: %s', action, error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 使用流式上传文件 (NapCat 扩展 API - HTTP 适配版)
   * @param filePath 本地文件路径
   * @param filename 可选的文件名
   * @returns 上传后的文件路径或标识符
   */
  public async uploadFileStream(
    filePath: string,
    filename?: string
  ): Promise<string> {
    const { promises: fs, createReadStream } = await import('fs');
    const { basename } = await import('path');
    const { randomUUID, createHash } = await import('crypto');

    const stats = await fs.stat(filePath);
    const fileSize = stats.size;
    const streamId = randomUUID();
    const totalChunks = Math.ceil(fileSize / DEFAULT_CHUNK_SIZE);
    const resolvedFilename = filename || basename(filePath);

    // 计算 SHA256 以供校验
    const hash = createHash('sha256');
    const hashStream = createReadStream(filePath);
    for await (const chunk of hashStream) {
      hash.update(chunk as Buffer);
    }
    const expectedSha256 = hash.digest('hex');

    logger.info(
      '[onebot.upload] Starting HTTP stream upload: %s (ID: %s, Chunks: %d)',
      resolvedFilename,
      streamId,
      totalChunks
    );

    const stream = createReadStream(filePath, {
      highWaterMark: DEFAULT_CHUNK_SIZE,
    });
    let chunkIndex = 0;

    // 1. 发送所有数据分片
    for await (const chunk of stream) {
      const params: Record<string, string | number> = {
        stream_id: streamId,
        chunk_data: (chunk as Buffer).toString('base64'),
        chunk_index: chunkIndex,
        total_chunks: totalChunks,
      };

      // 仅在第一个分片或必要时携带元数据
      if (chunkIndex === 0) {
        params.file_size = fileSize;
        params.filename = resolvedFilename;
        params.expected_sha256 = expectedSha256;
        params.file_retention = 300000; // 5 min
      }

      const res = await this.action('upload_file_stream', params);
      if (res.status !== 'ok') {
        throw new Error(`Failed to upload chunk ${chunkIndex}: ${res.message}`);
      }
      chunkIndex++;
    }

    // 2. 发送合并请求 (is_complete: true)
    logger.debug('[onebot.upload] Finalizing stream upload: %s', streamId);
    const finalRes = await this.action('upload_file_stream', {
      stream_id: streamId,
      is_complete: true,
    });

    if (finalRes.status === 'ok' && finalRes.data?.file_path) {
      logger.info(
        '[onebot.upload] Stream upload complete: %s',
        finalRes.data.file_path
      );
      return finalRes.data.file_path;
    }

    throw new Error('Stream upload failed to return server file path');
  }

  /**
   * 使用流式上传内存中的 Buffer (NapCat 扩展 API - HTTP 适配版)
   * @param buffer 要上传的 Buffer
   * @param filename 建议的文件名
   * @returns 上传后的文件路径或标识符
   */
  public async uploadBufferStream(
    buffer: Buffer,
    filename: string
  ): Promise<string> {
    const { randomUUID, createHash } = await import('crypto');

    const fileSize = buffer.length;
    const streamId = randomUUID();
    const totalChunks = Math.ceil(fileSize / DEFAULT_CHUNK_SIZE);
    const expectedSha256 = createHash('sha256').update(buffer).digest('hex');

    logger.info(
      '[onebot.upload] Starting HTTP buffer upload (ID: %s, Chunks: %d)',
      streamId,
      totalChunks
    );

    // 1. 分片上传
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * DEFAULT_CHUNK_SIZE;
      const end = Math.min(start + DEFAULT_CHUNK_SIZE, fileSize);
      const chunk = buffer.subarray(start, end);

      const params: Record<string, string | number> = {
        stream_id: streamId,
        chunk_data: chunk.toString('base64'),
        chunk_index: chunkIndex,
        total_chunks: totalChunks,
      };

      if (chunkIndex === 0) {
        params.file_size = fileSize;
        params.filename = filename;
        params.expected_sha256 = expectedSha256;
        params.file_retention = 300000;
      }

      const res = await this.action('upload_file_stream', params);
      if (res.status !== 'ok') {
        throw new Error(`Failed to upload chunk ${chunkIndex}: ${res.message}`);
      }
    }

    // 2. 合并
    const finalRes = await this.action('upload_file_stream', {
      stream_id: streamId,
      is_complete: true,
    });

    if (finalRes.status === 'ok' && finalRes.data?.file_path) {
      logger.info(
        '[onebot.upload] Buffer stream upload complete: %s',
        finalRes.data.file_path
      );
      return finalRes.data.file_path;
    }

    throw new Error('Buffer stream upload failed to return server file path');
  }

  /**
   * 获取客户端健康状态
   */
  public async getHealthStatus() {
    const wsOpen = this.ws?.readyState === WebSocket.OPEN;
    const wsHeartbeat = Date.now() - this.lastMessageTimestamp < 60000;
    const wsStatus =
      wsOpen && wsHeartbeat
        ? {
            status: 'UP' as const,
            details: 'WebSocket is open and receiving messages',
          }
        : {
            status: 'DOWN' as const,
            details: `WebSocket readyState: ${this.ws?.readyState}, last message: ${Date.now() - this.lastMessageTimestamp}ms ago`,
          };

    const authStatus =
      this.qq !== 0
        ? { status: 'UP' as const, details: `Authenticated as ${this.qq}` }
        : { status: 'DOWN' as const, details: 'Not authenticated (qq is 0)' };

    let apiStatus: { status: 'UP' | 'DOWN'; details: string };
    let timeoutId: NodeJS.Timeout | undefined = undefined;
    try {
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Timeout after 5s')),
          5000
        );
      });
      await Promise.race([this.action('get_login_info'), timeoutPromise]);
      apiStatus = { status: 'UP', details: 'API is responsive' };
    } catch (error: any) {
      apiStatus = {
        status: 'DOWN',
        details: `API check failed: ${error.message}`,
      };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    return {
      ws: wsStatus,
      auth: authStatus,
      api: apiStatus,
    };
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.lastMessageTimestamp = Date.now();

    // 每 30 秒发送一次 WebSocket ping
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        logger.debug('[onebot] Sending heartbeat ping');
        this.ws.ping();
      }
    }, 30000);

    // 每 10 秒检查一次是否超时 (超过 60 秒未收到任何消息/pong)
    this.monitorTimer = setInterval(() => {
      const now = Date.now();
      if (now - this.lastMessageTimestamp > 60000) {
        logger.warn(
          '[onebot] Heartbeat timeout! No message received for 60s. Terminating connection...'
        );
        this.ws?.terminate();
      }
    }, 10000);
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
      this.startHeartbeat();
    };

    this.ws.on('pong', () => {
      this.lastMessageTimestamp = Date.now();
    });

    this.ws.onmessage = (event) => {
      this.lastMessageTimestamp = Date.now();
      // console.debug('Received message:', event.data);
      const dataStr = event.data.toString();
      logger.debug('[onebot] Received message: %s', dataStr);
      const eventData = JSON.parse(dataStr) as Record<string, any>;
      if (
        eventData.post_type === 'message' &&
        eventData.message_type === 'private'
      ) {
        return;
      }
      this.emit('all', eventData);
      this.emit(eventData.post_type, eventData);
      this.emit(`${eventData.post_type}.${eventData.sub_type}`, eventData);
      if (eventData.post_type === 'message') {
        const userId = eventData.user_id;
        const groupId = eventData.group_id;

        // 1. 防止自身触发
        // Fallback to eventData.self_id if this.qq is not yet populated (startup race)
        const botId = this.qq || eventData.self_id;
        if (userId === botId) {
          return;
        }

        this.emit(`message.${eventData.message_type}`, eventData);
        const message = RecvMessage.fromMap(eventData);
        const text = message.content;

        let stripped = text;
        for (const prefix of config.prefixes) {
          if (text.startsWith(prefix)) {
            stripped = text.slice(prefix.length).trim();
            break;
          }
        }

        const simplifiedStripped = convertToSimplified(stripped);

        // 3. 内容重复检测 (防止 Bot 循环)
        const contextKey = groupId ? `g${groupId}` : `p${userId}`;
        const cachedMessages = this.sentMessagesCache.get(contextKey) || [];
        if (cachedMessages.includes(simplifiedStripped)) {
          logger.debug(
            '[onebot.command] Potential bot loop detected for message: %s',
            simplifiedStripped
          );
          return;
        }

        // 尝试匹配注册的指令
        let matched = false;
        for (const cmd of this.registeredCommands) {
          if (typeof cmd.pattern === 'string') {
            const pattern = cmd.pattern.toLowerCase();
            const lowerStripped = simplifiedStripped.toLowerCase();

            // 检查是否以 pattern 开头
            if (lowerStripped.startsWith(pattern)) {
              // 2. 指令冷却检查 (1s) - Moved here to only affect commands
              const cooldownKey = groupId ? `g${groupId}:u${userId}` : `p${userId}`;
              const now = Date.now();
              const lastTrigger = this.commandCooldowns.get(cooldownKey);
              if (lastTrigger && now - lastTrigger < this.COOLDOWN_MS) {
                continue; 
              }
              
              matched = true;
              this.commandCooldowns.set(cooldownKey, now);
              const isGeneral =
                cmd.options?.isGeneral || isGeneralPattern(cmd.pattern);
              if (!isGeneral) {
                logger.debug(
                  '[onebot.command] Matched command: %s',
                  cmd.pattern
                );
              }
              if (
                config.messageMatchLikeFaceId &&
                !cmd.options?.suppressLike &&
                !isGeneral
              ) {
                void message.like(config.messageMatchLikeFaceId.toString());
              }
              cmd.handler(eventData, cmd.pattern).catch((err) => {
                logger.error(
                  '[onebot.command] Error executing command handler for %s:',
                  cmd.pattern,
                  err
                );
              });
              // break; // Removed to allow multiple commands to match
            }
          } else if (cmd.pattern instanceof RegExp) {
            const match = cmd.pattern.exec(simplifiedStripped);
            if (match) {
              // 2. 指令冷却检查 (1s) - Moved here to only affect commands
              const cooldownKey = groupId ? `g${groupId}:u${userId}` : `p${userId}`;
              const now = Date.now();
              const lastTrigger = this.commandCooldowns.get(cooldownKey);
              if (lastTrigger && now - lastTrigger < this.COOLDOWN_MS) {
                continue;
              }

              matched = true;
              this.commandCooldowns.set(cooldownKey, now);
              const isGeneral =
                cmd.options?.isGeneral || isGeneralPattern(cmd.pattern);
              if (!isGeneral) {
                logger.debug(
                  '[onebot.command] Matched command: %s',
                  cmd.pattern
                );
              }
              if (
                config.messageMatchLikeFaceId &&
                !cmd.options?.suppressLike &&
                !isGeneral
              ) {
                void message.like(config.messageMatchLikeFaceId.toString());
              }
              cmd.handler(eventData, match).catch((err) => {
                logger.error(
                  '[onebot.command] Error executing command handler for %s:',
                  cmd.pattern,
                  err
                );
              });
              // break; // Removed to allow multiple commands to match
            }
          }
        }

        // 如果没有匹配到注册指令，回退到旧的指令检测机制（基于空格分隔）
        if (!matched) {
          const command = simplifiedStripped.split(' ')[0].toLowerCase();
          if (command) {
            // 2. 指令冷却检查 (1s) - Moved here to only affect commands
            const cooldownKey = groupId ? `g${groupId}:u${userId}` : `p${userId}`;
            const now = Date.now();
            const lastTrigger = this.commandCooldowns.get(cooldownKey);
            if (lastTrigger && now - lastTrigger < this.COOLDOWN_MS) {
              return;
            }

            this.commandCooldowns.set(cooldownKey, now);
            this.emit(`message.command.${command}`, eventData);
          }
        }
      } else if (eventData.post_type === 'notice') {
        this.emit(`notice.${eventData.notice_type}`, eventData);
      }
    };

    this.ws.onclose = (event) => {
      this.stopHeartbeat();
      logger.warn(
        '[onebot] WebSocket disconnected, code: %d, reason: %s',
        event.code,
        event.reason
      );
      this.ws = null;
      if (config.exitWhenError) {
        logger.error(
          '[onebot] WebSocket disconnected and config.exitWhenError is true, exiting...'
        );
        process.exit(1);
      } else {
        this.reconnect();
      }
    };

    this.ws.onerror = (error) => {
      this.stopHeartbeat();
      logger.error('[onebot] WebSocket error:', error);
      this.ws = null;
      if (config.exitWhenError) {
        logger.error(
          '[onebot] WebSocket error and config.exitWhenError is true, exiting...'
        );
        process.exit(1);
      } else {
        this.reconnect();
      }
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

  /**
   * 启动客户端
   * 排序已注册指令、获取登录信息并建立 WebSocket 连接
   */
  public async run(): Promise<void> {
    // 按照模式长度降序排序，确保长指令优先匹配
    this.registeredCommands.sort((a, b) => {
      const lenA = typeof a.pattern === 'string' ? a.pattern.length : 0;
      const lenB = typeof b.pattern === 'string' ? b.pattern.length : 0;
      return lenB - lenA;
    });

    // 异步获取登录信息，避免阻塞 WS 连接并增加重试机制
    this.initLoginInfo().catch((err) => {
      logger.error(
        '[onebot] Failed to fetch login info after retries: %s',
        err
      );
    });

    this.on('all', this.echoMessage);
    this.connectWebSocket();
  }

  /**
   * 初始化登录信息，包含重试机制
   */
  private async initLoginInfo(): Promise<void> {
    const maxAttempts = 3;
    const delay = 2000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.action('get_login_info');
        const loginInfo = response.data as Record<string, any>;
        this.qq = loginInfo.user_id;
        this.nickname = loginInfo.nickname;
        logger.info(
          '[onebot] Login info fetched successfully: %s (%d)',
          this.nickname,
          this.qq
        );
        return;
      } catch (error) {
        logger.warn(
          '[onebot] Attempt %d/%d to fetch login info failed: %s',
          attempt,
          maxAttempts,
          error
        );
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw new Error('Max retries reached for get_login_info');
  }

  public async echoMessage(eventData: Record<string, any>) {
    switch (eventData.post_type) {
      case 'message':
        switch (eventData.message_type) {
          case 'group':
            logger.info(
              '[onebot.recv][Group: %d][User: %d] %s%s: %s',
              eventData.group_id,
              eventData.user_id,
              `(${eventData.group_name}) `,
              eventData.sender.card || eventData.sender.nickname,
              eventData.raw_message
            );
        }
    }
  }
}
