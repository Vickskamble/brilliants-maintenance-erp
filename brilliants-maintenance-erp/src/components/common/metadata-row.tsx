export function MetadataRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="border-b border-gray-100 pb-3">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-gray-900">{value ?? "-"}</p>
    </div>
  );
}