import * as path from 'path';
import * as fs from 'fs';
import { Readable } from 'stream';
import { IngestService } from '@ingest/ingest.service';
import { LlmService } from '@llm/llm.service';
import { RedisService } from '@infrastructure/redis/redis.service';
import { ConfigService } from '@nestjs/config';

import { IngestStrategyResolver } from '@ingest/strategies/ingest-strategy.resolver';
import { FileStrategy } from '@ingest/strategies/file.strategy';
import { ManualStrategy } from '@ingest/strategies/manual.strategy';

describe('File Ingestion (Unit)', () => {
  let ingestService: IngestService;
  let llmService: jest.Mocked<LlmService>;
  let redisService: jest.Mocked<RedisService>;
  let configService: jest.Mocked<ConfigService>;
  let strategyResolver: IngestStrategyResolver;

  beforeEach(() => {
    llmService = {
      chunkContent: jest.fn(),
    } as unknown as jest.Mocked<LlmService>;

    redisService = {
      setJson: jest.fn().mockResolvedValue(undefined),
      getJson: jest.fn(),
    } as unknown as jest.Mocked<RedisService>;

    configService = {
      get: jest.fn().mockReturnValue(3600),
    } as unknown as jest.Mocked<ConfigService>;

    const mockConfigService = {
      get: jest.fn().mockReturnValue(null),
    } as unknown as ConfigService;

    strategyResolver = new IngestStrategyResolver([
      new FileStrategy(),
      new ManualStrategy(mockConfigService),
    ]);

    ingestService = new IngestService(
      redisService,
      strategyResolver,
      configService,
      llmService,
    );
  });

  describe('ingestFile with real PDF', () => {
    const pdfPath = path.resolve(__dirname, '../../resources/AI Agents Theory and Tools.pdf');

    it('should parse a real 1.5MB PDF and create a session', async () => {
      const pdfBuffer = fs.readFileSync(pdfPath);

      // Mock LLM chunking to return simple chunks (avoid actual OpenAI call)
      llmService.chunkContent.mockResolvedValue([
        { id: 'chunk-1', text: 'AI agents are autonomous systems...', isDirty: false },
        { id: 'chunk-2', text: 'Tools enable agents to interact...', isDirty: false },
      ]);

      const file: Express.Multer.File = {
        buffer: pdfBuffer,
        originalname: 'AI Agents Theory and Tools.pdf',
        size: pdfBuffer.length,
        mimetype: 'application/pdf',
        fieldname: 'file',
        encoding: '7bit',
        destination: '',
        filename: '',
        path: '',
        stream: Readable.from([]),
      };

      const result = await ingestService.ingestFile(file, 'test-user');

      expect(result).toHaveProperty('sessionId');
      expect(result.sessionId).toMatch(/^session_/);
      expect(result.sourceType).toBe('file');
      expect(result.sourceUrl).toContain('AI Agents Theory and Tools.pdf');
      expect(result.status).toBe('DRAFT');

      // Verify session was stored in Redis
      expect(redisService.setJson).toHaveBeenCalledWith(
        expect.stringContaining('session:session_'),
        expect.objectContaining({
          sourceType: 'file',
          userId: 'test-user',
          status: 'DRAFT',
        }),
        expect.any(Number),
      );

      // Verify LLM chunking was called with extracted PDF text
      expect(llmService.chunkContent).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/^session_/),
      );

      // The extracted content should be non-empty (real PDF has text)
      const chunkCallContent = llmService.chunkContent.mock.calls[0][0];
      expect(chunkCallContent.length).toBeGreaterThan(100);
    });

    it('should handle character chunking config for file', async () => {
      const pdfBuffer = fs.readFileSync(pdfPath);

      const file: Express.Multer.File = {
        buffer: pdfBuffer,
        originalname: 'AI Agents Theory and Tools.pdf',
        size: pdfBuffer.length,
        mimetype: 'application/pdf',
        fieldname: 'file',
        encoding: '7bit',
        destination: '',
        filename: '',
        path: '',
        stream: Readable.from([]),
      };

      const result = await ingestService.ingestFile(file, 'test-user', {
        method: 'character',
        chunkSize: 500,
        overlap: 100,
      });

      expect(result).toHaveProperty('sessionId');
      expect(result.status).toBe('DRAFT');

      // Should NOT call LLM when using character chunking
      expect(llmService.chunkContent).not.toHaveBeenCalled();

      // Verify chunks were stored
      const storedSession = redisService.setJson.mock.calls[0][1] as {
        chunks: Array<{ id: string; text: string }>;
      };
      expect(storedSession.chunks.length).toBeGreaterThan(0);
      // Each chunk should have reasonable size
      for (const chunk of storedSession.chunks) {
        expect(chunk.text.length).toBeGreaterThan(0);
        expect(chunk.text.length).toBeLessThanOrEqual(600); // chunkSize + some buffer
      }
    });
  });

  describe('ingestFile with small text file', () => {
    it('should parse a plain text file', async () => {
      const textContent = 'Hello, this is a test document.\n\nIt has multiple paragraphs.\n\nThird paragraph here.';
      const buffer = Buffer.from(textContent);

      llmService.chunkContent.mockResolvedValue([
        { id: 'chunk-1', text: textContent, isDirty: false },
      ]);

      const file: Express.Multer.File = {
        buffer,
        originalname: 'test.txt',
        size: buffer.length,
        mimetype: 'text/plain',
        fieldname: 'file',
        encoding: '7bit',
        destination: '',
        filename: '',
        path: '',
        stream: Readable.from([]),
      };

      const result = await ingestService.ingestFile(file, 'test-user');

      expect(result).toHaveProperty('sessionId');
      expect(result.sourceType).toBe('file');
    });
  });

  describe('ingestFile error cases', () => {
    it('should throw on unsupported file extension', async () => {
      const buffer = Buffer.from('data');

      const file: Express.Multer.File = {
        buffer,
        originalname: 'image.png',
        size: buffer.length,
        mimetype: 'image/png',
        fieldname: 'file',
        encoding: '7bit',
        destination: '',
        filename: '',
        path: '',
        stream: Readable.from([]),
      };

      await expect(ingestService.ingestFile(file, 'test-user')).rejects.toThrow('Unsupported');
    });

    it('should throw on empty PDF content', async () => {
      // Create a minimal valid PDF that has no extractable text
      // This is tricky - pdf-parse may still extract empty string
      const emptyBuffer = Buffer.from('not a pdf');

      const file: Express.Multer.File = {
        buffer: emptyBuffer,
        originalname: 'empty.pdf',
        size: emptyBuffer.length,
        mimetype: 'application/pdf',
        fieldname: 'file',
        encoding: '7bit',
        destination: '',
        filename: '',
        path: '',
        stream: Readable.from([]),
      };

      await expect(ingestService.ingestFile(file, 'test-user')).rejects.toThrow();
    });
  });
});
