const pathParts = window.location.pathname.split('/');
const uuid = pathParts[pathParts.indexOf('submit') + 1];

if (!uuid) {
  document.getElementById('invalidLink').classList.remove('hidden');
} else {
  loadProject(uuid);
}

async function loadProject(uuid) {
  try {
    const res = await fetch(`/api/projects/${uuid}`);
    if (res.status === 404) {
      document.getElementById('notFound').classList.remove('hidden');
      return;
    }
    if (!res.ok) {
      document.getElementById('notFound').classList.remove('hidden');
      return;
    }

    const project = await res.json();
    renderForm(project, uuid);
  } catch (err) {
    document.getElementById('notFound').classList.remove('hidden');
  }
}

function renderForm(project, uuid) {
  document.getElementById('pageTitle').textContent = project.center_label;
  document.getElementById('centerLabel').innerHTML =
    `${escapeHtml(project.center_label)} <span class="required">*</span>`;
  document.getElementById('centerText').placeholder = 'Your answer…';

  const fieldset = document.getElementById('branchesFieldset');
  if (project.branch_labels.length === 0) {
    fieldset.style.display = 'none';
  } else {
    project.branch_labels.forEach(bl => {
      const div = document.createElement('div');
      div.className = 'field';
      div.innerHTML = `
        <label for="branch${bl.position}">${escapeHtml(bl.label)}</label>
        <input type="text" id="branch${bl.position}" placeholder="Your answer…">
      `;
      fieldset.appendChild(div);
    });
  }

  document.getElementById('formSection').classList.remove('hidden');

  document.getElementById('nodeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('message');
    msg.className = 'message hidden';

    const center_text = document.getElementById('centerText').value.trim();
    const branches = project.branch_labels.map(bl =>
      (document.getElementById(`branch${bl.position}`) || {value: ''}).value.trim()
    );

    try {
      const res = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_uuid: uuid, center_text, branches }),
      });

      const data = await res.json();

      if (res.ok) {
        msg.textContent = 'Thank you! Your response has been submitted.';
        msg.className = 'message success';
        e.target.reset();
      } else {
        msg.textContent = `Error: ${data.error}`;
        msg.className = 'message error';
      }
    } catch (err) {
      msg.textContent = 'Network error. Please try again.';
      msg.className = 'message error';
    }
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
