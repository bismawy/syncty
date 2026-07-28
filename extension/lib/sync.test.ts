import { describe, expect, test } from 'bun:test';
import { mergeTrees, type TreeNode } from './sync';

describe('mergeTrees', () => {
  test('should merge initial sync with exact same bookmarks without duplicates', () => {
    const remote: TreeNode = {
      title: 'Bookmarks bar',
      children: [
        {
          title: 'Work',
          children: [
            { title: 'Google', url: 'https://google.com' },
            { title: 'GitHub', url: 'https://github.com' },
          ],
        },
      ],
    };

    const local: TreeNode = {
      title: 'Bookmarks Toolbar',
      children: [
        {
          title: 'Work',
          children: [
            { title: 'Google', url: 'https://google.com' },
            { title: 'GitHub', url: 'https://github.com' },
          ],
        },
      ],
    };

    const merged = mergeTrees(remote, local);

    expect(merged.children).toHaveLength(1);
    expect(merged.children![0].title).toBe('Work');
    expect(merged.children![0].children).toHaveLength(2);
    expect(merged.children![0].children![0].url).toBe('https://google.com');
    expect(merged.children![0].children![1].url).toBe('https://github.com');
  });

  test('should handle case-insensitive and trimmed folder names', () => {
    const remote: TreeNode = {
      title: 'Bookmarks bar',
      children: [
        {
          title: 'Development',
          children: [{ title: 'React', url: 'https://react.dev' }],
        },
      ],
    };

    const local: TreeNode = {
      title: 'Bookmarks bar',
      children: [
        {
          title: 'development ',
          children: [
            { title: 'React', url: 'https://react.dev' },
            { title: 'Vue', url: 'https://vuejs.org' },
          ],
        },
      ],
    };

    const merged = mergeTrees(remote, local);

    expect(merged.children).toHaveLength(1);
    expect(merged.children![0].title).toBe('Development');
    expect(merged.children![0].children).toHaveLength(2);
    expect(merged.children![0].children![0].title).toBe('React');
    expect(merged.children![0].children![1].title).toBe('Vue');
  });

  test('should overwrite matching bookmarks with remote version and append unique local bookmarks', () => {
    const remote: TreeNode = {
      title: 'Bookmarks bar',
      children: [
        { title: 'Google Remote', url: 'https://google.com' },
      ],
    };

    const local: TreeNode = {
      title: 'Bookmarks bar',
      children: [
        { title: 'Google Local', url: 'https://google.com/' },
        { title: 'Local Only', url: 'https://local-only.com' },
      ],
    };

    const merged = mergeTrees(remote, local);

    expect(merged.children).toHaveLength(2);
    expect(merged.children![0].title).toBe('Google Remote');
    expect(merged.children![0].url).toBe('https://google.com');
    expect(merged.children![1].title).toBe('Local Only');
  });
});
