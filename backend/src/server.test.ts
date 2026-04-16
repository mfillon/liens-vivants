import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from './server';
import { _resetForTests } from './db';

afterEach(() => {
  _resetForTests();
});

const AUTH = Buffer.from('admin:testpass').toString('base64');
const authHeader = { Authorization: `Basic ${AUTH}` };

// ── POST /api/projects ─────────────────────────────────────────────────────

describe('POST /api/projects', () => {
  it('returns 401 without credentials', async () => {
    const res = await request(app).post('/api/projects').send({ center_label: 'Test' });
    expect(res.status).toBe(401);
  });

  it('returns 401 with wrong credentials', async () => {
    const bad = Buffer.from('admin:wrong').toString('base64');
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Basic ${bad}`)
      .send({ center_label: 'Test' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when center_label is missing', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set(authHeader)
      .send({ branch_labels: ['A'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when center_label is blank', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set(authHeader)
      .send({ center_label: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when more than 5 branch_labels provided', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set(authHeader)
      .send({ center_label: 'Q', branch_labels: ['A', 'B', 'C', 'D', 'E', 'F'] });
    expect(res.status).toBe(400);
  });

  it('creates a project and returns 201 with uuid', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set(authHeader)
      .send({ center_label: 'My question', branch_labels: ['Branch A', 'Branch B'] });
    expect(res.status).toBe(201);
    expect(res.body.uuid).toMatch(/^[0-9a-f-]{36}$/);
    expect(typeof res.body.id).toBe('number');
  });
});

// ── GET /api/projects ──────────────────────────────────────────────────────

describe('GET /api/projects', () => {
  it('returns 401 without credentials', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(401);
  });

  it('returns empty array when no projects exist', async () => {
    const res = await request(app).get('/api/projects').set(authHeader);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all projects', async () => {
    await request(app).post('/api/projects').set(authHeader).send({ center_label: 'P1' });
    await request(app).post('/api/projects').set(authHeader).send({ center_label: 'P2' });
    const res = await request(app).get('/api/projects').set(authHeader);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

// ── GET /api/projects/:uuid ────────────────────────────────────────────────

describe('GET /api/projects/:uuid', () => {
  it('returns 404 for unknown uuid', async () => {
    const res = await request(app).get('/api/projects/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  it('returns the project with branch_labels', async () => {
    const { body } = await request(app)
      .post('/api/projects')
      .set(authHeader)
      .send({ center_label: 'Test', branch_labels: ['A', 'B'] });

    const res = await request(app).get(`/api/projects/${body.uuid}`);
    expect(res.status).toBe(200);
    expect(res.body.center_label).toBe('Test');
    expect(res.body.branch_labels).toHaveLength(2);
  });
});

// ── POST /api/nodes ────────────────────────────────────────────────────────

describe('POST /api/nodes', () => {
  it('returns 400 when project_uuid is missing', async () => {
    const res = await request(app).post('/api/nodes').send({ center_text: 'answer' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown project_uuid', async () => {
    const res = await request(app).post('/api/nodes').send({
      project_uuid: '00000000-0000-0000-0000-000000000000',
      center_text: 'answer',
      branches: [],
    });
    expect(res.status).toBe(404);
  });

  it('returns 400 when center_text is missing', async () => {
    const { body: project } = await request(app)
      .post('/api/projects')
      .set(authHeader)
      .send({ center_label: 'Q' });

    const res = await request(app).post('/api/nodes').send({
      project_uuid: project.uuid,
      center_text: '',
      branches: [],
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when branches has more than 5 items', async () => {
    const { body: project } = await request(app)
      .post('/api/projects')
      .set(authHeader)
      .send({ center_label: 'Q' });

    const res = await request(app)
      .post('/api/nodes')
      .send({
        project_uuid: project.uuid,
        center_text: 'answer',
        branches: ['a', 'b', 'c', 'd', 'e', 'f'],
      });
    expect(res.status).toBe(400);
  });

  it('creates a node and returns 201 with id and branchIds', async () => {
    const { body: project } = await request(app)
      .post('/api/projects')
      .set(authHeader)
      .send({ center_label: 'Q' });

    const res = await request(app)
      .post('/api/nodes')
      .send({
        project_uuid: project.uuid,
        center_text: 'My answer',
        branches: ['Branch response A', 'Branch response B'],
      });
    expect(res.status).toBe(201);
    expect(typeof res.body.id).toBe('number');
    expect(res.body.branchIds).toHaveLength(2);
  });
});

// ── GET /api/projects/:uuid/nodes ──────────────────────────────────────────

describe('GET /api/projects/:uuid/nodes', () => {
  it('returns 404 for unknown uuid', async () => {
    const res = await request(app).get('/api/projects/00000000-0000-0000-0000-000000000000/nodes');
    expect(res.status).toBe(404);
  });

  it('returns nodes with branches for a project', async () => {
    const { body: project } = await request(app)
      .post('/api/projects')
      .set(authHeader)
      .send({ center_label: 'Q' });

    await request(app)
      .post('/api/nodes')
      .send({
        project_uuid: project.uuid,
        center_text: 'answer',
        branches: ['branch text'],
      });

    const res = await request(app).get(`/api/projects/${project.uuid}/nodes`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].branches).toHaveLength(1);
  });
});

// ── GET /api/projects/:uuid/connections ────────────────────────────────────

describe('GET /api/projects/:uuid/connections', () => {
  it('returns 404 for unknown uuid', async () => {
    const res = await request(app).get(
      '/api/projects/00000000-0000-0000-0000-000000000000/connections',
    );
    expect(res.status).toBe(404);
  });

  it('returns connections with parsed shared_keywords', async () => {
    const { body: project } = await request(app)
      .post('/api/projects')
      .set(authHeader)
      .send({ center_label: 'Q' });

    await request(app)
      .post('/api/nodes')
      .send({ project_uuid: project.uuid, center_text: 'A', branches: ['ocean climate forest'] });
    await request(app)
      .post('/api/nodes')
      .send({ project_uuid: project.uuid, center_text: 'B', branches: ['ocean nature climate'] });

    const res = await request(app).get(`/api/projects/${project.uuid}/connections`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(Array.isArray(res.body[0].shared_keywords)).toBe(true);
  });
});

// ── GET /api/nodes ─────────────────────────────────────────────────────────

describe('GET /api/nodes', () => {
  it('returns 401 without credentials', async () => {
    const res = await request(app).get('/api/nodes');
    expect(res.status).toBe(401);
  });

  it('returns all nodes', async () => {
    const { body: project } = await request(app)
      .post('/api/projects')
      .set(authHeader)
      .send({ center_label: 'Q' });

    await request(app)
      .post('/api/nodes')
      .send({ project_uuid: project.uuid, center_text: 'answer', branches: [] });

    const res = await request(app).get('/api/nodes').set(authHeader);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

// ── POST /api/branches/:id/media ───────────────────────────────────────────

describe('POST /api/branches/:id/media', () => {
  it('returns 400 when no file is attached', async () => {
    const res = await request(app).post('/api/branches/1/media');
    expect(res.status).toBe(400);
  });
});

// ── POST /api/admin/recompute-connections ──────────────────────────────────

describe('POST /api/admin/recompute-connections', () => {
  it('returns 401 without credentials', async () => {
    const res = await request(app).post('/api/admin/recompute-connections');
    expect(res.status).toBe(401);
  });

  it('returns 200 and ok: true', async () => {
    const res = await request(app).post('/api/admin/recompute-connections').set(authHeader);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
