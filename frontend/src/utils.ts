import type { Branch } from './types';

export function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

export function mediaHtml(branch: Branch): string {
  if (!branch.media_path) return '';
  const src = `/uploads/${branch.media_path}`;
  if (branch.media_type?.startsWith('image/')) return `<img src="${src}" class="branch-media">`;
  if (branch.media_type?.startsWith('audio/'))
    return `<audio controls src="${src}" class="branch-media"></audio>`;
  if (branch.media_type?.startsWith('video/'))
    return `<video controls src="${src}" class="branch-media"></video>`;
  return '';
}

export function branchesHtml(branches: Branch[]): string {
  if (!branches?.length) return '<p class="empty">No branches</p>';
  return (
    '<ul>' +
    branches
      .map(
        (b) =>
          `<li><span class="position">${b.position}.</span> ${escapeHtml(b.text)}${mediaHtml(b)}</li>`,
      )
      .join('') +
    '</ul>'
  );
}
