"use client";

import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gauge, Construction } from "lucide-react";

export default function CalibrationPage() {
  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Calibration"
          description="Track instrument and gauge calibration schedules."
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
              <Gauge className="h-7 w-7 text-blue-600" />
            </div>
            <Badge variant="info" className="mt-4">
              Coming Soon
            </Badge>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              Calibration module not set up yet
            </h3>
            <p className="mt-2 max-w-md text-sm text-gray-500">
              Calibration records and schedules will appear here once the
              module is configured. No data is being displayed yet.
            </p>
            <Construction className="mt-6 h-5 w-5 text-gray-300" />
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  );
}