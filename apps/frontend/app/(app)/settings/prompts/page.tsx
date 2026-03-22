"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { collectionsApi } from "@/lib/api/collections";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Save,
    RotateCcw,
    Loader2,
    CheckCircle2,
    Bot,
    Globe,
    FolderOpen,
    Trash2,
} from "lucide-react";

type Tab = "global" | "collection";

// We need a collectionId to talk to the backend route
// Use a dummy slug for global endpoints since the route is /collections/:id/agent/prompts/global
const GLOBAL_SLUG = "_global";

export default function PromptsSettingsPage() {
    const [activeTab, setActiveTab] = useState<Tab>("global");
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

    // Global prompt state
    const [globalPrompt, setGlobalPrompt] = useState("");
    const [isGlobalDefault, setIsGlobalDefault] = useState(true);
    const [isGlobalLoading, setIsGlobalLoading] = useState(true);
    const [isGlobalSaving, setIsGlobalSaving] = useState(false);
    const [globalSaved, setGlobalSaved] = useState(false);
    const [globalDirty, setGlobalDirty] = useState(false);

    // Collection prompt state
    const [collectionPrompt, setCollectionPrompt] = useState("");
    const [hasCollectionOverride, setHasCollectionOverride] = useState(false);
    const [isCollectionLoading, setIsCollectionLoading] = useState(false);
    const [isCollectionSaving, setIsCollectionSaving] = useState(false);
    const [collectionSaved, setCollectionSaved] = useState(false);
    const [collectionDirty, setCollectionDirty] = useState(false);

    const { data: collectionsData } = useQuery({
        queryKey: ["collections"],
        queryFn: collectionsApi.list,
    });

    const collections = collectionsData?.collections ?? [];

    // Load global prompt
    const loadGlobalPrompt = useCallback(async () => {
        setIsGlobalLoading(true);
        try {
            // Need any collection ID to hit the route; the global prompt is the same for all
            const slug = collections[0]?.id ?? GLOBAL_SLUG;
            const data = await collectionsApi.getGlobalPrompt(slug);
            setGlobalPrompt(data.prompt);
            setIsGlobalDefault(data.isDefault);
            setGlobalDirty(false);
        } catch (err) {
            console.error("Failed to load global prompt:", err);
        } finally {
            setIsGlobalLoading(false);
        }
    }, [collections]);

    useEffect(() => {
        if (collections.length > 0) {
            loadGlobalPrompt();
        }
    }, [collections.length]); // eslint-disable-line react-hooks/exhaustive-deps

    // Load collection prompt
    const loadCollectionPrompt = useCallback(async (collectionId: string) => {
        setIsCollectionLoading(true);
        try {
            const data = await collectionsApi.getCollectionPrompt(collectionId);
            setCollectionPrompt(data.prompt ?? "");
            setHasCollectionOverride(data.hasOverride);
            setCollectionDirty(false);
        } catch (err) {
            console.error("Failed to load collection prompt:", err);
        } finally {
            setIsCollectionLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedCollectionId) {
            loadCollectionPrompt(selectedCollectionId);
        }
    }, [selectedCollectionId, loadCollectionPrompt]);

    // Save global prompt
    const handleSaveGlobal = async () => {
        const slug = collections[0]?.id ?? GLOBAL_SLUG;
        setIsGlobalSaving(true);
        try {
            await collectionsApi.updateGlobalPrompt(slug, globalPrompt);
            setIsGlobalDefault(false);
            setGlobalDirty(false);
            setGlobalSaved(true);
            setTimeout(() => setGlobalSaved(false), 2000);
        } catch (err) {
            console.error("Failed to save global prompt:", err);
        } finally {
            setIsGlobalSaving(false);
        }
    };

    // Reset global to default
    const handleResetGlobal = async () => {
        const slug = collections[0]?.id ?? GLOBAL_SLUG;
        try {
            await collectionsApi.resetGlobalPrompt(slug);
            await loadGlobalPrompt();
        } catch (err) {
            console.error("Failed to reset global prompt:", err);
        }
    };

    // Save collection prompt
    const handleSaveCollection = async () => {
        if (!selectedCollectionId) return;
        setIsCollectionSaving(true);
        try {
            await collectionsApi.updateCollectionPrompt(selectedCollectionId, collectionPrompt);
            setHasCollectionOverride(true);
            setCollectionDirty(false);
            setCollectionSaved(true);
            setTimeout(() => setCollectionSaved(false), 2000);
        } catch (err) {
            console.error("Failed to save collection prompt:", err);
        } finally {
            setIsCollectionSaving(false);
        }
    };

    // Remove collection override
    const handleRemoveOverride = async () => {
        if (!selectedCollectionId) return;
        try {
            await collectionsApi.deleteCollectionPrompt(selectedCollectionId);
            setCollectionPrompt("");
            setHasCollectionOverride(false);
            setCollectionDirty(false);
        } catch (err) {
            console.error("Failed to remove collection override:", err);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Bot className="h-6 w-6 text-indigo-500" />
                    Agent System Prompts
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Edit the system prompt that guides the AI agent. Changes take effect on the next chat message.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b">
                <button
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "global"
                            ? "border-indigo-500 text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    onClick={() => setActiveTab("global")}
                >
                    <Globe className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
                    Global Prompt
                </button>
                <button
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "collection"
                            ? "border-indigo-500 text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    onClick={() => setActiveTab("collection")}
                >
                    <FolderOpen className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
                    Collection Override
                </button>
            </div>

            {/* Global Prompt Tab */}
            {activeTab === "global" && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Global System Prompt</span>
                            {isGlobalDefault ? (
                                <Badge variant="outline" className="text-[10px] h-5 border-green-300 text-green-600 bg-green-50 dark:bg-green-950/30">
                                    Default
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-[10px] h-5 border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-950/30">
                                    Customized
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {!isGlobalDefault && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleResetGlobal}
                                    className="text-xs h-8"
                                >
                                    <RotateCcw className="h-3 w-3 mr-1" />
                                    Reset to Default
                                </Button>
                            )}
                            <Button
                                size="sm"
                                onClick={handleSaveGlobal}
                                disabled={isGlobalSaving || !globalDirty}
                                className="h-8"
                            >
                                {isGlobalSaving ? (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : globalSaved ? (
                                    <CheckCircle2 className="h-3 w-3 mr-1 text-green-400" />
                                ) : (
                                    <Save className="h-3 w-3 mr-1" />
                                )}
                                {globalSaved ? "Saved!" : "Save"}
                            </Button>
                        </div>
                    </div>

                    {isGlobalLoading ? (
                        <div className="flex items-center justify-center py-20 border rounded-lg bg-card">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <textarea
                            value={globalPrompt}
                            onChange={(e) => {
                                setGlobalPrompt(e.target.value);
                                setGlobalDirty(true);
                            }}
                            className="w-full min-h-[500px] rounded-lg border bg-card p-4 text-sm font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            spellCheck={false}
                        />
                    )}

                    <p className="text-xs text-muted-foreground">
                        This prompt is used for all collections unless overridden. Changes take effect on the next chat message.
                    </p>
                </div>
            )}

            {/* Collection Override Tab */}
            {activeTab === "collection" && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Select
                                value={selectedCollectionId ?? ""}
                                onValueChange={(v) => setSelectedCollectionId(v || null)}
                            >
                                <SelectTrigger className="w-64">
                                    <SelectValue placeholder="Select a collection…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {collections.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {selectedCollectionId && hasCollectionOverride && (
                                <Badge variant="outline" className="text-[10px] h-5 border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-950/30">
                                    Has Override
                                </Badge>
                            )}
                            {selectedCollectionId && !hasCollectionOverride && (
                                <Badge variant="outline" className="text-[10px] h-5 border-zinc-300 text-zinc-500 bg-zinc-50 dark:bg-zinc-900/30">
                                    Using Global
                                </Badge>
                            )}
                        </div>

                        {selectedCollectionId && (
                            <div className="flex items-center gap-2">
                                {hasCollectionOverride && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleRemoveOverride}
                                        className="text-xs h-8 text-red-500 hover:text-red-600"
                                    >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        Remove Override
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    onClick={handleSaveCollection}
                                    disabled={isCollectionSaving || !collectionDirty}
                                    className="h-8"
                                >
                                    {isCollectionSaving ? (
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : collectionSaved ? (
                                        <CheckCircle2 className="h-3 w-3 mr-1 text-green-400" />
                                    ) : (
                                        <Save className="h-3 w-3 mr-1" />
                                    )}
                                    {collectionSaved ? "Saved!" : "Save Override"}
                                </Button>
                            </div>
                        )}
                    </div>

                    {!selectedCollectionId ? (
                        <div className="flex flex-col items-center justify-center py-20 border rounded-lg bg-card text-center">
                            <FolderOpen className="h-8 w-8 text-muted-foreground/40 mb-3" />
                            <p className="text-sm text-muted-foreground">
                                Select a collection to configure a custom prompt override.
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Collections without an override use the global prompt.
                            </p>
                        </div>
                    ) : isCollectionLoading ? (
                        <div className="flex items-center justify-center py-20 border rounded-lg bg-card">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <textarea
                            value={collectionPrompt}
                            onChange={(e) => {
                                setCollectionPrompt(e.target.value);
                                setCollectionDirty(true);
                            }}
                            placeholder={hasCollectionOverride ? "" : "Paste a custom prompt here to override the global prompt for this collection…"}
                            className="w-full min-h-[500px] rounded-lg border bg-card p-4 text-sm font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            spellCheck={false}
                        />
                    )}

                    <p className="text-xs text-muted-foreground">
                        A collection override completely replaces the global prompt for that collection&apos;s agent.
                    </p>
                </div>
            )}
        </div>
    );
}
