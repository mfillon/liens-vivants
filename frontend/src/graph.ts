import ForceGraph3D, { type NodeObject } from '3d-force-graph';
import SpriteText from 'three-spritetext';
import type { Branch, Connection, Node, Project } from './types';
import { mediaHtml, escapeHtml, truncate } from './utils';
import { detectLang, t, type Lang } from './i18n';

declare global {
  interface Window {
    __graphOrbit?: { pause: () => void; resume: () => void };
  }
}

const pathParts = window.location.pathname.split('/');
const uuid = pathParts[pathParts.indexOf('graph') + 1];

const browserLang: Lang = detectLang();

if (!uuid) showError(t('graph.error.no_uuid', browserLang));
else loadGraph(uuid);

async function loadGraph(projectUuid: string): Promise<void> {
  try {
    const [projectRes, nodesRes, connectionsRes] = await Promise.all([
      fetch(`/api/projects/${projectUuid}`),
      fetch(`/api/projects/${projectUuid}/nodes`),
      fetch(`/api/projects/${projectUuid}/connections`),
    ]);
    if (!projectRes.ok) {
      showError(t('graph.error.not_found', browserLang));
      return;
    }

    const project = (await projectRes.json()) as Project;
    const lang: Lang = project.language === 'fr' ? 'fr' : 'en';
    const participants = (await nodesRes.json()) as Node[];
    const connections = (await connectionsRes.json()) as Connection[];

    document.documentElement.lang = lang;
    document.getElementById('project-title')!.textContent = project.center_label;

    const nodeWord =
      participants.length === 1 ? t('graph.node_singular', lang) : t('graph.node_plural', lang);
    const connWord =
      connections.length === 1
        ? t('graph.connection_singular', lang)
        : t('graph.connection_plural', lang);
    document.getElementById('stats')!.textContent =
      `${participants.length} ${nodeWord} · ${connections.length} ${connWord}`;

    document.getElementById('sidebar-hint')!.textContent = t('graph.hint', lang);
    document.getElementById('orbit-btn')!.textContent = t('graph.orbit_pause', lang);

    renderGraph(project, participants, connections, lang);
  } catch {
    showError(t('graph.error.load_failed', browserLang));
  }
}

// ── Graph node / link types ────────────────────────────────────────────────

interface HubNode {
  id: string;
  participant_name: string;
  branches: Array<{ position: number; text: string }>;
  _type: 'hub';
}

interface ParticipantNode {
  id: number;
  participant_name: string;
  branches: Branch[];
  _type: 'participant';
}

interface AnswerNode {
  id: string; // `answer-${nodeId}-${position}`
  nodeId: number;
  branchPosition: number;
  branchLabel: string;
  text: string;
  media_path: string | null;
  media_type: string | null;
  participant_name: string;
  _type: 'answer';
}

type GraphNode = HubNode | ParticipantNode | AnswerNode;

interface HubLink {
  source: number;
  target: string;
  _type: 'hub';
}

interface ParticipantAnswerLink {
  source: number;
  target: string;
  _type: 'participant-answer';
}

interface KeywordLink {
  source: string;
  target: string;
  keywords: string[];
  _type: 'keyword';
}

type GraphLink = HubLink | ParticipantAnswerLink | KeywordLink;

function answerId(nodeId: number, position: number): string {
  return `answer-${nodeId}-${position}`;
}

// ── Render ─────────────────────────────────────────────────────────────────

