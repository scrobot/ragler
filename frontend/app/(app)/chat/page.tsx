"use client";

import { useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { collectionsApi } from "@/lib/api/collections";
import { AgentChat } from "@/components/features/collection/chat/AgentChat";
import { ChatSessionSidebar } from "@/components/features/collection/chat/ChatSessionSidebar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Sparkles, PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ChatPage() {
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // chatKey only changes on EXPLICIT user actions (new chat, session switch)
    // so sending a first message doesn't remount the component
    const [chatKey, setChatKey] = useState(0);

    // Ref to trigger sidebar refresh without remounting
    const sidebarRefreshRef = useRef<() => void>(() => { });

    const { data, isLoading } = useQuery({
        queryKey: ["collections"],
        queryFn: collectionsApi.list,
    });

    const handleNewChat = useCallback(() => {
        setActiveSessionId(null);
        setChatKey((k) => k + 1);
    }, []);

    const handleSessionSelect = useCallback((sessionId: string) => {
        setActiveSessionId(sessionId);
        setChatKey((k) => k + 1);
    }, []);

    // Called by AgentChat after backend auto-creates the session
    const handleSessionCreated = useCallback((_sessionId: string) => {
        // Refresh the sidebar after a short delay to give the backend time
        // to auto-create the session in Redis before we fetch the list
        setTimeout(() => sidebarRefreshRef.current(), 2000);
    }, []);

    return (
        <div className="flex h-[calc(100vh-64px)]">
            {/* Sidebar */}
            {selectedCollectionId && isSidebarOpen && (
                <div className="w-64 flex-shrink-0">
                    <ChatSessionSidebar
                        collectionId={selectedCollectionId}
                        activeSessionId={activeSessionId}
                        onSessionSelect={handleSessionSelect}
                        onNewChat={handleNewChat}
                        refreshRef={sidebarRefreshRef}
                    />
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div className="flex items-center gap-3">
                        {selectedCollectionId && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            >
                                {isSidebarOpen ? (
                                    <PanelLeftClose className="h-4 w-4" />
                                ) : (
                                    <PanelLeft className="h-4 w-4" />
                                )}
                            </Button>
                        )}
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">Knowledge Chat</h1>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                AI-powered analysis and management of your knowledge base
                            </p>
                        </div>
                    </div>

                    <Select
                        value={selectedCollectionId ?? ""}
                        onValueChange={(v) => {
                            setSelectedCollectionId(v || null);
                            setActiveSessionId(null);
                            setChatKey((k) => k + 1);
                        }}
                    >
                        <SelectTrigger className="w-56">
                            <SelectValue placeholder="Select a collection…" />
                        </SelectTrigger>
                        <SelectContent>
                            {isLoading ? (
                                <SelectItem value="_loading" disabled>
                                    Loading…
                                </SelectItem>
                            ) : data?.collections.length === 0 ? (
                                <SelectItem value="_empty" disabled>
                                    No collections available
                                </SelectItem>
                            ) : (
                                data?.collections.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.name}
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-hidden p-4">
                    {selectedCollectionId ? (
                        <AgentChat
                            key={chatKey}
                            collectionId={selectedCollectionId}
                            sessionId={activeSessionId ?? undefined}
                            onSessionCreated={handleSessionCreated}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full rounded-lg border bg-card text-center">
                            <div className="p-4 rounded-full bg-muted mb-4">
                                <Sparkles className="h-8 w-8 text-muted-foreground/40" />
                            </div>
                            <h3 className="font-medium text-muted-foreground mb-1">
                                Select a collection to start chatting
                            </h3>
                            <p className="text-xs text-muted-foreground max-w-sm">
                                Choose a knowledge collection above to chat with the AI agent. It can analyze quality, reorganize chunks, and improve your knowledge base.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
