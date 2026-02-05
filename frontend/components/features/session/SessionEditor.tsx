"use client";

import { useQuery } from "@tanstack/react-query";
import { sessionsApi } from "@/lib/api/sessions";
import { ChunkList } from "./ChunkList";
import { RoleSwitcher } from "./RoleSwitcher";
import { SourcePreview } from "./SourcePreview";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, BookOpen, Send, LayoutTemplate, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { UserRole } from "@/types/api";
import { PublishModal } from "./PublishModal";
import { PreviewModal } from "./PreviewModal";

interface SessionEditorProps {
    sessionId: string;
}

export function SessionEditor({ sessionId }: SessionEditorProps) {
    // Local state for role (lifting it up from Switcher or using Context would be better, 
    // but for "Mock Dev Mode" we can rely on the Switcher setting the global API client 
    // and just syncing visual state here if needed, or better yet, using a small hook/store.
    // For now, I'll pass a default and let Switcher handle API, but UI needs re-render or context.
    // I will make RoleSwitcher trigger a re-render or use a shared state.
    // Actually, for simplicity in "Dev Mode", let's just make RoleSwitcher update internal state here too 
    // or I'll just rely on the API client headers being set. 
    // BUT the UI (e.g. Split button visibility) depends on the role state.
    // So I'll modify RoleSwitcher to accept a callback or I'll control it here.

    // Let's control it here for simplicity.
    // Wait, I already wrote RoleSwitcher as self-contained. I should modify it to accept `onRoleChange`.
    // Or I can just write it inline here or import a controlled one.
    // I'll assume I can edit RoleSwitcher or just create a local state here and pass it down.
    // But RoleSwitcher uses `apiClient.setUser`.
    // I will rewrite RoleSwitcher quickly or just copy the logic here.
    // Let's just user a local state and update both.

    const [role, setRole] = useState<UserRole>("L2");
    const [isPublishOpen, setIsPublishOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [showSourcePreview, setShowSourcePreview] = useState(true);

    const { data: session, isLoading, error } = useQuery({
        queryKey: ["session", sessionId],
        queryFn: () => sessionsApi.get(sessionId),
    });

    if (isLoading) {
        return (
            <div className="container mx-auto py-10 space-y-8">
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

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                <h2 className="text-xl font-semibold text-destructive">Failed to load session</h2>
                <Button variant="outline" asChild>
                    <Link href="/ingest">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Ingest
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 max-w-4xl">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-background/95 backdrop-blur pb-6 border-b mb-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <Link href="/ingest" className="hover:text-foreground transition-colors">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <span>/</span>
                        <span>session</span>
                        <span>/</span>
                        <span className="font-mono text-xs">{sessionId.substring(0, 8)}...</span>
                    </div>

                    {/* Dev Tools */}
                    <RoleSwitcher onChange={setRole} currentRole={role} />
                </div>

                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Content Editor</h1>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <BookOpen className="h-4 w-4" />
                            <span className="truncate max-w-[400px]">{session?.sourceUrl || "Manual Input"}</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {session?.sourceType !== "manual" && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowSourcePreview(!showSourcePreview)}
                                title={showSourcePreview ? "Hide source preview" : "Show source preview"}
                            >
                                {showSourcePreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => setIsPreviewOpen(true)}>
                            <LayoutTemplate className="mr-2 h-4 w-4" />
                            Preview
                        </Button>
                        <Button onClick={() => setIsPublishOpen(true)}>
                            <Send className="mr-2 h-4 w-4" />
                            Publish
                        </Button>
                    </div>
                </div>
            </div>

            {/* Source Preview */}
            {showSourcePreview && session?.sourceType !== "manual" && (
                <div className="mb-6">
                    <SourcePreview
                        rawContent={session?.rawContent ?? null}
                        sourceType={session?.sourceType ?? "manual"}
                        sourceUrl={session?.sourceUrl ?? ""}
                    />
                </div>
            )}

            {/* Main Content */}
            <ChunkList
                sessionId={sessionId}
                chunks={session?.chunks || []}
                role={role}
            />

            <PreviewModal
                open={isPreviewOpen}
                onOpenChange={setIsPreviewOpen}
                sessionId={sessionId}
            />

            <PublishModal
                open={isPublishOpen}
                onOpenChange={setIsPublishOpen}
                sessionId={sessionId}
            />
        </div>
    );
}
