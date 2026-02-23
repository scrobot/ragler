"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Send,
    Square,
    Trash2,
    Loader2,
    Bot,
    User,
    Zap,
    ShieldCheck,
    CheckCircle2,
    XCircle,
    Info,
} from "lucide-react";
import {
    useCollectionAgent,
    type Message,
    type AgentMode,
} from "../editor/ai/useCollectionAgent";
import { AgentToolCallCard } from "./AgentToolCallCard";
import { cn } from "@/lib/utils";

interface AgentChatProps {
    collectionId: string;
    sessionId?: string;
    onSessionCreated?: (sessionId: string) => void;
}

const SUGGESTIONS = [
    { label: "🧹 Clean collection", action: "clean" as const },
    { label: "Analyze collection quality", message: "Analyze this collection for quality issues" },
    { label: "Find duplicate chunks", message: "Find duplicate or similar chunks" },
    { label: "Check chunk lengths", message: "Identify chunks that are too long or too short" },
    { label: "Suggest improvements", message: "Suggest improvements to the knowledge base structure" },
];

export function AgentChat({ collectionId, sessionId: initialSessionId, onSessionCreated }: AgentChatProps) {
    const userId = "user-1"; // TODO: get from context

    const {
        sessionId,
        messages,
        isStreaming,
        pendingOperations,
        mode,
        setMode,
        sendMessage: rawSendMessage,
        cleanCollection,
        approveOperation,
        rejectOperation,
        stopStreaming,
        clearChat,
        loadSession,
        startNewSession,
    } = useCollectionAgent(collectionId, userId, initialSessionId);

    // Notify parent when session is first used
    const sendMessage = (content: string) => {
        if (onSessionCreated) {
            onSessionCreated(sessionId);
        }
        rawSendMessage(content);
    };

    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll on new messages
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

    const handleModeChange = (isAutomatic: boolean) => {
        setMode(isAutomatic ? "automatic" : "hitl");
    };

    return (
        <div className="flex flex-col h-[calc(100vh-200px)] min-h-[400px] rounded-lg border bg-card overflow-hidden">
            {/* Header Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm font-medium">AI Agent</span>
                    <ModeBadge mode={mode} />
                </div>

                <div className="flex items-center gap-4">
                    {/* Mode Toggle */}
                    <div className="flex items-center gap-2">
                        <ShieldCheck className={cn("h-3.5 w-3.5", mode === "hitl" ? "text-blue-500" : "text-muted-foreground")} />
                        <Label htmlFor="agent-mode" className="text-xs cursor-pointer">
                            HITL
                        </Label>
                        <Switch
                            id="agent-mode"
                            checked={mode === "automatic"}
                            onCheckedChange={handleModeChange}
                            className="data-[state=checked]:bg-amber-500"
                        />
                        <Label htmlFor="agent-mode" className="text-xs cursor-pointer">
                            Auto
                        </Label>
                        <Zap className={cn("h-3.5 w-3.5", mode === "automatic" ? "text-amber-500" : "text-muted-foreground")} />
                    </div>

                    {messages.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearChat}
                            className="text-xs h-7"
                        >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Clear
                        </Button>
                    )}
                </div>
            </div>

            {/* Pending Operations Bar */}
            {pendingOperations.length > 0 && (
                <div className="border-b bg-amber-50 dark:bg-amber-950/20 px-4 py-3 space-y-2">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                        {pendingOperations.length} pending approval{pendingOperations.length > 1 ? "s" : ""}
                    </p>
                    {pendingOperations.map((op) => (
                        <div
                            key={op.operationId}
                            className="flex items-start gap-3 p-3 rounded-md border bg-card"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-[10px] h-5">
                                        {op.type}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                    {op.description}
                                </p>
                                {op.preview && (
                                    <pre className="mt-1 text-[11px] bg-muted rounded p-2 max-h-16 overflow-hidden text-ellipsis">
                                        {op.preview.substring(0, 200)}
                                        {op.preview.length > 200 ? "…" : ""}
                                    </pre>
                                )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => approveOperation(op.operationId)}
                                >
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Approve
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs text-red-500 hover:text-red-600"
                                    onClick={() => rejectOperation(op.operationId)}
                                >
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Reject
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Messages Area */}
            <ScrollArea ref={scrollRef} className="flex-1 px-4 py-4">
                {messages.length === 0 ? (
                    <EmptyState
                        onSuggestionClick={(msg) => sendMessage(msg)}
                        onCleanClick={() => cleanCollection()}
                        isDisabled={isStreaming}
                        mode={mode}
                    />
                ) : (
                    <div className="space-y-4">
                        {messages.map((message) => (
                            <MessageBubble key={message.id} message={message} />
                        ))}
                        {isStreaming && (
                            <div className="flex items-center gap-2 text-muted-foreground pl-10">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm">Agent is working…</span>
                            </div>
                        )}
                    </div>
                )}
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t px-4 py-3">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask the agent to analyze, reorg, or improve chunks…"
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
            </div>
        </div>
    );
}

// --- Sub-components ---

function ModeBadge({ mode }: { mode: AgentMode }) {
    if (mode === "automatic") {
        return (
            <Badge variant="outline" className="text-[10px] h-5 border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-950/30">
                <Zap className="h-2.5 w-2.5 mr-1" />
                Automatic
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="text-[10px] h-5 border-blue-300 text-blue-600 bg-blue-50 dark:bg-blue-950/30">
            <ShieldCheck className="h-2.5 w-2.5 mr-1" />
            HITL
        </Badge>
    );
}

function EmptyState({
    onSuggestionClick,
    onCleanClick,
    isDisabled,
    mode,
}: {
    onSuggestionClick: (msg: string) => void;
    onCleanClick: () => void;
    isDisabled: boolean;
    mode: AgentMode;
}) {
    return (
        <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <div className="p-4 rounded-full bg-indigo-50 dark:bg-indigo-950/30 mb-4">
                <Bot className="h-8 w-8 text-indigo-400" />
            </div>
            <h3 className="font-medium mb-1">Collection AI Agent</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-1">
                Analyze quality, find duplicates, reorganize chunks, and improve your knowledge base.
            </p>
            <p className="text-xs text-muted-foreground mb-6 flex items-center gap-1">
                <Info className="h-3 w-3" />
                {mode === "hitl"
                    ? "HITL mode — all changes require your approval"
                    : "Automatic mode — agent executes changes automatically"}
            </p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                {SUGGESTIONS.map((s) => (
                    <Button
                        key={s.label}
                        variant="outline"
                        size="sm"
                        className="text-xs justify-start h-auto py-2 px-3 whitespace-normal text-left"
                        onClick={() => 'action' in s ? onCleanClick() : onSuggestionClick(s.message!)}
                        disabled={isDisabled}
                    >
                        {s.label}
                    </Button>
                ))}
            </div>
        </div>
    );
}

function MessageBubble({ message }: { message: Message }) {
    const isUser = message.role === "user";
    const isSystem = message.role === "system";

    if (isSystem) {
        return (
            <div className="flex justify-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <Zap className="h-3 w-3 text-amber-500" />
                    <span className="text-xs text-amber-700 dark:text-amber-400">
                        {message.content}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "")}>
            {/* Avatar */}
            <div
                className={cn(
                    "shrink-0 h-7 w-7 rounded-full flex items-center justify-center",
                    isUser ? "bg-primary" : "bg-indigo-100 dark:bg-indigo-950"
                )}
            >
                {isUser ? (
                    <User className="h-3.5 w-3.5 text-primary-foreground" />
                ) : (
                    <Bot className="h-3.5 w-3.5 text-indigo-500" />
                )}
            </div>

            {/* Content */}
            <div className={cn("flex flex-col max-w-[80%] gap-2 overflow-hidden", isUser ? "items-end" : "items-start")}>
                {message.content && (
                    <div
                        className={cn(
                            "rounded-lg px-4 py-2.5",
                            isUser ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}
                    >
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                )}

                {/* Tool Calls */}
                {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="w-full space-y-1.5 overflow-hidden">
                        {message.toolCalls.map((tc, i) => (
                            <AgentToolCallCard key={`${tc.tool}-${i}`} toolCall={tc} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
