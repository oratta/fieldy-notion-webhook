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

    constructor(apiKey: string, databaseId: string, groupingMode: string = 'none') {
        this.client = new Client({ auth: apiKey });
        this.databaseId = databaseId;
        this.groupingMode = (groupingMode as GroupingMode) || 'none';
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
        const existingPage = await this.findExistingPage(dateObj);

        if (existingPage) {
            console.log(`Found existing page: ${existingPage.id}, appending...`);
            await this.appendToPage(existingPage.id, data);
        } else {
            console.log('No existing page found, creating new...');
            await this.createGroupedPage(data);
        }
    }

    private async findExistingPage(date: Date): Promise<{ id: string } | null> {
        const { start, end } = this.getDateRange(date);

        try {
            const response = await this.client.databases.query({
                database_id: this.databaseId,
                filter: {
                    and: [
                        {
                            property: 'Date',
                            date: {
                                on_or_after: start,
                            },
                        },
                        {
                            property: 'Date',
                            date: {
                                before: end,
                            },
                        },
                    ],
                },
                sorts: [
                    {
                        property: 'Date',
                        direction: 'descending',
                    },
                ],
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

    private getDateRange(date: Date): { start: string; end: string } {
        const jstDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));

        if (this.groupingMode === 'daily') {
            const startOfDay = new Date(jstDate);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(startOfDay);
            endOfDay.setDate(endOfDay.getDate() + 1);

            return {
                start: this.toISOStringWithTimezone(startOfDay),
                end: this.toISOStringWithTimezone(endOfDay),
            };
        } else {
            // hourly
            const startOfHour = new Date(jstDate);
            startOfHour.setMinutes(0, 0, 0);

            const endOfHour = new Date(startOfHour);
            endOfHour.setHours(endOfHour.getHours() + 1);

            return {
                start: this.toISOStringWithTimezone(startOfHour),
                end: this.toISOStringWithTimezone(endOfHour),
            };
        }
    }

    private toISOStringWithTimezone(date: Date): string {
        // Convert to ISO string format for Notion API
        return date.toISOString();
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

    private async createGroupedPage(data: FieldyPayload) {
        const dateObj = new Date(data.date);
        const title = this.getGroupedTitle(dateObj);
        const blocks = this.createBlocks(data, true);

        try {
            await this.client.pages.create({
                parent: { database_id: this.databaseId },
                properties: {
                    'Name': {
                        title: [{ text: { content: title } }],
                    },
                    'Date': {
                        date: { start: data.date },
                    },
                },
                children: blocks.slice(0, 100),
            });

            // If more than 100 blocks, append the rest
            if (blocks.length > 100) {
                const page = await this.findExistingPage(dateObj);
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

    private getGroupedTitle(date: Date): string {
        const options: Intl.DateTimeFormatOptions = {
            timeZone: 'Asia/Tokyo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        };

        if (this.groupingMode === 'hourly') {
            options.hour = '2-digit';
            return `Transcription ${date.toLocaleString('ja-JP', options)}:00`;
        }

        return `Transcription ${date.toLocaleString('ja-JP', options)}`;
    }

    private async createNewPage(data: FieldyPayload) {
        const dateObj = new Date(data.date);
        const title = `Transcription ${dateObj.toLocaleString('ja-JP', {
            timeZone: 'Asia/Tokyo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        })}`;

        const blocks = this.createBlocks(data, false);

        try {
            await this.client.pages.create({
                parent: { database_id: this.databaseId },
                properties: {
                    'Name': {
                        title: [{ text: { content: title } }],
                    },
                    'Date': {
                        date: { start: data.date },
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
