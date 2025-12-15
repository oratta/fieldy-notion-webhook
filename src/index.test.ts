import { describe, expect, it, vi } from 'vitest';
import app from './index';

// Mock the notion module
vi.mock('./notion', () => {
    return {
        NotionService: class {
            constructor(apiKey: string, dbId: string) { }
            async createTranscriptionPage(data: any) {
                return Promise.resolve();
            }
        },
    };
});

describe('Fieldy Webhook', () => {
    it('should return 200 for valid payload', async () => {
        const payload = {
            date: '2025-01-01T00:00:00.000Z',
            transcription: 'Hello world',
            transcriptions: [],
        };

        const req = new Request('http://localhost/webhook', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const env = {
            NOTION_API_KEY: 'test-key',
            NOTION_DATABASE_ID: 'test-db',
        };

        const res = await app.fetch(req, env);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toEqual({ message: 'Success' });
    });

    it('should return 500 if config is missing', async () => {
        const payload = {
            date: '2025-01-01T00:00:00.000Z',
            transcription: 'Hello world',
            transcriptions: [],
        };

        const req = new Request('http://localhost/webhook', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Empty env
        const env = {};

        const res = await app.fetch(req, env);
        expect(res.status).toBe(500);
    });
});
