import { afterEach, describe, expect, it } from 'vitest';
import {
  _resetForTests,
  createNode,
  createProject,
  getAllNodes,
  getAllProjects,
  getBranchById,
  getConnectionsByProject,
  getNodesByProject,
  getProjectByUUID,
  recomputeAllConnections,
  saveBranchMedia,
} from '@/db';

afterEach(() => {
  _resetForTests();
});

// ── Projects ───────────────────────────────────────────────────────────────

describe('createProject / getProjectByUUID', () => {
  it('returns a uuid and numeric id', () => {
    const { id, uuid } = createProject('Test question', []);
    expect(typeof id).toBe('number');
    expect(uuid).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('can be retrieved by uuid', () => {
    const { uuid } = createProject('My question', ['Branch A', 'Branch B']);
    const project = getProjectByUUID(uuid);
    expect(project).toBeDefined();
    expect(project!.center_label).toBe('My question');
    expect(project!.branch_labels).toHaveLength(2);
    expect(project!.branch_labels[0].label).toBe('Branch A');
    expect(project!.branch_labels[1].label).toBe('Branch B');
  });

  it('branch labels preserve position', () => {
    const { uuid } = createProject('Q', ['First', 'Second', 'Third']);
    const project = getProjectByUUID(uuid);
    const positions = project!.branch_labels.map((bl) => bl.position);
    expect(positions).toEqual([1, 2, 3]);
  });

  it('skips blank branch labels', () => {
    const { uuid } = createProject('Q', ['A', '', '  ', 'D']);
    const project = getProjectByUUID(uuid);
    expect(project!.branch_labels).toHaveLength(2);
  });

  it('returns undefined for unknown uuid', () => {
    expect(getProjectByUUID('00000000-0000-0000-0000-000000000000')).toBeUndefined();
  });

  it('stores language, defaults to en', () => {
    const { uuid } = createProject('Q', []);
    const project = getProjectByUUID(uuid);
    expect(project!.language).toBe('en');
  });

  it('stores custom language', () => {
    const { uuid } = createProject('Q', [], 'fr');
    const project = getProjectByUUID(uuid);
    expect(project!.language).toBe('fr');
  });
});

describe('getAllProjects', () => {
  it('returns all projects with submission_count', () => {
    createProject('First', []);
    createProject('Second', []);
    const projects = getAllProjects();
    expect(projects).toHaveLength(2);
    expect(projects.every((p) => typeof p.submission_count === 'number')).toBe(true);
  });

  it('submission_count reflects node count', () => {
    const { id, uuid } = createProject('Q', ['A']);
    createNode(id, 'Participant 1', ['branch one']);
    createNode(id, 'Participant 2', ['branch two']);
    const projects = getAllProjects();
    const project = projects.find((p) => p.uuid === uuid)!;
    expect(project.submission_count).toBe(2);
  });
});

// ── Nodes ──────────────────────────────────────────────────────────────────

describe('createNode / getAllNodes / getNodesByProject', () => {
  it('returns nodeId and branchIds', () => {
    const { id: projectId } = createProject('Q', []);
    const { nodeId, branchIds } = createNode(projectId, 'Alice', ['branch A', 'branch B']);
    expect(typeof nodeId).toBe('number');
    expect(branchIds).toHaveLength(2);
    expect(branchIds[0]).toMatchObject({ position: 1, id: expect.any(Number) });
    expect(branchIds[1]).toMatchObject({ position: 2, id: expect.any(Number) });
  });

  it('skips blank branches', () => {
    const { id: projectId } = createProject('Q', []);
    const { branchIds } = createNode(projectId, 'Alice', ['ok', '', '  ']);
    expect(branchIds).toHaveLength(1);
  });

  it('getAllNodes includes branches', () => {
    const { id: projectId } = createProject('Q', []);
    createNode(projectId, 'Alice', ['alpha', 'beta']);
    const nodes = getAllNodes();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].branches).toHaveLength(2);
    expect(nodes[0].branches[0].text).toBe('alpha');
  });

  it('getNodesByProject filters by project', () => {
    const { id: p1 } = createProject('P1', []);
    const { id: p2 } = createProject('P2', []);
    createNode(p1, 'Alice', []);
    createNode(p2, 'Bob', []);
    expect(getNodesByProject(p1)).toHaveLength(1);
    expect(getNodesByProject(p2)).toHaveLength(1);
    expect(getNodesByProject(p1)[0].participant_name).toBe('Alice');
  });
});

// ── Branches ───────────────────────────────────────────────────────────────

