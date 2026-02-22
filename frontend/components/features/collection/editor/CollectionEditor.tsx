"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { collectionsApi } from "@/lib/api/collections";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Database,
  Wand2,
  RefreshCw,
  FileText,
  Layers,
  MessageCircle,
  LayoutGrid,
} from "lucide-react";
import { CollectionChunkList } from "./CollectionChunkList";
import { DocumentBrowser } from "./DocumentBrowser";
import { FilterPanel, FilterValues } from "./FilterPanel";
import { ChatPlayground } from "./ChatPlayground";
import { CollectionOverview } from "./CollectionOverview";
import { AIAssistantPanel } from "./ai/AIAssistantPanel";

interface CollectionEditorProps {
  collectionId: string;
}

export function CollectionEditor({ collectionId }: CollectionEditorProps) {
  const queryClient = useQueryClient();
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterValues>({});
  const limit = 20;

  const { data: collection, isLoading: isLoadingCollection } = useQuery({
    queryKey: ["collection", collectionId],
    queryFn: () => collectionsApi.get(collectionId),
  });

  const {
    data: chunksData,
    isLoading: isLoadingChunks,
    error,
    isFetching,
  } = useQuery({
    queryKey: ["collection-chunks", collectionId, page, limit, filters, selectedSourceId],
    queryFn: () =>
      collectionsApi.listChunks(collectionId, {
        limit,
        offset: page * limit,
        sortBy: "position",
        sortOrder: "asc",
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.sourceType ? { sourceType: filters.sourceType } : {}),
        ...(selectedSourceId ? { sourceId: selectedSourceId } : {}),
        ...(filters.minQuality !== undefined ? { minQuality: filters.minQuality } : {}),
        ...(filters.maxQuality !== undefined ? { maxQuality: filters.maxQuality } : {}),
        ...(filters.tags ? { tags: filters.tags } : {}),
      }),
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["collection-chunks", collectionId] });
    queryClient.invalidateQueries({ queryKey: ["collection-documents", collectionId] });
  };

  const handleSelectDocument = (sourceId: string) => {
    setSelectedSourceId(sourceId);
    setFilters({});
    setActiveTab("chunks");
    setPage(0);
  };

  const handleFiltersChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
    setPage(0);
  };

  const handleClearFilter = () => {
    setSelectedSourceId(null);
  };

  if (isLoadingCollection) {
    return (
      <div className="container mx-auto py-10 space-y-8 max-w-4xl">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur pb-6 border-b mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Link
              href="/collections"
              className="hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span>/</span>
            <span>collections</span>
            <span>/</span>
            <span className="font-mono text-xs">
              {collectionId.substring(0, 8)}...
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {collection?.name || "Collection Editor"}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Database className="h-4 w-4" />
              <span>{chunksData?.total ?? 0} chunks</span>
              {collection?.description && (
                <>
                  <span className="text-muted-foreground/50">|</span>
                  <span className="truncate max-w-[300px]">
                    {collection.description}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isFetching}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsAIPanelOpen(true)}
            >
              <Wand2 className="mr-2 h-4 w-4" />
              AI Assistant
            </Button>
          </div>
        </div>
      </div>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="chunks" className="gap-2">
            <Layers className="h-4 w-4" />
            All Chunks
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <CollectionOverview
            collectionId={collectionId}
            collection={collection}
            totalChunks={chunksData?.total ?? 0}
          />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentBrowser
            collectionId={collectionId}
            onSelectDocument={handleSelectDocument}
          />
        </TabsContent>

        <TabsContent value="chunks">
          <div className="space-y-4">
            <FilterPanel filters={filters} onChange={handleFiltersChange} />

            {selectedSourceId && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                <span className="text-sm text-muted-foreground">
                  Filtered by document:
                </span>
                <code className="text-xs font-mono bg-background px-2 py-0.5 rounded">
                  {selectedSourceId.substring(0, 16)}...
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilter}
                  className="ml-auto text-xs"
                >
                  Clear filter
                </Button>
              </div>
            )}
            {isLoadingChunks ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">Failed to load chunks</p>
                <p className="text-xs mt-1">This collection may not have been published yet.</p>
              </div>
            ) : (
              <CollectionChunkList
                collectionId={collectionId}
                chunks={chunksData?.chunks ?? []}
                total={chunksData?.total ?? 0}
                page={page}
                limit={limit}
                onPageChange={setPage}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="chat">
          <ChatPlayground collectionId={collectionId} />
        </TabsContent>
      </Tabs>

      {/* AI Assistant Panel */}
      <AIAssistantPanel
        collectionId={collectionId}
        userId="demo-user"
        open={isAIPanelOpen}
        onOpenChange={setIsAIPanelOpen}
      />
    </div>
  );
}
