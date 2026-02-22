"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { chatApi, ChatCitation } from "@/lib/api/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Send,
    Bot,
    User,
    Loader2,
    FileText,
    Sparkles,
} from "lucide-react";

interface Message {
    role: "user" | "assistant";
    content: string;
    citations?: ChatCitation[];
}

interface ChatPlaygroundProps {
    collectionId: string;
}

export function ChatPlayground({ collectionId }: ChatPlaygroundProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [sessionId, setSessionId] = useState<string | undefined>();
    const scrollRef = useRef<HTMLDivElement>(null);

    const mutation = useMutation({
        mutationFn: (message: string) =>
            chatApi.send(collectionId, message, sessionId),
        onSuccess: (data) => {
            setSessionId(data.sessionId);
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: data.answer,
                    citations: data.citations,
                },
            ]);
        },
        onError: () => {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: "Sorry, something went wrong. Please try again.",
                },
            ]);
        },
    });

    const handleSend = () => {
        const trimmed = input.trim();
        if (!trimmed || mutation.isPending) return;

        setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
        setInput("");
        mutation.mutate(trimmed);
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="flex flex-col h-[600px] rounded-lg border bg-card overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 p-4 border-b bg-muted/30">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-medium text-sm">Knowledge Chat</h3>
                <Badge variant="outline" className="text-xs ml-auto">
                    RAG
                </Badge>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <Bot className="h-12 w-12 text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">
                            Ask questions about your knowledge base
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Responses are grounded in your collection&apos;s chunks
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"
                                    }`}
                            >
                                {msg.role === "assistant" && (
                                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <Bot className="h-4 w-4 text-primary" />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[80%] rounded-lg p-3 text-sm ${msg.role === "user"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted"
                                        }`}
                                >
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                    {msg.citations && msg.citations.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                                            <p className="text-xs font-medium opacity-70">Sources:</p>
                                            {msg.citations.map((citation, cidx) => (
                                                <div
                                                    key={cidx}
                                                    className="flex items-start gap-1.5 text-xs opacity-60"
                                                >
                                                    <FileText className="h-3 w-3 mt-0.5 shrink-0" />
                                                    <span className="line-clamp-1">
                                                        {citation.content.substring(0, 100)}...
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] shrink-0 ml-auto"
                                                    >
                                                        {Math.round(citation.score * 100)}%
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {msg.role === "user" && (
                                    <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center shrink-0">
                                        <User className="h-4 w-4" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {mutation.isPending && (
                            <div className="flex gap-3">
                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <Bot className="h-4 w-4 text-primary" />
                                </div>
                                <div className="bg-muted rounded-lg p-3">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                    }}
                    className="flex gap-2"
                >
                    <Input
                        placeholder="Ask a question..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={mutation.isPending}
                        className="flex-1"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!input.trim() || mutation.isPending}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
