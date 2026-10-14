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
import {
  createDeviation,
  DEVIATION_TYPES,
  DEVIATION_SEVERITIES,
} from "@/services/qms/deviations";

export default function NewDeviationPage() {
  const router = useRouter();
  const scope = useQueryScope();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [devType, setDevType] = useState("process");
  const [severity, setSeverity] = useState("minor");
  const [occurredAt, setOccurredAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setIsSaving(true);
    setError("");
    const { data, error: createError } = await createDeviation(scope, { id: user?.id ?? null }, {
      title: title.trim(),
      description: description.trim() || undefined,
      dev_type: devType,
      severity,
      occurred_at: occurredAt ? new Date(occurredAt).toISOString() : undefined,
    });
    setIsSaving(false);
    if (createError || !data) {
      setError(createError ?? "Could not create the deviation.");
      return;
    }
    router.push(`/quality/deviations/${data.id}`);
  }

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader title="New Deviation" description="Report a deviation or non-conformance" backHref="/quality/deviations" />

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Deviation details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Title <span className="text-red-500">*</span>
              </label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Batch temperature overshoot" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Type</label>
                <select
                  value={devType}
                  onChange={(e) => setDevType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {DEVIATION_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {DEVIATION_SEVERITIES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Occurred at <span className="text-xs font-normal text-gray-400">(optional)</span>
              </label>
              <Input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What happened, when and impact" />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.push("/quality/deviations")}>Cancel</Button>
              <Button type="button" onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? "Creating..." : "Create deviation"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  );
}