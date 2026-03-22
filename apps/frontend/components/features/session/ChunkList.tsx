"use client";

import { useState } from "react";
import { Chunk } from "@/types/api";
import { ChunkItem } from "./ChunkItem";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Merge, Plus, X, Loader2, PenLine, Globe, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { sessionsApi } from "@/lib/api/sessions";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface ChunkListProps {
    sessionId: string;
    chunks: Chunk[];
}

type AddMode = null | "manual" | "agent";

export function ChunkList({ sessionId, chunks }: ChunkListProps) {
    const queryClient = useQueryClient();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [addMode, setAddMode] = useState<AddMode>(null);
    const [newChunkText, setNewChunkText] = useState("");
    const [agentPrompt, setAgentPrompt] = useState("");

    // Mutations
    const updateMutation = useMutation({
        mutationFn: ({ chunkId, text }: { chunkId: string; text: string }) =>
            sessionsApi.updateChunk(sessionId, chunkId, { text }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
            toast.success("Chunk updated");
        },
    });

    const mergeMutation = useMutation({
        mutationFn: (chunkIds: string[]) =>
            sessionsApi.mergeChunks(sessionId, { chunkIds }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
            setSelectedIds(new Set());
            toast.success("Chunks merged");
        },
    });

    const splitMutation = useMutation({
        mutationFn: ({ chunkId }: { chunkId: string }) =>
            sessionsApi.splitChunk(sessionId, chunkId, {
                splitPoints: [Math.floor(chunks.find(c => c.id === chunkId)!.text.length / 2)]
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
            toast.success("Chunk split");
        },
    });

    const addMutation = useMutation({
        mutationFn: (text: string) =>
            sessionsApi.addChunk(sessionId, text),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
            setNewChunkText("");
            setAddMode(null);
            toast.success("Chunk added");
        },
        onError: () => {
            toast.error("Failed to add chunk");
        },
    });

    const generateMutation = useMutation({
        mutationFn: (prompt: string) =>
            sessionsApi.generateChunk(sessionId, prompt),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
            setAgentPrompt("");
            setAddMode(null);
            toast.success("Chunk generated from web search");
        },
        onError: () => {
            toast.error("Failed to generate chunk");
        },
    });

    // Handlers
    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleMerge = () => {
        if (selectedIds.size < 2) return;
        mergeMutation.mutate(Array.from(selectedIds));
    };

    const handleUpdate = (id: string, text: string) => {
        updateMutation.mutate({ chunkId: id, text });
    };

    const handleSplit = (id: string) => {
        if (confirm("Split this chunk into two?")) {
            splitMutation.mutate({ chunkId: id });
        }
    };

    const handleAddManual = () => {
        const trimmed = newChunkText.trim();
        if (!trimmed) return;
        addMutation.mutate(trimmed);
    };

    const handleGenerate = () => {
        const trimmed = agentPrompt.trim();
        if (!trimmed) return;
        generateMutation.mutate(trimmed);
    };

    const handleCancel = () => {
        setAddMode(null);
        setNewChunkText("");
        setAgentPrompt("");
    };

    return (
        <div className="space-y-4 pb-20">
            {/* Floating Action Bar for Selection */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-2 rounded-full shadow-lg flex items-center gap-4">
                    <span className="text-sm font-medium">{selectedIds.size} selected</span>

                    <div className="h-4 w-px bg-background/20" />

                    <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-full h-8"
                        onClick={handleMerge}
                        disabled={selectedIds.size < 2 || mergeMutation.isPending}
                    >
                        <Merge className="h-3 w-3 mr-2" />
                        Merge
                    </Button>

                    <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full h-8 text-background hover:bg-background/20 hover:text-background"
                        onClick={() => setSelectedIds(new Set())}
                    >
                        Clear
                    </Button>
                </div>
            )}

            {chunks.map((chunk) => (
                <div key={chunk.id} className="group">
                    <ChunkItem
                        chunk={chunk}
                        isSelected={selectedIds.has(chunk.id)}
                        onToggleSelect={toggleSelect}
                        onUpdate={handleUpdate}
                        onSplit={handleSplit}
                        isUpdating={updateMutation.isPending && updateMutation.variables?.chunkId === chunk.id}
                    />
                </div>
            ))}

            {/* Add Chunk Section */}
            {addMode === "manual" && (
                <div className="border border-dashed border-indigo-500/50 rounded-lg p-4 space-y-3 bg-indigo-500/5">
                    <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium mb-1">
                        <PenLine className="h-3 w-3" />
                        Manual Chunk
                    </div>
                    <textarea
                        value={newChunkText}
                        onChange={(e) => setNewChunkText(e.target.value)}
                        placeholder="Type or paste your chunk content here…"
                        className="w-full min-h-[120px] rounded-md border bg-background p-3 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        autoFocus
                    />
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={handleCancel} disabled={addMutation.isPending}>
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                        </Button>
                        <Button size="sm" onClick={handleAddManual} disabled={!newChunkText.trim() || addMutation.isPending}>
                            {addMutation.isPending ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                                <Plus className="h-3 w-3 mr-1" />
                            )}
                            Add Chunk
                        </Button>
                    </div>
                </div>
            )}

            {addMode === "agent" && (
                <div className="border border-dashed border-emerald-500/50 rounded-lg p-4 space-y-3 bg-emerald-500/5">
                    <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium mb-1">
                        <Sparkles className="h-3 w-3" />
                        AI Web Search
                    </div>
                    <textarea
                        value={agentPrompt}
                        onChange={(e) => setAgentPrompt(e.target.value)}
                        placeholder="Describe what you need, e.g. &quot;When did Phil Spencer leave Microsoft and who replaced him?&quot;"
                        className="w-full min-h-[80px] rounded-md border bg-background p-3 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        autoFocus
                        disabled={generateMutation.isPending}
                    />
                    {generateMutation.isPending && (
                        <div className="flex items-center gap-2 text-xs text-emerald-400 py-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Searching the web and generating chunk…
                        </div>
                    )}
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={handleCancel} disabled={generateMutation.isPending}>
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleGenerate}
                            disabled={!agentPrompt.trim() || generateMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {generateMutation.isPending ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                                <Globe className="h-3 w-3 mr-1" />
                            )}
                            Search & Generate
                        </Button>
                    </div>
                </div>
            )}

            {addMode === null && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="w-full border border-dashed border-zinc-700 rounded-lg py-3 text-sm text-muted-foreground hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-500/5 transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Add Chunk
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-56">
                        <DropdownMenuItem onClick={() => setAddMode("manual")} className="cursor-pointer">
                            <PenLine className="h-4 w-4 mr-2" />
                            Manual
                            <span className="ml-auto text-xs text-muted-foreground">Type text</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAddMode("agent")} className="cursor-pointer">
                            <Sparkles className="h-4 w-4 mr-2 text-emerald-400" />
                            Create by Agent
                            <span className="ml-auto text-xs text-muted-foreground">Web search</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
}
