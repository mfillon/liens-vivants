import type { Node, Project } from './types';
import { escapeHtml, mediaHtml } from './utils';
import { detectLang, t, type Lang } from './i18n';

declare global {
  interface Window {
    copyText: (text: string) => void;
    copyLink: (id: string) => void;
  }
}

const lang: Lang = detectLang();
let credentials = '';

const SESSION_KEY = 'admin_session';
const SESSION_TTL = 60 * 60 * 1000; // 1 hour

function saveSession(creds: string): void {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ credentials: creds, expiry: Date.now() + SESSION_TTL }),
  );
}

function loadSession(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { credentials: creds, expiry } = JSON.parse(raw) as {
      credentials: string;
      expiry: number;
    };
    if (Date.now() > expiry) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return creds;
  } catch {
    return null;
  }
}

function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  credentials = '';
}

function showDashboard(projects: Project[]): void {
  document.getElementById('authForm')!.classList.add('hidden');
  document.getElementById('dashboard')!.classList.remove('hidden');
  document.getElementById('logoutBtn')!.classList.remove('hidden');
  renderProjects(projects);
}

// ── Apply i18n to static elements ──────────────────────────────────────────

document.title = t('page.title', lang);
document.documentElement.lang = lang;
document.getElementById('admin-h1')!.textContent = t('admin.h1', lang);
document.getElementById('login-heading')!.textContent = t('login.heading', lang);
document.getElementById('login-username-label')!.textContent = t('login.username', lang);
document.getElementById('login-password-label')!.textContent = t('login.password', lang);
document.getElementById('loginBtn')!.textContent = t('login.button', lang);
document.getElementById('create-heading')!.textContent = t('create.heading', lang);
document.getElementById('center-label-text')!.textContent = t('create.center_label', lang);
(document.getElementById('centerLabel') as HTMLInputElement).placeholder = t(
  'create.center_placeholder',
  lang,
);
document.getElementById('project-lang-label')!.textContent = t('create.language', lang);
document.getElementById('lang-opt-en')!.textContent = t('create.language_en', lang);
document.getElementById('lang-opt-fr')!.textContent = t('create.language_fr', lang);
document.getElementById('branches-legend')!.textContent = t('create.branches_legend', lang);
([1, 2, 3, 4, 5] as const).forEach((i) => {
  document.getElementById(`bl${i}-label`)!.textContent = `${t('create.branch', lang)} ${i}`;
});
document.getElementById('create-submit-btn')!.textContent = t('create.submit', lang);
document.getElementById('new-link-label')!.textContent = t('create.link_label', lang);
document.getElementById('new-link-copy')!.textContent = t('create.copy', lang);
document.getElementById('projects-heading')!.textContent = t('projects.heading', lang);
document.getElementById('tools-heading')!.textContent = t('tools.heading', lang);
document.getElementById('tools-info')!.textContent = t('tools.recompute_info', lang);
document.getElementById('recomputeBtn')!.textContent = t('tools.recompute_btn', lang);

// Set default language selector to browser language
(document.getElementById('projectLang') as HTMLSelectElement).value = lang;

// ── Auth ────────────────────────────────────────────────────────────────────

document.getElementById('loginBtn')!.addEventListener('click', login);
document.getElementById('adminPass')!.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') login();
});
document.getElementById('logoutBtn')!.textContent = t('login.logout', lang);
document.getElementById('logoutBtn')!.addEventListener('click', () => {
  clearSession();
  document.getElementById('dashboard')!.classList.add('hidden');
  document.getElementById('logoutBtn')!.classList.add('hidden');
  document.getElementById('authForm')!.classList.remove('hidden');
});

// Auto-restore session on page load
void (async () => {
  const stored = loadSession();
  if (!stored) return;
  credentials = stored;
  const res = await fetch('/api/projects', {
    headers: { Authorization: `Basic ${credentials}` },
  }).catch(() => null);
  if (res?.ok) {
    showDashboard((await res.json()) as Project[]);
  } else {
    clearSession();
  }
})();

