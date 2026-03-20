export function MaintenanceNotice({
  message,
}: {
  message: string;
}) {
  return (
    <div
      role="status"
      className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
    >
      <strong className="font-semibold">Сайт в разработке.</strong>{" "}
      {message}
    </div>
  );
}

