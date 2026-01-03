import logger from '../config/logger';

export interface FeatureModule {
  name: string;
  description: string;
  init: () => Promise<void>;
  needEnable: boolean;
}

export class FeatureManager {
  private static instance: FeatureManager;
  private features: Map<string, FeatureModule> = new Map();

  private constructor() {}

  public static getInstance(): FeatureManager {
    if (!FeatureManager.instance) {
      FeatureManager.instance = new FeatureManager();
    }
    return FeatureManager.instance;
  }

  public registerFeature(feature: FeatureModule): void {
    this.features.set(feature.name, feature);
    logger.info(
      '[feature.manager] Registered feature: %s - %s',
      feature.name,
      feature.description
    );
  }

  public async initializeAllFeatures(): Promise<void> {
    logger.info(
      '[feature.manager] Initializing %d features...',
      this.features.size
    );

    const initializationPromises = Array.from(this.features.entries()).map(
      async ([name, feature]) => {
        try {
          await feature.init();
          logger.info('[feature.manager] Initialized feature: %s', name);
          return { name, success: true };
        } catch (error) {
          logger.error(
            '[feature.manager] Failed to initialize feature %s:',
            name,
            error
          );
          return { name, success: false, error };
        }
      }
    );

    const results = await Promise.all(initializationPromises);
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

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
