"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sessionsApi } from "@/lib/api/sessions";
import { collectionsApi } from "@/lib/api/collections";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface PublishModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sessionId: string;
}

export function PublishModal({ open, onOpenChange, sessionId }: PublishModalProps) {
    const router = useRouter();
    const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");

    const { data: collectionsData } = useQuery({
        queryKey: ["collections"],
        queryFn: collectionsApi.list,
    });

    const mutation = useMutation({
        mutationFn: () => sessionsApi.publish(sessionId, { targetCollectionId: selectedCollectionId }),
        onSuccess: () => {
            toast.success("Published successfully!");
            router.push("/collections");
        },
        onError: () => {
            toast.error("Failed to publish");
        },
    });

    const handlePublish = () => {
        if (!selectedCollectionId) {
            toast.error("Please select a collection");
            return;
        }
        mutation.mutate();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Publish to Collection</DialogTitle>
                    <DialogDescription>
                        Select a target collection to publish your changes. This will make them available for retrieval.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <label className="text-sm font-medium mb-2 block">Target Collection</label>
                    <Select value={selectedCollectionId} onValueChange={setSelectedCollectionId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a collection..." />
                        </SelectTrigger>
                        <SelectContent>
                            {collectionsData?.collections?.map((col) => (
                                <SelectItem key={col.id} value={col.id}>
                                    {col.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handlePublish} disabled={mutation.isPending || !selectedCollectionId}>
                        {mutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Confirm Publish
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
