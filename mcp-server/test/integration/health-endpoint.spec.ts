import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { createServer, Server, IncomingMessage, ServerResponse } from 'node:http';
import axios from 'axios';
import { checkLiveness, checkReadiness } from '../../src/health/health.js';

vi.mock('axios');

/**
 * Integration test: spins up a minimal HTTP server with health endpoints
 * and validates responses via fetch.
 */

function createHealthServer(): Server {
    return createServer(async (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

        if (req.method === 'GET' && (url.pathname === '/health/live' || url.pathname === '/health/liveness')) {
            const result = checkLiveness();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
        }

        if (req.method === 'GET' && (url.pathname === '/health/ready' || url.pathname === '/health/readiness' || url.pathname === '/health')) {
            const result = await checkReadiness();
            const statusCode = result.status === 'ok' ? 200 : 503;
            res.writeHead(statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
        }

        res.writeHead(404);
        res.end('Not Found');
    });
}

describe('Health endpoints (integration)', () => {
    let server: Server;
    let baseUrl: string;

    beforeAll(async () => {
        server = createHealthServer();
        await new Promise<void>((resolve) => {
            server.listen(0, '127.0.0.1', () => resolve());
        });
        const address = server.address();
        if (typeof address === 'object' && address !== null) {
            baseUrl = `http://127.0.0.1:${address.port}`;
        }
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterAll(async () => {
        await new Promise<void>((resolve, reject) => {
            server.close((err?: Error | null) => (err ? reject(err) : resolve()));
        });
    });

    it('GET /health/live should return 200 with ok status', async () => {
        const res = await fetch(`${baseUrl}/health/live`);

        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.status).toBe('ok');
    });

    it('GET /health/liveness should return 200 (alias)', async () => {
        const res = await fetch(`${baseUrl}/health/liveness`);

        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.status).toBe('ok');
    });

    it('GET /health/ready should return 200 when backend is reachable', async () => {
        vi.mocked(axios.get).mockResolvedValue({ status: 200, data: { status: 'ok' } });

        const res = await fetch(`${baseUrl}/health/ready`);

        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.status).toBe('ok');
        expect(body.details['kms-api'].status).toBe('up');
    });

    it('GET /health/ready should return 503 when backend is unreachable', async () => {
        vi.mocked(axios.get).mockRejectedValue(new Error('ECONNREFUSED'));

        const res = await fetch(`${baseUrl}/health/ready`);

        expect(res.status).toBe(503);

        const body = await res.json();
        expect(body.status).toBe('error');
        expect(body.details['kms-api'].status).toBe('down');
    });

    it('GET /health should alias to readiness', async () => {
        vi.mocked(axios.get).mockResolvedValue({ status: 200, data: { status: 'ok' } });

        const res = await fetch(`${baseUrl}/health`);

        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.status).toBe('ok');
        expect(body.details).toHaveProperty('kms-api');
    });

    it('GET /unknown should return 404', async () => {
        const res = await fetch(`${baseUrl}/unknown`);

        expect(res.status).toBe(404);
    });
});