function renderGraph(
  project: Project,
  participants: Node[],
  connections: Connection[],
  lang: Lang,
): void {
  const container = document.getElementById('graph-3d')!;

  // Build label lookup: branch position → label
  const branchLabelByPosition = new Map<number, string>(
    project.branch_labels.map((bl) => [bl.position, bl.label]),
  );

  // ── Hub node
  const hubNode: HubNode = {
    id: '__hub__',
    participant_name: project.center_label,
    branches: project.branch_labels.map((bl) => ({ position: bl.position, text: bl.label })),
    _type: 'hub',
  };

  // ── Participant nodes + answer mini-nodes
  const participantNodes: ParticipantNode[] = participants.map((n) => ({
    id: n.id,
    participant_name: n.participant_name,
    branches: n.branches,
    _type: 'participant',
  }));

  const answerNodes: AnswerNode[] = participants.flatMap((n) =>
    n.branches.map((b) => ({
      id: answerId(n.id, b.position),
      nodeId: n.id,
      branchPosition: b.position,
      branchLabel: branchLabelByPosition.get(b.position) ?? `${b.position}`,
      text: b.text,
      media_path: b.media_path,
      media_type: b.media_type,
      participant_name: n.participant_name,
      _type: 'answer' as const,
    })),
  );

  const graphNodes: GraphNode[] = [hubNode, ...participantNodes, ...answerNodes];

  // ── Links
  const hubLinks: HubLink[] = participants.map((n) => ({
    source: n.id,
    target: '__hub__',
    _type: 'hub',
  }));

  const participantAnswerLinks: ParticipantAnswerLink[] = participants.flatMap((n) =>
    n.branches.map((b) => ({
      source: n.id,
      target: answerId(n.id, b.position),
      _type: 'participant-answer',
    })),
  );

  // Keyword connections between answer mini-nodes (skip legacy connections without positions)
  const keywordLinks: KeywordLink[] = connections
    .filter((c) => c.branch_position_a !== null && c.branch_position_b !== null)
    .map((c) => ({
      source: answerId(c.node_id_a, c.branch_position_a!),
      target: answerId(c.node_id_b, c.branch_position_b!),
      keywords: c.shared_keywords,
      _type: 'keyword',
    }));

  const graphLinks: GraphLink[] = [...hubLinks, ...participantAnswerLinks, ...keywordLinks];

  // ── Lookup maps
  const nodeById = new Map<string | number, GraphNode>(graphNodes.map((n) => [n.id, n]));
  const keywordLinkByPair = new Map<string, KeywordLink>(
    keywordLinks.map((l) => [`${l.source}-${l.target}`, l]),
  );

  // ── ForceGraph3D
  const Graph = new ForceGraph3D(container)
    .backgroundColor('#0f1117')
    .graphData({ nodes: graphNodes, links: graphLinks })
    .nodeThreeObject((node: NodeObject) => {
      const id = node.id;
      const data = id !== undefined ? nodeById.get(id) : undefined;
      if (!data) return new SpriteText('?');

      if (data._type === 'hub') {
        const sprite = new SpriteText(truncate(data.participant_name, 20));
        sprite.color = '#ffffff';
        sprite.textHeight = 6;
        sprite.backgroundColor = '#f5a623';
        sprite.padding = 4;
        sprite.borderRadius = 4;
        return sprite;
      }

      if (data._type === 'participant') {
        const sprite = new SpriteText(truncate(data.participant_name, 15));
        sprite.color = '#e0e0e0';
        sprite.textHeight = 4;
        sprite.backgroundColor = '#4a90e2';
        sprite.padding = 4;
        sprite.borderRadius = 4;
        return sprite;
      }

      // answer mini-node
      const sprite = new SpriteText(truncate(data.text, 18));
      sprite.color = '#d0d0d0';
      sprite.textHeight = 2.5;
      sprite.backgroundColor = '#5b4a8e';
      sprite.padding = 3;
      sprite.borderRadius = 3;
      return sprite;
    })
    .nodeThreeObjectExtend(false)
    .linkColor((link) => {
      const l = link as GraphLink;
      if (l._type === 'keyword') return 'rgba(74,144,226,0.85)';
      if (l._type === 'participant-answer') return 'rgba(180,140,255,0.55)';
      return 'rgba(106,122,154,0.2)';
    })
    .linkWidth((link) => {
      const l = link as GraphLink;
      if (l._type === 'keyword') return 1.5;
      if (l._type === 'participant-answer') return 0.8;
      return 0.3;
    })
    .linkOpacity(1)
    .onNodeClick((node) => {
      window.__graphOrbit?.pause();
      const id = node.id;
      const data = id !== undefined ? nodeById.get(id) : undefined;
      if (!data) return;
      if (data._type === 'hub') showHub(data, lang);
      else if (data._type === 'participant') showParticipant(data, lang);
      else showAnswer(data, lang);
    })
    .onLinkClick((link) => {
      const l = link as GraphLink;
      if (l._type !== 'keyword') return;
      window.__graphOrbit?.pause();
      const src = (link as { source: unknown }).source;
      const tgt = (link as { target: unknown }).target;
      const rawSrcId = typeof src === 'object' && src !== null ? (src as { id: unknown }).id : src;
      const rawTgtId = typeof tgt === 'object' && tgt !== null ? (tgt as { id: unknown }).id : tgt;
      if (typeof rawSrcId !== 'string' && typeof rawSrcId !== 'number') return;
      if (typeof rawTgtId !== 'string' && typeof rawTgtId !== 'number') return;
      const sourceId: string | number = rawSrcId;
      const targetId: string | number = rawTgtId;
      const kl = keywordLinkByPair.get(`${sourceId}-${targetId}`);
      if (!kl) return;
      const answerA = nodeById.get(sourceId);
      const answerB = nodeById.get(targetId);
      if (!answerA || answerA._type !== 'answer') return;
      if (!answerB || answerB._type !== 'answer') return;
      showKeywordConnection(answerA, answerB, kl.keywords, lang);
    })
    .onBackgroundClick(() => {
      window.__graphOrbit?.pause();
      document.getElementById('detail-content')!.innerHTML = '';
      document.getElementById('sidebar-hint')!.textContent = t('graph.hint', lang);
    });

  setTimeout(() => {
    Graph.zoomToFit(800, 40);
    setTimeout(() => {
      const { x, y, z } = Graph.cameraPosition();
      const distance = Math.sqrt(x * x + y * y + z * z);
      let theta = Math.atan2(x, z);
      let intervalId: ReturnType<typeof setInterval> | null = null;

      const btn = document.getElementById('orbit-btn')!;

      function startOrbit(): void {
        if (intervalId) return;
        intervalId = setInterval(() => {
          const phi = Math.PI / 2 + Math.sin(theta * 0.37) * (Math.PI / 3.5);
          Graph.cameraPosition({
            x: distance * Math.sin(phi) * Math.sin(theta),
            y: distance * Math.cos(phi),
            z: distance * Math.sin(phi) * Math.cos(theta),
          });
          theta += Math.PI / 300;
        }, 10);
        btn.textContent = t('graph.orbit_pause', lang);
      }

      function pauseOrbit(): void {
        if (intervalId) clearInterval(intervalId);
        intervalId = null;
        btn.textContent = t('graph.orbit_resume', lang);
      }

      window.__graphOrbit = { pause: pauseOrbit, resume: startOrbit };
      btn.addEventListener('click', () => {
        if (intervalId) pauseOrbit();
        else startOrbit();
      });
      startOrbit();
    }, 800);
  }, 500);
}

