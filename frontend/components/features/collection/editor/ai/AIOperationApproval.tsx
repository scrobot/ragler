"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, Scissors, Merge, Pencil, Trash2 } from "lucide-react";
import type { PendingOperation } from "./useCollectionAgent";

const OPERATION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  SPLIT: Scissors,
  MERGE: Merge,
  REWRITE: Pencil,
  DELETE: Trash2,
};

interface AIOperationApprovalProps {
  operation: PendingOperation;
  onApprove: () => void;
  onReject: () => void;
}

export function AIOperationApproval({
  operation,
  onApprove,
  onReject,
}: AIOperationApprovalProps) {
  const Icon = OPERATION_ICONS[operation.type] || Pencil;

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-900/20 dark:border-amber-800">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900">
            <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{operation.type}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {operation.description}
            </p>
            {operation.preview && (
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-20 whitespace-pre-wrap">
                {operation.preview.substring(0, 200)}
                {operation.preview.length > 200 && "..."}
              </pre>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              onClick={onReject}
              className="h-8 w-8"
            >
              <X className="h-4 w-4 text-destructive" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onApprove}
              className="h-8 w-8"
            >
              <Check className="h-4 w-4 text-green-600" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
