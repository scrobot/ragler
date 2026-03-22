import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { AppModule } from '../../src/app.module';
import { ZodValidationPipe } from 'nestjs-zod';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

export interface TestContainers {
  redis: StartedRedisContainer;
  qdrant: StartedTestContainer;
}

export interface TestContext {
  app: INestApplication;
  containers: TestContainers;
}

const QDRANT_IMAGE = 'qdrant/qdrant:v1.13.0';
const REDIS_IMAGE = 'redis:7-alpine';

export async function startContainers(): Promise<TestContainers> {
  console.log('Starting test containers...');

  const [redis, qdrant] = await Promise.all([
    new RedisContainer(REDIS_IMAGE).start(),
    new GenericContainer(QDRANT_IMAGE)
      .withExposedPorts(6333, 6334)
      .withWaitStrategy(Wait.forHttp('/readyz', 6333).forStatusCode(200))
      .withStartupTimeout(120_000)
      .start(),
  ]);

  console.log(`Redis started at ${redis.getHost()}:${redis.getPort()}`);
  console.log(
    `Qdrant started at ${qdrant.getHost()}:${qdrant.getMappedPort(6333)}`,
  );

  return { redis, qdrant };
}

export async function stopContainers(containers: TestContainers): Promise<void> {
  console.log('Stopping test containers...');
  await Promise.all([containers.redis.stop(), containers.qdrant.stop()]);
}

export async function createTestApp(
  containers: TestContainers,
): Promise<INestApplication> {
  const redisHost = containers.redis.getHost();
  const redisPort = containers.redis.getPort();
  const qdrantUrl = `http://${containers.qdrant.getHost()}:${containers.qdrant.getMappedPort(6333)}`;

  // Set environment variables for the test
  process.env.REDIS_HOST = redisHost;
  process.env.REDIS_PORT = String(redisPort);
  process.env.QDRANT_URL = qdrantUrl;
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key';
  process.env.NODE_ENV = 'test';

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();

  return app;
}

export async function setupTestContext(): Promise<TestContext> {
  const containers = await startContainers();
  const app = await createTestApp(containers);
  return { app, containers };
}

export async function teardownTestContext(ctx: TestContext): Promise<void> {
  await ctx.app.close();
  await stopContainers(ctx.containers);
}
