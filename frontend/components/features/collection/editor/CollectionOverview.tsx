"use client";

import { useQuery } from "@tanstack/react-query";
import { collectionsApi } from "@/lib/api/collections";
import { documentsApi, DocumentSummary } from "@/lib/api/documents";
import { Collection } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Database,
    FileText,
    Globe,
    Pencil,
    Upload,
    BarChart3,
    Calendar,
    User,
} from "lucide-react";
import { format } from "date-fns";

interface CollectionOverviewProps {
    collectionId: string;
    collection: Collection | undefined;
    totalChunks: number;
}

const SOURCE_TYPE_CONFIG: Record<
    string,
    { icon: React.ComponentType<{ className?: string }>; label: string; color: string }
> = {
    confluence: { icon: Globe, label: "Confluence", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
    web: { icon: Globe, label: "Web", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
    manual: { icon: Pencil, label: "Manual", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
    file: { icon: Upload, label: "File", color: "bg-violet-500/10 text-violet-500 border-violet-500/20" },
};

function computeSourceBreakdown(documents: DocumentSummary[]): Record<string, { count: number; chunks: number }> {
    const breakdown: Record<string, { count: number; chunks: number }> = {};
    for (const doc of documents) {
        const type = doc.sourceType;
        if (!breakdown[type]) {
            breakdown[type] = { count: 0, chunks: 0 };
        }
        breakdown[type].count += 1;
        breakdown[type].chunks += doc.chunkCount;
    }
    return breakdown;
}

function computeAvgQuality(documents: DocumentSummary[]): number | null {
    const scores = documents
        .map((d) => d.avgQualityScore)
        .filter((s): s is number => s !== null);
    if (scores.length === 0) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function CollectionOverview({
    collectionId,
    collection,
    totalChunks,
}: CollectionOverviewProps) {
    const { data: docsData, isLoading: isLoadingDocs } = useQuery({
        queryKey: ["collection-documents", collectionId],
        queryFn: () => documentsApi.list(collectionId),
    });

    const documents = docsData?.documents ?? [];
    const totalDocuments = docsData?.total ?? 0;
    const avgQuality = computeAvgQuality(documents);
    const sourceBreakdown = computeSourceBreakdown(documents);

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    icon={Database}
                    label="Total Chunks"
                    value={totalChunks.toLocaleString()}
                />
                <StatCard
                    icon={FileText}
                    label="Documents"
                    value={isLoadingDocs ? "…" : totalDocuments.toLocaleString()}
                />
                <StatCard
                    icon={BarChart3}
                    label="Avg Quality"
                    value={
                        isLoadingDocs
                            ? "…"
                            : avgQuality !== null
                                ? `${avgQuality}%`
                                : "N/A"
                    }
                    valueColor={
                        avgQuality !== null
                            ? avgQuality >= 80
                                ? "text-green-600"
                                : avgQuality >= 50
                                    ? "text-yellow-600"
                                    : "text-red-600"
                            : undefined
                    }
                />
                <StatCard
                    icon={Globe}
                    label="Source Types"
                    value={isLoadingDocs ? "…" : Object.keys(sourceBreakdown).length.toString()}
                />
            </div>

            {/* Collection Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Collection Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Created by</span>
                        <span className="font-medium">{collection?.createdBy ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Created at</span>
                        <span className="font-medium">
                            {collection?.createdAt
                                ? format(new Date(collection.createdAt), "PPp")
                                : "—"}
                        </span>
                    </div>
                    {collection?.description && (
                        <div className="pt-2 border-t">
                            <p className="text-sm text-muted-foreground">{collection.description}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Source Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Sources Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoadingDocs ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-10 w-full" />
                            ))}
                        </div>
                    ) : Object.keys(sourceBreakdown).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No documents ingested yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {Object.entries(sourceBreakdown).map(([type, stats]) => {
                                const config = SOURCE_TYPE_CONFIG[type] ?? SOURCE_TYPE_CONFIG.web;
                                const Icon = config.icon;
                                return (
                                    <div
                                        key={type}
                                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-md ${config.color}`}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium">{config.label}</span>
                                                <p className="text-xs text-muted-foreground">
                                                    {stats.count} document{stats.count !== 1 ? "s" : ""}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className="text-xs">
                                            {stats.chunks} chunk{stats.chunks !== 1 ? "s" : ""}
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
    valueColor,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    valueColor?: string;
}) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className={`text-lg font-bold ${valueColor ?? ""}`}>{value}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
