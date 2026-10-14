"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { LoadingPage } from "@/components/common/loading";
import { ApprovalPanel } from "@/components/approvals/approval-panel";
import { PermissionGate } from "@/components/auth/permission-gate";
import { ERPModal } from "@/components/erp/erp-modal";
import { useAuth } from "@/lib/auth/context";
import { useQueryScope } from "@/lib/auth/query-scope";
import {
  getDocument,
  listDocumentRevisions,
  submitDocumentForApproval,
  moveDocument,
  setDocumentStoragePath,
  type QmsDocumentRow,
} from "@/services/qms/documents";
import { uploadQmsDocument, createSignedQmsUrl } from "@/services/qms/storage";
import type { ApproverContext } from "@/services/approvals";
import { FileText, Download, History, Send, Paperclip } from "lucide-react";

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const { user, profile, roles, hasPermission } = useAuth();
  const scope = useQueryScope();
  const [doc, setDoc] = useState<QmsDocumentRow | null>(null);
  const [revisions, setRevisions] = useState<QmsDocumentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAttachOpen, setIsAttachOpen] = useState(false);
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [isAttaching, setIsAttaching] = useState(false);

  const docId = params.id;

  async function load() {
    setIsLoading(true);
    const [docRes, revRes] = await Promise.all([
      getDocument(docId),
      listDocumentRevisions(docId),
    ]);
    setDoc(docRes.data);
    setRevisions(revRes.data);
    setIsLoading(false);
  }

  useEffect(() => {
    void load();
  }, [docId]);

  if (!user) return null;

  const ctx: ApproverContext = {
    userId: user.id,
    userName: profile?.name ?? user.email ?? "User",
    roleCodes: roles.map((r) => r.code),
    organizationId: scope.organizationId,
    plantId: scope.plantId,
    hasPermission,
  };

  async function handleSubmit() {
    if (!doc) return;
    setIsSubmitting(true);
    setMessage(null);
    const res = await submitDocumentForApproval(scope, ctx, doc.id);
    setIsSubmitting(false);
    if (res.error) {
      setMessage({ kind: "err", text: res.error });
      return;
    }
    if (!res.created) {
      setMessage({ kind: "err", text: "No approval workflow is configured for documents. Contact your administrator." });
      return;
    }
    setMessage({ kind: "ok", text: "Document submitted for QA review." });
    await load();
  }

  async function handleMove(toStatus: "superseded" | "withdrawn") {
    if (!doc) return;
    setMessage(null);
    const error = await moveDocument(doc.id, toStatus);
    if (error) {
      setMessage({ kind: "err", text: error });
      return;
    }
    setMessage({
      kind: "ok",
      text: toStatus === "superseded" ? "Document marked as superseded." : "Document withdrawn.",
    });
    await load();
  }

  async function handleDownload(path: string) {
    const { url, error } = await createSignedQmsUrl(path);
    if (error || !url) {
      setMessage({ kind: "err", text: error ?? "Could not create download link." });
      return;
    }
    window.open(url, "_blank");
  }

  async function handleAttach() {
    if (!doc || !attachFile) return;
    setIsAttaching(true);
    setMessage(null);
    const { path, error: uploadError } = await uploadQmsDocument(attachFile, "documents");
    if (uploadError || !path) {
      setIsAttaching(false);
      setMessage({ kind: "err", text: uploadError ?? "Could not upload the file." });
      return;
    }
    const error = await setDocumentStoragePath(doc.id, path);
    setIsAttaching(false);
    if (error) {
      setMessage({ kind: "err", text: error });
      return;
    }
    setAttachFile(null);
    setIsAttachOpen(false);
    setMessage({ kind: "ok", text: "File attached to this revision." });
    await load();
  }

  if (isLoading) {
    return (
      <ERPLayout>
        <LoadingPage />
      </ERPLayout>
    );
  }

  if (!doc) {
    return (
      <ERPLayout>
        <div className="py-12 text-center text-sm text-gray-500">Document not found.</div>
      </ERPLayout>
    );
  }

  const isOwner = doc.owner_id === user.id;

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title={doc.doc_code}
          description={doc.title}
          backHref="/quality/documents"
        />

        {message && (
          <div
            className={
              message.kind === "ok"
                ? "rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
                : "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            }
          >
            {message.text}
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4 text-gray-400" />
              Document details
            </CardTitle>
            <StatusBadge status={doc.status} />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Type" value={doc.doc_type} />
              <Field label="Revision" value={String(doc.revision)} />
              <Field label="Owner" value={doc.owner_name ?? "—"} />
              <Field label="Effective date" value={doc.effective_date ? new Date(doc.effective_date).toLocaleDateString("en-IN") : "—"} />
            </div>
            {(doc.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {doc.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {doc.version_notes && (
              <p className="text-sm text-gray-600">{doc.version_notes}</p>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
              {doc.status === "draft" && (isOwner || hasPermission("documents", "edit")) && (
                <PermissionGate module="documents" action="edit" fallback={null}>
                  <>
                    <Button size="sm" variant="outline" onClick={() => setIsAttachOpen(true)}>
                      <Paperclip className="mr-1.5 h-3.5 w-3.5" />
                      Attach file
                    </Button>
                    <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      {isSubmitting ? "Submitting..." : "Submit for approval"}
                    </Button>
                  </>
                </PermissionGate>
              )}
              {doc.status === "effective" && (
                <PermissionGate module="documents" action="close" fallback={null}>
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-200 text-amber-700 hover:bg-amber-50"
                      onClick={() => handleMove("superseded")}
                    >
                      Mark superseded
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-gray-200 text-gray-600 hover:bg-gray-50"
                      onClick={() => handleMove("withdrawn")}
                    >
                      Withdraw
                    </Button>
                  </>
                </PermissionGate>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <History className="h-4 w-4 text-gray-400" />
                Revision history
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {revisions.map((rev) => (
                <div key={rev.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Rev {rev.revision}
                      {rev.id === doc.id ? (
                        <span className="ml-1.5 text-xs text-blue-600">(current)</span>
                      ) : null}
                    </p>
                    {rev.version_notes && (
                      <p className="mt-0.5 text-xs text-gray-500">{rev.version_notes}</p>
                    )}
                    <div className="mt-1">
                      <StatusBadge status={rev.status} />
                    </div>
                  </div>
                  {rev.storage_path && (
                    <Button size="sm" variant="ghost" onClick={() => handleDownload(rev.storage_path!)}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              {revisions.length === 0 && (
                <p className="text-sm text-gray-500">No revisions recorded.</p>
              )}
            </CardContent>
          </Card>

          <ApprovalPanel entityType="document" entityId={doc.id} onChange={load} />
        </div>

        <ERPModal
          open={isAttachOpen}
          onClose={() => !isAttaching && setIsAttachOpen(false)}
          title="Attach file"
          description={`Attach the approved file to ${doc.doc_code} Rev ${doc.revision}.`}
          size="md"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAttachOpen(false)}
                disabled={isAttaching}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAttach}
                disabled={isAttaching || !attachFile}
              >
                {isAttaching ? "Uploading..." : "Attach"}
              </Button>
            </>
          }
        >
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            onChange={(e) => setAttachFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-600"
          />
        </ERPModal>
      </div>
    </ERPLayout>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm text-gray-900">{value}</p>
    </div>
  );
}