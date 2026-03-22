"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { collectionsApi } from "@/lib/api/collections";
import { CreateCollectionSchema, CreateCollectionRequest } from "@/types/schema";
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
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CreateCollectionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: (id: string) => void;
}

export function CreateCollectionModal({
    open,
    onOpenChange,
    onCreated,
}: CreateCollectionModalProps) {
    const queryClient = useQueryClient();

    const form = useForm<CreateCollectionRequest>({
        resolver: zodResolver(CreateCollectionSchema),
        defaultValues: {
            name: "",
            description: "",
        },
    });

    const mutation = useMutation({
        mutationFn: collectionsApi.create,
        onSuccess: (created) => {
            queryClient.invalidateQueries({ queryKey: ["collections"] });
            toast.success("Collection created successfully");
            form.reset();
            if (onCreated && created?.id) {
                onCreated(created.id);
            } else {
                onOpenChange(false);
            }
        },
        onError: () => {
            toast.error("Failed to create collection");
        },
    });

    const onSubmit = (data: CreateCollectionRequest) => {
        mutation.mutate(data);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create Collection</DialogTitle>
                    <DialogDescription>
                        Create a new knowledge collection to organize your chunks.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Legal Documents" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Describe the purpose of this collection..."
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Create
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
