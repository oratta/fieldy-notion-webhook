import { Hono } from 'hono';
import { NotionService, FieldyPayload } from './notion';

type Bindings = {
    NOTION_API_KEY: string;
    NOTION_DATABASE_ID: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/', (c) => {
    return c.text('Fieldy Webhook Receiver is running!');
});

app.post('/webhook', async (c) => {
    try {
        const payload = await c.req.json<FieldyPayload>();
        console.log('Received payload:', JSON.stringify(payload, null, 2));

        const apiKey = c.env.NOTION_API_KEY;
        const dbId = c.env.NOTION_DATABASE_ID;

        if (!apiKey || !dbId) {
            console.error('Missing configuration: NOTION_API_KEY or NOTION_DATABASE_ID');
            return c.json({ error: 'Server configuration error' }, 500);
        }

        const notion = new NotionService(apiKey, dbId);
        await notion.createTranscriptionPage(payload);

        return c.json({ message: 'Success' }, 200);
    } catch (e: any) {
        console.error('Error processing webhook:', e);
        return c.json({ error: e.message || 'Internal Server Error' }, 500);
    }
});

export default app;
