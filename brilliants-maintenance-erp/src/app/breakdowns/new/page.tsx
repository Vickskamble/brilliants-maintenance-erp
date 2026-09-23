"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BreakdownForm from "@/lib/validation/breakdowns";
import { ArrowLeft } from "lucide-react";

export default function NewBreakdownPage() {
  const router = useRouter();

  return (
    <ERPLayout>
      <PageHeader
        title="Report Breakdown"
        description="Record a new equipment breakdown."
        action={
          <Link href="/breakdowns">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Breakdowns
            </Button>
          </Link>
        }
      />
      <Card>
        <CardContent className="p-6">
          <BreakdownForm
            onCancel={() => router.push("/breakdowns")}
            onSaved={(id) => router.push(`/breakdowns/${id}`)}
          />
        </CardContent>
      </Card>
    </ERPLayout>
  );
}