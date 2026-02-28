"use client";

import { useFeatureFlags, useUpdateFeatureFlags, useResetFeatureFlags } from "@/hooks/use-feature-flags";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
    Loader2,
    ToggleLeft,
    RotateCcw,
    FileText,
    Globe,
    Upload,
    Bot,
} from "lucide-react";

interface FeatureDefinition {
    key: "confluenceIngest" | "webIngest" | "fileIngest" | "agent";
    label: string;
    description: string;
    icon: React.ElementType;
}

const FEATURES: FeatureDefinition[] = [
    {
        key: "confluenceIngest",
        label: "Confluence Ingestion",
        description: "Import documents from Atlassian Confluence pages.",
        icon: FileText,
    },
    {
        key: "webIngest",
        label: "Web URL Ingestion",
        description: "Fetch and process content from public web pages.",
        icon: Globe,
    },
    {
        key: "fileIngest",
        label: "File Upload",
        description: "Upload PDF, DOCX, and text files for ingestion.",
        icon: Upload,
    },
    {
        key: "agent",
        label: "AI Agent",
        description: "Chat assistant, collection cleaning, and AI-powered chunk creation.",
        icon: Bot,
    },
];

export default function FeaturesSettingsPage() {
    const { data: flags, isLoading, isError } = useFeatureFlags();
    const updateMutation = useUpdateFeatureFlags();
    const resetMutation = useResetFeatureFlags();

    const handleToggle = (key: FeatureDefinition["key"], checked: boolean) => {
        updateMutation.mutate({ [key]: checked });
    };

    const handleReset = () => {
        resetMutation.mutate();
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

    if (isError || !flags) {
        return (
            <div className="max-w-2xl mx-auto py-8 px-6">
                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-4">
                    <p className="text-sm text-red-600 dark:text-red-400">
                        Failed to load feature flags. Is the backend running?
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-8 px-6 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <ToggleLeft className="h-6 w-6 text-indigo-500" />
                    Feature Flags
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Enable or disable features for this deployment. Changes take effect immediately.
                </p>
            </div>

            {/* Feature Toggles */}
            <div className="space-y-1">
                {FEATURES.map((feature) => {
                    const Icon = feature.icon;
                    const isEnabled = flags[feature.key];
                    const isUpdating = updateMutation.isPending;

                    return (
                        <div
                            key={feature.key}
                            className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted/30"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`rounded-md p-2 ${isEnabled
                                    ? "bg-indigo-500/10 text-indigo-500"
                                    : "bg-muted text-muted-foreground"
                                    }`}>
                                    <Icon className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{feature.label}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) =>
                                    handleToggle(feature.key, checked)
                                }
                                disabled={isUpdating}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Reset */}
            <div className="flex items-center justify-between pt-4 border-t">
                <div>
                    <p className="text-sm font-medium">Reset to Defaults</p>
                    <p className="text-xs text-muted-foreground">
                        Remove all overrides and revert to environment variable defaults.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    disabled={resetMutation.isPending}
                >
                    {resetMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                        <RotateCcw className="h-4 w-4 mr-1.5" />
                    )}
                    Reset
                </Button>
            </div>
        </div>
    );
}
