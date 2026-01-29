import pool from './db.js';
import logger from '../config/logger.js';
import type { PoolClient } from 'pg';

export type TimeStatus =
  | 'NORMAL'
  | 'LATE'
  | 'VERY_LATE'
  | 'UNREASONABLE'
  | 'EARLY';

export interface SleepRecordResult {
  status: TimeStatus;
  rank: number;
  globalRank: number;
  sleepDuration?: number; // Hours
  wakeDuration?: number; // Hours
}

// Configuration Constants
const CONSTANTS = {
  DAY_START_HOUR: 4,
  MAX_SLEEP_DURATION_HOURS: 24,
  MIN_SLEEP_DURATION_HOURS: 0,
  MIN_THRESHOLD_HOURS: 2, // Minimum sleep duration threshold to prevent short records
  WAKE_RANGES: [
    { max: 8, status: 'NORMAL' },
    { max: 10, status: 'LATE' },
    { max: 12, status: 'VERY_LATE' },
    // Else UNREASONABLE
  ] as const,
  SLEEP_RANGES: [
    { start: 20, max: 24, status: 'NORMAL' },
    { start: 24, max: 26, status: 'LATE' },
    { start: 26, max: 28, status: 'VERY_LATE' },
    // Else UNREASONABLE
  ] as const,
};

/**
 * Convert a Date object to a timezone-aware string for database storage
 * This ensures consistent timezone handling across different server configurations
 */
export function toDatabaseTimestamp(date: Date): string {
  // Use Intl.DateTimeFormat to explicitly format the date in Asia/Shanghai timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Format the date using the formatter
  const parts = formatter.formatToParts(date);
  const partMap = parts.reduce(
    (acc, part) => {
      acc[part.type] = part.value;
      return acc;
    },
    {} as Record<string, string>
  );

  // Extract the individual components
  const year = partMap.year;
  const month = partMap.month;
  const day = partMap.day;
  const hour = partMap.hour;
  const minute = partMap.minute;
  const second = partMap.second;

  // Format as 'YYYY-MM-DD HH:MM:SS' and append +08:00 for Asia/Shanghai
  return `${year}-${month}-${day} ${hour}:${minute}:${second}+08:00`;
}

/**
 * Normalize a date to the business day start (4:00 AM)
 * This handles the business logic where the day starts at 4 AM
 */
export function getDayStart(date: Date): Date {
  const start = new Date(date);
  if (start.getHours() < CONSTANTS.DAY_START_HOUR) {
    start.setDate(start.getDate() - 1);
  }
  start.setHours(CONSTANTS.DAY_START_HOUR, 0, 0, 0);
  return start;
}

/**
 * Normalize hour for comparison (0-3 becomes 24-27 relative to previous day)
 */
export function getAdjustedHour(date: Date): number {
  const hour = date.getHours();
  return hour < CONSTANTS.DAY_START_HOUR ? hour + 24 : hour;
}

/**
 * Calculate sleep duration with strict boundary checks and multiple thresholds
 */
export function calculateDuration(
  wakeTime: Date,
  lastSleepTime: Date | null,
  dayStart?: Date
): number | undefined {
  if (!lastSleepTime) return undefined;

  const diffMs = wakeTime.getTime() - lastSleepTime.getTime();
  const hours = diffMs / (1000 * 60 * 60);

  // Apply minimum threshold to prevent short duration records around business day change
  if (hours < CONSTANTS.MIN_THRESHOLD_HOURS) {
    return undefined;
  }

  // If lastSleepTime is earlier than dayStart by more than 18 hours, consider it invalid
  if (dayStart) {
    const hoursFromDayStart =
      (lastSleepTime.getTime() - dayStart.getTime()) / (1000 * 60 * 60);

    // If sleep time is more than 18 hours before the day start, it's invalid
    if (hoursFromDayStart < -18) {
      return undefined;
    }
  }

  if (hours < CONSTANTS.MAX_SLEEP_DURATION_HOURS) {
    return Math.round(hours * 10) / 10;
  }
  return undefined;
}

export class SleepService {
  /**
   * Check if the time is appropriate for the action
   */
  private static checkTimeStatus(
    date: Date,
    type: 'WAKE' | 'SLEEP'
  ): TimeStatus {
    const adjHour = getAdjustedHour(date);

    if (type === 'WAKE') {
      if (adjHour < CONSTANTS.DAY_START_HOUR) return 'UNREASONABLE'; // Should be handled by DayStart logic, but safety check
      for (const range of CONSTANTS.WAKE_RANGES) {
        if (adjHour < range.max) return range.status as TimeStatus;
      }
      return 'UNREASONABLE';
    } else {
      // Sleep ranges are bit more complex (20:00 - 04:00 next day)
      // adjHour: 20..28
      if (adjHour < 20 && adjHour >= CONSTANTS.DAY_START_HOUR)
        return 'UNREASONABLE';

      for (const range of CONSTANTS.SLEEP_RANGES) {
        if (adjHour >= range.start && adjHour < range.max)
          return range.status as TimeStatus;
      }
      return 'UNREASONABLE';
    }
  }

