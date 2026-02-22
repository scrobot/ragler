"use client";

import { useQuery } from "@tanstack/react-query";
import { documentsApi, DocumentSummary } from "@/lib/api/documents";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
    Globe,
    FileText,
    Pencil,
    Upload,
    ExternalLink,
    BarChart3,
} from "lucide-react";

interface DocumentBrowserProps {
    collectionId: string;
    onSelectDocument?: (sourceId: string) => void;
}

const SOURCE_TYPE_CONFIG: Record<
    string,
    { icon: React.ComponentType<{ className?: string }>; label: string; color: string }
> = {
    confluence: { icon: Globe, label: "Confluence", color: "bg-blue-500/10 text-blue-500" },
    web: { icon: Globe, label: "Web", color: "bg-emerald-500/10 text-emerald-500" },
    manual: { icon: Pencil, label: "Manual", color: "bg-amber-500/10 text-amber-500" },
    file: { icon: Upload, label: "File", color: "bg-violet-500/10 text-violet-500" },
};

function QualityBadge({ score }: { score: number | null }) {
    if (score === null) {
        return (
            <Badge variant="outline" className="text-xs text-muted-foreground">
                No score
            </Badge>
        );
    }

    const color =
        score >= 80
            ? "bg-green-500/10 text-green-600 border-green-500/20"
            : score >= 50
                ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                : "bg-red-500/10 text-red-600 border-red-500/20";

    return (
        <Badge variant="outline" className={`text-xs ${color}`}>
            <BarChart3 className="h-3 w-3 mr-1" />
            {score}%
        </Badge>
    );
}

function DocumentCard({
    document,
    onClick,
}: {
    document: DocumentSummary;
    onClick?: () => void;
}) {
    const config = SOURCE_TYPE_CONFIG[document.sourceType] || SOURCE_TYPE_CONFIG.web;
    const Icon = config.icon;

    return (
        <button
            onClick={onClick}
            className="w-full text-left p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`p-2 rounded-md ${config.color} shrink-0`}>
                        <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm truncate">
                            {document.title || document.filename || document.sourceUrl}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {document.filename || document.sourceUrl}
                        </p>
                    </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>

            <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                    {document.chunkCount} chunk{document.chunkCount !== 1 ? "s" : ""}
                </Badge>
                <Badge variant="outline" className={`text-xs ${config.color}`}>
                    {config.label}
                </Badge>
                <QualityBadge score={document.avgQualityScore} />
                {document.ingestDate && (
                    <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(document.ingestDate).toLocaleDateString()}
                    </span>
                )}
            </div>
        </button>
    );
}

export function DocumentBrowser({
    collectionId,
    onSelectDocument,
}: DocumentBrowserProps) {
    const { data, isLoading, error } = useQuery({
        queryKey: ["collection-documents", collectionId],
        queryFn: () => documentsApi.list(collectionId),
    });

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <p>Failed to load documents</p>
            </div>
        );
    }

    if (!data?.documents.length) {
        return (
            <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No documents yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                    Ingest content to see it organized by source document
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>{data.total} document{data.total !== 1 ? "s" : ""}</span>
            </div>
            {data.documents.map((doc) => (
                <DocumentCard
                    key={doc.sourceId}
                    document={doc}
                    onClick={() => onSelectDocument?.(doc.sourceId)}
                />
            ))}
        </div>
    );
}
