"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { streamAgentChat, streamCleanCollection, collectionsApi } from "@/lib/api/collections";
import type { AgentEvent } from "@/types/api";

export type AgentMode = "hitl" | "automatic";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: ToolCall[];
  timestamp: Date;
}

export interface ToolCall {
  tool: string;
  input: unknown;
  output?: unknown;
  status: "pending" | "complete" | "error";
}

export interface PendingOperation {
  operationId: string;
  type: string;
  description: string;
  preview?: string;
}

function updateAssistantMessage(
  messages: Message[],
  id: string,
  updates: Partial<Message>
): Message[] {
  return messages.map((m) => (m.id === id ? { ...m, ...updates } : m));
}

export function useCollectionAgent(collectionId: string, userId: string, initialSessionId?: string) {
  const [sessionId, setSessionId] = useState<string>(initialSessionId || uuidv4());
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);
  const [mode, setMode] = useState<AgentMode>("hitl");
  const abortRef = useRef<(() => void) | null>(null);
  const modeRef = useRef<AgentMode>(mode);

  // Keep modeRef in sync for use inside callbacks
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Auto-load history when resuming an existing session
  useEffect(() => {
    if (!initialSessionId) return;

    collectionsApi
      .getSessionWithHistory(collectionId, initialSessionId)
      .then((result) => {
        const loadedMessages: Message[] = result.messages.map((m, i) => ({
          id: `loaded-${i}`,
          role: m.role === "human" ? ("user" as const) : ("assistant" as const),
          content: m.content,
          timestamp: new Date(),
        }));
        setMessages(loadedMessages);
      })
      .catch((err) => console.error("Failed to load session:", err));
    // Only run on mount (initialSessionId doesn't change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      // Add user message
      const userMessage: Message = {
        id: uuidv4(),
        role: "user",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);

      // Create assistant message placeholder
      const assistantMessageId = uuidv4();
      let assistantContent = "";
      let toolCalls: ToolCall[] = [];

      const handleEvent = (event: AgentEvent) => {
        switch (event.type) {
          case "thinking":
            break;

          case "tool_call":
            toolCalls = [
              ...toolCalls,
              {
                tool: event.tool,
                input: event.input,
                status: "pending",
              },
            ];
            setMessages((prev) =>
              updateAssistantMessage(prev, assistantMessageId, {
                toolCalls: [...toolCalls],
              })
            );
            break;

          case "tool_result":
            toolCalls = toolCalls.map((tc) =>
              tc.tool === event.tool && tc.status === "pending"
                ? { ...tc, output: event.output, status: "complete" as const }
                : tc
            );

            // Extract pending operations from suggestions
            if (event.tool === "suggest_operation" && event.output) {
              try {
                const suggestion =
                  typeof event.output === "string"
                    ? JSON.parse(event.output)
                    : event.output;
                if (suggestion.action && suggestion.action !== "KEEP") {
                  const operation: PendingOperation = {
                    operationId: suggestion.operationId,
                    type: suggestion.action,
                    description: suggestion.rationale || "",
                    preview: suggestion.suggestedContent,
                  };

                  if (modeRef.current === "automatic") {
                    // Auto-approve in automatic mode
                    collectionsApi
                      .approveOperation(collectionId, suggestion.operationId, {
                        sessionId,
                      })
                      .then(() => {
                        setMessages((prev) => [
                          ...prev,
                          {
                            id: uuidv4(),
                            role: "system" as const,
                            content: `Auto-approved: ${suggestion.action} — ${suggestion.rationale || ""}`,
                            timestamp: new Date(),
                          },
                        ]);
                      })
                      .catch(() => {
                        // Silently handle approval failures
                      });
                  } else {
                    setPendingOperations((prev) => [...prev, operation]);
                  }
                }
              } catch {
                // Ignore parse errors
              }
            }

            setMessages((prev) =>
              updateAssistantMessage(prev, assistantMessageId, {
                toolCalls: [...toolCalls],
              })
            );
            break;

          case "message":
            assistantContent = event.content;
            setMessages((prev) =>
              updateAssistantMessage(prev, assistantMessageId, {
                content: assistantContent,
                toolCalls,
              })
            );
            break;

          case "error":
            setMessages((prev) =>
              updateAssistantMessage(prev, assistantMessageId, {
                content: `Error: ${event.message}`,
              })
            );
            setIsStreaming(false);
            break;

          case "done":
            setIsStreaming(false);
            break;
        }
      };

      // Add empty assistant message
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: "assistant" as const,
          content: "",
          toolCalls: [],
          timestamp: new Date(),
        },
      ]);

      // Start streaming
      abortRef.current = streamAgentChat(
        collectionId,
        { message: content, sessionId },
        userId,
        handleEvent,
        (error) => {
          console.error("Agent error:", error);
          setMessages((prev) =>
            updateAssistantMessage(prev, assistantMessageId, {
              content: `Error: ${error.message}`,
            })
          );
          setIsStreaming(false);
        },
        () => setIsStreaming(false)
      );
    },
    [collectionId, sessionId, userId]
  );

  const approveOperation = useCallback(
    async (operationId: string) => {
      await collectionsApi.approveOperation(collectionId, operationId, {
        sessionId,
      });
      setPendingOperations((prev) =>
        prev.filter((op) => op.operationId !== operationId)
      );

      // Send approval message to agent
      await sendMessage(`Approved operation ${operationId}. Please execute it.`);
    },
    [collectionId, sessionId, sendMessage]
  );

  const rejectOperation = useCallback((operationId: string) => {
    setPendingOperations((prev) =>
      prev.filter((op) => op.operationId !== operationId)
    );
  }, []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.();
    setIsStreaming(false);
  }, []);

  const clearChat = useCallback(async () => {
    setMessages([]);
    setPendingOperations([]);
    await collectionsApi.clearSession(collectionId, sessionId);
  }, [collectionId, sessionId]);

  const cleanCollection = useCallback(
    async () => {
      setIsStreaming(true);

      const assistantMessageId = uuidv4();
      let deletedCount = 0;
      const deletedItems: string[] = [];

      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: "user" as const,
          content: "🧹 Clean collection",
          timestamp: new Date(),
        },
        {
          id: assistantMessageId,
          role: "assistant" as const,
          content: "Scanning collection for junk chunks...",
          timestamp: new Date(),
        },
      ]);

      const handleCleanEvent = (event: AgentEvent) => {
        switch (event.type) {
          case "dirty_chunk_found":
            deletedItems.push(`❌ ${(event as any).reason}: \`${(event as any).preview?.substring(0, 60)}...\``);
            break;

          case "dirty_chunk_deleted":
            deletedCount++;
            setMessages((prev) =>
              updateAssistantMessage(prev, assistantMessageId, {
                content: `Scanning... Deleted ${deletedCount} junk chunk${deletedCount > 1 ? "s" : ""} so far.`,
              })
            );
            break;

          case "clean_progress": {
            const { scanned, total } = event as any;
            setMessages((prev) =>
              updateAssistantMessage(prev, assistantMessageId, {
                content: `Scanning... ${scanned}/${total} chunks checked. Deleted ${deletedCount} junk.`,
              })
            );
            break;
          }

          case "clean_complete": {
            const { totalScanned, totalDeleted, remaining, breakdown } = event as any;
            const breakdownStr = Object.entries(breakdown as Record<string, number>)
              .map(([k, v]) => `${v}× ${k}`)
              .join(", ");
            const summary = totalDeleted > 0
              ? `✅ **Cleaning complete!**\n\nScanned: ${totalScanned} chunks\nDeleted: ${totalDeleted} (${breakdownStr})\nRemaining: ${remaining}`
              : `✅ Collection is clean! Scanned ${totalScanned} chunks — no junk found.`;
            setMessages((prev) =>
              updateAssistantMessage(prev, assistantMessageId, {
                content: summary,
              })
            );
            setIsStreaming(false);
            break;
          }

          case "error":
            setMessages((prev) =>
              updateAssistantMessage(prev, assistantMessageId, {
                content: `Error: ${(event as any).message}`,
              })
            );
            setIsStreaming(false);
            break;
        }
      };

      abortRef.current = streamCleanCollection(
        collectionId,
        handleCleanEvent,
        (error) => {
          console.error("Clean error:", error);
          setMessages((prev) =>
            updateAssistantMessage(prev, assistantMessageId, {
              content: `Error: ${error.message}`,
            })
          );
          setIsStreaming(false);
        },
        () => setIsStreaming(false)
      );
    },
    [collectionId]
  );

  const loadSession = useCallback(async (targetSessionId: string) => {
    try {
      const result = await collectionsApi.getSessionWithHistory(collectionId, targetSessionId);
      setSessionId(targetSessionId);
      setPendingOperations([]);

      const loadedMessages: Message[] = result.messages.map((m, i) => ({
        id: `loaded-${i}`,
        role: m.role === 'human' ? 'user' as const : 'assistant' as const,
        content: m.content,
        timestamp: new Date(),
      }));

      setMessages(loadedMessages);
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  }, [collectionId]);

  const startNewSession = useCallback(() => {
    const newId = uuidv4();
    setSessionId(newId);
    setMessages([]);
    setPendingOperations([]);
  }, []);

  return {
    sessionId,
    messages,
    isStreaming,
    pendingOperations,
    mode,
    setMode,
    sendMessage,
    cleanCollection,
    approveOperation,
    rejectOperation,
    stopStreaming,
    clearChat,
    loadSession,
    startNewSession,
  };
}
