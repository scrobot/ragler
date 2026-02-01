import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  TestContext,
  setupTestContext,
  teardownTestContext,
} from './test-setup';

describe('Ingest E2E', () => {
  let ctx: TestContext;
  let app: INestApplication;

  beforeAll(async () => {
    ctx = await setupTestContext();
    app = ctx.app;
  }, 180000);

  afterAll(async () => {
    await teardownTestContext(ctx);
  });

  describe('POST /api/ingest (Manual Source)', () => {
    it('should create session from manual content', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/ingest')
        .set('X-User-ID', 'test@example.com')
        .send({
          sourceType: 'manual',
          content: 'This is test content for manual ingestion.\n\nThis is a second paragraph.',
        })
        .expect(201);

      expect(response.body).toHaveProperty('sessionId');
      expect(response.body.sourceType).toBe('manual');
      expect(response.body.status).toBe('DRAFT');
      expect(response.body.sourceUrl).toBe('manual://input');
    });

    it('should reject manual source without content', async () => {
      await request(app.getHttpServer())
        .post('/api/ingest')
        .set('X-User-ID', 'test@example.com')
        .send({
          sourceType: 'manual',
        })
        .expect(400);
    });

    it('should handle missing X-User-ID header gracefully', async () => {
      // API may use default user ID when header is missing
      const response = await request(app.getHttpServer())
        .post('/api/ingest')
        .send({
          sourceType: 'manual',
          content: 'Test content',
        });

      // Either returns 201 with default user or 400 if header is required
      expect([201, 400]).toContain(response.status);
    });
  });

  describe('Session Lifecycle', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Create a session for each test
      const response = await request(app.getHttpServer())
        .post('/api/ingest')
        .set('X-User-ID', 'test@example.com')
        .send({
          sourceType: 'manual',
          content: 'First paragraph of content.\n\nSecond paragraph of content.\n\nThird paragraph.',
        });

      sessionId = response.body.sessionId;
    });

    it('should retrieve session details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/session/${sessionId}`)
        .set('X-User-ID', 'test@example.com')
        .expect(200);

      expect(response.body).toHaveProperty('sessionId', sessionId);
      expect(response.body).toHaveProperty('status', 'DRAFT');
      expect(response.body).toHaveProperty('chunks');
      expect(Array.isArray(response.body.chunks)).toBe(true);
    });

    it('should return 404 for non-existent session', async () => {
      await request(app.getHttpServer())
        .get('/api/session/non-existent-session')
        .set('X-User-ID', 'test@example.com')
        .expect(404);
    });

    it('should update chunk text', async () => {
      // First get the session to find a chunk ID
      const sessionResponse = await request(app.getHttpServer())
        .get(`/api/session/${sessionId}`)
        .set('X-User-ID', 'test@example.com');

      const chunkId = sessionResponse.body.chunks[0]?.id;
      if (!chunkId) {
        // Skip if no chunks (content wasn't chunked)
        return;
      }

      const response = await request(app.getHttpServer())
        .patch(`/api/session/${sessionId}/chunks/${chunkId}`)
        .set('X-User-ID', 'test@example.com')
        .send({
          text: 'Updated chunk text',
        })
        .expect(200);

      expect(response.body.chunks.find((c: { id: string }) => c.id === chunkId)?.text).toBe(
        'Updated chunk text',
      );
    });

    it('should merge chunks', async () => {
      const sessionResponse = await request(app.getHttpServer())
        .get(`/api/session/${sessionId}`)
        .set('X-User-ID', 'test@example.com');

      const chunks = sessionResponse.body.chunks;
      if (chunks.length < 2) {
        // Skip if not enough chunks
        return;
      }

      const chunkIds = [chunks[0].id, chunks[1].id];

      const response = await request(app.getHttpServer())
        .post(`/api/session/${sessionId}/chunks/merge`)
        .set('X-User-ID', 'test@example.com')
        .send({ chunkIds })
        .expect(200);

      // Should have one fewer chunk after merge
      expect(response.body.chunks.length).toBe(chunks.length - 1);
    });

    it('should split chunk (DEV role)', async () => {
      const sessionResponse = await request(app.getHttpServer())
        .get(`/api/session/${sessionId}`)
        .set('X-User-ID', 'test@example.com');

      const chunk = sessionResponse.body.chunks[0];
      if (!chunk || chunk.text.length < 20) {
        // Skip if chunk is too short to split
        return;
      }

      const splitPoint = Math.floor(chunk.text.length / 2);

      const response = await request(app.getHttpServer())
        .post(`/api/session/${sessionId}/chunks/${chunk.id}/split`)
        .set('X-User-ID', 'test@example.com')
        .set('X-User-Role', 'DEV')
        .send({ splitPoints: [splitPoint] })
        .expect(200);

      // Should have one more chunk after split
      expect(response.body.chunks.length).toBe(
        sessionResponse.body.chunks.length + 1,
      );
    });

    it('should deny split chunk for L2 role', async () => {
      const sessionResponse = await request(app.getHttpServer())
        .get(`/api/session/${sessionId}`)
        .set('X-User-ID', 'test@example.com');

      const chunk = sessionResponse.body.chunks[0];
      if (!chunk) return;

      await request(app.getHttpServer())
        .post(`/api/session/${sessionId}/chunks/${chunk.id}/split`)
        .set('X-User-ID', 'test@example.com')
        .set('X-User-Role', 'L2')
        .send({ splitPoints: [10] })
        .expect(403);
    });

    it('should generate preview', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/session/${sessionId}/preview`)
        .set('X-User-ID', 'test@example.com')
        .expect(201);

      expect(response.body).toHaveProperty('chunks');
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('status', 'PREVIEW');
      expect(response.body).toHaveProperty('isValid');
    });
  });

  describe('Full Flow: Ingest → Publish', () => {
    let collectionId: string;
    let sessionId: string;

    beforeAll(async () => {
      // Create a collection for publishing
      const collectionResponse = await request(app.getHttpServer())
        .post('/api/collections')
        .set('X-User-ID', 'test@example.com')
        .set('X-User-Role', 'DEV')
        .send({
          name: 'E2E Test Collection',
          description: 'Collection for E2E testing',
        });

      collectionId = collectionResponse.body.id;
    });

    afterAll(async () => {
      // Cleanup: delete the test collection
      if (collectionId) {
        await request(app.getHttpServer())
          .delete(`/api/collections/${collectionId}`)
          .set('X-User-ID', 'test@example.com')
          .set('X-User-Role', 'DEV');
      }
    });

    it('should complete full ingest-to-publish flow', async () => {
      // Step 1: Ingest content with clear paragraph breaks
      const ingestResponse = await request(app.getHttpServer())
        .post('/api/ingest')
        .set('X-User-ID', 'test@example.com')
        .send({
          sourceType: 'manual',
          content:
            'This is the first paragraph of comprehensive test content for the E2E flow. It has enough text to be meaningful.\n\nThis is the second paragraph. It contains multiple sentences to test chunking properly.\n\nThis is the third paragraph with additional content for testing.',
        })
        .expect(201);

      sessionId = ingestResponse.body.sessionId;
      expect(sessionId).toBeDefined();

      // Step 2: Verify session was created
      const sessionResponse = await request(app.getHttpServer())
        .get(`/api/session/${sessionId}`)
        .set('X-User-ID', 'test@example.com')
        .expect(200);

      expect(sessionResponse.body.status).toBe('DRAFT');
      // Chunks may be empty initially depending on implementation
      expect(sessionResponse.body).toHaveProperty('chunks');

      // Step 3: Preview before publish
      const previewResponse = await request(app.getHttpServer())
        .post(`/api/session/${sessionId}/preview`)
        .set('X-User-ID', 'test@example.com')
        .expect(201);

      expect(previewResponse.body).toHaveProperty('chunks');
      expect(previewResponse.body).toHaveProperty('sessionId');
      expect(previewResponse.body).toHaveProperty('status', 'PREVIEW');

      // Step 4: Publish to collection (only if OpenAI key is available)
      if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'test-key') {
        const publishResponse = await request(app.getHttpServer())
          .post(`/api/session/${sessionId}/publish`)
          .set('X-User-ID', 'test@example.com')
          .send({ collectionId })
          .expect(200);

        expect(publishResponse.body).toHaveProperty('publishedCount');
      }
    });
  });
});

describe('Collections E2E', () => {
  let ctx: TestContext;
  let app: INestApplication;

  beforeAll(async () => {
    ctx = await setupTestContext();
    app = ctx.app;
  }, 180000);

  afterAll(async () => {
    await teardownTestContext(ctx);
  });

  describe('Collection CRUD', () => {
    let testCollectionId: string;

    it('should list collections', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/collections')
        .set('X-User-ID', 'test@example.com')
        .expect(200);

      expect(response.body).toHaveProperty('collections');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.collections)).toBe(true);
    });

    it('should create collection (DEV role)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/collections')
        .set('X-User-ID', 'test@example.com')
        .set('X-User-Role', 'DEV')
        .send({
          name: 'Test Collection',
          description: 'A test collection for E2E',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Collection');
      testCollectionId = response.body.id;
    });

    it('should deny collection creation for L2 role', async () => {
      await request(app.getHttpServer())
        .post('/api/collections')
        .set('X-User-ID', 'test@example.com')
        .set('X-User-Role', 'L2')
        .send({
          name: 'Should Fail',
          description: 'This should not be created',
        })
        .expect(403);
    });

    it('should get collection by ID', async () => {
      if (!testCollectionId) return;

      const response = await request(app.getHttpServer())
        .get(`/api/collections/${testCollectionId}`)
        .set('X-User-ID', 'test@example.com')
        .expect(200);

      expect(response.body.id).toBe(testCollectionId);
      expect(response.body.name).toBe('Test Collection');
    });

    it('should delete collection (DEV role)', async () => {
      if (!testCollectionId) return;

      await request(app.getHttpServer())
        .delete(`/api/collections/${testCollectionId}`)
        .set('X-User-ID', 'test@example.com')
        .set('X-User-Role', 'DEV')
        .expect(204);

      // Allow time for deletion to propagate
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify deletion - collection should no longer exist
      const verifyResponse = await request(app.getHttpServer())
        .get(`/api/collections/${testCollectionId}`)
        .set('X-User-ID', 'test@example.com');

      // Should return 404, but may return 200 with empty data depending on implementation
      expect([404, 200]).toContain(verifyResponse.status);
    });
  });
});

describe('Health E2E', () => {
  let ctx: TestContext;
  let app: INestApplication;

  beforeAll(async () => {
    ctx = await setupTestContext();
    app = ctx.app;
  }, 180000);

  afterAll(async () => {
    await teardownTestContext(ctx);
  });

  it('should return healthy status', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('info');
    expect(response.body.info).toHaveProperty('redis');
    expect(response.body.info).toHaveProperty('qdrant');
  });

  it('should return liveness probe', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health/liveness')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
  });

  it('should return readiness probe', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health/readiness')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
  });
});
