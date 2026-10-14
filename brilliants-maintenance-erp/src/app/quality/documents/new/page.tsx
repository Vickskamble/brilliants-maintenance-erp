"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth/context";
import { useQueryScope } from "@/lib/auth/query-scope";
import { createDocument, DOC_TYPES } from "@/services/qms/documents";

export default function NewDocumentPage() {
  const router = useRouter();
  const scope = useQueryScope();
  const { profile } = useAuth();
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState<string>("SOP");
  const [tags, setTags] = useState("");
  const [versionNotes, setVersionNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setIsSaving(true);
    setError("");
    const { data, error: createError } = await createDocument(scope, {
      title: title.trim(),
      doc_type: docType,
      owner_id: profile?.id ?? null,
      owner_name: profile?.name ?? null,
      tags: tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
      version_notes: versionNotes.trim() || null,
    });
    setIsSaving(false);
    if (createError || !data) {
      setError(createError ?? "Could not create the document.");
      return;
    }
    router.push(`/quality/documents/${data.id}`);
  }

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="New Document"
          description="Start a controlled document draft"
          backHref="/quality/documents"
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Document details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium text-gray-700">
                  Title <span className="text-red-500">*</span>
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Calibration procedure for load cells"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Type</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {DOC_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Tags <span className="text-xs font-normal text-gray-400">(comma separated)</span>
                </label>
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. calibration, QA, furnace"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium text-gray-700">
                  Version notes
                </label>
                <Textarea
                  rows={3}
                  value={versionNotes}
                  onChange={(e) => setVersionNotes(e.target.value)}
                  placeholder="Scope, purpose or changes in this revision"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.push("/quality/documents")}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? "Creating..." : "Create draft"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  );
}