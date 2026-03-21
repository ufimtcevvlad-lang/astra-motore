export function MaintenanceNotice({
  message,
}: {
  message: string;
}) {
  return (
    <div
      role="status"
      className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <strong className="font-semibold">Сайт в разработке.</strong>{" "}
      {message}
    </div>
  );
}