async function login(): Promise<void> {
  const user = (document.getElementById('adminUser') as HTMLInputElement).value;
  const pass = (document.getElementById('adminPass') as HTMLInputElement).value;
  const authError = document.getElementById('authError')!;
  authError.className = 'message error hidden';

  credentials = btoa(`${user}:${pass}`);

  try {
    const res = await fetch('/api/projects', {
      headers: { Authorization: `Basic ${credentials}` },
    });

    if (res.status === 401) {
      authError.textContent = t('login.error.invalid', lang);
      authError.className = 'message error';
      clearSession();
      return;
    }

    if (!res.ok) {
      authError.textContent = t('login.error.server', lang);
      authError.className = 'message error';
      return;
    }

    saveSession(credentials);
    const projects = (await res.json()) as Project[];
    showDashboard(projects);
  } catch {
    authError.textContent = t('login.error.network', lang);
    authError.className = 'message error';
  }
}

// ── Create project ──────────────────────────────────────────────────────────

document.getElementById('projectForm')!.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('projectError')!;
  errEl.className = 'message error hidden';
  document.getElementById('newLinkBox')!.classList.add('hidden');

  const center_label = (document.getElementById('centerLabel') as HTMLInputElement).value.trim();
  const language = (document.getElementById('projectLang') as HTMLSelectElement).value;
  const branch_labels = ([1, 2, 3, 4, 5] as const)
    .map((i) => (document.getElementById(`bl${i}`) as HTMLInputElement).value.trim())
    .filter((l) => l);

  try {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({ center_label, branch_labels, language }),
    });

    const data = (await res.json()) as { error?: string; uuid?: string };

    if (!res.ok) {
      errEl.textContent = `Error: ${data.error}`;
      errEl.className = 'message error';
      return;
    }

    const link = `${window.location.origin}/submit/${data.uuid}`;
    const linkEl = document.getElementById('newLink') as HTMLAnchorElement;
    linkEl.href = link;
    linkEl.textContent = link;
    document.getElementById('newLinkBox')!.classList.remove('hidden');
    (e.target as HTMLFormElement).reset();
    // Reset language selector to browser default after form reset
    (document.getElementById('projectLang') as HTMLSelectElement).value = lang;

    const listRes = await fetch('/api/projects', {
      headers: { Authorization: `Basic ${credentials}` },
    });
    renderProjects((await listRes.json()) as Project[]);
  } catch {
    errEl.textContent = t('create.error.network', lang);
    errEl.className = 'message error';
  }
});

// ── Render projects ─────────────────────────────────────────────────────────

function renderProjects(projects: Project[]): void {
  const container = document.getElementById('projectList')!;

  if (projects.length === 0) {
    container.innerHTML = `<p class="empty">${t('projects.empty', lang)}</p>`;
    return;
  }

  container.innerHTML = '';
  projects.forEach((project) => {
    const card = document.createElement('div');
    card.className = 'card';

    const date = new Date(project.created_at + 'Z').toLocaleString();
    const link = `${window.location.origin}/submit/${project.uuid}`;

    const branchLabelsHtml =
      project.branch_labels.length > 0
        ? '<ul>' +
          project.branch_labels
            .map(
              (bl) =>
                `<li><span class="position">${bl.position}.</span> ${escapeHtml(bl.label)}</li>`,
            )
            .join('') +
          '</ul>'
        : `<p class="empty">${t('projects.no_branch_labels', lang)}</p>`;

    const count = project.submission_count ?? 0;
    const submissionWord =
      count === 1
        ? t('projects.submissions_singular', lang)
        : t('projects.submissions_plural', lang);

    card.innerHTML = `
      <div class="card-header">
        <h2>${escapeHtml(project.center_label)}</h2>
        <span class="timestamp">${date}</span>
      </div>
      <div class="branches">${branchLabelsHtml}</div>
      <div class="link-row">
        <a href="${link}" target="_blank" class="submit-link">${link}</a>
        <button class="copy-btn" onclick="copyText('${escapeHtml(link)}')">${t('projects.copy', lang)}</button>
      </div>
      <div class="link-row" style="margin-top:6px">
        <a href="/graph/${project.uuid}" target="_blank" class="graph-link">${t('projects.view_graph', lang)}</a>
      </div>
      <p class="count" style="margin-top:10px">${count} ${submissionWord}</p>
      <button class="toggle-btn" data-project-id="${project.id}">${t('projects.show', lang)}</button>
      <div class="submissions hidden" id="submissions-${project.id}"></div>
    `;

    container.appendChild(card);
  });

  container.querySelectorAll<HTMLButtonElement>('.toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => toggleSubmissions(btn));
  });
}

