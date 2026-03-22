"use client";

import { useState } from "react";
import { Chunk } from "@/types/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Pencil,
    Split,
    Wand2,
    X,
    Check,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ChunkItemProps {
    chunk: Chunk;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
    onUpdate: (id: string, text: string) => void;
    onSplit: (id: string) => void;
    isUpdating?: boolean;
}

export function ChunkItem({
    chunk,
    isSelected,
    onToggleSelect,
    onUpdate,
    onSplit,
    isUpdating = false,
}: ChunkItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(chunk.text);

    const handleSave = () => {
        onUpdate(chunk.id, text);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setText(chunk.text);
        setIsEditing(false);
    };

    return (
        <Card className={cn(
            "relative transition-all duration-200 border-l-4",
            isSelected ? "border-l-primary ring-1 ring-primary/20" : "border-l-transparent",
            chunk.isDirty ? "bg-amber-50/30 dark:bg-amber-950/10" : ""
        )}>
            <div className="absolute left-3 top-3 z-10">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(chunk.id)}
                    className="h-5 w-5"
                />
            </div>

            <CardContent className="pt-4 pl-12 pr-4 pb-4">
                {isEditing ? (
                    <div className="space-y-3">
                        <Textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="min-h-[120px] font-mono text-sm leading-relaxed"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={handleCancel}>
                                <X className="h-4 w-4 mr-1" /> Cancel
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                                {isUpdating ? (
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-1" />
                                ) : (
                                    <Check className="h-4 w-4 mr-1" />
                                )}
                                Save Changes
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div
                        className="prose prose-sm max-w-none dark:prose-invert cursor-text"
                        onClick={() => setIsEditing(true)}
                    >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{chunk.text}</p>
                    </div>
                )}
            </CardContent>

            {!isEditing && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Quick Actions */}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditing(true)}>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>

                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onSplit(chunk.id)}>
                        <Split className="h-4 w-4 text-muted-foreground" />
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Wand2 className="h-4 w-4 text-indigo-500" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>AI Assistant</DropdownMenuLabel>
                            <DropdownMenuItem>Simplify Text</DropdownMenuItem>
                            <DropdownMenuItem>Fix Grammar</DropdownMenuItem>
                            <DropdownMenuItem>Clarify Terminology</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}

            {chunk.isDirty && (
                <div className="absolute bottom-2 right-2">
                    <span className="text-[10px] text-amber-600 font-medium px-2 py-0.5 bg-amber-100 rounded-full">
                        Modified
                    </span>
                </div>
            )}
        </Card>
    );
}
