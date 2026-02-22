import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@infrastructure/redis';
import type { StoredMessage } from '../../dto/agent.dto';

const SESSION_TTL = 2_592_000; // 30 days
const APPROVED_OPS_TTL = 86_400; // 24 hours
const MAX_HISTORY_LENGTH = 50;

export interface AgentHistoryMessage {
  role: 'human' | 'ai';
  content: string;
}

export interface ChatSessionMeta {
  id: string;
  userId: string;
  collectionId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Redis-backed conversation memory and session persistence for collection agents.
 *
 * Key layout:
 *   agent:session:{id}      — JSON hash with session metadata
 *   agent:history:{id}      — JSON array of messages
 *   agent:approved:{id}     — JSON array of approved operation IDs
 *   agent:sessions:user:{u} — sorted set of session IDs scored by updatedAt epoch
 */
@Injectable()
export class AgentMemoryService {
  private readonly logger = new Logger(AgentMemoryService.name);

  constructor(private readonly redis: RedisService) { }

  // ============================================================================
  // Session CRUD
  // ============================================================================

  async createSession(
    userId: string,
    collectionId: string,
    title?: string,
    existingId?: string,
  ): Promise<ChatSessionMeta> {
    const { v4: uuidv4 } = await import('uuid');
    const id = existingId || uuidv4();
    const now = new Date().toISOString();

    const session: ChatSessionMeta = {
      id,
      userId,
      collectionId,
      title: title || 'New Chat',
      createdAt: now,
      updatedAt: now,
    };

    const key = this.getSessionKey(id);
    await this.redis.set(key, JSON.stringify(session), SESSION_TTL);

    // Add to user index (score = epoch ms for ordering)
    const indexKey = this.getUserIndexKey(userId);
    await this.redis.zadd(indexKey, Date.now(), id);

    return session;
  }

  async getSession(sessionId: string): Promise<ChatSessionMeta | null> {
    const key = this.getSessionKey(sessionId);
    const data = await this.redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as ChatSessionMeta;
  }

  async listSessions(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<ChatSessionMeta[]> {
    const indexKey = this.getUserIndexKey(userId);
    // Get IDs sorted by updatedAt descending (newest first)
    const ids = await this.redis.zrevrange(indexKey, offset, offset + limit - 1);

    if (!ids || ids.length === 0) return [];

    const sessions: ChatSessionMeta[] = [];
    for (const id of ids) {
      const session = await this.getSession(id);
      if (session) {
        sessions.push(session);
      } else {
        // Clean stale index entries
        await this.redis.zrem(indexKey, id);
      }
    }

    return sessions;
  }

  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    session.title = title;
    session.updatedAt = new Date().toISOString();

    await this.redis.set(this.getSessionKey(sessionId), JSON.stringify(session), SESSION_TTL);
    await this.redis.zadd(this.getUserIndexKey(session.userId), Date.now(), sessionId);
  }

  async deleteSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      await this.redis.zrem(this.getUserIndexKey(session.userId), sessionId);
    }

    await Promise.all([
      this.redis.del(this.getSessionKey(sessionId)),
      this.redis.del(this.getHistoryKey(sessionId)),
      this.redis.del(this.getApprovedOpsKey(sessionId)),
    ]);
  }

  private async touchSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    session.updatedAt = new Date().toISOString();
    await this.redis.set(this.getSessionKey(sessionId), JSON.stringify(session), SESSION_TTL);
    await this.redis.zadd(this.getUserIndexKey(session.userId), Date.now(), sessionId);
  }

  // ============================================================================
  // Conversation History
  // ============================================================================

  async loadHistory(sessionId: string): Promise<AgentHistoryMessage[]> {
    const key = this.getHistoryKey(sessionId);

    try {
      const data = await this.redis.get(key);
      if (!data) return [];

      const messages: StoredMessage[] = JSON.parse(data);
      return messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
    } catch (error) {
      this.logger.warn({
        event: 'load_history_failed',
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  async saveHistory(sessionId: string, messages: AgentHistoryMessage[]): Promise<void> {
    const key = this.getHistoryKey(sessionId);

    try {
      const trimmedMessages = messages.slice(-MAX_HISTORY_LENGTH);
      const data: StoredMessage[] = trimmedMessages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: new Date().toISOString(),
      }));

      await this.redis.set(key, JSON.stringify(data), SESSION_TTL);
    } catch (error) {
      this.logger.error({
        event: 'save_history_failed',
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async addMessage(sessionId: string, message: AgentHistoryMessage): Promise<void> {
    const history = await this.loadHistory(sessionId);
    history.push(message);
    await this.saveHistory(sessionId, history);
    await this.touchSession(sessionId);

    // Auto-title on first user message
    if (message.role === 'human' && history.length === 1) {
      const autoTitle = message.content.slice(0, 60) + (message.content.length > 60 ? '…' : '');
      await this.updateSessionTitle(sessionId, autoTitle);
    }
  }

  async clearHistory(sessionId: string): Promise<void> {
    const key = this.getHistoryKey(sessionId);
    await this.redis.del(key);
  }

  // ============================================================================
  // Approved Operations
  // ============================================================================

  async loadApprovedOperations(sessionId: string): Promise<Set<string>> {
    const key = this.getApprovedOpsKey(sessionId);

    try {
      const data = await this.redis.get(key);
      if (!data) return new Set();
      const operations: string[] = JSON.parse(data);
      return new Set(operations);
    } catch (error) {
      this.logger.warn({
        event: 'load_approved_ops_failed',
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return new Set();
    }
  }

  async approveOperation(sessionId: string, operationId: string): Promise<void> {
    const key = this.getApprovedOpsKey(sessionId);

    try {
      const existing = await this.loadApprovedOperations(sessionId);
      existing.add(operationId);
      await this.redis.set(key, JSON.stringify([...existing]), APPROVED_OPS_TTL);
    } catch (error) {
      this.logger.error({
        event: 'approve_operation_failed',
        sessionId,
        operationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async isOperationApproved(sessionId: string, operationId: string): Promise<boolean> {
    try {
      const approved = await this.loadApprovedOperations(sessionId);
      return approved.has(operationId);
    } catch {
      return false;
    }
  }

  async revokeApproval(sessionId: string, operationId: string): Promise<void> {
    const key = this.getApprovedOpsKey(sessionId);
    const existing = await this.loadApprovedOperations(sessionId);
    existing.delete(operationId);
    await this.redis.set(key, JSON.stringify([...existing]), APPROVED_OPS_TTL);
  }

  async clearApprovedOperations(sessionId: string): Promise<void> {
    const key = this.getApprovedOpsKey(sessionId);
    await this.redis.del(key);
  }

  // ============================================================================
  // Key Helpers
  // ============================================================================

  private getSessionKey(sessionId: string): string {
    return `agent:session:${sessionId}`;
  }

  private getHistoryKey(sessionId: string): string {
    return `agent:history:${sessionId}`;
  }

  private getApprovedOpsKey(sessionId: string): string {
    return `agent:approved:${sessionId}`;
  }

  private getUserIndexKey(userId: string): string {
    return `agent:sessions:user:${userId}`;
  }
}

