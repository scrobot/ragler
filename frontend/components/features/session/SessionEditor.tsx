"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { sessionsApi } from "@/lib/api/sessions";
import { ChunkList } from "./ChunkList";
import { RoleSwitcher } from "./RoleSwitcher";
import { SourcePreview } from "./SourcePreview";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, BookOpen, Send, LayoutTemplate, Eye, EyeOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { UserRole } from "@/types/api";
import { PublishModal } from "./PublishModal";
import { PreviewModal } from "./PreviewModal";
import { ConfirmationDialog } from "@/components/app/confirmation-dialog";
import { toast } from "sonner";

interface SessionEditorProps {
    sessionId: string;
}

export function SessionEditor({ sessionId }: SessionEditorProps) {
    const router = useRouter();
    const queryClient = useQueryClient();

    const [role, setRole] = useState<UserRole>("L2");
    const [isPublishOpen, setIsPublishOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [showSourcePreview, setShowSourcePreview] = useState(true);

    const deleteMutation = useMutation({
        mutationFn: () => sessionsApi.delete(sessionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sessions"] });
            toast.success("Session deleted successfully");
            router.push("/sessions");
        },
        onError: () => {
            toast.error("Failed to delete session");
        },
    });

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
                    <Link href="/sessions">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sessions
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
                        <Link href="/sessions" className="hover:text-foreground transition-colors">
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
                        <ConfirmationDialog
                            trigger={
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={deleteMutation.isPending}
                                    title="Delete session"
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            }
                            title="Delete Session"
                            description="Are you sure you want to delete this session? This will permanently remove all chunks and cannot be undone."
                            confirmLabel="Delete"
                            onConfirm={() => deleteMutation.mutate()}
                            variant="destructive"
                        />
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
