import ForceGraph3D, { type NodeObject } from '3d-force-graph';
import SpriteText from 'three-spritetext';
import type { Connection, Node, Project } from './types';
import { branchesHtml, escapeHtml, truncate } from './utils';

declare global {
  interface Window {
    __graphOrbit?: { pause: () => void; resume: () => void };
  }
}

const pathParts = window.location.pathname.split('/');
const uuid = pathParts[pathParts.indexOf('graph') + 1];

if (!uuid) showError('No project UUID in URL.');
else loadGraph(uuid);

async function loadGraph(projectUuid: string): Promise<void> {
  try {
    const [projectRes, nodesRes, connectionsRes] = await Promise.all([
      fetch(`/api/projects/${projectUuid}`),
      fetch(`/api/projects/${projectUuid}/nodes`),
      fetch(`/api/projects/${projectUuid}/connections`),
    ]);
    if (!projectRes.ok) {
      showError('Project not found.');
      return;
    }

    const project = (await projectRes.json()) as Project;
    const nodes = (await nodesRes.json()) as Node[];
    const connections = (await connectionsRes.json()) as Connection[];

    document.getElementById('project-title')!.textContent = project.center_label;
    document.getElementById('stats')!.textContent =
      `${nodes.length} node${nodes.length !== 1 ? 's' : ''} · ` +
      `${connections.length} connection${connections.length !== 1 ? 's' : ''}`;

    renderGraph(project, nodes, connections);
  } catch {
    showError('Failed to load graph data.');
  }
}

interface HubNode {
  id: string;
  participant_name: string;
  branches: Array<{ position: number; text: string }>;
  _isHub: true;
  fx: number;
  fy: number;
  fz: number;
}

type GraphNode = Node | HubNode;

interface HubLink {
  source: number;
  target: string;
  _isHubLink: true;
}

interface RealLink {
  source: number;
  target: number;
  keywords: string[];
  _isHubLink: false;
}

type GraphLink = HubLink | RealLink;

function renderGraph(project: Project, nodes: Node[], connections: Connection[]): void {
  const container = document.getElementById('graph-3d')!;

  const hubNode: HubNode = {
    id: '__hub__',
    participant_name: project.center_label,
    branches: project.branch_labels.map((bl) => ({ position: bl.position, text: bl.label })),
    _isHub: true,
    fx: 0,
    fy: 0,
    fz: 0,
  };

  const graphNodes: GraphNode[] = [...nodes, hubNode];

  const hubLinks: HubLink[] = nodes.map((n) => ({
    source: n.id,
    target: '__hub__',
    _isHubLink: true,
  }));

  const realLinks: RealLink[] = connections.map((c) => ({
    source: c.node_id_a,
    target: c.node_id_b,
    keywords: c.shared_keywords,
    _isHubLink: false,
  }));

  const graphLinks: GraphLink[] = [...hubLinks, ...realLinks];

  // Lookup maps give us typed access inside NodeObject/LinkObject callbacks
  const nodeById = new Map<string | number, GraphNode>(graphNodes.map((n) => [n.id, n]));
  const realLinkByPair = new Map<string, RealLink>(
    realLinks.map((l) => [`${l.source}-${l.target}`, l]),
  );

  const Graph = new ForceGraph3D(container)
    .backgroundColor('#0f1117')
    .graphData({ nodes: graphNodes, links: graphLinks })
    .nodeThreeObject((node: NodeObject) => {
      const id = node.id;
      const data = id !== undefined ? nodeById.get(id) : undefined;
      const isHub = data !== undefined && '_isHub' in data;
      const text = data?.participant_name ?? '';
      const sprite = new SpriteText(truncate(text, isHub ? 20 : 15));
      sprite.color = isHub ? '#ffffff' : '#e0e0e0';
      sprite.textHeight = isHub ? 6 : 4;
      sprite.backgroundColor = isHub ? '#f5a623' : '#4a90e2';
      sprite.padding = 4;
      sprite.borderRadius = 4;
      return sprite;
    })
    .nodeThreeObjectExtend(false)
    .linkColor((link) => ('keywords' in link ? 'rgba(74,144,226,0.85)' : 'rgba(106,122,154,0.25)'))
    .linkWidth((link) => ('keywords' in link ? 1.5 : 0.3))
    .linkOpacity(1)
    .onNodeClick((node) => {
      window.__graphOrbit?.pause();
      const id = node.id;
      const data = id !== undefined ? nodeById.get(id) : undefined;
      if (!data) return;
      if ('_isHub' in data) showHub(data);
      else showSingleNode(data);
    })
    .onLinkClick((link) => {
      if (!('keywords' in link)) return;
      window.__graphOrbit?.pause();
      const src = link.source;
      const tgt = link.target;
      const sourceId = typeof src === 'object' && src !== null ? src.id : src;
      const targetId = typeof tgt === 'object' && tgt !== null ? tgt.id : tgt;
      if (sourceId === undefined || targetId === undefined) return;
      const realLink = realLinkByPair.get(`${sourceId}-${targetId}`);
      if (!realLink) return;
      const source = nodeById.get(sourceId);
      const target = nodeById.get(targetId);
      if (!source || '_isHub' in source) return;
      if (!target || '_isHub' in target) return;
      showConnection(source, target, realLink.keywords);
    })
    .onBackgroundClick(() => {
      window.__graphOrbit?.pause();
      document.getElementById('detail-content')!.innerHTML = '';
      document.getElementById('sidebar-hint')!.textContent =
        'Click a node or connection to explore';
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
        btn.textContent = '⏸ Pause orbit';
      }

      function pauseOrbit(): void {
        if (intervalId) clearInterval(intervalId);
        intervalId = null;
        btn.textContent = '▶ Resume orbit';
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

function showHub(d: HubNode): void {
  document.getElementById('sidebar-hint')!.textContent = 'Project question';
  const labelsHtml =
    d.branches.length > 0
      ? '<ul>' +
        d.branches
          .map((b) => `<li><span class="position">${b.position}.</span> ${escapeHtml(b.text)}</li>`)
          .join('') +
        '</ul>'
      : '<p class="empty">No branch labels defined</p>';

  document.getElementById('detail-content')!.innerHTML = `
    <div class="node-block">
      <div class="center" style="color:#f5a623">${escapeHtml(d.participant_name)}</div>
      ${labelsHtml}
    </div>`;
}

function showSingleNode(d: Node): void {
  document.getElementById('sidebar-hint')!.textContent = 'Response';
  document.getElementById('detail-content')!.innerHTML = `
    <div class="node-block">
      <div class="center">${escapeHtml(d.participant_name)}</div>
      ${branchesHtml(d.branches)}
    </div>`;
}

function showConnection(nodeA: Node, nodeB: Node, keywords: string[]): void {
  document.getElementById('sidebar-hint')!.textContent = 'Connection';
  const tagsHtml = keywords.map((k) => `<span class="shared-tag">${escapeHtml(k)}</span>`).join('');

  document.getElementById('detail-content')!.innerHTML = `
    <div class="shared-row">${tagsHtml}</div>
    <div class="node-block">
      <div class="center">${escapeHtml(nodeA.participant_name)}</div>
      ${branchesHtml(nodeA.branches)}
    </div>
    <hr class="divider">
    <div class="node-block">
      <div class="center">${escapeHtml(nodeB.participant_name)}</div>
      ${branchesHtml(nodeB.branches)}
    </div>`;
}

function showError(msg: string): void {
  const errorEl = document.getElementById('error')!;
  errorEl.textContent = msg;
  errorEl.style.display = 'block';
  document.getElementById('project-title')!.textContent = 'Error';
}
