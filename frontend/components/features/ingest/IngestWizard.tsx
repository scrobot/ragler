"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ingestApi } from "@/lib/api/ingest";
import { IngestSchema, IngestRequest } from "@/types/schema";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, FileText, Globe, Type, Upload } from "lucide-react";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUploadStep } from "./FileUploadStep";

export function IngestWizard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("confluence");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const form = useForm<IngestRequest>({
        resolver: zodResolver(IngestSchema),
        defaultValues: {
            sourceType: "confluence",
            url: "",
            pageId: "",
            content: "",
        },
    });

    const mutation = useMutation({
        mutationFn: (data: IngestRequest) => {
            switch (data.sourceType) {
                case "confluence":
                    return ingestApi.ingestConfluence({
                        url: data.url || undefined,
                        pageId: data.pageId || undefined,
                    });
                case "web":
                    if (!data.url) throw new Error("URL is required");
                    return ingestApi.ingestWeb({ url: data.url });
                case "manual":
                    if (!data.content) throw new Error("Content is required");
                    return ingestApi.ingestManual({ content: data.content });
                case "file":
                    if (!selectedFile) throw new Error("File is required");
                    return ingestApi.ingestFile(selectedFile);
                default:
                    throw new Error("Invalid source type");
            }
        },
        onSuccess: (data) => {
            toast.success("Ingestion started successfully");
            router.push(`/session/${data.sessionId}`);
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to start ingestion");
        },
    });

    const onSubmit = (data: IngestRequest) => {
        mutation.mutate(data);
    };

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        form.setValue("sourceType", value as any);
        form.resetField("url");
        form.resetField("pageId");
        form.resetField("content");
        setSelectedFile(null);
    };

    return (
        <Card className="w-[600px] mx-auto">
            <CardHeader>
                <CardTitle>Add Knowledge Source</CardTitle>
                <CardDescription>
                    Import content to create a new editing session.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 mb-6">
                        <TabsTrigger value="confluence" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Confluence
                        </TabsTrigger>
                        <TabsTrigger value="web" className="flex items-center gap-2">
                            <Globe className="h-4 w-4" /> Web URL
                        </TabsTrigger>
                        <TabsTrigger value="manual" className="flex items-center gap-2">
                            <Type className="h-4 w-4" /> Manual
                        </TabsTrigger>
                        <TabsTrigger value="file" className="flex items-center gap-2">
                            <Upload className="h-4 w-4" /> File
                        </TabsTrigger>
                    </TabsList>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <TabsContent value="confluence" className="space-y-4">
                                <div className="bg-muted/50 p-4 rounded-md text-sm text-muted-foreground mb-4">
                                    Import a document from Confluence. You can provide either the full URL or the Page ID.
                                </div>
                                <FormField
                                    control={form.control}
                                    name="url"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Confluence Page URL</FormLabel>
                                            <FormControl>
                                                <Input placeholder="https://confluence.example.com/display/SPACE/Page+Title" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="text-center text-muted-foreground text-xs my-2">- OR -</div>
                                <FormField
                                    control={form.control}
                                    name="pageId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Page ID</FormLabel>
                                            <FormControl>
                                                <Input placeholder="12345678" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </TabsContent>

                            <TabsContent value="web" className="space-y-4">
                                <div className="bg-muted/50 p-4 rounded-md text-sm text-muted-foreground mb-4">
                                    Import content from any accessible public web page.
                                </div>
                                <FormField
                                    control={form.control}
                                    name="url"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Web Page URL</FormLabel>
                                            <FormControl>
                                                <Input placeholder="https://example.com/blog/article" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </TabsContent>

                            <TabsContent value="manual" className="space-y-4">
                                <div className="bg-muted/50 p-4 rounded-md text-sm text-muted-foreground mb-4">
                                    Manually paste or type the content you want to process.
                                </div>
                                <FormField
                                    control={form.control}
                                    name="content"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Content</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Paste your text here..."
                                                    className="min-h-[200px]"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </TabsContent>

                            <TabsContent value="file" className="space-y-4">
                                <FileUploadStep
                                    onFileSelect={setSelectedFile}
                                    selectedFile={selectedFile}
                                />
                            </TabsContent>

                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={mutation.isPending}>
                                    {mutation.isPending && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Start Processing
                                </Button>
                            </div>
                        </form>
                    </Form>
                </Tabs>
            </CardContent>
        </Card>
    );
}
