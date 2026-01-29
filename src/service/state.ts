import logger from '../config/logger.js';

/**
 * 消息关联历史项
 */
export interface MessageHistoryItem {
  messageId: string;
  timestamp: number;
}

/**
 * B站解析历史项
 */
export interface BilibiliParseItem {
  groupId: number;
  videoId: string; // BV号或AV号
  timestamp: number;
}

/**
 * 全局状态服务，管理内存中的缓存和临时状态
 * 包含消息关联追踪（用于自动撤回）、B站解析历史追踪和撤回状态管理
 */
export class StateService {
  private static instance: StateService;

  // 消息关联历史：原始消息 ID -> 关联消息列表
  private messageHistory: Map<number, MessageHistoryItem[]> = new Map();
  // B站解析历史：视频ID -> 解析记录
  private bilibiliParseHistory: Map<string, BilibiliParseItem[]> = new Map();
  // 已撤回的消息 ID -> 撤回时间戳
  private recalledMessageIds: Map<number, number> = new Map();

  private constructor() {
    this.startCleanupTask();
  }

  /**
   * 获取 StateService 单例
   */
  public static getInstance(): StateService {
    if (!StateService.instance) {
      StateService.instance = new StateService();
    }
    return StateService.instance;
  }

  /**
   * 记录原始消息与机器人回复消息之间的关联
   * @param originalMsgId 原始消息 ID
   * @param relatedMsgId 机器人回复的消息 ID
   */
  public addMessageRelation(originalMsgId: number, relatedMsgId: string) {
    let history = this.messageHistory.get(originalMsgId);
    if (!history) {
      history = [];
      this.messageHistory.set(originalMsgId, history);
    }
    history.push({
      messageId: relatedMsgId,
      timestamp: Date.now(),
    });
  }

  /**
   * 获取关联消息列表
   */
  public getRelatedMessages(originalMsgId: number): MessageHistoryItem[] {
    return this.messageHistory.get(originalMsgId) || [];
  }

  /**
   * 记录B站视频解析历史
   * @param groupId 群号
   * @param videoId 视频ID（BV号或AV号）
   */
  public addBilibiliParseRecord(groupId: number, videoId: string) {
    const now = Date.now();
    let records = this.bilibiliParseHistory.get(videoId);
    if (!records) {
      records = [];
      this.bilibiliParseHistory.set(videoId, records);
    }
    records.push({
      groupId,
      videoId,
      timestamp: now,
    });
  }

  /**
   * 检查在指定群聊中是否已解析过该视频（5分钟内）
   * @param groupId 群号
   * @param videoId 视频ID（BV号或AV号）
   * @returns 是否已解析过
   */
  public hasBilibiliParsedInGroup(groupId: number, videoId: string): boolean {
    const records = this.bilibiliParseHistory.get(videoId);
    if (!records) {
      return false;
    }

    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000; // 5分钟前的时间戳

    // 检查是否在相同群聊且5分钟内已解析过该视频
    return records.some(
      (record) =>
        record.groupId === groupId && record.timestamp > fiveMinutesAgo
    );
  }

  /**
   * 标记消息为已撤回
   */
  public markAsRecalled(msgId: number) {
    this.recalledMessageIds.set(msgId, Date.now());
  }

  /**
   * 检查消息是否已被撤回
   */
  public isRecalled(msgId: number): boolean {
    return this.recalledMessageIds.has(msgId);
  }

  /**
   * 启动定时清理任务
   */
  private startCleanupTask() {
    setInterval(() => {
      const now = Date.now();
      const messageHistoryExpirationTime = 24 * 60 * 60 * 1000; // 24 小时
      const bilibiliParseHistoryExpirationTime = 5 * 60 * 1000; // 5 分钟

      // 清理 messageHistory
      let historyDeleted = 0;
      for (const [id, history] of this.messageHistory.entries()) {
        if (
          history.length === 0 ||
          now - history[0].timestamp > messageHistoryExpirationTime
        ) {
          this.messageHistory.delete(id);
          historyDeleted++;
        }
      }

      // 清理 bilibiliParseHistory
      let bilibiliHistoryDeleted = 0;
      for (const [videoId, records] of this.bilibiliParseHistory.entries()) {
        const filteredRecords = records.filter(
          (record) =>
            now - record.timestamp <= bilibiliParseHistoryExpirationTime
        );

        if (filteredRecords.length === 0) {
          this.bilibiliParseHistory.delete(videoId);
          bilibiliHistoryDeleted++;
        } else if (filteredRecords.length !== records.length) {
          this.bilibiliParseHistory.set(videoId, filteredRecords);
        }
      }

      // 清理 recalledMessageIds
      let recalledDeleted = 0;
      for (const [id, timestamp] of this.recalledMessageIds.entries()) {
        if (now - timestamp > messageHistoryExpirationTime) {
          this.recalledMessageIds.delete(id);
          recalledDeleted++;
        }
      }

      if (
        historyDeleted > 0 ||
        recalledDeleted > 0 ||
        bilibiliHistoryDeleted > 0
      ) {
        logger.debug(
          '[state.service] Cleanup completed: deleted %d history entries, %d bilibili parse entries and %d recall entries',
          historyDeleted,
          bilibiliHistoryDeleted,
          recalledDeleted
        );
      }
    }, 3600000); // 每小时执行一次
  }
}

export const stateService = StateService.getInstance();
