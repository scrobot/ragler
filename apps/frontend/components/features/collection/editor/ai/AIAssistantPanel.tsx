"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wand2, Send, Square, Trash2, Loader2 } from "lucide-react";
import { useCollectionAgent, type Message, type ToolCall } from "./useCollectionAgent";
import { AIOperationApproval } from "./AIOperationApproval";
import { cn } from "@/lib/utils";

interface AIAssistantPanelProps {
  collectionId: string;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIAssistantPanel({
  collectionId,
  userId,
  open,
  onOpenChange,
}: AIAssistantPanelProps) {
  const {
    messages,
    isStreaming,
    pendingOperations,
    sendMessage,
    approveOperation,
    rejectOperation,
    stopStreaming,
    clearChat,
  } = useCollectionAgent(collectionId, userId);

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[450px] sm:w-[540px] flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-indigo-500" />
            AI Assistant
          </SheetTitle>
        </SheetHeader>

        {/* Pending Operations */}
        {pendingOperations.length > 0 && (
          <div className="border-b px-6 py-4 space-y-2">
            <h4 className="text-sm font-medium">Pending Approvals</h4>
            {pendingOperations.map((op) => (
              <AIOperationApproval
                key={op.operationId}
                operation={op}
                onApprove={() => approveOperation(op.operationId)}
                onReject={() => rejectOperation(op.operationId)}
              />
            ))}
          </div>
        )}

        {/* Chat Messages */}
        <ScrollArea ref={scrollRef} className="flex-1 px-6 py-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Wand2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm">
                Ask me to analyze the collection, score chunks, or suggest
                improvements.
              </p>
              <div className="mt-4 space-y-2">
                <SuggestionButton
                  onClick={() => sendMessage("Analyze this collection for quality issues")}
                  disabled={isStreaming}
                >
                  Analyze collection quality
                </SuggestionButton>
                <SuggestionButton
                  onClick={() => sendMessage("Find duplicate or similar chunks")}
                  disabled={isStreaming}
                >
                  Find duplicates
                </SuggestionButton>
                <SuggestionButton
                  onClick={() => sendMessage("Identify chunks that are too long or too short")}
                  disabled={isStreaming}
                >
                  Check chunk lengths
                </SuggestionButton>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isStreaming && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t px-6 py-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about collection quality..."
              disabled={isStreaming}
              className="flex-1"
            />
            {isStreaming ? (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={stopStreaming}
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" size="icon" disabled={!input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            )}
          </form>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-muted-foreground"
              onClick={clearChat}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear chat
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SuggestionButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full justify-start"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex flex-col",
        isUser ? "items-end" : "items-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-4 py-2",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        {message.content ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : message.toolCalls && message.toolCalls.length > 0 ? (
          <ToolCallsDisplay toolCalls={message.toolCalls} />
        ) : null}
      </div>

      {/* Tool calls display for messages with content */}
      {message.content && message.toolCalls && message.toolCalls.length > 0 && (
        <div className="mt-2 max-w-[85%]">
          <ToolCallsDisplay toolCalls={message.toolCalls} />
        </div>
      )}
    </div>
  );
}

function ToolCallsDisplay({ toolCalls }: { toolCalls: ToolCall[] }) {
  return (
    <div className="space-y-2">
      {toolCalls.map((tc, i) => (
        <div
          key={i}
          className="text-xs bg-background/50 rounded px-2 py-1 border"
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-indigo-500">{tc.tool}</span>
            {tc.status === "pending" && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            {tc.status === "complete" && (
              <span className="text-green-500">✓</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
