"use client";

import { useMutation } from "@tanstack/react-query";
import { sessionsApi } from "@/lib/api/sessions";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PreviewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sessionId: string;
}

export function PreviewModal({ open, onOpenChange, sessionId }: PreviewModalProps) {

    const mutation = useMutation({
        mutationFn: () => sessionsApi.preview(sessionId),
    });

    useEffect(() => {
        if (open) {
            mutation.mutate();
        }
    }, [open, sessionId]);

    const data = mutation.data;
    const isLoading = mutation.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Preview & Validate</DialogTitle>
                    <DialogDescription>
                        Validating chunk structure and checking for issues before publishing.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden py-4">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : data ? (
                        <div className="space-y-4 h-full flex flex-col">
                            {data.isValid ? (
                                <Alert className="border-green-500 bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-100">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <AlertTitle>Validation Passed</AlertTitle>
                                    <AlertDescription>
                                        All {data.chunks.length} chunks are valid and ready to publish.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Validation Failed</AlertTitle>
                                    <AlertDescription>
                                        Please fix the issues below before publishing.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {data.warnings && data.warnings.length > 0 && (
                                <div className="bg-amber-50 p-4 rounded-md text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                                    <h4 className="font-medium mb-2">Warnings:</h4>
                                    <ul className="list-disc pl-5 space-y-1">
                                        {data.warnings.map((w, i) => <li key={i}>{w}</li>)}
                                    </ul>
                                </div>
                            )}


                            <div className="border rounded-md px-4 py-2 bg-muted/20">
                                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Final Chunk Preview:</h4>
                                <ScrollArea className="h-[200px]">
                                    <div className="space-y-2 text-sm">
                                        {data.chunks.map((chunk, i) => (
                                            <div key={chunk.id} className="p-2 border-b last:border-0">
                                                <span className="text-xs text-muted-foreground mr-2 font-mono">[{i + 1}]</span>
                                                {chunk.text.substring(0, 100)}...
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-red-500">Failed to load preview</div>
                    )}
                </div>

                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
