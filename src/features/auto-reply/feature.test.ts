import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

interface AutoReplyResponseSegment {
  type: string;
  data: Record<string, unknown>;
}

type AutoReplyResponse = AutoReplyResponseSegment[];

interface AutoReplyRule {
  trigger: string;
  responses: AutoReplyResponse[];
}

interface AutoReplyConfig {
  replies: AutoReplyRule[];
}

describe('Auto-Reply Config', () => {
  it('should be valid YAML and have correct structure', () => {
    const configPath = path.resolve(
      __dirname,
      '../../../assets/auto-reply/replies.yaml'
    );
    const fileContent = fs.readFileSync(configPath, 'utf-8');
    const config = yaml.load(fileContent) as AutoReplyConfig;

    expect(config).toBeDefined();
    expect(config.replies).toBeInstanceOf(Array);

    config.replies.forEach((rule: AutoReplyRule, index: number) => {
      expect(rule.trigger, `Rule ${index} should have a trigger`).toBeDefined();
      expect(
        typeof rule.trigger,
        `Rule ${index} trigger should be a string`
      ).toBe('string');

      // Verify regex validity
      expect(() => {
        const match = rule.trigger.match(/^\/(.+)\/([gimsuy]*)$/);
        if (match) {
          new RegExp(match[1], match[2]);
        } else {
          new RegExp(rule.trigger);
        }
      }, `Rule ${index} trigger regex is invalid: ${rule.trigger}`).not.toThrow();

      expect(
        rule.responses,
        `Rule ${index} should have responses`
      ).toBeInstanceOf(Array);
      expect(
        rule.responses.length,
        `Rule ${index} should have at least one response`
      ).toBeGreaterThan(0);
    });
  });
});
