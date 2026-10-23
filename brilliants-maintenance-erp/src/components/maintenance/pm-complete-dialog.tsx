"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface PmCompletionValues {
  completedAt: string;
  notes: string | null;
  durationMinutes: number | null;
}

interface PmCompleteDialogProps {
  open: boolean;
  onClose: () => void;
  scheduleLabel?: string | null;
  isSubmitting?: boolean;
  onConfirm: (values: PmCompletionValues) => void | Promise<void>;
}

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function PmCompleteDialog({
  open,
  onClose,
  scheduleLabel,
  isSubmitting = false,
  onConfirm,
}: PmCompleteDialogProps) {
  const today = toDateInput(new Date());
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [duration, setDuration] = useState("");

  useEffect(() => {
    if (open) {
      setDate(toDateInput(new Date()));
      setNotes("");
      setDuration("");
    }
  }, [open]);

  async function handleConfirm() {
    if (!date) return;
    const [year, month, day] = date.split("-").map(Number);
    const completedAt = new Date(year, month - 1, day, 12, 0, 0).toISOString();
    await onConfirm({
      completedAt,
      notes: notes.trim() || null,
      durationMinutes:
        duration.trim() === "" ? null : Math.max(0, Number(duration) || 0),
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Complete PM"
      description={
        scheduleLabel
          ? `Record completion for ${scheduleLabel}.`
          : "Record the PM completion details."
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="pm-completed-date">
            Completion date <span className="text-red-500">*</span>
          </Label>
          <Input
            id="pm-completed-date"
            type="date"
            value={date}
            max={today}
            onChange={(event) => setDate(event.target.value)}
            className="mt-1.5"
          />
          <p className="mt-1 text-xs text-gray-500">
            Select the date the maintenance was actually performed.
          </p>
        </div>

        <div>
          <Label htmlFor="pm-notes">Notes</Label>
          <Textarea
            id="pm-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional observations..."
            rows={3}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="pm-duration">Time taken (minutes)</Label>
          <Input
            id="pm-duration"
            type="number"
            min={0}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            placeholder="Optional"
            className="mt-1.5"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={!date || isSubmitting}>
            {isSubmitting ? "Completing..." : "Complete PM"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
