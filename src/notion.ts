import { Client } from '@notionhq/client';

export type GroupingMode = 'none' | 'daily' | 'hourly';

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
    private groupingMode: GroupingMode;

    constructor(apiKey: string, databaseId: string, groupingMode: string = 'hourly') {
        this.client = new Client({ auth: apiKey });
        this.databaseId = databaseId;
        this.groupingMode = (groupingMode as GroupingMode) || 'hourly';
    }

    async saveTranscription(data: FieldyPayload) {
        if (this.groupingMode === 'none') {
            await this.createNewPage(data);
        } else {
            await this.appendOrCreatePage(data);
        }
    }

    private async appendOrCreatePage(data: FieldyPayload) {
        const dateObj = new Date(data.date);
        const { dateStr, hour } = this.getDateAndHour(dateObj);

        const existingPage = await this.findExistingPage(dateStr, hour);

        if (existingPage) {
            console.log(`Found existing page: ${existingPage.id}, appending...`);
            await this.appendToPage(existingPage.id, data);
        } else {
            console.log('No existing page found, creating new...');
            await this.createGroupedPage(data, dateStr, hour);
        }
    }

    private getDateAndHour(date: Date): { dateStr: string; hour: number } {
        // Convert to JST
        const jstDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));

        const year = jstDate.getFullYear();
        const month = String(jstDate.getMonth() + 1).padStart(2, '0');
        const day = String(jstDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const hour = this.groupingMode === 'daily' ? -1 : jstDate.getHours();

        return { dateStr, hour };
    }

    private async findExistingPage(dateStr: string, hour: number): Promise<{ id: string } | null> {
        try {
            const response = await this.client.databases.query({
                database_id: this.databaseId,
                filter: {
                    and: [
                        {
                            property: 'Date',
                            date: {
                                equals: dateStr,
                            },
                        },
                        {
                            property: 'Hour',
                            number: {
                                equals: hour,
                            },
                        },
                    ],
                },
                page_size: 1,
            });

            if (response.results.length > 0) {
                return { id: response.results[0].id };
            }
            return null;
        } catch (error) {
            console.error('Error finding existing page:', error);
            return null;
        }
    }

    private async appendToPage(pageId: string, data: FieldyPayload) {
        const blocks = this.createBlocks(data, true);

        try {
            // Append blocks in batches of 100 (Notion limit)
            for (let i = 0; i < blocks.length; i += 100) {
                const batch = blocks.slice(i, i + 100);
                await this.client.blocks.children.append({
                    block_id: pageId,
                    children: batch,
                });
            }
        } catch (error) {
            console.error('Failed to append to Notion page:', error);
            throw error;
        }
    }

    private async createGroupedPage(data: FieldyPayload, dateStr: string, hour: number) {
        const title = this.getGroupedTitle(dateStr, hour);
        const blocks = this.createBlocks(data, true);

        try {
            await this.client.pages.create({
                parent: { database_id: this.databaseId },
                properties: {
                    'Name': {
                        title: [{ text: { content: title } }],
                    },
                    'Date': {
                        date: { start: dateStr },
                    },
                    'Hour': {
                        number: hour,
                    },
                },
                children: blocks.slice(0, 100),
            });

            // If more than 100 blocks, append the rest
            if (blocks.length > 100) {
                const page = await this.findExistingPage(dateStr, hour);
                if (page) {
                    for (let i = 100; i < blocks.length; i += 100) {
                        const batch = blocks.slice(i, i + 100);
                        await this.client.blocks.children.append({
                            block_id: page.id,
                            children: batch,
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Failed to create Notion page:', error);
            throw error;
        }
    }

    private getGroupedTitle(dateStr: string, hour: number): string {
        // Convert YYYY-MM-DD to YYYY/MM/DD
        const formattedDate = dateStr.replace(/-/g, '/');

        if (this.groupingMode === 'daily' || hour === -1) {
            return `${formattedDate} 00:00-23:59`;
        }

        const hourStr = String(hour).padStart(2, '0');
        return `${formattedDate} ${hourStr}:00-${hourStr}:59`;
    }

    private async createNewPage(data: FieldyPayload) {
        const dateObj = new Date(data.date);
        const jstDate = new Date(dateObj.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));

        const year = jstDate.getFullYear();
        const month = String(jstDate.getMonth() + 1).padStart(2, '0');
        const day = String(jstDate.getDate()).padStart(2, '0');
        const hours = String(jstDate.getHours()).padStart(2, '0');
        const minutes = String(jstDate.getMinutes()).padStart(2, '0');

        const title = `${year}/${month}/${day} ${hours}:${minutes}`;
        const dateStr = `${year}-${month}-${day}`;

        const blocks = this.createBlocks(data, false);

        try {
            await this.client.pages.create({
                parent: { database_id: this.databaseId },
                properties: {
                    'Name': {
                        title: [{ text: { content: title } }],
                    },
                    'Date': {
                        date: { start: dateStr },
                    },
                    'Hour': {
                        number: jstDate.getHours(),
                    },
                },
                children: blocks.slice(0, 100),
            });
        } catch (error) {
            console.error('Failed to create Notion page:', error);
            throw error;
        }
    }

    private createBlocks(data: FieldyPayload, includeTimestamp: boolean): any[] {
        const blocks: any[] = [];
        const dateObj = new Date(data.date);

        // Add timestamp header when appending to grouped pages
        if (includeTimestamp) {
            const timeStr = dateObj.toLocaleString('ja-JP', {
                timeZone: 'Asia/Tokyo',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });
            blocks.push({
                object: 'block',
                type: 'heading_3',
                heading_3: {
                    rich_text: [{ type: 'text', text: { content: `--- ${timeStr} ---` } }],
                },
            });
        }

        if (data.transcriptions && data.transcriptions.length > 0) {
            for (const t of data.transcriptions) {
                blocks.push({
                    object: 'block',
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [
                            {
                                type: 'text',
                                text: { content: `[Speaker ${t.speaker}] `, link: null },
                                annotations: { bold: true },
                            },
                            {
                                type: 'text',
                                text: { content: t.text, link: null },
                            },
                        ],
                    },
                });
            }
        } else {
            const chunks = this.chunkString(data.transcription, 2000);
            for (const chunk of chunks) {
                blocks.push({
                    object: 'block',
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [{ type: 'text', text: { content: chunk } }],
                    },
                });
            }
        }

        return blocks;
    }

    private chunkString(str: string, length: number): string[] {
        const chunks = [];
        for (let i = 0; i < str.length; i += length) {
            chunks.push(str.substring(i, i + length));
        }
        return chunks;
    }
}