  /**
   * Execute ranking query using optimized single SQL with FILTER clause for better performance
   * This combines both local and global rank calculations in a single query
   */
  private static async getRanks(
    client: PoolClient,
    groupId: number,
    dayStart: Date,
    myTime: Date,
    type: 'wake' | 'sleep'
  ) {
    const timeField = type === 'wake' ? 'last_wake_time' : 'last_sleep_time';

    // Use a single query with conditional counting to calculate both local and global ranks
    const rankSql = `
      SELECT
        COUNT(CASE WHEN group_id = $1 THEN 1 END) as rank,
        COUNT(*) as global_rank
      FROM user_sleep_stats
      WHERE ${timeField} IS NOT NULL
        AND ${timeField} >= $2
        AND ${timeField} <= $3
    `;

    const result = await client.query(rankSql, [
      groupId,
      toDatabaseTimestamp(dayStart),
      toDatabaseTimestamp(myTime),
    ]);
    const row = result.rows[0];

    return {
      rank: parseInt(row.rank),
      globalRank: parseInt(row.global_rank),
    };
  }

  /**
   * Record wake time with transaction for idempotency and consistency
   */
  public static async recordWakeTime(
    userId: number,
    groupId: number
  ): Promise<SleepRecordResult> {
    const now = new Date();
    const dayStart = getDayStart(now);
    const status = this.checkTimeStatus(now, 'WAKE');

    if (status === 'UNREASONABLE') {
      return { status, rank: 0, globalRank: 0 };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Lock user record to ensure atomic read-modify-write decision
      const userRes = await client.query(
        'SELECT last_wake_time, last_sleep_time FROM user_sleep_stats WHERE user_id = $1 AND group_id = $2 FOR UPDATE',
        [userId, groupId]
      );
      const userRecord = userRes.rows[0];

      let effectiveTime = now;
      let sleepDuration: number | undefined;

      // 2. Check Idempotency
      const lastWake = userRecord?.last_wake_time
        ? new Date(userRecord.last_wake_time)
        : null;
      const alreadyWokeUpToday = lastWake && lastWake >= dayStart;

      if (alreadyWokeUpToday) {
        // Use existing time for ranking to preserve original rank
        effectiveTime = lastWake!;
        // Recalculate duration based on existing data to ensure consistency
        sleepDuration = calculateDuration(
          effectiveTime,
          userRecord?.last_sleep_time
            ? new Date(userRecord.last_sleep_time)
            : null,
          dayStart
        );
      } else {
        // New wake up for today
        sleepDuration = calculateDuration(
          now,
          userRecord?.last_sleep_time
            ? new Date(userRecord.last_sleep_time)
            : null,
          dayStart
        );

        // Upsert with timezone-aware timestamp and proper timezone handling in SQL
        const upsertQuery = `
          INSERT INTO user_sleep_stats (user_id, group_id, wake_count, last_wake_time)
          VALUES ($1, $2, 1, $3::timestamptz)
          ON CONFLICT (user_id, group_id)
          DO UPDATE SET
            wake_count = user_sleep_stats.wake_count + 1,
            last_wake_time = $3::timestamptz
        `;
        await client.query(upsertQuery, [
          userId,
          groupId,
          toDatabaseTimestamp(now),
        ]);
      }

      // 3. Get Ranks (using effectiveTime ensures rank stability)
      const { rank, globalRank } = await this.getRanks(
        client,
        groupId,
        dayStart,
        effectiveTime,
        'wake'
      );

      await client.query('COMMIT');

      return { status, rank, globalRank, sleepDuration };
    } catch (e) {
      await client.query('ROLLBACK');
      logger.error('[SleepService] recordWakeTime transaction failed:', e);
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Record sleep time
   */
  public static async recordSleepTime(
    userId: number,
    groupId: number
  ): Promise<SleepRecordResult> {
    const now = new Date();
    const dayStart = getDayStart(now);
    const status = this.checkTimeStatus(now, 'SLEEP');

    if (status === 'UNREASONABLE') {
      return { status, rank: 0, globalRank: 0 };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userRes = await client.query(
        'SELECT last_sleep_time, last_wake_time FROM user_sleep_stats WHERE user_id = $1 AND group_id = $2 FOR UPDATE',
        [userId, groupId]
      );
      const userRecord = userRes.rows[0];

      let effectiveTime = now;
      let wakeDuration: number | undefined;

      const lastSleep = userRecord?.last_sleep_time
        ? new Date(userRecord.last_sleep_time)
        : null;
      const alreadySleptToday = lastSleep && lastSleep >= dayStart;

      if (alreadySleptToday) {
        effectiveTime = lastSleep!;
      } else {
        // Calculate wake duration (time spent awake since last wake time)
        wakeDuration = calculateDuration(
          now,
          userRecord?.last_wake_time
            ? new Date(userRecord.last_wake_time)
            : null,
          dayStart
        );

        const upsertQuery = `
          INSERT INTO user_sleep_stats (user_id, group_id, sleep_count, last_sleep_time)
          VALUES ($1, $2, 1, $3::timestamptz)
          ON CONFLICT (user_id, group_id)
          DO UPDATE SET
            sleep_count = user_sleep_stats.sleep_count + 1,
            last_sleep_time = $3::timestamptz
        `;
        await client.query(upsertQuery, [
          userId,
          groupId,
          toDatabaseTimestamp(now),
        ]);
      }

      const { rank, globalRank } = await this.getRanks(
        client,
        groupId,
        dayStart,
        effectiveTime,
        'sleep'
      );

      await client.query('COMMIT');

      return { status, rank, globalRank, wakeDuration };
    } catch (e) {
      await client.query('ROLLBACK');
      logger.error('[SleepService] recordSleepTime transaction failed:', e);
      throw e;
    } finally {
      client.release();
    }
  }
}
