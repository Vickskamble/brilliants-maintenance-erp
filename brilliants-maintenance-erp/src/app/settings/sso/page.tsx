"use client";

import { useEffect, useState } from "react";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingPage } from "@/components/common/loading";
import { ShieldCheck, ShieldX } from "lucide-react";

interface SsoStatus {
  enabled: boolean;
  reason?: string;
  fetchError?: string;
  providers: Array<{ id: string; type: string; name: string }>;
}

export default function SsoPage() {
  const [status, setStatus] = useState<SsoStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/settings/sso");
        const json = (await res.json()) as SsoStatus;
        if (!res.ok) {
          setError((json as { error?: string }).error ?? "Could not load SSO status.");
          return;
        }
        setStatus(json);
      } catch {
        setError("Network error. Try again.");
      }
    })();
  }, []);

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Single Sign-On"
          description="SAML / SSO status for this deployment"
          backHref="/settings"
        />

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!status ? (
          <LoadingPage />
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  {status.enabled ? (
                    <ShieldCheck className="h-4 w-4 text-green-600" />
                  ) : (
                    <ShieldX className="h-4 w-4 text-gray-400" />
                  )}
                  Availability
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Badge variant={status.enabled ? "success" : "default"}>
                    {status.enabled ? "Enabled" : "Not enabled"}
                  </Badge>
                </div>
                {status.reason && (
                  <p className="text-sm text-gray-600">{status.reason}</p>
                )}
                {status.fetchError && (
                  <p className="text-sm text-amber-600">{status.fetchError}</p>
                )}
                <p className="text-xs text-gray-400">
                  Creating providers is done in the Supabase Dashboard under
                  Authentication → SSO (configure SAML metadata there). Account
                  provisioning still requires the Enterprise add-on.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Configured identity providers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {status.providers.length === 0 ? (
                  <p className="text-sm text-gray-500">No identity providers configured.</p>
                ) : (
                  status.providers.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                    >
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      <Badge variant="default">{p.type}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ERPLayout>
  );
}