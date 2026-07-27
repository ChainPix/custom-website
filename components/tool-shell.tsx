import type { ReactNode } from "react";

type ToolShellProps = {
  /** Tool page h1. */
  title: string;
  /** One-line description rendered under the title. */
  description?: string;
  children: ReactNode;
};

/**
 * Minimal shared page scaffold for tool pages: h1 + description header.
 * The outer width/padding wrapper comes from app/(tools)/layout.tsx.
 * New tools should use this; existing tools migrate opportunistically.
 */
export default function ToolShell({ title, description, children }: ToolShellProps) {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
        {description ? <p className="text-lg text-slate-600">{description}</p> : null}
      </header>
      {children}
    </div>
  );
}
