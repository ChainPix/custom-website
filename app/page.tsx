import ToolGrid from "@/components/tool-grid";
import Image from "next/image";
import { toolCategories } from "@/lib/tools";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-16 text-slate-900">
      <header className="flex flex-col gap-3">
        <div className="mb-2 flex justify-center">
          <Image
            src="/logo.png"
            alt="ToolStack"
            width={200}
            height={60}
            priority
            className="h-auto w-auto"
          />
        </div>
        <h1 className="text-center text-3xl font-semibold">Minimal, fast, and focused online tools</h1>
        <p className="mx-auto max-w-3xl text-center text-lg text-slate-700">
          Choose a tool to get started. All tools are free to use and work directly in your browser. No sign-up required.
        </p>
        <div className="text-center text-sm text-slate-600">
          Need something else?{" "}
          <a
            className="font-semibold text-slate-900 underline decoration-slate-300 decoration-2 underline-offset-4 transition hover:decoration-slate-500"
            href="/contact"
          >
            Contact the developers
          </a>{" "}
          with your request.
        </div>
      </header>

      <ToolGrid categories={toolCategories} />
    </main>
  );
}
