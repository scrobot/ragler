"use client";

import { useState, useEffect } from "react";
import { settingsApi } from "@/lib/api/settings";
import type { AvailableModel } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Save,
    Loader2,
    CheckCircle2,
    Bot,
    Eye,
    EyeOff,
    KeyRound,
    Cpu,
} from "lucide-react";

export default function AgentSettingsPage() {
    // Model state
    const [modelName, setModelName] = useState<string>("");
    const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);

    // API key state
    const [apiKeyInput, setApiKeyInput] = useState<string>("");
    const [maskedApiKey, setMaskedApiKey] = useState<string | null>(null);
    const [hasCustomApiKey, setHasCustomApiKey] = useState(false);
    const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);
    const [isApiKeyEditing, setIsApiKeyEditing] = useState(false);

    // UI state
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [settings, modelsData] = await Promise.all([
                    settingsApi.getAgentSettings(),
                    settingsApi.getAvailableModels(),
                ]);

                setModelName(settings.modelName);
                setMaskedApiKey(settings.maskedApiKey);
                setHasCustomApiKey(settings.hasCustomApiKey);
                setAvailableModels(modelsData.models);
            } catch (err) {
                console.error("Failed to load agent settings:", err);
                setError("Failed to load settings. Is the backend running?");
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    const handleModelChange = (newModel: string) => {
        setModelName(newModel);
        setIsDirty(true);
    };

    const handleApiKeyChange = (value: string) => {
        setApiKeyInput(value);
        setIsDirty(true);
    };

    const handleStartEditingKey = () => {
        setIsApiKeyEditing(true);
        setApiKeyInput("");
        setIsDirty(true);
    };

    const handleCancelEditingKey = () => {
        setIsApiKeyEditing(false);
        setApiKeyInput("");
        // Only reset dirty if model hasn't changed
        setIsDirty(false);
    };

    const handleClearCustomKey = () => {
        setApiKeyInput("");
        setIsApiKeyEditing(false);
        setHasCustomApiKey(false);
        setIsDirty(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);

        try {
            const updatePayload: Record<string, unknown> = {};

            updatePayload.modelName = modelName;

            if (isApiKeyEditing && apiKeyInput) {
                updatePayload.apiKey = apiKeyInput;
            } else if (!hasCustomApiKey && !apiKeyInput) {
                updatePayload.apiKey = null;
            }

            const result = await settingsApi.updateAgentSettings(updatePayload);

            setModelName(result.modelName);
            setMaskedApiKey(result.maskedApiKey);
            setHasCustomApiKey(result.hasCustomApiKey);
            setIsApiKeyEditing(false);
            setApiKeyInput("");
            setIsDirty(false);
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2000);
        } catch (err) {
            console.error("Failed to save settings:", err);
            setError("Failed to save settings. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto py-8 px-6">
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-8 px-6 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Bot className="h-6 w-6 text-indigo-500" />
                    Agent Configuration
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Select the AI model and configure the API key used by the agent, chat, and content generation.
                </p>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-4">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            {/* Model Selection */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-muted-foreground" />
                    <label className="text-sm font-medium">Model</label>
                </div>
                <Select value={modelName} onValueChange={handleModelChange}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a model…" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableModels.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                                <div className="flex items-center justify-between w-full gap-4">
                                    <span className="font-medium">{model.name}</span>
                                    <span className="text-xs text-muted-foreground">{model.description}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                    This model is used for the AI agent, RAG chat, and content chunking. Embedding model stays fixed.
                </p>
            </div>

            {/* API Key */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                    <label className="text-sm font-medium">OpenAI API Key</label>
                    {hasCustomApiKey && !isApiKeyEditing && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-950/30">
                            Custom
                        </span>
                    )}
                    {!hasCustomApiKey && !isApiKeyEditing && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-green-300 text-green-600 bg-green-50 dark:bg-green-950/30">
                            From Environment
                        </span>
                    )}
                </div>

                {isApiKeyEditing ? (
                    <div className="space-y-2">
                        <div className="relative">
                            <Input
                                type={isApiKeyVisible ? "text" : "password"}
                                value={apiKeyInput}
                                onChange={(e) => handleApiKeyChange(e.target.value)}
                                placeholder="sk-..."
                                className="pr-10 font-mono text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setIsApiKeyVisible(!isApiKeyVisible)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {isApiKeyVisible ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelEditingKey}
                                className="text-xs h-7"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <code className="flex-1 rounded border bg-muted/50 px-3 py-2 text-sm font-mono text-muted-foreground truncate">
                                {maskedApiKey || "Not set"}
                            </code>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleStartEditingKey}
                                className="text-xs h-8 shrink-0"
                            >
                                {hasCustomApiKey ? "Change Key" : "Set Custom Key"}
                            </Button>
                            {hasCustomApiKey && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearCustomKey}
                                    className="text-xs h-8 text-red-500 hover:text-red-600 shrink-0"
                                >
                                    Remove
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                <p className="text-xs text-muted-foreground">
                    Override the default API key from the environment. Removing the custom key falls back to the server&apos;s environment variable.
                </p>
            </div>

            {/* Save */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button
                    onClick={handleSave}
                    disabled={isSaving || !isDirty}
                    className="min-w-[100px]"
                >
                    {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : isSaved ? (
                        <CheckCircle2 className="h-4 w-4 mr-1.5 text-green-400" />
                    ) : (
                        <Save className="h-4 w-4 mr-1.5" />
                    )}
                    {isSaved ? "Saved!" : "Save Changes"}
                </Button>
            </div>
        </div>
    );
}
