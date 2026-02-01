"use client";

import { useState } from "react";
import { Chunk, UserRole } from "@/types/api";
import { ChunkItem } from "./ChunkItem";
import { Button } from "@/components/ui/button";
import { Merge } from "lucide-react";
import { toast } from "sonner";
import { sessionsApi } from "@/lib/api/sessions";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface ChunkListProps {
    sessionId: string;
    chunks: Chunk[];
    role: UserRole;
}

export function ChunkList({ sessionId, chunks, role }: ChunkListProps) {
    const queryClient = useQueryClient();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
                // Default split behavior (e.g. split in half) or open a modal for precision
                // For MVP/Dev, we can just trigger a basic split or mock it
                splitPoints: [Math.floor(chunks.find(c => c.id === chunkId)!.text.length / 2)]
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
            toast.success("Chunk split");
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
                        role={role}
                        isSelected={selectedIds.has(chunk.id)}
                        onToggleSelect={toggleSelect}
                        onUpdate={handleUpdate}
                        onSplit={handleSplit}
                        isUpdating={updateMutation.isPending && updateMutation.variables?.chunkId === chunk.id}
                    />
                </div>
            ))}
        </div>
    );
}
