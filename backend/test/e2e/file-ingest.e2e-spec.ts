import * as path from 'path';
import * as fs from 'fs';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  TestContext,
  setupTestContext,
  teardownTestContext,
} from './test-setup';

describe('File Ingest E2E', () => {
  let ctx: TestContext;
  let app: INestApplication;

  beforeAll(async () => {
    // Enable file ingest feature for tests
    process.env.FEATURE_FILE_INGEST = 'true';
    ctx = await setupTestContext();
    app = ctx.app;
  }, 180000);

  afterAll(async () => {
    await teardownTestContext(ctx);
    delete process.env.FEATURE_FILE_INGEST;
  });

  describe('POST /api/ingest/file (PDF upload)', () => {
    const pdfPath = path.resolve(__dirname, '../resources/AI Agents Theory and Tools.pdf');

    it('should successfully ingest a 1.5MB PDF file', async () => {
      // Verify the test PDF exists
      expect(fs.existsSync(pdfPath)).toBe(true);
      const stats = fs.statSync(pdfPath);
      expect(stats.size).toBeGreaterThan(1_000_000); // > 1MB

      const response = await request(app.getHttpServer())
        .post('/api/ingest/file')
        .set('X-User-ID', 'e2e-test@example.com')
        .attach('file', pdfPath);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body.sessionId).toMatch(/^session_/);
      expect(response.body.sourceType).toBe('file');
      expect(response.body.sourceUrl).toContain('AI Agents Theory and Tools.pdf');
      expect(response.body.status).toBe('DRAFT');
      expect(response.body).toHaveProperty('createdAt');
    }, 60000); // generous timeout for PDF parsing + chunking

    it('should create a session with extractable chunks from the PDF', async () => {
      const ingestResponse = await request(app.getHttpServer())
        .post('/api/ingest/file')
        .set('X-User-ID', 'e2e-test@example.com')
        .attach('file', pdfPath);

      expect(ingestResponse.status).toBe(201);
      const sessionId = ingestResponse.body.sessionId;

      // Retrieve the session to verify chunks exist
      const sessionResponse = await request(app.getHttpServer())
        .get(`/api/session/${sessionId}`)
        .set('X-User-ID', 'e2e-test@example.com')
        .expect(200);

      expect(sessionResponse.body.sessionId).toBe(sessionId);
      expect(sessionResponse.body.status).toBe('DRAFT');
      expect(sessionResponse.body.sourceType).toBe('file');
      expect(Array.isArray(sessionResponse.body.chunks)).toBe(true);
      expect(sessionResponse.body.chunks.length).toBeGreaterThan(0);

      // Each chunk should have non-empty text content
      for (const chunk of sessionResponse.body.chunks) {
        expect(chunk).toHaveProperty('id');
        expect(chunk).toHaveProperty('text');
        expect(chunk.text.length).toBeGreaterThan(0);
      }
    }, 60000);

    it('should reject unsupported file types', async () => {
      // Create a temp file with unsupported extension
      const tmpFile = path.resolve(__dirname, '../resources/test.png');
      fs.writeFileSync(tmpFile, 'fake image data');

      try {
        const response = await request(app.getHttpServer())
          .post('/api/ingest/file')
          .set('X-User-ID', 'e2e-test@example.com')
          .attach('file', tmpFile);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Unsupported');
      } finally {
        fs.unlinkSync(tmpFile);
      }
    });

    it('should reject request without file', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/ingest/file')
        .set('X-User-ID', 'e2e-test@example.com');

      expect(response.status).toBe(400);
    });

    it('should accept a plain text file', async () => {
      const tmpFile = path.resolve(__dirname, '../resources/test-sample.txt');
      fs.writeFileSync(tmpFile, 'This is a test document.\n\nWith multiple paragraphs of content.\n\nThird paragraph for chunking.');

      try {
        const response = await request(app.getHttpServer())
          .post('/api/ingest/file')
          .set('X-User-ID', 'e2e-test@example.com')
          .attach('file', tmpFile);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('sessionId');
        expect(response.body.sourceType).toBe('file');
      } finally {
        fs.unlinkSync(tmpFile);
      }
    });
  });
});
