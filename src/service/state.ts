import logger from '../config/logger';

/**
 * 消息关联历史项
 */
export interface MessageHistoryItem {
  messageId: string;
  timestamp: number;
}

/**
 * 全局状态服务，管理内存中的缓存和状态
 */
export class StateService {
  private static instance: StateService;

  // 消息关联历史：原始消息 ID -> 关联消息列表
  private messageHistory: Map<number, MessageHistoryItem[]> = new Map();
  // 已撤回的消息 ID -> 撤回时间戳
  private recalledMessageIds: Map<number, number> = new Map();

  private constructor() {
    this.startCleanupTask();
  }

  public static getInstance(): StateService {
    if (!StateService.instance) {
      StateService.instance = new StateService();
    }
    return StateService.instance;
  }

  /**
   * 记录消息关联
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
      const expirationTime = 24 * 60 * 60 * 1000; // 24 小时

      // 清理 messageHistory
      let historyDeleted = 0;
      for (const [id, history] of this.messageHistory.entries()) {
        if (
          history.length === 0 ||
          now - history[0].timestamp > expirationTime
        ) {
          this.messageHistory.delete(id);
          historyDeleted++;
        }
      }

      // 清理 recalledMessageIds
      let recalledDeleted = 0;
      for (const [id, timestamp] of this.recalledMessageIds.entries()) {
        if (now - timestamp > expirationTime) {
          this.recalledMessageIds.delete(id);
          recalledDeleted++;
        }
      }

      if (historyDeleted > 0 || recalledDeleted > 0) {
        logger.debug(
          '[state.service] Cleanup completed: deleted %d history entries and %d recall entries',
          historyDeleted,
          recalledDeleted
        );
      }
    }, 3600000); // 每小时执行一次
  }
}

export const stateService = StateService.getInstance();
