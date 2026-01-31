import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Collections', () => {
    it('GET /api/collections should return collection list', () => {
      return request(app.getHttpServer())
        .get('/api/collections')
        .set('X-User-ID', 'test@example.com')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('collections');
          expect(res.body).toHaveProperty('total');
        });
    });

    it('POST /api/collections should require DEV/ML role', () => {
      return request(app.getHttpServer())
        .post('/api/collections')
        .set('X-User-ID', 'test@example.com')
        .set('X-User-Role', 'L2')
        .send({ name: 'Test Collection' })
        .expect(403);
    });
  });
});
