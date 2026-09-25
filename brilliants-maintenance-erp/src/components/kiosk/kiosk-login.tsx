"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";
import { QrCode, Loader2 } from "lucide-react";

export function KioskLogin() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSigningIn(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setError(error.message);
      setIsSigningIn(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-slate-100 px-6 py-10">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
        <QrCode className="h-8 w-8 text-white" />
      </div>
      <h1 className="mt-4 text-xl font-bold text-gray-900">Maintenance Kiosk</h1>
      <p className="mt-1 text-sm text-gray-500">
        Sign in with your ERP account
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-sm"
      >
        <div className="space-y-1.5">
          <Label htmlFor="kiosk-email">Email</Label>
          <Input
            id="kiosk-email"
            type="email"
            autoComplete="username"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="kiosk-password">Password</Label>
          <Input
            id="kiosk-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        <FormError message={error ?? undefined} />
        <Button type="submit" className="w-full" disabled={isSigningIn}>
          {isSigningIn ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>
    </div>
  );
}