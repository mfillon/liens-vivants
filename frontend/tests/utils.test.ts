// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import type { Branch } from '@/types';
import { branchesHtml, escapeHtml, mediaHtml, truncate } from '@/utils';

// ── escapeHtml ─────────────────────────────────────────────────────────────

describe('escapeHtml', () => {
  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('leaves double quotes unchanged (not escaped in text nodes)', () => {
    expect(escapeHtml('"hello"')).toBe('"hello"');
  });

  it('leaves plain text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });

  it('escapes nested tags', () => {
    expect(escapeHtml('<b>bold & <i>italic</i></b>')).toBe(
      '&lt;b&gt;bold &amp; &lt;i&gt;italic&lt;/i&gt;&lt;/b&gt;',
    );
  });
});

// ── truncate ───────────────────────────────────────────────────────────────

describe('truncate', () => {
  it('returns the string unchanged when within limit', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates and appends ellipsis when over limit', () => {
    expect(truncate('hello world', 5)).toBe('hello…');
  });

  it('handles empty string', () => {
    expect(truncate('', 5)).toBe('');
  });

  it('does not truncate at exact limit', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('handles limit of 0', () => {
    expect(truncate('hi', 0)).toBe('…');
  });
});

// ── mediaHtml ──────────────────────────────────────────────────────────────

function branch(overrides: Partial<Branch> = {}): Branch {
  return {
    id: 1,
    node_id: 1,
    position: 1,
    text: 'text',
    media_path: null,
    media_type: null,
    ...overrides,
  };
}

describe('mediaHtml', () => {
  it('returns empty string when media_path is null', () => {
    expect(mediaHtml(branch())).toBe('');
  });

  it('returns an <img> tag for image media', () => {
    const html = mediaHtml(branch({ media_path: 'photo.jpg', media_type: 'image/jpeg' }));
    expect(html).toBe('<img src="/uploads/photo.jpg" class="branch-media">');
  });

  it('returns an <audio> tag for audio media', () => {
    const html = mediaHtml(branch({ media_path: 'sound.mp3', media_type: 'audio/mpeg' }));
    expect(html).toBe('<audio controls src="/uploads/sound.mp3" class="branch-media"></audio>');
  });

  it('returns a <video> tag for video media', () => {
    const html = mediaHtml(branch({ media_path: 'clip.mp4', media_type: 'video/mp4' }));
    expect(html).toBe('<video controls src="/uploads/clip.mp4" class="branch-media"></video>');
  });

  it('returns empty string for unknown media type', () => {
    expect(mediaHtml(branch({ media_path: 'file.pdf', media_type: 'application/pdf' }))).toBe('');
  });
});

// ── branchesHtml ───────────────────────────────────────────────────────────

describe('branchesHtml', () => {
  it('returns empty-state paragraph for empty array', () => {
    expect(branchesHtml([])).toBe('<p class="empty">No branches</p>');
  });

  it('wraps branches in a <ul>', () => {
    const html = branchesHtml([branch({ position: 1, text: 'alpha' })]);
    expect(html).toContain('<ul>');
    expect(html).toContain('</ul>');
  });

  it('includes position and text in each <li>', () => {
    const html = branchesHtml([branch({ position: 2, text: 'beta' })]);
    expect(html).toContain('<span class="position">2.</span>');
    expect(html).toContain('beta');
  });

  it('escapes HTML in branch text', () => {
    const html = branchesHtml([branch({ position: 1, text: '<script>' })]);
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('renders all branches', () => {
    const branches = [
      branch({ position: 1, text: 'first' }),
      branch({ position: 2, text: 'second' }),
      branch({ position: 3, text: 'third' }),
    ];
    const html = branchesHtml(branches);
    expect(html).toContain('first');
    expect(html).toContain('second');
    expect(html).toContain('third');
  });

  it('includes media HTML for branches with attachments', () => {
    const b = branch({
      position: 1,
      text: 'with image',
      media_path: 'img.jpg',
      media_type: 'image/jpeg',
    });
    const html = branchesHtml([b]);
    expect(html).toContain('<img src="/uploads/img.jpg"');
  });
});
