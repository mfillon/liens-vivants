import type { BranchLabel, Project } from './types';

const pathParts = window.location.pathname.split('/');
const uuid = pathParts[pathParts.indexOf('submit') + 1];

if (!uuid) {
  document.getElementById('invalidLink')!.classList.remove('hidden');
} else {
  loadProject(uuid);
}

async function loadProject(projectUuid: string): Promise<void> {
  try {
    const res = await fetch(`/api/projects/${projectUuid}`);
    if (!res.ok) {
      document.getElementById('notFound')!.classList.remove('hidden');
      return;
    }
    const project = (await res.json()) as Project;
    renderForm(project, projectUuid);
  } catch {
    document.getElementById('notFound')!.classList.remove('hidden');
  }
}

function renderForm(project: Project, projectUuid: string): void {
  document.getElementById('pageTitle')!.textContent = project.center_label;
  document.getElementById('centerLabel')!.innerHTML =
    `${escapeHtml(project.center_label)} <span class="required">*</span>`;
  (document.getElementById('centerText') as HTMLTextAreaElement).placeholder = 'Your answer…';

  const fieldset = document.getElementById('branchesFieldset')!;
  if (project.branch_labels.length === 0) {
    (fieldset as HTMLElement).style.display = 'none';
  } else {
    project.branch_labels.forEach((bl: BranchLabel) => {
      const div = document.createElement('div');
      div.className = 'field';
      div.innerHTML = `
        <label for="branch${bl.position}">${escapeHtml(bl.label)}</label>
        <input type="text" id="branch${bl.position}" placeholder="Your answer…">
        <input type="file" id="branchFile${bl.position}" accept="image/*,audio/*,video/*" class="file-input">
      `;
      fieldset.appendChild(div);
    });
  }

  document.getElementById('formSection')!.classList.remove('hidden');

  document.getElementById('nodeForm')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('message')!;
    msg.className = 'message hidden';

    const center_text = (document.getElementById('centerText') as HTMLTextAreaElement).value.trim();
    const branches = project.branch_labels.map((bl) =>
      (
        (document.getElementById(`branch${bl.position}`) as HTMLInputElement | null)?.value ?? ''
      ).trim(),
    );

    try {
      const res = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_uuid: projectUuid, center_text, branches }),
      });

      const data = (await res.json()) as {
        error?: string;
        branchIds?: Array<{ position: number; id: number }>;
      };

      if (!res.ok) {
        msg.textContent = `Error: ${data.error}`;
        msg.className = 'message error';
        return;
      }

      const uploadErrors: string[] = [];
      for (const { position, id } of data.branchIds ?? []) {
        const fileInput = document.getElementById(
          `branchFile${position}`,
        ) as HTMLInputElement | null;
        if (fileInput?.files?.length) {
          const formData = new FormData();
          formData.append('file', fileInput.files[0]);
          const uploadRes = await fetch(`/api/branches/${id}/media`, {
            method: 'POST',
            body: formData,
          });
          if (!uploadRes.ok) {
            const uploadData = (await uploadRes.json()) as { error: string };
            uploadErrors.push(`Branch ${position}: ${uploadData.error}`);
          }
        }
      }

      if (uploadErrors.length) {
        msg.textContent = `Submitted, but some uploads failed: ${uploadErrors.join('; ')}`;
        msg.className = 'message error';
      } else {
        msg.textContent = 'Thank you! Your response has been submitted.';
        msg.className = 'message success';
      }
      (e.target as HTMLFormElement).reset();
    } catch {
      msg.textContent = 'Network error. Please try again.';
      msg.className = 'message error';
    }
  });
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
