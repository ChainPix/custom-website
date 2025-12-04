import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact the FastFormat team",
  description: "Send feedback, report issues, or request a new online tool. We usually reply within one business day.",
  keywords: ["contact", "support", "feedback", "feature request", "ToolStack"],
};

export default function ContactPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16 text-slate-900">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">FastFormat</p>
        <h1 className="text-3xl font-semibold">Contact the developers</h1>
        <p className="max-w-2xl text-base text-slate-700">
          Tell us what you need—bug reports, feature requests, or new tool ideas. We read every message and respond quickly.
        </p>
      </header>

      <form
        action="https://api.web3forms.com/submit"
        method="POST"
        className="flex flex-col gap-4 rounded-2xl bg-white/90 p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200"
      >
        <input type="hidden" name="access_key" value="e3c9f9b8-e9fb-4476-a1a2-d09d2c97491d" />
        <input type="checkbox" name="botcheck" className="hidden" tabIndex={-1} autoComplete="off" />

        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-sm font-semibold text-slate-800">
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="Your name"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-[var(--shadow-soft)] outline-none transition focus:border-slate-400"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-semibold text-slate-800">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-[var(--shadow-soft)] outline-none transition focus:border-slate-400"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="message" className="text-sm font-semibold text-slate-800">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            placeholder="Tell us how we can help..."
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 shadow-[var(--shadow-soft)] outline-none transition focus:border-slate-400"
          />
        </div>

        <p className="text-xs text-slate-500">We never share your email. Expect a reply in ~1 business day.</p>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0"
        >
          Send message
        </button>
      </form>
    </main>
  );
}
