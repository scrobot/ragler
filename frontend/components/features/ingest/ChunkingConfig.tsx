"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Settings2, Sparkles, SplitSquareVertical } from "lucide-react";

export interface ChunkingConfigValue {
    method: "llm" | "character";
    chunkSize: number;
    overlap: number;
}

interface ChunkingConfigProps {
    value: ChunkingConfigValue;
    onChange: (value: ChunkingConfigValue) => void;
}

export function ChunkingConfig({ value, onChange }: ChunkingConfigProps) {
    const [isOpen, setIsOpen] = useState(false);

    const isCharacterMode = value.method === "character";

    const handleMethodToggle = (isCharacter: boolean) => {
        onChange({
            ...value,
            method: isCharacter ? "character" : "llm",
        });
    };

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-sm text-left">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium flex-1">Chunking Settings</span>
                <Badge variant="outline" className="text-xs">
                    {isCharacterMode ? "Character" : "LLM"}
                </Badge>
                <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""
                        }`}
                />
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-2 p-4 rounded-lg border bg-card space-y-5">
                {/* Method Toggle */}
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Chunking Method</Label>
                        <p className="text-xs text-muted-foreground">
                            {isCharacterMode
                                ? "Split by character count with overlap"
                                : "AI-powered semantic chunking"}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <Sparkles className={`h-3.5 w-3.5 ${!isCharacterMode ? "text-primary" : "text-muted-foreground"}`} />
                            <span className={`text-xs ${!isCharacterMode ? "font-medium" : "text-muted-foreground"}`}>
                                LLM
                            </span>
                        </div>
                        <Switch
                            checked={isCharacterMode}
                            onCheckedChange={handleMethodToggle}
                        />
                        <div className="flex items-center gap-1.5">
                            <SplitSquareVertical className={`h-3.5 w-3.5 ${isCharacterMode ? "text-primary" : "text-muted-foreground"}`} />
                            <span className={`text-xs ${isCharacterMode ? "font-medium" : "text-muted-foreground"}`}>
                                Character
                            </span>
                        </div>
                    </div>
                </div>

                {/* Character Mode Settings */}
                {isCharacterMode && (
                    <div className="space-y-4 pt-2 border-t">
                        {/* Chunk Size */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label className="text-sm">Chunk Size</Label>
                                <span className="text-xs font-mono text-muted-foreground">
                                    {value.chunkSize.toLocaleString()} chars
                                </span>
                            </div>
                            <Slider
                                value={[value.chunkSize]}
                                onValueChange={([size]) =>
                                    onChange({ ...value, chunkSize: size })
                                }
                                min={100}
                                max={10000}
                                step={100}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>100</span>
                                <span>10,000</span>
                            </div>
                        </div>

                        {/* Overlap */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label className="text-sm">Overlap</Label>
                                <span className="text-xs font-mono text-muted-foreground">
                                    {value.overlap.toLocaleString()} chars
                                </span>
                            </div>
                            <Slider
                                value={[value.overlap]}
                                onValueChange={([overlap]) =>
                                    onChange({ ...value, overlap })
                                }
                                min={0}
                                max={Math.min(2000, Math.floor(value.chunkSize * 0.5))}
                                step={50}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>0</span>
                                <span>{Math.min(2000, Math.floor(value.chunkSize * 0.5)).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                )}
            </CollapsibleContent>
        </Collapsible>
    );
}
