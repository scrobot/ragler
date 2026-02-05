"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Globe, FileCode } from "lucide-react";
import { SourceType } from "@/types/api";

interface SourcePreviewProps {
  rawContent: string | null;
  sourceType: SourceType;
  sourceUrl: string;
}

export function SourcePreview({ rawContent, sourceType, sourceUrl }: SourcePreviewProps) {
  // For manual sources, there's no preview
  if (sourceType === "manual" || !rawContent) {
    return (
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Source Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No preview available for manual text input.
          </p>
        </CardContent>
      </Card>
    );
  }

  const icon = sourceType === "web" ? Globe : FileCode;
  const Icon = icon;

  // Create a blob URL for the iframe to render the HTML safely
  const blobUrl = useMemo(() => {
    // Wrap the raw content in a basic HTML structure if it's Confluence storage format
    const htmlContent = sourceType === "confluence"
      ? `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; padding: 16px; line-height: 1.6; }
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    pre { background: #f4f4f4; padding: 12px; overflow-x: auto; }
    code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
  </style>
</head>
<body>${rawContent}</body>
</html>`
      : rawContent;

    const blob = new Blob([htmlContent], { type: "text/html" });
    return URL.createObjectURL(blob);
  }, [rawContent, sourceType]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className="h-4 w-4" />
          Source Preview
          <span className="text-xs text-muted-foreground font-normal ml-auto truncate max-w-[200px]">
            {sourceUrl}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <iframe
          src={blobUrl}
          title="Source Preview"
          className="w-full h-[400px] border-0 rounded-b-lg"
          sandbox="allow-same-origin"
        />
      </CardContent>
    </Card>
  );
}