// ── Sidebar renderers ──────────────────────────────────────────────────────

function showHub(d: HubNode, lang: Lang): void {
  document.getElementById('sidebar-hint')!.textContent = t('graph.project_question', lang);
  const labelsHtml =
    d.branches.length > 0
      ? '<ul>' +
        d.branches
          .map((b) => `<li><span class="position">${b.position}.</span> ${escapeHtml(b.text)}</li>`)
          .join('') +
        '</ul>'
      : `<p class="empty">${t('graph.no_branch_labels', lang)}</p>`;

  document.getElementById('detail-content')!.innerHTML = `
    <div class="node-block">
      <div class="center" style="color:#f5a623">${escapeHtml(d.participant_name)}</div>
      ${labelsHtml}
    </div>`;
}

function showParticipant(d: ParticipantNode, lang: Lang): void {
  document.getElementById('sidebar-hint')!.textContent = t('graph.participant', lang);
  const answersHtml =
    d.branches.length > 0
      ? '<ul>' +
        d.branches
          .map(
            (b) =>
              `<li><span class="position">${b.position}.</span> ${escapeHtml(b.text)}${mediaHtml(b)}</li>`,
          )
          .join('') +
        '</ul>'
      : `<p class="empty">${t('graph.no_branches', lang)}</p>`;

  document.getElementById('detail-content')!.innerHTML = `
    <div class="node-block">
      <div class="center">${escapeHtml(d.participant_name)}</div>
      ${answersHtml}
    </div>`;
}

function showAnswer(d: AnswerNode, lang: Lang): void {
  document.getElementById('sidebar-hint')!.textContent = t('graph.answer', lang);
  document.getElementById('detail-content')!.innerHTML = `
    <div class="node-block">
      <div class="center" style="font-size:0.8rem;color:#aaa;font-weight:400;margin-bottom:4px">
        ${escapeHtml(d.participant_name)}
      </div>
      <div style="font-size:0.75rem;color:#666;margin-bottom:8px">
        ${escapeHtml(d.branchLabel)}
      </div>
      <div class="center">${escapeHtml(d.text)}</div>
      ${mediaHtml({ id: 0, node_id: d.nodeId, position: d.branchPosition, text: d.text, media_path: d.media_path, media_type: d.media_type })}
    </div>`;
}

function showKeywordConnection(
  answerA: AnswerNode,
  answerB: AnswerNode,
  keywords: string[],
  lang: Lang,
): void {
  document.getElementById('sidebar-hint')!.textContent = t('graph.connection_label', lang);
  const tagsHtml = keywords.map((k) => `<span class="shared-tag">${escapeHtml(k)}</span>`).join('');

  document.getElementById('detail-content')!.innerHTML = `
    <div class="shared-row">${tagsHtml}</div>
    <div class="node-block">
      <div class="center" style="font-size:0.8rem;color:#aaa;font-weight:400;margin-bottom:4px">
        ${escapeHtml(answerA.participant_name)}
      </div>
      <div style="font-size:0.75rem;color:#666;margin-bottom:8px">
        ${escapeHtml(answerA.branchLabel)}
      </div>
      <div class="center">${escapeHtml(answerA.text)}</div>
      ${mediaHtml({ id: 0, node_id: answerA.nodeId, position: answerA.branchPosition, text: answerA.text, media_path: answerA.media_path, media_type: answerA.media_type })}
    </div>
    <hr class="divider">
    <div class="node-block">
      <div class="center" style="font-size:0.8rem;color:#aaa;font-weight:400;margin-bottom:4px">
        ${escapeHtml(answerB.participant_name)}
      </div>
      <div style="font-size:0.75rem;color:#666;margin-bottom:8px">
        ${escapeHtml(answerB.branchLabel)}
      </div>
      <div class="center">${escapeHtml(answerB.text)}</div>
      ${mediaHtml({ id: 0, node_id: answerB.nodeId, position: answerB.branchPosition, text: answerB.text, media_path: answerB.media_path, media_type: answerB.media_type })}
    </div>`;
}

function showError(msg: string): void {
  const errorEl = document.getElementById('error')!;
  errorEl.textContent = msg;
  errorEl.style.display = 'block';
  document.getElementById('project-title')!.textContent = 'Error';
}