describe('getBranchById / saveBranchMedia', () => {
  it('getBranchById returns the branch', () => {
    const { id: projectId } = createProject('Q', []);
    const { branchIds } = createNode(projectId, 'Alice', ['my branch']);
    const branch = getBranchById(branchIds[0].id);
    expect(branch).toBeDefined();
    expect(branch!.text).toBe('my branch');
  });

  it('getBranchById returns undefined for unknown id', () => {
    expect(getBranchById(999999)).toBeUndefined();
  });

  it('saveBranchMedia updates media_path and media_type', () => {
    const { id: projectId } = createProject('Q', []);
    const { branchIds } = createNode(projectId, 'Alice', ['my branch']);
    const branchId = branchIds[0].id;
    saveBranchMedia(branchId, 'branch-123.jpg', 'image/jpeg');
    const branch = getBranchById(branchId);
    expect(branch!.media_path).toBe('branch-123.jpg');
    expect(branch!.media_type).toBe('image/jpeg');
  });

  it('saveBranchMedia returns null for unknown branch', () => {
    expect(saveBranchMedia(999999, 'file.jpg', 'image/jpeg')).toBeNull();
  });
});

// ── Connections ────────────────────────────────────────────────────────────

describe('getConnectionsByProject / computeConnections (via createNode)', () => {
  it('creates a connection when two nodes share branch keywords', () => {
    const { id: projectId } = createProject('Q', []);
    createNode(projectId, 'Alice', ['climate change ocean']);
    createNode(projectId, 'Bob', ['ocean pollution climate']);
    const connections = getConnectionsByProject(projectId);
    expect(connections).toHaveLength(1);
    expect(connections[0].shared_keywords).toContain('climate');
    expect(connections[0].shared_keywords).toContain('ocean');
  });

  it('records branch positions on connections', () => {
    const { id: projectId } = createProject('Q', []);
    createNode(projectId, 'Alice', ['climate ocean']);
    createNode(projectId, 'Bob', ['ocean climate']);
    const [conn] = getConnectionsByProject(projectId);
    expect(conn.branch_position_a).toBe(1);
    expect(conn.branch_position_b).toBe(1);
  });

  it('creates per-branch connections when multiple branches match', () => {
    const { id: projectId } = createProject('Q', []);
    // Alice: branch 1 = ocean, branch 2 = forest
    // Bob:   branch 1 = ocean, branch 2 = forest
    createNode(projectId, 'Alice', ['ocean waves', 'forest trees']);
    createNode(projectId, 'Bob', ['ocean deep', 'forest nature']);
    const connections = getConnectionsByProject(projectId);
    // Expect one connection per matching branch pair: (1,1) and (2,2)
    expect(connections).toHaveLength(2);
    const pairs = connections
      .map((c) => `${c.branch_position_a}-${c.branch_position_b}`)
      .toSorted();
    expect(pairs).toEqual(['1-1', '2-2']);
  });

  it('creates no connection when nodes share no keywords', () => {
    const { id: projectId } = createProject('Q', []);
    createNode(projectId, 'Alice', ['apple banana']);
    createNode(projectId, 'Bob', ['forest mountain']);
    expect(getConnectionsByProject(projectId)).toHaveLength(0);
  });

  it('shared_keywords is parsed as an array', () => {
    const { id: projectId } = createProject('Q', []);
    createNode(projectId, 'Alice', ['forest river landscape']);
    createNode(projectId, 'Bob', ['landscape nature river']);
    const [conn] = getConnectionsByProject(projectId);
    expect(Array.isArray(conn.shared_keywords)).toBe(true);
  });

  it('does not connect nodes across different projects', () => {
    const { id: p1 } = createProject('P1', []);
    const { id: p2 } = createProject('P2', []);
    createNode(p1, 'Alice', ['ocean climate forest']);
    createNode(p2, 'Bob', ['ocean climate forest']);
    expect(getConnectionsByProject(p1)).toHaveLength(0);
    expect(getConnectionsByProject(p2)).toHaveLength(0);
  });
});

describe('recomputeAllConnections', () => {
  it('rebuilds connections from scratch', () => {
    const { id: projectId } = createProject('Q', []);
    createNode(projectId, 'Alice', ['ocean climate']);
    createNode(projectId, 'Bob', ['ocean forest']);
    expect(getConnectionsByProject(projectId)).toHaveLength(1);

    // Recompute should produce the same result
    recomputeAllConnections();
    expect(getConnectionsByProject(projectId)).toHaveLength(1);
  });
});
