"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { sessionsApi } from "@/lib/api/sessions";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2, Plus, FileText, Globe, BookOpen, Trash2 } from "lucide-react";
import { SourceType } from "@/types/api";
import { ConfirmationDialog } from "@/components/app/confirmation-dialog";
import { toast } from "sonner";

const sourceTypeConfig: Record<SourceType, { label: string; icon: React.ReactNode }> = {
    manual: { label: "Manual", icon: <FileText className="h-4 w-4" /> },
    web: { label: "Web", icon: <Globe className="h-4 w-4" /> },
    confluence: { label: "Confluence", icon: <BookOpen className="h-4 w-4" /> },
};

const statusConfig: Record<string, { variant: "primary" | "secondary" | "destructive" | "outline" }> = {
    DRAFT: { variant: "secondary" },
    PREVIEW: { variant: "outline" },
    PUBLISHED: { variant: "primary" },
};

export function SessionList() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const { data, isLoading, error } = useQuery({
        queryKey: ["sessions"],
        queryFn: sessionsApi.list,
    });

    const deleteMutation = useMutation({
        mutationFn: sessionsApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sessions"] });
            toast.success("Session deleted successfully");
        },
        onError: () => {
            toast.error("Failed to delete session");
        },
    });

    const handleRowClick = (sessionId: string) => {
        router.push(`/session/${sessionId}`);
    };

    const handleDelete = (sessionId: string) => {
        deleteMutation.mutate(sessionId);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center text-red-500 p-8">
                Failed to load sessions.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Sessions</h2>
                    <p className="text-muted-foreground">
                        Draft sessions awaiting review and publishing.
                    </p>
                </div>
                <Button onClick={() => router.push("/ingest")}>
                    <Plus className="mr-2 h-4 w-4" /> New Session
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Sessions</CardTitle>
                    <CardDescription>
                        Click on a session to edit and publish its chunks.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Source</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Chunks</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Updated</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data?.sessions.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="text-center h-24 text-muted-foreground"
                                    >
                                        No sessions found. Create one via Ingestion.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data?.sessions.map((session) => (
                                    <TableRow
                                        key={session.sessionId}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => handleRowClick(session.sessionId)}
                                    >
                                        <TableCell className="font-medium max-w-[300px] truncate">
                                            {session.sourceUrl}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {sourceTypeConfig[session.sourceType]?.icon}
                                                <span>{sourceTypeConfig[session.sourceType]?.label}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={statusConfig[session.status]?.variant ?? "secondary"}>
                                                {session.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {session.chunkCount}
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(session.createdAt), "PPp")}
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(session.updatedAt), "PPp")}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <ConfirmationDialog
                                                trigger={
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => e.stopPropagation()}
                                                        disabled={deleteMutation.isPending}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                }
                                                title="Delete Session"
                                                description={`Are you sure you want to delete this session? This will permanently remove ${session.chunkCount} chunk(s) and cannot be undone.`}
                                                confirmLabel="Delete"
                                                onConfirm={() => handleDelete(session.sessionId)}
                                                variant="destructive"
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
