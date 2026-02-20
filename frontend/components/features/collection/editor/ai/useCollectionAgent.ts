"use client";

import { useState, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { streamAgentChat, collectionsApi } from "@/lib/api/collections";
import type { AgentEvent } from "@/types/api";

export interface Message {
  id: string;
  role: "user" | "assistant";
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

export function useCollectionAgent(collectionId: string, userId: string) {
  const [sessionId] = useState(() => uuidv4());
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);
  const abortRef = useRef<(() => void) | null>(null);

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
            // Show typing indicator - handled by isStreaming state
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
                  setPendingOperations((prev) => [
                    ...prev,
                    {
                      operationId: suggestion.operationId,
                      type: suggestion.action,
                      description: suggestion.rationale || "",
                      preview: suggestion.suggestedContent,
                    },
                  ]);
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

  return {
    sessionId,
    messages,
    isStreaming,
    pendingOperations,
    sendMessage,
    approveOperation,
    rejectOperation,
    stopStreaming,
    clearChat,
  };
}
