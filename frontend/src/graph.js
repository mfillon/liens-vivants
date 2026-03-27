import * as d3 from 'd3';

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
  const svgEl = document.getElementById('svg');
  const width = svgEl.clientWidth;
  const height = svgEl.clientHeight;

  const svg = d3.select('#svg').attr('viewBox', [0, 0, width, height]);
  const g = svg.append('g');
  svg.call(d3.zoom().scaleExtent([0.2, 4]).on('zoom', e => g.attr('transform', e.transform)));

  if (nodes.length === 0) {
    svg.append('text')
      .attr('x', width / 2).attr('y', height / 2)
      .attr('text-anchor', 'middle').attr('fill', '#555')
      .text('No nodes submitted yet.');
    return;
  }

  // Hub (fixed center, not part of forceLink)
  const hubX = width / 2, hubY = height / 2;
  const hubData = {
    id: '__hub__',
    center_text: project.center_label,
    branches: project.branch_labels.map(bl => ({ position: bl.position, text: bl.label })),
    _isHub: true,
    fx: hubX, fy: hubY,
  };

  // All nodes anchor to the hub (guaranteed visible, no type-comparison needed)
  // Real keyword connections are drawn on top and stand out clearly

  // Real links — only these go into forceLink
  const realLinkData = connections.map(c => ({
    source: c.node_id_a,
    target: c.node_id_b,
    keywords: c.shared_keywords,
  }));

  // Simulation: real nodes + hub (for repulsion), only realLinks in force
  const simNodes = [...nodes, hubData];
  const simulation = d3.forceSimulation(simNodes)
    .force('link', d3.forceLink(realLinkData).id(d => d.id).distance(130))
    .force('charge', d3.forceManyBody().strength(-320))
    .force('center', d3.forceCenter(hubX, hubY))
    .force('collision', d3.forceCollide(44));

  // ── Draw order: hub-links first (behind everything) ──

  // Hub anchor lines: ALL nodes → hub center, drawn manually
  // (no D3 ID resolution — uses node object .x/.y directly from simulation)
  const hubLinkSel = g.append('g')
    .selectAll('line')
    .data(nodes)
    .join('line')
    .attr('class', 'hub-link');

  // Invisible wide hit area for hub lines
  const hubLinkHitSel = g.append('g')
    .selectAll('line')
    .data(nodes)
    .join('line')
    .attr('class', 'hub-link-hit')
    .on('click', (event, d) => {
      event.stopPropagation();
      clearSelection(realLinkSel, hubLinkSel, nodeSel);
      hubLinkSel.classed('selected', (ld) => ld === d);
      showSingleNode(d);
    });

  // Real connection lines (visual)
  const realLinkSel = g.append('g')
    .selectAll('line')
    .data(realLinkData)
    .join('line')
    .attr('class', 'link');

  // Invisible wide hit-area on top of each real link for easier clicking
  const realLinkHitSel = g.append('g')
    .selectAll('line')
    .data(realLinkData)
    .join('line')
    .attr('class', 'link-hit')
    .on('click', (event, d) => {
      event.stopPropagation();
      clearSelection(realLinkSel, hubLinkSel, nodeSel);
      realLinkSel.classed('selected', (ld) => ld === d);
      showConnection(d.source, d.target, d.keywords);
    });

  // Keyword labels on real links
  const linkLabelSel = g.append('g')
    .selectAll('text')
    .data(realLinkData)
    .join('text')
    .attr('class', 'link-label')
    .text(d => d.keywords.slice(0, 2).join(', '));

  // Nodes (real + hub)
  const nodeSel = g.append('g')
    .selectAll('g')
    .data(simNodes)
    .join('g')
    .attr('class', d => d._isHub ? 'hub' : 'node')
    .call(d3.drag()
      .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); if (!d._isHub) { d.fx = d.x; d.fy = d.y; } })
      .on('drag',  (e, d) => { if (!d._isHub) { d.fx = e.x; d.fy = e.y; } })
      .on('end',   (e, d) => { if (!e.active) simulation.alphaTarget(0); if (!d._isHub) { d.fx = null; d.fy = null; } })
    )
    .on('click', (event, d) => {
      event.stopPropagation();
      clearSelection(realLinkSel, hubLinkSel, nodeSel);
      d3.select(event.currentTarget).classed('selected', true);
      if (d._isHub) showHub(d);
      else showSingleNode(d);
    });

  nodeSel.append('circle').attr('r', d => d._isHub ? 40 : 28);
  nodeSel.append('text').text(d => truncate(d.center_text, d._isHub ? 18 : 16));

  // Click on empty canvas → clear selection
  svg.on('click', () => {
    clearSelection(realLinkSel, hubLinkSel, nodeSel);
    document.getElementById('detail-content').innerHTML = '';
    document.getElementById('sidebar-hint').textContent = 'Click a node or connection to explore';
  });

  simulation.on('tick', () => {
    // Real links: D3 resolves source/target to objects
    realLinkSel
      .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x).attr('y2', d => d.target.y);

    realLinkHitSel
      .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x).attr('y2', d => d.target.y);

    // Hub links: use node object .x/.y directly — no D3 resolution needed
    hubLinkSel
      .attr('x1', d => d.x).attr('y1', d => d.y)
      .attr('x2', hubX).attr('y2', hubY);

    hubLinkHitSel
      .attr('x1', d => d.x).attr('y1', d => d.y)
      .attr('x2', hubX).attr('y2', hubY);

    linkLabelSel
      .attr('x', d => (d.source.x + d.target.x) / 2)
      .attr('y', d => (d.source.y + d.target.y) / 2);

    nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
  });
}

// ── Sidebar renderers ──

function clearSelection(realLinkSel, hubLinkSel, nodeSel) {
  realLinkSel.classed('selected', false);
  hubLinkSel.classed('selected', false);
  nodeSel.classed('selected', false);
}

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
  const branchesHtml = d.branches.length > 0
    ? '<ul>' + d.branches.map(b =>
        `<li><span class="position">${b.position}.</span> ${escapeHtml(b.text)}</li>`
      ).join('') + '</ul>'
    : '<p class="empty">No branches</p>';

  document.getElementById('detail-content').innerHTML = `
    <div class="node-block">
      <div class="center">${escapeHtml(d.center_text)}</div>
      ${branchesHtml}
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
  if (!branches || branches.length === 0) return '<p class="empty">No branches</p>';
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
  const el = document.getElementById('error');
  el.textContent = msg;
  el.style.display = 'block';
  document.getElementById('project-title').textContent = 'Error';
}
