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
  createCapa,
  CAPA_SOURCE_TYPES,
  CAPA_RISKS,
} from "@/services/qms/capas";

export default function NewCapaPage() {
  const router = useRouter();
  const scope = useQueryScope();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceType, setSourceType] = useState("deviation");
  const [sourceRef, setSourceRef] = useState("");
  const [riskLevel, setRiskLevel] = useState("medium");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setIsSaving(true);
    setError("");
    const { data, error: createError } = await createCapa(scope, { id: user?.id ?? null }, {
      title: title.trim(),
      description: description.trim() || undefined,
      source_type: sourceType,
      source_ref: sourceRef.trim() || undefined,
      risk_level: riskLevel,
    });
    setIsSaving(false);
    if (createError || !data) {
      setError(createError ?? "Could not create the CAPA.");
      return;
    }
    router.push(`/quality/capas/${data.id}`);
  }

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader title="New CAPA" description="Initiate a corrective and preventive action" backHref="/quality/capas" />

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">CAPA details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Title <span className="text-red-500">*</span>
              </label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Calibration revision for furnace sensors" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Source</label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {CAPA_SOURCE_TYPES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Risk level</label>
                <select
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {CAPA_RISKS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Source reference <span className="text-xs font-normal text-gray-400">(e.g. DEV-QA-0001)</span>
              </label>
              <Input value={sourceRef} onChange={(e) => setSourceRef(e.target.value)} placeholder="DEV-QA-0001" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Problem statement and related context" />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.push("/quality/capas")}>Cancel</Button>
              <Button type="button" onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? "Creating..." : "Initiate CAPA"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  );
}