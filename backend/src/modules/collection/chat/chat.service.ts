import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { QdrantClientService } from '@infrastructure/qdrant';
import { LlmService } from '@llm/llm.service';
import { AgentMemoryService, AgentHistoryMessage } from '../agent/memory/redis-memory';
import { ChatResponse, ChatCitation } from '../dto';

interface QdrantSearchResult {
    id: string;
    score: number;
    payload: {
        chunk: { text: string };
        doc: { url: string; title: string | null };
    };
}

const TOP_K = 5;
const MAX_HISTORY_TURNS = 10;

@Injectable()
export class ChatService {
    private readonly logger = new Logger(ChatService.name);
    private readonly openai: OpenAI;

    constructor(
        private readonly qdrantClient: QdrantClientService,
        private readonly llmService: LlmService,
        private readonly memoryService: AgentMemoryService,
        private readonly configService: ConfigService,
    ) {
        this.openai = new OpenAI({
            apiKey: this.configService.get<string>('OPENAI_API_KEY'),
        });
    }

    async chat(
        collectionId: string,
        message: string,
        sessionId?: string,
    ): Promise<ChatResponse> {
        const chatSessionId = sessionId || `chat_${uuidv4()}`;
        const collectionName = `kb_${collectionId}`;
        const startTime = Date.now();

        this.logger.log({
            event: 'chat_start',
            collectionId,
            sessionId: chatSessionId,
            messageLength: message.length,
        });

        // 1. Verify collection exists
        const exists = await this.qdrantClient.collectionExists(collectionName);
        if (!exists) {
            throw new NotFoundException(`Collection ${collectionId} not found`);
        }

        // 2. Load conversation history
        const history = await this.memoryService.loadHistory(chatSessionId);

        // 3. Generate embedding for user query
        const [queryEmbedding] = await this.llmService.generateEmbeddings(
            [message],
            chatSessionId,
        );

        // 4. Search Qdrant for relevant chunks
        const searchResults = (await this.qdrantClient.search(
            collectionName,
            queryEmbedding,
            TOP_K,
        )) as QdrantSearchResult[];

        const citations: ChatCitation[] = searchResults.map((result) => ({
            chunkId: String(result.id),
            content: result.payload.chunk.text.substring(0, 500),
            score: result.score,
        }));

        // 5. Build RAG prompt
        const contextText = searchResults
            .map(
                (result, index) =>
                    `[Source ${index + 1}]: ${result.payload.chunk.text}`,
            )
            .join('\n\n');

        const recentHistory = history.slice(-MAX_HISTORY_TURNS * 2);
        const historyMessages: OpenAI.Chat.ChatCompletionMessageParam[] =
            recentHistory.map((msg) => ({
                role: msg.role === 'human' ? ('user' as const) : ('assistant' as const),
                content: msg.content,
            }));

        const systemPrompt = `You are a knowledgeable assistant answering questions based on the provided knowledge base.
Use the retrieved context below to answer the user's question accurately.
If the context doesn't contain enough information, say so honestly rather than guessing.
Cite specific sources when possible using [Source N] notation.

## Retrieved Context
${contextText || 'No relevant context found in the knowledge base.'}`;

        // 6. Call LLM
        const completion = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                ...historyMessages,
                { role: 'user', content: message },
            ],
            temperature: 0.3,
            max_tokens: 2000,
        });

        const answer =
            completion.choices[0]?.message?.content || 'No response generated.';

        // 7. Save conversation history
        await this.memoryService.addMessage(chatSessionId, {
            role: 'human',
            content: message,
        });
        await this.memoryService.addMessage(chatSessionId, {
            role: 'ai',
            content: answer,
        });

        const duration = Date.now() - startTime;
        this.logger.log({
            event: 'chat_success',
            collectionId,
            sessionId: chatSessionId,
            durationMs: duration,
            citationCount: citations.length,
        });

        return {
            answer,
            sessionId: chatSessionId,
            citations,
        };
    }
}
