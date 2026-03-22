'use client';

import { useState, useEffect, useCallback, type MutableRefObject } from 'react';
import { Plus, Trash2, MessageSquare, PenLine } from 'lucide-react';
import { collectionsApi } from '@/lib/api/collections';

interface ChatSession {
    id: string;
    title: string;
    collectionId: string;
    createdAt: string;
    updatedAt: string;
}

interface ChatSessionSidebarProps {
    collectionId: string;
    activeSessionId: string | null;
    onSessionSelect: (sessionId: string) => void;
    onNewChat: () => void;
    refreshRef?: MutableRefObject<() => void>;
}

export function ChatSessionSidebar({
    collectionId,
    activeSessionId,
    onSessionSelect,
    onNewChat,
    refreshRef,
}: ChatSessionSidebarProps) {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

    const loadSessions = useCallback(async () => {
        if (!collectionId) return;
        setIsLoading(true);
        try {
            const result = await collectionsApi.listSessions(collectionId);
            setSessions(result.sessions);
        } catch (error) {
            console.error('Failed to load sessions:', error);
        } finally {
            setIsLoading(false);
        }
    }, [collectionId]);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    // Expose refresh to parent via ref
    useEffect(() => {
        if (refreshRef) {
            refreshRef.current = loadSessions;
        }
    }, [refreshRef, loadSessions]);

    const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await collectionsApi.deleteAgentSession(collectionId, sessionId);
            setSessions((prev) => prev.filter((s) => s.id !== sessionId));
            if (activeSessionId === sessionId) {
                onNewChat();
            }
        } catch (error) {
            console.error('Failed to delete session:', error);
        }
    };

    const handleRename = async (sessionId: string) => {
        if (!editTitle.trim()) {
            setEditingId(null);
            return;
        }
        try {
            await collectionsApi.renameSession(collectionId, sessionId, editTitle.trim());
            setSessions((prev) =>
                prev.map((s) => (s.id === sessionId ? { ...s, title: editTitle.trim() } : s)),
            );
        } catch (error) {
            console.error('Failed to rename session:', error);
        }
        setEditingId(null);
    };

    const startEditing = (session: ChatSession, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingId(session.id);
        setEditTitle(session.title);
    };

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="flex flex-col h-full bg-zinc-900/50 border-r border-zinc-800">
            {/* New Chat Button */}
            <div className="p-3 border-b border-zinc-800">
                <button
                    onClick={onNewChat}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Chat
                </button>
            </div>

            {/* Session List */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="p-4 text-sm text-zinc-500 text-center">Loading…</div>
                ) : sessions.length === 0 ? (
                    <div className="p-4 text-sm text-zinc-500 text-center">
                        No conversations yet
                    </div>
                ) : (
                    <div className="py-1">
                        {sessions.map((session) => {
                            const isActive = session.id === activeSessionId;
                            const isEditing = editingId === session.id;

                            return (
                                <div
                                    key={session.id}
                                    onClick={() => onSessionSelect(session.id)}
                                    className={`group flex items-start gap-2 px-3 py-2.5 mx-1 rounded-lg cursor-pointer transition-colors ${isActive
                                        ? 'bg-zinc-700/60 text-white'
                                        : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                                        }`}
                                >
                                    <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-50" />
                                    <div className="flex-1 min-w-0">
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleRename(session.id);
                                                    if (e.key === 'Escape') setEditingId(null);
                                                }}
                                                onBlur={() => handleRename(session.id)}
                                                className="w-full bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                autoFocus
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <div className="text-sm font-medium truncate">{session.title}</div>
                                        )}
                                        <div className="text-xs text-zinc-500 mt-0.5">
                                            {formatDate(session.updatedAt)}
                                        </div>
                                    </div>
                                    {/* Action buttons */}
                                    {!isEditing && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => startEditing(session, e)}
                                                className="p-1 rounded hover:bg-zinc-600 text-zinc-400 hover:text-white"
                                                title="Rename"
                                            >
                                                <PenLine className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(session.id, e)}
                                                className="p-1 rounded hover:bg-red-900/50 text-zinc-400 hover:text-red-400"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
