let credentials = '';

document.getElementById('loginBtn').addEventListener('click', login);
document.getElementById('adminPass').addEventListener('keydown', e => {
  if (e.key === 'Enter') login();
});

async function login() {
  const user = document.getElementById('adminUser').value;
  const pass = document.getElementById('adminPass').value;
  const authError = document.getElementById('authError');
  authError.className = 'message error hidden';

  credentials = btoa(`${user}:${pass}`);

  try {
    const res = await fetch('/api/projects', {
      headers: { 'Authorization': `Basic ${credentials}` },
    });

    if (res.status === 401) {
      authError.textContent = 'Invalid credentials.';
      authError.className = 'message error';
      credentials = '';
      return;
    }

    if (!res.ok) {
      authError.textContent = 'Server error. Please try again.';
      authError.className = 'message error';
      return;
    }

    const projects = await res.json();
    document.getElementById('authForm').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    renderProjects(projects);
  } catch (err) {
    authError.textContent = 'Network error. Please try again.';
    authError.className = 'message error';
  }
}

document.getElementById('projectForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('projectError');
  errEl.className = 'message error hidden';
  document.getElementById('newLinkBox').classList.add('hidden');

  const center_label = document.getElementById('centerLabel').value.trim();
  const branch_labels = [1,2,3,4,5].map(i =>
    document.getElementById(`bl${i}`).value.trim()
  ).filter(l => l);

  try {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
      },
      body: JSON.stringify({ center_label, branch_labels }),
    });

    const data = await res.json();

    if (!res.ok) {
      errEl.textContent = `Error: ${data.error}`;
      errEl.className = 'message error';
      return;
    }

    const link = `${window.location.origin}/submit/${data.uuid}`;
    const linkEl = document.getElementById('newLink');
    linkEl.href = link;
    linkEl.textContent = link;
    document.getElementById('newLinkBox').classList.remove('hidden');
    e.target.reset();

    // Refresh project list
    const listRes = await fetch('/api/projects', {
      headers: { 'Authorization': `Basic ${credentials}` },
    });
    renderProjects(await listRes.json());
  } catch (err) {
    errEl.textContent = 'Network error. Please try again.';
    errEl.className = 'message error';
  }
});

function renderProjects(projects) {
  const container = document.getElementById('projectList');

  if (projects.length === 0) {
    container.innerHTML = '<p class="empty">No projects yet.</p>';
    return;
  }

  container.innerHTML = '';
  projects.forEach(project => {
    const card = document.createElement('div');
    card.className = 'card';

    const date = new Date(project.created_at + 'Z').toLocaleString();
    const link = `${window.location.origin}/submit/${project.uuid}`;

    const branchLabelsHtml = project.branch_labels.length > 0
      ? '<ul>' + project.branch_labels.map(bl =>
          `<li><span class="position">${bl.position}.</span> ${escapeHtml(bl.label)}</li>`
        ).join('') + '</ul>'
      : '<p class="empty">No branch labels defined</p>';

    const submissionWord = project.submission_count === 1 ? 'submission' : 'submissions';

    card.innerHTML = `
      <div class="card-header">
        <h2>${escapeHtml(project.center_label)}</h2>
        <span class="timestamp">${date}</span>
      </div>
      <div class="branches">${branchLabelsHtml}</div>
      <div class="link-row">
        <a href="${link}" target="_blank" class="submit-link">${link}</a>
        <button class="copy-btn" onclick="copyText('${escapeHtml(link)}')">Copy</button>
      </div>
      <div class="link-row" style="margin-top:6px">
        <a href="/graph/${project.uuid}" target="_blank" class="graph-link">View graph →</a>
      </div>
      <p class="count" style="margin-top:10px">${project.submission_count} ${submissionWord}</p>
      <button class="toggle-btn" data-project-id="${project.id}">Show submissions</button>
      <div class="submissions hidden" id="submissions-${project.id}"></div>
    `;

    container.appendChild(card);
  });

  container.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleSubmissions(btn));
  });
}

async function toggleSubmissions(btn) {
  const projectId = parseInt(btn.dataset.projectId);
  const submissionsEl = document.getElementById(`submissions-${projectId}`);

  if (!submissionsEl.classList.contains('hidden')) {
    submissionsEl.classList.add('hidden');
    btn.textContent = 'Show submissions';
    return;
  }

  btn.textContent = 'Hide submissions';
  submissionsEl.classList.remove('hidden');

  if (submissionsEl.dataset.loaded) return;
  submissionsEl.dataset.loaded = 'true';
  submissionsEl.textContent = 'Loading…';

  try {
    const res = await fetch('/api/nodes', {
      headers: { 'Authorization': `Basic ${credentials}` },
    });
    const nodes = await res.json();
    const filtered = nodes.filter(n => n.project_id === projectId);

    if (filtered.length === 0) {
      submissionsEl.innerHTML = '<p class="empty">No submissions yet.</p>';
      return;
    }

    submissionsEl.innerHTML = filtered.map(node => {
      const date = new Date(node.created_at + 'Z').toLocaleString();
      const branchesHtml = node.branches.length > 0
        ? '<ul>' + node.branches.map(b =>
            `<li><span class="position">${b.position}.</span> ${escapeHtml(b.text)}${mediaHtml(b)}</li>`
          ).join('') + '</ul>'
        : '';
      return `
        <div class="submission-card">
          <div class="card-header">
            <strong>${escapeHtml(node.center_text)}</strong>
            <span class="timestamp">${date}</span>
          </div>
          ${branchesHtml}
        </div>
      `;
    }).join('');
  } catch (err) {
    submissionsEl.textContent = 'Failed to load submissions.';
  }
}

document.getElementById('recomputeBtn').addEventListener('click', async () => {
  const btn = document.getElementById('recomputeBtn');
  const msg = document.getElementById('recomputeMsg');
  btn.disabled = true;
  btn.textContent = 'Recomputing…';
  msg.className = 'message hidden';

  try {
    const res = await fetch('/api/admin/recompute-connections', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${credentials}` },
    });
    if (res.ok) {
      msg.textContent = 'Connections recomputed successfully.';
      msg.className = 'message success';
    } else {
      msg.textContent = 'Failed to recompute connections.';
      msg.className = 'message error';
    }
  } catch (err) {
    msg.textContent = 'Network error.';
    msg.className = 'message error';
  }

  btn.disabled = false;
  btn.textContent = 'Recompute all connections';
});

function copyLink(id) {
  copyText(document.getElementById(id).textContent);
}

window.copyLink = copyLink;

function copyText(text) {
  navigator.clipboard.writeText(text).catch(() => {
    prompt('Copy this link:', text);
  });
}

window.copyText = copyText;

function mediaHtml(branch) {
  if (!branch.media_path) return '';
  const src = `/uploads/${branch.media_path}`;
  if (branch.media_type?.startsWith('image/'))
    return `<img src="${src}" class="branch-media">`;
  if (branch.media_type?.startsWith('audio/'))
    return `<audio controls src="${src}" class="branch-media"></audio>`;
  if (branch.media_type?.startsWith('video/'))
    return `<video controls src="${src}" class="branch-media"></video>`;
  return '';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
