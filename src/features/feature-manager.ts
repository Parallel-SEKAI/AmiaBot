import logger from '../config/logger.js';

/**
 * 功能模块接口定义
 */
export interface FeatureModule {
  /** 模块唯一名称 */
  name: string;
  /** 模块功能描述 */
  description: string;
  /** 初始化逻辑 */
  init: () => Promise<void>;
  /** 是否需要手动开启（针对群聊） */
  needEnable: boolean;
}

/**
 * 功能管理器，负责管理所有功能模块的注册与初始化
 * 采用单例模式
 */
export class FeatureManager {
  private static instance: FeatureManager;
  private features: Map<string, FeatureModule> = new Map();

  private constructor() {}

  /**
   * 获取 FeatureManager 单例
   */
  public static getInstance(): FeatureManager {
    if (!FeatureManager.instance) {
      FeatureManager.instance = new FeatureManager();
    }
    return FeatureManager.instance;
  }

  /**
   * 注册一个新的功能模块
   * @param feature 符合 FeatureModule 接口的对象
   */
  public registerFeature(feature: FeatureModule): void {
    this.features.set(feature.name, feature);
    logger.info(
      '[feature.manager] Registered feature: %s - %s',
      feature.name,
      feature.description
    );
  }

  /**
   * 并行初始化所有已注册的功能模块
   */
  public async initializeAllFeatures(): Promise<void> {
    logger.info(
      '[feature.manager] Initializing %d features...',
      this.features.size
    );

    const featureList = Array.from(this.features.values());

    const results = await Promise.allSettled(
      featureList.map(async (feature) => {
        try {
          await feature.init();
          logger.info(
            '[feature.manager] Initialized feature: %s',
            feature.name
          );
          return feature.name;
        } catch (error) {
          logger.error(
            '[feature.manager] Failed to initialize feature %s:',
            feature.name,
            error
          );
          throw error;
        }
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    logger.info(
      '[feature.manager] Feature initialization completed: %d successful, %d failed',
      successful,
      failed
    );
  }

  public getFeature(name: string): FeatureModule | undefined {
    return this.features.get(name);
  }

  public getAllFeatures(): FeatureModule[] {
    return Array.from(this.features.values());
  }

  public getFeatureCount(): number {
    return this.features.size;
  }

  public getFeatureNames(): string[] {
    return Array.from(this.features.keys());
  }
}

// 导出全局单例，其它模块直接导入此变量
export const featureManager = FeatureManager.getInstance();
