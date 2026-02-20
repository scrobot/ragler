"use client";

import { useState } from "react";
import { EditorChunk } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Scissors,
  Trash2,
  Save,
  X,
  Pencil,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CollectionChunkItemProps {
  chunk: EditorChunk;
  index: number;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onUpdate: (id: string, content: string) => void;
  onSplit: () => void;
  onDelete: () => void;
  isUpdating: boolean;
}

function getQualityColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return "bg-muted text-muted-foreground";
  if (score >= 80) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
  if (score >= 60) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
  return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
}

export function CollectionChunkItem({
  chunk,
  index,
  isSelected,
  onToggleSelect,
  onUpdate,
  onSplit,
  onDelete,
  isUpdating,
}: CollectionChunkItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(chunk.content);

  const qualityScore = chunk.editor?.quality_score;
  const qualityIssues = chunk.editor?.quality_issues ?? [];

  const handleSave = () => {
    if (editContent.trim() !== chunk.content.trim()) {
      onUpdate(chunk.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(chunk.content);
    setIsEditing(false);
  };

  return (
    <Card
      className={cn(
        "group transition-all",
        isSelected && "ring-2 ring-primary",
        isEditing && "ring-2 ring-blue-500"
      )}
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Selection Checkbox */}
          <div className="pt-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(chunk.id)}
            />
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            {/* Header Row */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-muted-foreground">
                #{index + 1}
              </span>
              <Badge variant="secondary" className="text-xs">
                {chunk.chunk.type}
              </Badge>
              {chunk.chunk.section && (
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {chunk.chunk.section}
                </span>
              )}

              {/* Quality Score Badge */}
              {qualityScore !== null && qualityScore !== undefined && (
                <Badge className={cn("text-xs ml-auto", getQualityColor(qualityScore))}>
                  {qualityScore}/100
                </Badge>
              )}

              {/* Quality Issues Indicator */}
              {qualityIssues.length > 0 && (
                <div
                  className="flex items-center text-amber-500"
                  title={qualityIssues.join(", ")}
                >
                  <AlertCircle className="h-3 w-3" />
                  <span className="text-xs ml-1">{qualityIssues.length}</span>
                </div>
              )}
            </div>

            {/* Content */}
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[150px] font-mono text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isUpdating}
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancel}>
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="prose prose-sm dark:prose-invert max-w-none cursor-pointer"
                onClick={() => {
                  setEditContent(chunk.content);
                  setIsEditing(true);
                }}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {chunk.content}
                </p>
              </div>
            )}

            {/* Tags */}
            {chunk.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {chunk.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>{chunk.content.length} chars</span>
              {chunk.editor?.edit_count && chunk.editor.edit_count > 0 && (
                <>
                  <span>|</span>
                  <span>{chunk.editor.edit_count} edits</span>
                </>
              )}
            </div>
          </div>

          {/* Actions Menu */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  setEditContent(chunk.content);
                  setIsEditing(true);
                }}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSplit}>
                  <Scissors className="h-4 w-4 mr-2" />
                  Split
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
