"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { collectionsApi } from "@/lib/api/collections";
import { EditorChunk } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Merge, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { CollectionChunkItem } from "./CollectionChunkItem";

interface CollectionChunkListProps {
  collectionId: string;
  chunks: EditorChunk[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export function CollectionChunkList({
  collectionId,
  chunks,
  total,
  page,
  limit,
  onPageChange,
}: CollectionChunkListProps) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const totalPages = Math.ceil(total / limit);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ chunkId, content }: { chunkId: string; content: string }) =>
      collectionsApi.updateChunk(collectionId, chunkId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["collection-chunks", collectionId],
      });
      toast.success("Chunk updated");
    },
    onError: () => {
      toast.error("Failed to update chunk");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (chunkId: string) =>
      collectionsApi.deleteChunk(collectionId, chunkId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["collection-chunks", collectionId],
      });
      toast.success("Chunk deleted");
    },
    onError: () => {
      toast.error("Failed to delete chunk");
    },
  });

  const mergeMutation = useMutation({
    mutationFn: (chunkIds: string[]) =>
      collectionsApi.mergeChunks(collectionId, { chunkIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["collection-chunks", collectionId],
      });
      setSelectedIds(new Set());
      toast.success("Chunks merged");
    },
    onError: () => {
      toast.error("Failed to merge chunks");
    },
  });

  const splitMutation = useMutation({
    mutationFn: ({ chunkId, content }: { chunkId: string; content: string }) => {
      // Split at paragraph breaks or in half
      const midpoint = Math.floor(content.length / 2);
      const paragraphBreak = content.indexOf("\n\n", midpoint - 200);
      const splitPoint =
        paragraphBreak > midpoint - 200 && paragraphBreak < midpoint + 200
          ? paragraphBreak
          : midpoint;

      return collectionsApi.splitChunk(collectionId, chunkId, {
        splitPoints: [splitPoint],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["collection-chunks", collectionId],
      });
      toast.success("Chunk split");
    },
    onError: () => {
      toast.error("Failed to split chunk");
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
    // Sort selected IDs by their position in the current chunks array
    const sortedIds = [...selectedIds].sort((a, b) => {
      const indexA = chunks.findIndex((c) => c.id === a);
      const indexB = chunks.findIndex((c) => c.id === b);
      return indexA - indexB;
    });
    mergeMutation.mutate(sortedIds);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected chunks?`)) return;

    Promise.all([...selectedIds].map((id) => deleteMutation.mutateAsync(id)))
      .then(() => {
        setSelectedIds(new Set());
        toast.success(`Deleted ${selectedIds.size} chunks`);
      })
      .catch(() => {
        toast.error("Failed to delete some chunks");
      });
  };

  const handleUpdate = (id: string, content: string) => {
    updateMutation.mutate({ chunkId: id, content });
  };

  const handleSplit = (chunk: EditorChunk) => {
    if (chunk.content.length < 100) {
      toast.error("Chunk is too short to split");
      return;
    }
    if (confirm("Split this chunk into two?")) {
      splitMutation.mutate({ chunkId: chunk.id, content: chunk.content });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this chunk?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Floating Action Bar for Selection */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-2 rounded-full shadow-lg flex items-center gap-4">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>

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
            variant="secondary"
            className="rounded-full h-8 text-destructive"
            onClick={handleBulkDelete}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-3 w-3 mr-2" />
            Delete
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

      {/* Chunk List */}
      {chunks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No chunks in this collection</p>
        </div>
      ) : (
        chunks.map((chunk, index) => (
          <CollectionChunkItem
            key={chunk.id}
            chunk={chunk}
            index={page * limit + index}
            isSelected={selectedIds.has(chunk.id)}
            onToggleSelect={toggleSelect}
            onUpdate={handleUpdate}
            onSplit={() => handleSplit(chunk)}
            onDelete={() => handleDelete(chunk.id)}
            isUpdating={
              updateMutation.isPending &&
              updateMutation.variables?.chunkId === chunk.id
            }
          />
        ))
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