// ── Toggle submissions ──────────────────────────────────────────────────────

async function toggleSubmissions(btn: HTMLButtonElement): Promise<void> {
  const projectId = parseInt(btn.dataset.projectId ?? '', 10);
  const submissionsEl = document.getElementById(`submissions-${projectId}`)!;

  if (!submissionsEl.classList.contains('hidden')) {
    submissionsEl.classList.add('hidden');
    btn.textContent = t('projects.show', lang);
    return;
  }

  btn.textContent = t('projects.hide', lang);
  submissionsEl.classList.remove('hidden');

  if (submissionsEl.dataset.loaded) return;
  submissionsEl.dataset.loaded = 'true';
  submissionsEl.textContent = t('submissions.loading', lang);

  try {
    const res = await fetch('/api/nodes', {
      headers: { Authorization: `Basic ${credentials}` },
    });
    const nodes = (await res.json()) as Node[];
    const filtered = nodes.filter((n) => n.project_id === projectId);

    if (filtered.length === 0) {
      submissionsEl.innerHTML = `<p class="empty">${t('submissions.empty', lang)}</p>`;
      return;
    }

    submissionsEl.innerHTML = filtered
      .map((node) => {
        const date = new Date(node.created_at + 'Z').toLocaleString();
        const branchesHtml =
          node.branches.length > 0
            ? '<ul>' +
              node.branches
                .map(
                  (b) =>
                    `<li><span class="position">${b.position}.</span> ${escapeHtml(b.text)}${mediaHtml(b)}</li>`,
                )
                .join('') +
              '</ul>'
            : '';
        return `
        <div class="submission-card">
          <div class="card-header">
            <strong>${escapeHtml(node.participant_name)}</strong>
            <span class="timestamp">${date}</span>
          </div>
          ${branchesHtml}
        </div>
      `;
      })
      .join('');
  } catch {
    submissionsEl.textContent = t('submissions.failed', lang);
  }
}

// ── Recompute connections ───────────────────────────────────────────────────

document.getElementById('recomputeBtn')!.addEventListener('click', async () => {
  const btn = document.getElementById('recomputeBtn') as HTMLButtonElement;
  const msg = document.getElementById('recomputeMsg')!;
  btn.disabled = true;
  btn.textContent = t('tools.recomputing', lang);
  msg.className = 'message hidden';

  try {
    const res = await fetch('/api/admin/recompute-connections', {
      method: 'POST',
      headers: { Authorization: `Basic ${credentials}` },
    });
    if (res.ok) {
      msg.textContent = t('tools.recompute_success', lang);
      msg.className = 'message success';
    } else {
      msg.textContent = t('tools.recompute_error', lang);
      msg.className = 'message error';
    }
  } catch {
    msg.textContent = t('tools.network_error', lang);
    msg.className = 'message error';
  }

  btn.disabled = false;
  btn.textContent = t('tools.recompute_btn', lang);
});

// ── Clipboard helpers ───────────────────────────────────────────────────────

function copyLink(id: string): void {
  copyText(document.getElementById(id)!.textContent ?? '');
}

window.copyLink = copyLink;

function copyText(text: string): void {
  navigator.clipboard.writeText(text).catch(() => {
    prompt('Copy this link:', text);
  });
}

window.copyText = copyText;
