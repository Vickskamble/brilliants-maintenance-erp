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
import { createChange, CHANGE_TYPES } from "@/services/qms/changes";

export default function NewChangePage() {
  const router = useRouter();
  const scope = useQueryScope();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [changeType, setChangeType] = useState("process");
  const [riskAssessment, setRiskAssessment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setIsSaving(true);
    setError("");
    const { data, error: createError } = await createChange(scope, { id: user?.id ?? null }, {
      title: title.trim(),
      description: description.trim() || undefined,
      change_type: changeType,
      risk_assessment: riskAssessment.trim() || undefined,
    });
    setIsSaving(false);
    if (createError || !data) {
      setError(createError ?? "Could not create the change request.");
      return;
    }
    router.push(`/quality/change-control/${data.id}`);
  }

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader title="New Change Request" description="Raise a change for CCB review" backHref="/quality/change-control" />

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Change request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Title <span className="text-red-500">*</span>
              </label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. PID tuning change on furnace F-101" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Type</label>
              <select
                value={changeType}
                onChange={(e) => setChangeType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {CHANGE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is changing and why" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Risk assessment</label>
              <Textarea rows={4} value={riskAssessment} onChange={(e) => setRiskAssessment(e.target.value)} placeholder="Impact and risk analysis for the CCB" />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.push("/quality/change-control")}>Cancel</Button>
              <Button type="button" onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? "Creating..." : "Raise change"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  );
}