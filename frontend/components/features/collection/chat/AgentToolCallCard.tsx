"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolCall } from "../editor/ai/useCollectionAgent";

const TOOL_LABELS: Record<string, { label: string; color: string }> = {
    analyze_quality: { label: "Analyze Quality", color: "text-blue-500" },
    analyze_collection_quality: { label: "Analyze Quality", color: "text-blue-500" },
    score_chunk: { label: "Score Chunk", color: "text-amber-500" },
    suggest_operation: { label: "Suggest Operation", color: "text-purple-500" },
    get_chunk: { label: "Get Chunk", color: "text-cyan-500" },
    get_chunk_content: { label: "Get Chunk", color: "text-cyan-500" },
    get_chunks_context: { label: "Get Chunks Context", color: "text-teal-500" },
    execute_operation: { label: "Execute Operation", color: "text-red-500" },
    list_collections: { label: "List Collections", color: "text-emerald-500" },
    scroll_chunks: { label: "Browse Chunks", color: "text-blue-500" },
    search_chunks: { label: "Search Chunks", color: "text-violet-500" },
    count_chunks: { label: "Count Chunks", color: "text-sky-500" },
    update_chunk_payload: { label: "Update Payload", color: "text-orange-500" },
    upsert_chunk: { label: "Upsert Chunk", color: "text-green-500" },
    delete_chunks: { label: "Delete Chunks", color: "text-red-500" },
};

interface AgentToolCallCardProps {
    toolCall: ToolCall;
}

export function AgentToolCallCard({ toolCall }: AgentToolCallCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const config = TOOL_LABELS[toolCall.tool] ?? { label: toolCall.tool, color: "text-muted-foreground" };

    const statusIcon =
        toolCall.status === "pending" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : toolCall.status === "complete" ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
        ) : (
            <XCircle className="h-3.5 w-3.5 text-red-500" />
        );

    return (
        <div className="rounded-md border bg-card text-xs">
            <button
                type="button"
                className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {isExpanded ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                ) : (
                    <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                )}
                <span className={cn("font-mono font-medium", config.color)}>
                    {config.label}
                </span>
                <span className="ml-auto">{statusIcon}</span>
            </button>

            {isExpanded && (
                <div className="border-t px-3 py-2 space-y-2">
                    {toolCall.input !== undefined && (
                        <div>
                            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Input</p>
                            <pre className="bg-muted rounded p-2 text-[11px] leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap break-words">
                                {typeof toolCall.input === "string"
                                    ? toolCall.input
                                    : JSON.stringify(toolCall.input, null, 2)}
                            </pre>
                        </div>
                    )}
                    {toolCall.output !== undefined && (
                        <div>
                            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Output</p>
                            <pre className="bg-muted rounded p-2 text-[11px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
                                {typeof toolCall.output === "string"
                                    ? toolCall.output
                                    : JSON.stringify(toolCall.output, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
