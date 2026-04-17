import type { BranchLabel, Project } from './types';
import { escapeHtml } from './utils';
import { detectLang, defaultParticipantName, t, type Lang } from './i18n';

const pathParts = window.location.pathname.split('/');
const uuid = pathParts[pathParts.indexOf('submit') + 1];

// Use browser language as fallback before project language is known
const browserLang: Lang = detectLang();

if (!uuid) {
  const el = document.getElementById('invalidLink')!;
  el.textContent = t('submit.invalid_link', browserLang);
  el.classList.remove('hidden');
} else {
  loadProject(uuid);
}

async function loadProject(projectUuid: string): Promise<void> {
  try {
    const res = await fetch(`/api/projects/${projectUuid}`);
    if (!res.ok) {
      const el = document.getElementById('notFound')!;
      el.textContent = t('submit.not_found', browserLang);
      el.classList.remove('hidden');
      return;
    }
    const project = (await res.json()) as Project;
    renderForm(project, projectUuid);
  } catch {
    const el = document.getElementById('notFound')!;
    el.textContent = t('submit.not_found', browserLang);
    el.classList.remove('hidden');
  }
}

function renderForm(project: Project, projectUuid: string): void {
  const lang: Lang = project.language === 'fr' ? 'fr' : 'en';

  document.documentElement.lang = lang;
  document.getElementById('pageTitle')!.textContent = project.center_label;

  // Participant name field
  let nextN = project.next_participant_number ?? 1;
  const participantInput = document.getElementById('participantName') as HTMLInputElement;
  document.getElementById('participantLabel')!.textContent = t('submit.participant_label', lang);
  participantInput.placeholder = defaultParticipantName(nextN, lang);

  // Dismissible notification
  const notification = document.getElementById('notification')!;
  const notificationMsg = document.getElementById('notificationMsg')!;
  document
    .getElementById('notificationDismiss')!
    .setAttribute('aria-label', t('submit.dismiss', lang));
  document.getElementById('notificationDismiss')!.addEventListener('click', () => {
    notification.classList.add('hidden');
  });

  // Branch fields
  const fieldset = document.getElementById('branchesFieldset')!;
  document.getElementById('branchesLegend')!.textContent = t('submit.branches_legend', lang);

  if (project.branch_labels.length === 0) {
    (fieldset as HTMLElement).style.display = 'none';
  } else {
    project.branch_labels.forEach((bl: BranchLabel) => {
      const div = document.createElement('div');
      div.className = 'field';
      div.innerHTML = `
        <label for="branch${bl.position}">${escapeHtml(bl.label)}</label>
        <input type="text" id="branch${bl.position}" placeholder="${t('submit.branch_placeholder', lang)}">
        <input type="file" id="branchFile${bl.position}" accept="image/*,audio/*,video/*" class="file-input">
      `;
      fieldset.appendChild(div);
    });
  }

  document.getElementById('submitBtn')!.textContent = t('submit.button', lang);
  document.getElementById('formSection')!.classList.remove('hidden');

  document.getElementById('nodeForm')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('message')!;
    msg.className = 'message hidden';

    const participant_name = participantInput.value.trim();

    const branches = project.branch_labels.map((bl) =>
      (
        (document.getElementById(`branch${bl.position}`) as HTMLInputElement | null)?.value ?? ''
      ).trim(),
    );

    try {
      const res = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_uuid: projectUuid, participant_name, branches }),
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
        msg.textContent = `${t('submit.error.uploads', lang)} ${uploadErrors.join('; ')}`;
        msg.className = 'message error';
      } else {
        notificationMsg.textContent = t('submit.success', lang);
        notification.classList.remove('hidden');
        msg.className = 'message hidden';
        nextN++;
        participantInput.placeholder = defaultParticipantName(nextN, lang);
      }
      (e.target as HTMLFormElement).reset();
    } catch {
      msg.textContent = t('submit.error.network', lang);
      msg.className = 'message error';
    }
  });
}
