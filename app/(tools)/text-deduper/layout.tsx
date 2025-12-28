export default function TextDeduperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full px-6 py-14 text-slate-900">{children}</div>
  );
}
