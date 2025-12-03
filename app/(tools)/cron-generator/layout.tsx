export default function CronGeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-14 text-slate-900">{children}</div>
  );
}
