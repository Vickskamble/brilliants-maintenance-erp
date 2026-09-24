"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/context";
import { useQueryScope } from "@/lib/auth/query-scope";
import {
  AttachmentRow,
  attachmentDownloadUrl,
  deleteAttachment,
  formatSize,
  listAttachments,
  logAuditAction,
  uploadAttachment,
} from "@/services/platform";
import { Download, FileText, Paperclip, Upload, X } from "lucide-react";
import { LoadingSpinner } from "@/components/common/loading";

interface AttachmentPanelProps {
  entityType: string;
  entityId: string;
  entityTitle?: string;
}

export function AttachmentPanel({
  entityType,
  entityId,
  entityTitle,
}: AttachmentPanelProps) {
  const { user, profile } = useAuth();
  const scope = useQueryScope();
  const fileRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<AttachmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await listAttachments(scope, entityType, entityId);
    setItems(res.data);
    setError(res.error);
    setIsLoading(false);
  }, [scope, entityType, entityId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIsUploading(true);
    setError(null);
    const res = await uploadAttachment(scope, {
      entityType,
      entityId,
      file,
      user: { id: user?.id, name: profile?.name },
    });
    if (res.error) {
      setError(res.error);
    } else {
      void logAuditAction(
        scope,
        {
          action: "attachment.upload",
          entityType,
          entityId,
          entityTitle,
          summary: `Uploaded ${file.name} (${formatSize(file.size)})`,
          metadata: { file_name: file.name, size_bytes: file.size },
        },
        { id: user?.id, name: profile?.name }
      );
      await load();
    }
    setIsUploading(false);
  }

  async function onDelete(a: AttachmentRow) {
    const res = await deleteAttachment(scope, a.id);
    if (res.error) {
      setError(res.error);
      return;
    }
    void logAuditAction(
      scope,
      {
        action: "attachment.delete",
        entityType,
        entityId,
        entityTitle,
        summary: `Removed ${a.file_name}`,
        metadata: { file_name: a.file_name },
      },
      { id: user?.id, name: profile?.name }
    );
    await load();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Paperclip className="h-4 w-4 text-gray-500" />
          Attachments
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <LoadingSpinner size="sm" className="mr-2" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Upload
        </Button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => void onPickFile(e)}
        />
      </CardHeader>
      <CardContent className="space-y-2">
        {error && (
          <p className="rounded-md bg-red-50 p-2 text-xs text-red-600">{error}</p>
        )}
        {isLoading ? (
          <p className="py-4 text-center text-sm text-gray-400">
            Loading attachments...
          </p>
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">
            No attachments yet. Upload documents, photos or job sheets.
          </p>
        ) : (
          items.map((a) => {
            const url = attachmentDownloadUrl(a);
            return (
              <div
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {a.file_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatSize(a.size_bytes)}
                      {a.uploaded_by_name ? ` · ${a.uploaded_by_name}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {url && (
                    <a href={url} download={a.file_name}>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void onDelete(a)}
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}