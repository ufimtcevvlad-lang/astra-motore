interface AdminHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export default function AdminHeader({ title, children }: AdminHeaderProps) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-4">
        {children}
        <span className="text-sm text-gray-500">{dateStr}</span>
      </div>
    </header>
  );
}
