import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { checkLiveness, checkReadiness } from '../../src/health/health.js';

vi.mock('axios');

describe('Health checks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('checkLiveness', () => {
        it('should always return ok status', () => {
            const result = checkLiveness();

            expect(result).toEqual({
                status: 'ok',
                info: {},
                error: {},
                details: {},
            });
        });
    });

    describe('checkReadiness', () => {
        it('should return ok when backend API is reachable', async () => {
            vi.mocked(axios.get).mockResolvedValue({ status: 200, data: { status: 'ok' } });

            const result = await checkReadiness();

            expect(result.status).toBe('ok');
            expect(result.details['kms-api'].status).toBe('up');
            expect(result.info['kms-api'].status).toBe('up');
            expect(result.error).toEqual({});
            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('/api/health'),
                expect.objectContaining({ timeout: 5000 }),
            );
        });

        it('should return error when backend API is unreachable', async () => {
            vi.mocked(axios.get).mockRejectedValue(new Error('ECONNREFUSED'));

            const result = await checkReadiness();

            expect(result.status).toBe('error');
            expect(result.details['kms-api'].status).toBe('down');
            expect(result.details['kms-api'].message).toBe('ECONNREFUSED');
            expect(result.error['kms-api'].status).toBe('down');
            expect(result.info).toEqual({});
        });

        it('should return error with unknown message for non-Error throws', async () => {
            vi.mocked(axios.get).mockRejectedValue('some string error');

            const result = await checkReadiness();

            expect(result.status).toBe('error');
            expect(result.details['kms-api'].message).toBe('Unknown error');
        });
    });
});
