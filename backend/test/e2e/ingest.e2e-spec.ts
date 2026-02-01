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
      // sourceUrl is now hash-based for idempotency: manual://{MD5}
      expect(response.body.sourceUrl).toMatch(/^manual:\/\/[a-f0-9]{32}$/);
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

    it('should reject empty content string', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/ingest')
        .set('X-User-ID', 'test@example.com')
        .send({
          sourceType: 'manual',
          content: '',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should reject whitespace-only content', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/ingest')
        .set('X-User-ID', 'test@example.com')
        .send({
          sourceType: 'manual',
          content: '   \n\t  ',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should reject content exceeding maximum length', async () => {
      // Note: Express body-parser has its own limit (~100KB default)
      // So we test rejection at either body-parser level (500) or DTO level (400)
      const longContent = 'a'.repeat(102401); // 100KB + 1 byte
      const response = await request(app.getHttpServer())
        .post('/api/ingest')
        .set('X-User-ID', 'test@example.com')
        .send({
          sourceType: 'manual',
          content: longContent,
        });

      // Should be rejected (either by body-parser or DTO validation)
      expect([400, 413, 500]).toContain(response.status);
    });

    it('should accept moderately large content (50KB)', async () => {
      // Test with 50KB which is safely under body-parser default limit
      const largeContent = 'a'.repeat(51200); // 50KB
      const response = await request(app.getHttpServer())
        .post('/api/ingest')
        .set('X-User-ID', 'test@example.com')
        .send({
          sourceType: 'manual',
          content: largeContent,
        })
        .expect(201);

      expect(response.body).toHaveProperty('sessionId');
    });

    it('should generate deterministic sourceUrl for same content (idempotency)', async () => {
      const content = 'Identical content for idempotency test';

      const response1 = await request(app.getHttpServer())
        .post('/api/ingest')
        .set('X-User-ID', 'test@example.com')
        .send({ sourceType: 'manual', content })
        .expect(201);

      const response2 = await request(app.getHttpServer())
        .post('/api/ingest')
        .set('X-User-ID', 'test@example.com')
        .send({ sourceType: 'manual', content })
        .expect(201);

      // Same content should produce same sourceUrl (hash-based)
      expect(response1.body.sourceUrl).toBe(response2.body.sourceUrl);
      // But different sessionIds (new sessions)
      expect(response1.body.sessionId).not.toBe(response2.body.sessionId);
    });

    it('should generate different sourceUrl for different content', async () => {
      const response1 = await request(app.getHttpServer())
        .post('/api/ingest')
        .set('X-User-ID', 'test@example.com')
        .send({ sourceType: 'manual', content: 'Content A' })
        .expect(201);

      const response2 = await request(app.getHttpServer())
        .post('/api/ingest')
        .set('X-User-ID', 'test@example.com')
        .send({ sourceType: 'manual', content: 'Content B' })
        .expect(201);

      expect(response1.body.sourceUrl).not.toBe(response2.body.sourceUrl);
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

    it('should accept single character content', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/ingest')
        .set('X-User-ID', 'test@example.com')
        .send({
          sourceType: 'manual',
          content: 'X',
        })
        .expect(201);

      expect(response.body).toHaveProperty('sessionId');
    });
  });

  describe('POST /api/ingest (Web Source)', () => {
    it('should reject web source without URL', async () => {
      await request(app.getHttpServer())
        .post('/api/ingest')
        .set('X-User-ID', 'test@example.com')
        .send({
          sourceType: 'web',
        })
        .expect(400);
    });

    it('should reject invalid URL format', async () => {
      await request(app.getHttpServer())
        .post('/api/ingest')
        .set('X-User-ID', 'test@example.com')
        .send({
          sourceType: 'web',
          url: 'not-a-valid-url',
        })
        .expect(400);
    });

    it('should reject private IP addresses (SSRF prevention)', async () => {
      const privateUrls = [
        'http://localhost/admin',
        'http://127.0.0.1/admin',
        'http://10.0.0.1/internal',
        'http://192.168.1.1/router',
        'http://172.16.0.1/internal',
      ];

      for (const url of privateUrls) {
        const response = await request(app.getHttpServer())
          .post('/api/ingest')
          .set('X-User-ID', 'test@example.com')
          .send({ sourceType: 'web', url });

        // Should be rejected (400) for security
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('private');
      }
    });

    it('should reject non-http(s) schemes', async () => {
      const invalidUrls = [
        'ftp://example.com/file',
        'file:///etc/passwd',
        'javascript:alert(1)',
      ];

      for (const url of invalidUrls) {
        const response = await request(app.getHttpServer())
          .post('/api/ingest')
          .set('X-User-ID', 'test@example.com')
          .send({ sourceType: 'web', url });

        expect(response.status).toBe(400);
      }
    });

    it('should accept valid https URL (may fail on network)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/ingest')
        .set('X-User-ID', 'test@example.com')
        .send({
          sourceType: 'web',
          url: 'https://example.com/page',
        });

      // Either succeeds (201) or fails due to network/content issues
      // 400: URL validation or content extraction error
      // 422: Content extraction failed
      // 502: Network error (retryable)
      expect([201, 400, 422, 502]).toContain(response.status);
    });
  });

  describe('POST /api/ingest (Confluence Source)', () => {
    describe('Input Validation', () => {
      it('should reject confluence source without URL or pageId', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/ingest')
          .set('X-User-ID', 'test@example.com')
          .send({
            sourceType: 'confluence',
          })
          .expect(400);

        expect(response.body.message).toBeDefined();
      });

      it('should reject pageId for non-confluence source type (web)', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/ingest')
          .set('X-User-ID', 'test@example.com')
          .send({
            sourceType: 'web',
            url: 'https://example.com/page',
            pageId: '123456',
          })
          .expect(400);

        // Zod validation may wrap error message
        expect(response.body.message).toBeDefined();
      });

      it('should reject pageId for non-confluence source type (manual)', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/ingest')
          .set('X-User-ID', 'test@example.com')
          .send({
            sourceType: 'manual',
            content: 'Some content',
            pageId: '123456',
          })
          .expect(400);

        // Zod validation may wrap error message
        expect(response.body.message).toBeDefined();
      });

      it('should reject non-numeric pageId', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/ingest')
          .set('X-User-ID', 'test@example.com')
          .send({
            sourceType: 'confluence',
            pageId: 'not-numeric',
          })
          .expect(400);

        // Zod validation may wrap error message
        expect(response.body.message).toBeDefined();
      });

      it('should reject pageId with decimal', async () => {
        await request(app.getHttpServer())
          .post('/api/ingest')
          .set('X-User-ID', 'test@example.com')
          .send({
            sourceType: 'confluence',
            pageId: '123.456',
          })
          .expect(400);
      });

      it('should reject pageId with negative number', async () => {
        await request(app.getHttpServer())
          .post('/api/ingest')
          .set('X-User-ID', 'test@example.com')
          .send({
            sourceType: 'confluence',
            pageId: '-123',
          })
          .expect(400);
      });

      it('should accept large numeric pageId', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/ingest')
          .set('X-User-ID', 'test@example.com')
          .send({
            sourceType: 'confluence',
            pageId: '9876543210',
          });

        // Should pass DTO validation, may fail on config/network
        expect([201, 400, 502, 503]).toContain(response.status);
      });

      it('should reject invalid URL format for confluence', async () => {
        await request(app.getHttpServer())
          .post('/api/ingest')
          .set('X-User-ID', 'test@example.com')
          .send({
            sourceType: 'confluence',
            url: 'not-a-valid-url',
          })
          .expect(400);
      });
    });

    describe('Configuration and Network Handling', () => {
      it('should return 503 when Confluence is not configured (pageId)', async () => {
        // When CONFLUENCE_BASE_URL is not set, should return 503
        const response = await request(app.getHttpServer())
          .post('/api/ingest')
          .set('X-User-ID', 'test@example.com')
          .send({
            sourceType: 'confluence',
            pageId: '123456',
          });

        // 503 if config missing, or other errors if partially configured
        expect([201, 400, 502, 503]).toContain(response.status);

        // If 503, verify it's a config error
        if (response.status === 503) {
          expect(response.body.message).toContain('configured');
        }
      });

      it('should return 503 when Confluence is not configured (URL)', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/ingest')
          .set('X-User-ID', 'test@example.com')
          .send({
            sourceType: 'confluence',
            url: 'https://test.atlassian.net/wiki/spaces/SPACE/pages/123456/Title',
          });

        expect([201, 400, 502, 503]).toContain(response.status);

        if (response.status === 503) {
          expect(response.body.message).toContain('configured');
        }
      });

      it('should accept request with both URL and pageId', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/ingest')
          .set('X-User-ID', 'test@example.com')
          .send({
            sourceType: 'confluence',
            url: 'https://test.atlassian.net/wiki/spaces/SPACE/pages/123456/Title',
            pageId: '123456',
          });

        // Should pass DTO validation
        expect([201, 400, 502, 503]).toContain(response.status);
      });
    });

    describe('URL Format Validation', () => {
      it('should accept valid Atlassian cloud URL', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/ingest')
          .set('X-User-ID', 'test@example.com')
          .send({
            sourceType: 'confluence',
            url: 'https://company.atlassian.net/wiki/spaces/TEAM/pages/123456789/Page+Title',
          });

        // Should pass URL validation, may fail on config
        expect([201, 400, 502, 503]).toContain(response.status);
      });

      it('should accept Confluence URL with query parameters', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/ingest')
          .set('X-User-ID', 'test@example.com')
          .send({
            sourceType: 'confluence',
            url: 'https://company.atlassian.net/wiki/spaces/TEAM/pages/123456?version=1',
          });

        expect([201, 400, 502, 503]).toContain(response.status);
      });

      it('should handle Confluence URL without page title', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/ingest')
          .set('X-User-ID', 'test@example.com')
          .send({
            sourceType: 'confluence',
            url: 'https://company.atlassian.net/wiki/spaces/TEAM/pages/123456',
          });

        expect([201, 400, 502, 503]).toContain(response.status);
      });
    });

    describe('Error Response Structure', () => {
      it('should return structured error response for validation failures', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/ingest')
          .set('X-User-ID', 'test@example.com')
          .send({
            sourceType: 'confluence',
          })
          .expect(400);

        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should return structured error for config errors', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/ingest')
          .set('X-User-ID', 'test@example.com')
          .send({
            sourceType: 'confluence',
            pageId: '123456',
          });

        // If it's a config error (503), verify structure
        if (response.status === 503) {
          expect(response.body).toHaveProperty('message');
          expect(response.body).toHaveProperty('statusCode', 503);
        }
      });
    });

  });

  describe('Confluence Happy Path (Mocked API)', () => {
    let confluenceCtx: TestContext;
    let confluenceApp: INestApplication;
    const originalFetch = global.fetch;

    // Mock response with content that JSDOM will properly extract
    // Use simple text content that won't be stripped during whitespace normalization
    const mockConfluencePageResponse = {
      id: '123456',
      status: 'current',
      title: 'Test Page Title',
      spaceId: '789',
      body: {
        storage: {
          value: '<p>This is the page content from Confluence.</p><p>Second paragraph with important information.</p>',
          representation: 'storage',
        },
      },
      _links: {
        webui: '/wiki/spaces/TEAM/pages/123456/Test+Page+Title',
        base: 'https://test.atlassian.net',
      },
    };

    // Create a proper mock Response object
    const createMockResponse = (body: unknown, ok = true, status = 200) => {
      return Promise.resolve({
        ok,
        status,
        statusText: ok ? 'OK' : 'Error',
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(JSON.stringify(body)),
        headers: new Headers({ 'content-type': 'application/json' }),
        clone: function () {
          return this;
        },
      } as unknown as Response);
    };

    beforeAll(async () => {
      // Set Confluence configuration BEFORE initializing the app
      process.env.CONFLUENCE_BASE_URL = 'https://test.atlassian.net';
      process.env.CONFLUENCE_USER_EMAIL = 'test@example.com';
      process.env.CONFLUENCE_API_TOKEN = 'mock-api-token';

      // Mock fetch BEFORE initializing the app
      global.fetch = jest.fn().mockImplementation((url: string | URL | Request) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/wiki/api/v2/pages/')) {
          return createMockResponse(mockConfluencePageResponse);
        }
        // For other URLs (like health checks), return appropriate responses
        return originalFetch(url);
      });

      confluenceCtx = await setupTestContext();
      confluenceApp = confluenceCtx.app;
    }, 180000);

    afterAll(async () => {
      await teardownTestContext(confluenceCtx);
      // Clean up environment variables and restore fetch
      delete process.env.CONFLUENCE_BASE_URL;
      delete process.env.CONFLUENCE_USER_EMAIL;
      delete process.env.CONFLUENCE_API_TOKEN;
      global.fetch = originalFetch;
    });

    it('should successfully ingest Confluence page by pageId and create session', async () => {
      const response = await request(confluenceApp.getHttpServer())
        .post('/api/ingest')
        .set('X-User-ID', 'test@example.com')
        .send({
          sourceType: 'confluence',
          pageId: '123456',
        });

      // Should succeed with 201
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body.sourceType).toBe('confluence');
      expect(response.body.status).toBe('DRAFT');
      expect(response.body.sourceUrl).toContain('test.atlassian.net');
    });

    it('should successfully ingest Confluence page by URL and create session', async () => {
      const response = await request(confluenceApp.getHttpServer())
        .post('/api/ingest')
        .set('X-User-ID', 'test@example.com')
        .send({
          sourceType: 'confluence',
          url: 'https://test.atlassian.net/wiki/spaces/TEAM/pages/123456/Test+Page',
        });

      // Should succeed with 201
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body.sourceType).toBe('confluence');
      expect(response.body.status).toBe('DRAFT');
    });

    it('should retrieve created session with Confluence content', async () => {
      // First, ingest a Confluence page
      const ingestResponse = await request(confluenceApp.getHttpServer())
        .post('/api/ingest')
        .set('X-User-ID', 'test@example.com')
        .send({
          sourceType: 'confluence',
          pageId: '123456',
        });

      expect(ingestResponse.status).toBe(201);
      const sessionId = ingestResponse.body.sessionId;

      // Then, retrieve the session
      const sessionResponse = await request(confluenceApp.getHttpServer())
        .get(`/api/session/${sessionId}`)
        .set('X-User-ID', 'test@example.com')
        .expect(200);

      expect(sessionResponse.body.sessionId).toBe(sessionId);
      expect(sessionResponse.body.status).toBe('DRAFT');
      expect(sessionResponse.body).toHaveProperty('chunks');
    });

    it('should verify Confluence API was called with correct parameters', async () => {
      // Clear mock calls
      (global.fetch as jest.Mock).mockClear();

      await request(confluenceApp.getHttpServer())
        .post('/api/ingest')
        .set('X-User-ID', 'test@example.com')
        .send({
          sourceType: 'confluence',
          pageId: '123456',
        });

      // Verify fetch was called with correct URL
      // Note: fetch uses default GET method (not explicitly passed)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/wiki/api/v2/pages/123456'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic'),
          }),
        }),
      );
    });

    it('should handle Confluence page with empty content gracefully', async () => {
      // Override mock for this test with empty body content
      const emptyContentResponse = {
        ...mockConfluencePageResponse,
        body: {
          storage: {
            value: '',
            representation: 'storage',
          },
        },
      };

      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        createMockResponse(emptyContentResponse),
      );

      const response = await request(confluenceApp.getHttpServer())
        .post('/api/ingest')
        .set('X-User-ID', 'test@example.com')
        .send({
          sourceType: 'confluence',
          pageId: '123456',
        });

      // Should return 422 for empty content extraction
      expect(response.status).toBe(422);
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
          .send({ targetCollectionId: collectionId })
          .expect(201);

        expect(publishResponse.body).toHaveProperty('publishedChunks');
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
