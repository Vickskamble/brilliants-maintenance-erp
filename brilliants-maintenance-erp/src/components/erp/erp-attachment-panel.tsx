"use client";

import type { ReactNode } from "react";
import { Paperclip, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";

export interface ERPAttachment {
  id: string;
  name: string;
  size?: string;
  url?: string;
  onDownload?: () => void;
  onDelete?: () => void;
}

export interface ERPAttachmentPanelProps {
  attachments: ERPAttachment[];
  onUpload?: () => void;
  uploadLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  isUploading?: boolean;
  className?: string;
}

export function ERPAttachmentPanel({
  attachments,
  onUpload,
  uploadLabel = "Upload",
  emptyTitle = "No attachments",
  emptyDescription = "Upload files to attach documents or images.",
  isUploading,
  className,
}: ERPAttachmentPanelProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {onUpload && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onUpload} isLoading={isUploading}>
            <Upload className="mr-2 h-4 w-4" />
            {uploadLabel}
          </Button>
        </div>
      )}
      {attachments.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {attachments.map((file) => (
            <li key={file.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <Paperclip className="h-4 w-4 shrink-0 text-gray-400" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{file.name}</p>
                  {file.size && (
                    <p className="text-xs text-gray-500">{file.size}</p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {file.url && (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                  >
                    View
                  </a>
                )}
                {file.onDownload && (
                  <Button variant="ghost" size="sm" onClick={file.onDownload}>
                    Download
                  </Button>
                )}
                {file.onDelete && (
                  <Button variant="ghost" size="sm" onClick={file.onDelete}>
                    Delete
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}