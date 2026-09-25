"use client";

import { QrCode } from "./qr-code";

export interface QrLabelEquipment {
  id: string;
  qr_code: string | null;
  equipment_code: string;
  equipment_name: string;
  plants?: { name: string } | null;
}

export function QrLabel({
  equipment,
}: {
  equipment: QrLabelEquipment;
}) {
  return (
    <div className="flex w-56 flex-col items-center gap-2 rounded-md border border-gray-300 p-3">
      <QrCode
        payload={equipment.qr_code || `BEM:${equipment.id}`}
        size={168}
        className="rounded border border-gray-100 bg-white p-1"
      />
      <div className="w-full text-center">
        <p className="truncate text-sm font-semibold text-gray-900">
          {equipment.equipment_code}
        </p>
        <p className="truncate text-xs text-gray-600">{equipment.equipment_name}</p>
        <p className="mt-0.5 truncate text-[10px] uppercase tracking-wide text-gray-400">
          {equipment.plants?.name ?? "No plant"}
        </p>
      </div>
    </div>
  );
}