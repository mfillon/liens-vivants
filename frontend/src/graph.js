import ForceGraph3D from '3d-force-graph';
import SpriteText from 'three-spritetext';

const pathParts = window.location.pathname.split('/');
const uuid = pathParts[pathParts.indexOf('graph') + 1];

if (!uuid) showError('No project UUID in URL.');
else loadGraph(uuid);

async function loadGraph(uuid) {
  try {
    const [projectRes, nodesRes, connectionsRes] = await Promise.all([
      fetch(`/api/projects/${uuid}`),
      fetch(`/api/projects/${uuid}/nodes`),
      fetch(`/api/projects/${uuid}/connections`),
    ]);
    if (!projectRes.ok) { showError('Project not found.'); return; }

    const project = await projectRes.json();
    const nodes = await nodesRes.json();
    const connections = await connectionsRes.json();

    document.getElementById('project-title').textContent = project.center_label;
    document.getElementById('stats').textContent =
      `${nodes.length} node${nodes.length !== 1 ? 's' : ''} · ` +
      `${connections.length} connection${connections.length !== 1 ? 's' : ''}`;

    renderGraph(project, nodes, connections);
  } catch (err) {
    showError('Failed to load graph data.');
  }
}

function renderGraph(project, nodes, connections) {
  const container = document.getElementById('graph-3d');

  const hubNode = {
    id: '__hub__',
    center_text: project.center_label,
    branches: project.branch_labels.map(bl => ({ position: bl.position, text: bl.label })),
    _isHub: true,
    fx: 0, fy: 0, fz: 0,
  };

  const graphNodes = [...nodes, hubNode];

  const hubLinks = nodes.map(n => ({
    source: n.id,
    target: '__hub__',
    _isHubLink: true,
  }));

  const realLinks = connections.map(c => ({
    source: c.node_id_a,
    target: c.node_id_b,
    keywords: c.shared_keywords,
    _isHubLink: false,
  }));

  const Graph = ForceGraph3D()(container)
    .backgroundColor('#0f1117')
    .graphData({ nodes: graphNodes, links: [...hubLinks, ...realLinks] })
    .nodeThreeObject(d => {
      const sprite = new SpriteText(truncate(d.center_text, d._isHub ? 20 : 15));
      sprite.color = d._isHub ? '#ffffff' : '#e0e0e0';
      sprite.textHeight = d._isHub ? 6 : 4;
      sprite.backgroundColor = d._isHub ? '#f5a623' : '#4a90e2';
      sprite.padding = 4;
      sprite.borderRadius = 4;
      return sprite;
    })
    .nodeThreeObjectExtend(false)
    .linkColor(d => d._isHubLink ? 'rgba(106,122,154,0.25)' : 'rgba(74,144,226,0.85)')
    .linkWidth(d => d._isHubLink ? 0.3 : 1.5)
    .linkOpacity(1)
    .onNodeClick(node => {
      window.__graphOrbit?.pause();
      if (node._isHub) showHub(node);
      else showSingleNode(node);
    })
    .onLinkClick(link => {
      if (!link._isHubLink) {
        window.__graphOrbit?.pause();
        showConnection(link.source, link.target, link.keywords);
      }
    })
    .onBackgroundClick(() => {
      document.getElementById('detail-content').innerHTML = '';
      document.getElementById('sidebar-hint').textContent = 'Click a node or connection to explore';
    });

  // Zoom to fit, then orbit at the resulting distance
  setTimeout(() => {
    Graph.zoomToFit(800, 40);
    setTimeout(() => {
      const { x, y, z } = Graph.cameraPosition();
      const distance = Math.sqrt(x * x + y * y + z * z);
      let theta = Math.atan2(x, z);
      let intervalId = null;

      const btn = document.getElementById('orbit-btn');

      function startOrbit() {
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

      function pauseOrbit() {
        clearInterval(intervalId);
        intervalId = null;
        btn.textContent = '▶ Resume orbit';
      }

      window.__graphOrbit = { pause: pauseOrbit, resume: startOrbit };

      btn.addEventListener('click', () => {
        intervalId ? pauseOrbit() : startOrbit();
      });

      startOrbit();
    }, 800);
  }, 500);
}

// ── Sidebar renderers ──

function showHub(d) {
  document.getElementById('sidebar-hint').textContent = 'Project question';
  const labelsHtml = d.branches.length > 0
    ? '<ul>' + d.branches.map(b =>
        `<li><span class="position">${b.position}.</span> ${escapeHtml(b.text)}</li>`
      ).join('') + '</ul>'
    : '<p class="empty">No branch labels defined</p>';

  document.getElementById('detail-content').innerHTML = `
    <div class="node-block">
      <div class="center" style="color:#f5a623">${escapeHtml(d.center_text)}</div>
      ${labelsHtml}
    </div>`;
}

function showSingleNode(d) {
  document.getElementById('sidebar-hint').textContent = 'Response';
  const bl = d.branches?.length > 0
    ? '<ul>' + d.branches.map(b =>
        `<li><span class="position">${b.position}.</span> ${escapeHtml(b.text)}</li>`
      ).join('') + '</ul>'
    : '<p class="empty">No branches</p>';

  document.getElementById('detail-content').innerHTML = `
    <div class="node-block">
      <div class="center">${escapeHtml(d.center_text)}</div>
      ${bl}
    </div>`;
}

function showConnection(nodeA, nodeB, keywords) {
  document.getElementById('sidebar-hint').textContent = 'Connection';
  const tagsHtml = keywords.map(k => `<span class="shared-tag">${escapeHtml(k)}</span>`).join('');

  document.getElementById('detail-content').innerHTML = `
    <div class="shared-row">${tagsHtml}</div>
    <div class="node-block">
      <div class="center">${escapeHtml(nodeA.center_text)}</div>
      ${branchesHtml(nodeA.branches)}
    </div>
    <hr class="divider">
    <div class="node-block">
      <div class="center">${escapeHtml(nodeB.center_text)}</div>
      ${branchesHtml(nodeB.branches)}
    </div>`;
}

function branchesHtml(branches) {
  if (!branches?.length) return '<p class="empty">No branches</p>';
  return '<ul>' + branches.map(b =>
    `<li><span class="position">${b.position}.</span> ${escapeHtml(b.text)}</li>`
  ).join('') + '</ul>';
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showError(msg) {
  document.getElementById('error').textContent = msg;
  document.getElementById('error').style.display = 'block';
  document.getElementById('project-title').textContent = 'Error';
}
