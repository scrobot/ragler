"use client";

import { useState, useCallback } from "react";
import { Upload, X, FileText, FileSpreadsheet, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPTED_EXTENSIONS = ".pdf,.docx,.doc,.txt,.md,.csv";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface FileUploadStepProps {
    onFileSelect: (file: File | null) => void;
    selectedFile: File | null;
}

function getFileIcon(filename: string) {
    const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    switch (ext) {
        case '.pdf':
        case '.docx':
        case '.doc':
            return <FileText className="h-8 w-8 text-red-500" />;
        case '.csv':
            return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
        default:
            return <File className="h-8 w-8 text-blue-500" />;
    }
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadStep({ onFileSelect, selectedFile }: FileUploadStepProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const validateFile = useCallback((file: File): string | null => {
        if (file.size > MAX_FILE_SIZE) {
            return `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`;
        }

        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        const allowed = ACCEPTED_EXTENSIONS.split(',');
        if (!allowed.includes(ext)) {
            return `Unsupported file type "${ext}". Supported: ${allowed.join(', ')}`;
        }

        return null;
    }, []);

    const handleFile = useCallback((file: File) => {
        const validationError = validateFile(file);
        if (validationError) {
            setError(validationError);
            onFileSelect(null);
            return;
        }
        setError(null);
        onFileSelect(file);
    }, [validateFile, onFileSelect]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    }, [handleFile]);

    return (
        <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-md text-sm text-muted-foreground mb-4">
                Upload a document file (PDF, DOCX, TXT, Markdown, or CSV). Max 10 MB.
            </div>

            {!selectedFile ? (
                <div
                    className={cn(
                        "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                        isDragOver
                            ? "border-primary bg-primary/5"
                            : "border-muted-foreground/25 hover:border-primary/50",
                    )}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-upload-input')?.click()}
                >
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm font-medium">
                        Drop a file here or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        PDF, DOCX, DOC, TXT, MD, CSV — up to 10 MB
                    </p>
                    <input
                        id="file-upload-input"
                        type="file"
                        className="hidden"
                        accept={ACCEPTED_EXTENSIONS}
                        onChange={handleInputChange}
                    />
                </div>
            ) : (
                <div className="border rounded-lg p-4 flex items-center gap-4">
                    {getFileIcon(selectedFile.name)}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                            {formatFileSize(selectedFile.size)}
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            onFileSelect(null);
                            setError(null);
                        }}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {error && (
                <p className="text-sm text-destructive">{error}</p>
            )}
        </div>
    );
}
