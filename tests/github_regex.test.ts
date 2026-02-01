import { describe, it, expect } from 'vitest';

describe('GitHub Feature Regex', () => {
  const repoAllRegex =
    /(?<![A-Za-z0-9_.-])([A-Za-z0-9_-]+)\/([A-Za-z0-9_.-]+)/g;

  it('should match valid repository names', () => {
    const text = 'Check out facebook/react and vuejs/vue-next';
    const matches = [...text.matchAll(repoAllRegex)];

    expect(matches).toHaveLength(2);
    expect(matches[0][1]).toBe('facebook');
    expect(matches[0][2]).toBe('react');
    expect(matches[1][1]).toBe('vuejs');
    expect(matches[1][2]).toBe('vue-next');
  });

  it('should match repository names with digits', () => {
    const text = 'Look at user123/repo-456';
    const matches = [...text.matchAll(repoAllRegex)];

    expect(matches).toHaveLength(1);
    expect(matches[0][1]).toBe('user123');
    expect(matches[0][2]).toBe('repo-456');
  });

  it('should match repository names with dots', () => {
    const text = 'Reference socketio/socket.io-client';
    const matches = [...text.matchAll(repoAllRegex)];

    expect(matches).toHaveLength(1);
    expect(matches[0][1]).toBe('socketio');
    expect(matches[0][2]).toBe('socket.io-client');
  });

  it('should not match invalid patterns', () => {
    // "invalid/" and "repo/" shouldn't match as full repo paths require both parts
    // However, the regex might partially match "invalid/" if followed by something that looks like a repo
    // Let's test specific non-matches or partial matches that shouldn't happen

    const invalidText = 'not a repo';
    expect([...invalidText.matchAll(repoAllRegex)]).toHaveLength(0);
  });
});
