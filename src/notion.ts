import { Client } from '@notionhq/client';

export interface FieldyPayload {
    date: string;
    transcription: string;
    transcriptions: {
        text: string;
        speaker: string;
        start: number;
        end: number;
        duration: number;
    }[];
}

export class NotionService {
    private client: Client;
    private databaseId: string;

    constructor(apiKey: string, databaseId: string) {
        this.client = new Client({ auth: apiKey });
        this.databaseId = databaseId;
    }

    async createTranscriptionPage(data: FieldyPayload) {
        // Format the date for the title "Transcription {YYYY-MM-DD HH:mm}"
        const dateObj = new Date(data.date);
        const title = `Transcription ${dateObj.toLocaleString('ja-JP', {
            timeZone: 'Asia/Tokyo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        })}`;

        // Prepare blocks
        const chunks = this.chunkString(data.transcription, 2000);
        const children: any[] = [];

        // Add full transcription as paragraphs (fallback if transcriptions array is empty)
        if (data.transcriptions && data.transcriptions.length > 0) {
            // Use speaker diarization if available
            for (const t of data.transcriptions) {
                children.push({
                    object: 'block',
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [
                            {
                                type: 'text',
                                text: {
                                    content: `[Speaker ${t.speaker}] `,
                                    link: null,
                                },
                                annotations: {
                                    bold: true,
                                },
                            },
                            {
                                type: 'text',
                                text: {
                                    content: t.text,
                                    link: null,
                                },
                            },
                        ],
                    },
                });
            }
        } else {
            // Fallback to unstructured text
            for (const chunk of chunks) {
                children.push({
                    object: 'block',
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [
                            {
                                type: 'text',
                                text: {
                                    content: chunk,
                                },
                            },
                        ],
                    },
                });
            }
        }

        try {
            await this.client.pages.create({
                parent: { database_id: this.databaseId },
                properties: {
                    'Name': {
                        title: [
                            {
                                text: {
                                    content: title,
                                },
                            },
                        ],
                    },
                    'Date': {
                        date: {
                            start: data.date,
                        },
                    },
                    // 'Summary' field is omitted as per plan
                },
                children: children.slice(0, 100), // Notion limit: 100 blocks per request. If more, need to paginate append.
            });
        } catch (error) {
            console.error("Failed to create Notion page:", error);
            throw error;
        }
    }

    private chunkString(str: string, length: number): string[] {
        const chunks = [];
        for (let i = 0; i < str.length; i += length) {
            chunks.push(str.substring(i, i + length));
        }
        return chunks;
    }
}
