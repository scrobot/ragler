import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@infrastructure/redis';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import type { StoredMessage } from '../../dto/agent.dto';

const HISTORY_TTL = 86400; // 24 hours
const APPROVED_OPS_TTL = 86400; // 24 hours
const MAX_HISTORY_LENGTH = 50; // Maximum messages to retain

/**
 * Redis-backed conversation memory for collection agents
 */
@Injectable()
export class AgentMemoryService {
  private readonly logger = new Logger(AgentMemoryService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Load conversation history from Redis
   */
  async loadHistory(sessionId: string): Promise<BaseMessage[]> {
    const key = this.getHistoryKey(sessionId);

    try {
      const data = await this.redis.get(key);
      if (!data) {
        return [];
      }

      const messages: StoredMessage[] = JSON.parse(data);
      return messages.map((m) =>
        m.role === 'human' ? new HumanMessage(m.content) : new AIMessage(m.content),
      );
    } catch (error) {
      this.logger.warn({
        event: 'load_history_failed',
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Save conversation history to Redis
   */
  async saveHistory(sessionId: string, messages: BaseMessage[]): Promise<void> {
    const key = this.getHistoryKey(sessionId);

    try {
      // Trim to max length (keep most recent)
      const trimmedMessages = messages.slice(-MAX_HISTORY_LENGTH);

      const data: StoredMessage[] = trimmedMessages.map((m) => ({
        role: m._getType() === 'human' ? 'human' : 'ai',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        timestamp: new Date().toISOString(),
      }));

      await this.redis.set(key, JSON.stringify(data), HISTORY_TTL);
    } catch (error) {
      this.logger.error({
        event: 'save_history_failed',
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Add a single message to history
   */
  async addMessage(sessionId: string, message: BaseMessage): Promise<void> {
    const history = await this.loadHistory(sessionId);
    history.push(message);
    await this.saveHistory(sessionId, history);
  }

  /**
   * Clear conversation history
   */
  async clearHistory(sessionId: string): Promise<void> {
    const key = this.getHistoryKey(sessionId);
    await this.redis.del(key);
  }

  /**
   * Load approved operation IDs for a session
   */
  async loadApprovedOperations(sessionId: string): Promise<Set<string>> {
    const key = this.getApprovedOpsKey(sessionId);

    try {
      const data = await this.redis.get(key);
      if (!data) {
        return new Set();
      }
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

  /**
   * Approve an operation for execution
   */
  async approveOperation(sessionId: string, operationId: string): Promise<void> {
    const key = this.getApprovedOpsKey(sessionId);

    try {
      const existing = await this.loadApprovedOperations(sessionId);
      existing.add(operationId);
      await this.redis.set(key, JSON.stringify([...existing]), APPROVED_OPS_TTL);

      this.logger.debug({
        event: 'operation_approved',
        sessionId,
        operationId,
      });
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

  /**
   * Check if an operation is approved
   */
  async isOperationApproved(sessionId: string, operationId: string): Promise<boolean> {
    try {
      const approved = await this.loadApprovedOperations(sessionId);
      return approved.has(operationId);
    } catch (error) {
      this.logger.warn({
        event: 'check_approval_failed',
        sessionId,
        operationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Revoke an operation approval
   */
  async revokeApproval(sessionId: string, operationId: string): Promise<void> {
    const key = this.getApprovedOpsKey(sessionId);
    const existing = await this.loadApprovedOperations(sessionId);
    existing.delete(operationId);
    await this.redis.set(key, JSON.stringify([...existing]), APPROVED_OPS_TTL);
  }

  /**
   * Clear all approved operations for a session
   */
  async clearApprovedOperations(sessionId: string): Promise<void> {
    const key = this.getApprovedOpsKey(sessionId);
    await this.redis.del(key);
  }

  private getHistoryKey(sessionId: string): string {
    return `agent:history:${sessionId}`;
  }

  private getApprovedOpsKey(sessionId: string): string {
    return `agent:approved:${sessionId}`;
  }
}
