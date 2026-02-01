"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collectionsApi } from "@/lib/api/collections";
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
import { format } from "date-fns";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { CreateCollectionModal } from "./CreateCollectionModal";
import { toast } from "sonner";

export function CollectionList() {
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const { data, isLoading, error } = useQuery({
        queryKey: ["collections"],
        queryFn: collectionsApi.list,
    });

    const deleteMutation = useMutation({
        mutationFn: collectionsApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["collections"] });
            toast.success("Collection deleted successfully");
        },
        onError: () => {
            toast.error("Failed to delete collection");
        },
    });

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this collection?")) {
            deleteMutation.mutate(id);
        }
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
                Failed to load collections.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Collections</h2>
                    <p className="text-muted-foreground">
                        Manage your knowledge collections.
                    </p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> New Collection
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Collections</CardTitle>
                    <CardDescription>
                        A list of all knowledge collections available in the system.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Created By</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data?.collections.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={5}
                                        className="text-center h-24 text-muted-foreground"
                                    >
                                        No collections found. Create one to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data?.collections.map((collection) => (
                                    <TableRow key={collection.id}>
                                        <TableCell className="font-medium">
                                            {collection.name}
                                        </TableCell>
                                        <TableCell>{collection.description}</TableCell>
                                        <TableCell>{collection.createdBy}</TableCell>
                                        <TableCell>
                                            {format(new Date(collection.createdAt), "PPp")}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(collection.id)}
                                                disabled={deleteMutation.isPending}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <CreateCollectionModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
            />
        </div>
    );
}
