import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  TestContext,
  setupTestContext,
  teardownTestContext,
} from './test-setup';

/**
 * Integration tests for v2 publishing and search flows
 *
 * Tests the complete end-to-end flow:
 * 1. Collection creation
 * 2. Content ingestion (session creation)
 * 3. Publishing with v2 schema (structured chunking, tags, metadata)
 * 4. Search with v2 filters and navigation intent
 * 5. Verify structured metadata in results
 */
describe('V2 Publish & Search E2E', () => {
  let ctx: TestContext;
  let app: INestApplication;
  let collectionId: string;
  let sessionId: string;

  beforeAll(async () => {
    ctx = await setupTestContext();
    app = ctx.app;
  }, 180000); // 3 minute timeout for container startup

  afterAll(async () => {
    await teardownTestContext(ctx);
  });

  describe('Complete V2 Flow', () => {
    it('should create a collection', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/collections')
        .set('X-User-ID', 'test@example.com')
        .set('X-User-Role', 'DEV')
        .send({
          name: 'V2 Test Collection',
          description: 'Testing v2 schema with structured chunking',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('V2 Test Collection');
      collectionId = response.body.id;
    });

    it('should ingest content with sections and tables', async () => {
      const testContent = `
# Introduction to RAG

RAG (Retrieval-Augmented Generation) is a powerful technique for enhancing LLM responses with external knowledge.

## Core Concepts

Retrieval-augmented generation combines vector search with language models. The system retrieves relevant context before generating responses.

### Vector Embeddings

Text is converted into high-dimensional vectors using embedding models like text-embedding-3-small.

## Team Contacts

For questions about RAG implementation:
- Email: rag-team@example.com
- Slack: #rag-support

## Implementation Table

| Component | Technology | Status |
|-----------|------------|--------|
| Embeddings | OpenAI | Active |
| Vector DB | Qdrant | Active |
| LLM | GPT-4 | Active |
`;

      const response = await request(app.getHttpServer())
        .post('/api/ingest/manual')
        .set('X-User-ID', 'test@example.com')
        .send({
          content: testContent,
        })
        .expect(201);

      expect(response.body).toHaveProperty('sessionId');
      sessionId = response.body.sessionId;
    });

    it('should publish session with v2 schema', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/session/${sessionId}/publish`)
        .set('X-User-ID', 'test@example.com')
        .send({
          targetCollectionId: collectionId,
        })
        .expect(201);

      expect(response.body.sessionId).toBe(sessionId);
      expect(response.body.collectionId).toBe(collectionId);
      expect(response.body.publishedChunks).toBeGreaterThan(0);

      console.log(`Published ${response.body.publishedChunks} chunks`);
    });

    it('should search and return v2 structured metadata', async () => {
      // Wait a moment for Qdrant indexing
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await request(app.getHttpServer())
        .post('/api/search')
        .set('X-User-ID', 'test@example.com')
        .send({
          query: 'What is RAG and how does it work?',
          collectionId,
          limit: 5,
        })
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('total');
      expect(response.body.query).toBe('What is RAG and how does it work?');
      expect(response.body.results.length).toBeGreaterThan(0);

      // Verify v2 structure
      const firstResult = response.body.results[0];

      // Check top-level fields
      expect(firstResult).toHaveProperty('id');
      expect(firstResult).toHaveProperty('score');
      expect(firstResult).toHaveProperty('content');
      expect(firstResult).toHaveProperty('doc');
      expect(firstResult).toHaveProperty('chunk');
      expect(firstResult).toHaveProperty('tags');

      // Check doc metadata
      expect(firstResult.doc).toHaveProperty('url');
      expect(firstResult.doc).toHaveProperty('title');
      expect(firstResult.doc).toHaveProperty('source_type');
      expect(firstResult.doc.source_type).toBe('manual');
      expect(firstResult.doc).toHaveProperty('revision');

      // Check chunk metadata
      expect(firstResult.chunk).toHaveProperty('type');
      expect(['knowledge', 'navigation', 'table_row']).toContain(firstResult.chunk.type);
      expect(firstResult.chunk).toHaveProperty('heading_path');
      expect(Array.isArray(firstResult.chunk.heading_path)).toBe(true);
      expect(firstResult.chunk).toHaveProperty('section');
      expect(firstResult.chunk).toHaveProperty('lang');
      expect(['en', 'ru', 'mixed']).toContain(firstResult.chunk.lang);

      // Check tags
      expect(Array.isArray(firstResult.tags)).toBe(true);

      console.log('Sample result structure:', JSON.stringify(firstResult, null, 2));
    });

    it('should exclude navigation chunks by default', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/search')
        .set('X-User-ID', 'test@example.com')
        .send({
          query: 'vector embeddings implementation',
          collectionId,
          limit: 10,
        })
        .expect(200);

      expect(response.body.results.length).toBeGreaterThan(0);

      // Verify no navigation chunks
      const hasNavigation = response.body.results.some(
        (r: any) => r.chunk.type === 'navigation'
      );
      expect(hasNavigation).toBe(false);

      console.log('Chunk types returned:',
        response.body.results.map((r: any) => r.chunk.type)
      );
    });

    it('should include navigation chunks when query has navigation intent', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/search')
        .set('X-User-ID', 'test@example.com')
        .send({
          query: 'contact information for RAG team',
          collectionId,
          limit: 10,
        })
        .expect(200);

      expect(response.body.results.length).toBeGreaterThan(0);

      // May include navigation chunks if classifier detects intent
      // (This is probabilistic with GPT-4o-mini classifier)
      console.log('Navigation query results:',
        response.body.results.map((r: any) => ({
          type: r.chunk.type,
          preview: r.content.substring(0, 50)
        }))
      );
    });

    it('should filter by chunk type', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/search')
        .set('X-User-ID', 'test@example.com')
        .send({
          query: 'components technology',
          collectionId,
          limit: 10,
          filters: {
            chunk_types: ['table_row'],
          },
        })
        .expect(200);

      if (response.body.results.length > 0) {
        // If we got results, they should all be table_row type
        response.body.results.forEach((result: any) => {
          expect(result.chunk.type).toBe('table_row');
        });

        console.log('Table row results:', response.body.results.length);
      } else {
        console.log('No table row chunks found (may need different query)');
      }
    });

    it('should filter by source type', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/search')
        .set('X-User-ID', 'test@example.com')
        .send({
          query: 'RAG implementation',
          collectionId,
          limit: 10,
          filters: {
            source_types: ['manual'],
          },
        })
        .expect(200);

      expect(response.body.results.length).toBeGreaterThan(0);

      // All results should be from manual source
      response.body.results.forEach((result: any) => {
        expect(result.doc.source_type).toBe('manual');
      });
    });

    it('should return structured heading paths', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/search')
        .set('X-User-ID', 'test@example.com')
        .send({
          query: 'vector embeddings',
          collectionId,
          limit: 5,
        })
        .expect(200);

      expect(response.body.results.length).toBeGreaterThan(0);

      // Check that heading_path provides document structure
      const resultsWithHeadings = response.body.results.filter(
        (r: any) => r.chunk.heading_path && r.chunk.heading_path.length > 0
      );

      if (resultsWithHeadings.length > 0) {
        const sample = resultsWithHeadings[0];
        console.log('Sample heading path:', sample.chunk.heading_path);
        console.log('Formatted section:', sample.chunk.section);

        // Heading path should be an array of strings
        expect(Array.isArray(sample.chunk.heading_path)).toBe(true);
        sample.chunk.heading_path.forEach((heading: any) => {
          expect(typeof heading).toBe('string');
        });
      }
    });

    it('should clean up - delete collection', async () => {
      await request(app.getHttpServer())
        .delete(`/api/collections/${collectionId}`)
        .set('X-User-ID', 'test@example.com')
        .set('X-User-Role', 'DEV')
        .expect(204);

      // Verify collection is deleted
      await request(app.getHttpServer())
        .get(`/api/collections/${collectionId}`)
        .set('X-User-ID', 'test@example.com')
        .expect(404);
    });
  });

  describe('V2 Schema Validation', () => {
    let validationCollectionId: string;
    let validationSessionId: string;

    beforeAll(async () => {
      // Create collection for validation tests
      const colResponse = await request(app.getHttpServer())
        .post('/api/collections')
        .set('X-User-ID', 'test@example.com')
        .set('X-User-Role', 'DEV')
        .send({
          name: 'V2 Validation Collection',
          description: 'Testing v2 schema validation',
        })
        .expect(201);

      validationCollectionId = colResponse.body.id;
    });

    afterAll(async () => {
      // Clean up
      await request(app.getHttpServer())
        .delete(`/api/collections/${validationCollectionId}`)
        .set('X-User-ID', 'test@example.com')
        .set('X-User-Role', 'DEV')
        .expect(204);
    });

    it('should handle content with Russian language', async () => {
      const russianContent = `
# Введение в RAG

RAG (Retrieval-Augmented Generation) - это мощная техника для улучшения ответов LLM с использованием внешних знаний.

## Основные концепции

Генерация с дополненным поиском объединяет векторный поиск с языковыми моделями.
`;

      // Ingest
      const ingestResponse = await request(app.getHttpServer())
        .post('/api/ingest/manual')
        .set('X-User-ID', 'test@example.com')
        .send({
          content: russianContent,
        })
        .expect(201);

      validationSessionId = ingestResponse.body.sessionId;

      // Publish
      await request(app.getHttpServer())
        .post(`/api/session/${validationSessionId}/publish`)
        .set('X-User-ID', 'test@example.com')
        .send({
          targetCollectionId: validationCollectionId,
        })
        .expect(201);

      // Wait for indexing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Search
      const searchResponse = await request(app.getHttpServer())
        .post('/api/search')
        .set('X-User-ID', 'test@example.com')
        .send({
          query: 'RAG концепции',
          collectionId: validationCollectionId,
          limit: 5,
        })
        .expect(200);

      expect(searchResponse.body.results.length).toBeGreaterThan(0);

      // Verify language detection
      const russianChunks = searchResponse.body.results.filter(
        (r: any) => r.chunk.lang === 'ru'
      );
      expect(russianChunks.length).toBeGreaterThan(0);

      console.log('Russian chunks detected:', russianChunks.length);
    });

    it('should handle mixed language content', async () => {
      const mixedContent = `
# Introduction / Введение

This document contains both English and Russian text. Этот документ содержит текст на английском и русском языках.

## Technical Details

We use RAG for knowledge retrieval. Мы используем RAG для поиска знаний.
`;

      // Ingest and publish
      const ingestResponse = await request(app.getHttpServer())
        .post('/api/ingest/manual')
        .set('X-User-ID', 'test@example.com')
        .send({
          content: mixedContent,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/session/${ingestResponse.body.sessionId}/publish`)
        .set('X-User-ID', 'test@example.com')
        .send({
          targetCollectionId: validationCollectionId,
        })
        .expect(201);

      // Wait and search
      await new Promise(resolve => setTimeout(resolve, 1000));

      const searchResponse = await request(app.getHttpServer())
        .post('/api/search')
        .set('X-User-ID', 'test@example.com')
        .send({
          query: 'technical details',
          collectionId: validationCollectionId,
          limit: 5,
        })
        .expect(200);

      expect(searchResponse.body.results.length).toBeGreaterThan(0);

      // Check language classification (could be 'mixed' or 'ru' or 'en')
      searchResponse.body.results.forEach((result: any) => {
        expect(['en', 'ru', 'mixed']).toContain(result.chunk.lang);
      });

      console.log('Language distribution:',
        searchResponse.body.results.map((r: any) => r.chunk.lang)
      );
    });
  });
});
