"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { useQueryScope } from "@/lib/auth/query-scope";
import {
  verifyAndRecordSignature,
  type SignatureIntent,
} from "@/services/signatures";

interface SignModalProps {
  open: boolean;
  onClose: () => void;
  entityType: string;
  entityId: string;
  intent: SignatureIntent;
  meaning: string;
  onSigned: () => void | Promise<void>;
}

export function SignModal({
  open,
  onClose,
  entityType,
  entityId,
  intent,
  meaning,
  onSigned,
}: SignModalProps) {
  const { user, profile } = useAuth();
  const scope = useQueryScope();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError("");
    setIsSaving(true);
    const res = await verifyAndRecordSignature(
      {
        organizationId: scope.organizationId ?? null,
        plantId: scope.plantId ?? null,
        userId: user.id,
        userName: profile?.name ?? user.email ?? "User",
        entityType,
        entityId,
        intent,
        meaning,
      },
      password
    );
    setIsSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setPassword("");
    onClose();
    await onSigned();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Electronic Signature"
      description="Re-enter your password to sign this action (21 CFR Part 11)."
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
          <p className="font-medium text-gray-900">{meaning}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            Signed by {profile?.name ?? user?.email ?? "User"} at{" "}
            {new Date().toLocaleString()}
          </p>
        </div>

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          autoComplete="current-password"
          required
          autoFocus
        />

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving} variant="primary">
            <Lock className="mr-1 h-4 w-4" />
            {isSaving ? "Signing..." : "Sign & Submit"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}