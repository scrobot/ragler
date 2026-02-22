"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Filter, X, ChevronDown, Search } from "lucide-react";

export interface FilterValues {
    sourceType?: string;
    sourceId?: string;
    minQuality?: number;
    maxQuality?: number;
    tags?: string;
    search?: string;
}

interface FilterPanelProps {
    filters: FilterValues;
    onChange: (filters: FilterValues) => void;
}

export function FilterPanel({ filters, onChange }: FilterPanelProps) {
    const [isOpen, setIsOpen] = useState(false);

    const activeFilterCount = Object.values(filters).filter(
        (v) => v !== undefined && v !== "",
    ).length;

    const handleClear = () => {
        onChange({});
    };

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-sm text-left">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium flex-1">Filters</span>
                {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                        {activeFilterCount} active
                    </Badge>
                )}
                <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""
                        }`}
                />
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-2 p-4 rounded-lg border bg-card space-y-4">
                {/* Text Search */}
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Search in content</Label>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search chunks..."
                            value={filters.search || ""}
                            onChange={(e) =>
                                onChange({ ...filters, search: e.target.value || undefined })
                            }
                            className="pl-8 h-9 text-sm"
                        />
                    </div>
                </div>

                {/* Source Type */}
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Source Type</Label>
                    <Select
                        value={filters.sourceType || "all"}
                        onValueChange={(v) =>
                            onChange({
                                ...filters,
                                sourceType: v === "all" ? undefined : v,
                            })
                        }
                    >
                        <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="All sources" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All sources</SelectItem>
                            <SelectItem value="confluence">Confluence</SelectItem>
                            <SelectItem value="web">Web</SelectItem>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="file">File</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Quality Range */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label className="text-xs font-medium">Quality Score</Label>
                        <span className="text-xs text-muted-foreground">
                            {filters.minQuality ?? 0}–{filters.maxQuality ?? 100}
                        </span>
                    </div>
                    <div className="space-y-2">
                        <Slider
                            value={[filters.minQuality ?? 0, filters.maxQuality ?? 100]}
                            onValueChange={([min, max]) =>
                                onChange({
                                    ...filters,
                                    minQuality: min === 0 ? undefined : min,
                                    maxQuality: max === 100 ? undefined : max,
                                })
                            }
                            min={0}
                            max={100}
                            step={5}
                            className="w-full"
                        />
                    </div>
                </div>

                {/* Tags */}
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Tags (comma-separated)</Label>
                    <Input
                        placeholder="e.g. api, setup, howto"
                        value={filters.tags || ""}
                        onChange={(e) =>
                            onChange({ ...filters, tags: e.target.value || undefined })
                        }
                        className="h-9 text-sm"
                    />
                </div>

                {/* Clear Button */}
                {activeFilterCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClear}
                        className="w-full text-xs"
                    >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Clear all filters
                    </Button>
                )}
            </CollapsibleContent>
        </Collapsible>
    );
}
