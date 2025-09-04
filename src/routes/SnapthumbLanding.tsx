import React, { useEffect, useState } from "react";

const SnapthumbLanding: React.FC = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const prev = document.title;
    document.title = "Snapthumb — Free, pro-grade YouTube thumbnail maker";
    return () => { document.title = prev; };
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: wire to Formspree/Mailchimp or a Vercel serverless endpoint
    console.log("Snapthumb early access:", email);
    setSubmitted(true);
  };

  return (
    <div className="min-h-svh flex flex-col">
      {/* Header */}
      <header className="w-full border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div className="text-xl font-extrabold tracking-tight">Snapthumb</div>
          {/* Keep beta link subtle */}
          <a
            href="/app"
            className="text-sm opacity-50 hover:opacity-100 transition"
            aria-label="Open Snapthumb (beta)"
          >
            Open beta
          </a>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-4 py-16 grid gap-10 lg:grid-cols-2 items-center">
          <div>
            <h1 className="text-4xl font-extrabold leading-tight">
              Free, pro-grade YouTube thumbnail maker
            </h1>
            <p className="mt-4 text-base opacity-80">
              Grab the perfect frame from your video, drop your logo on top, and export a sharp thumbnail under 2&nbsp;MB — no watermarks, no bloat.
            </p>
            <ul className="mt-6 space-y-2 text-sm opacity-80 list-disc list-inside">
              <li>Instant frame capture (stays on your device)</li>
              <li>Drag & resize overlays with pixel precision</li>
              <li>Export tuned for YouTube’s compression</li>
            </ul>

            <form onSubmit={onSubmit} className="mt-8 flex max-w-md gap-2">
              <input
                type="email"
                required
                placeholder="you@studio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-xl border px-3 py-2 outline-none focus:ring"
                aria-label="Your email"
              />
              <button
                type="submit"
                className="rounded-xl border px-4 py-2 font-medium hover:shadow"
              >
                Get early access
              </button>
            </form>

            {submitted && (
              <p className="mt-3 text-sm text-green-600">
                Thanks! You’re on the list. We’ll email you when it launches.
              </p>
            )}

            <p className="mt-3 text-xs opacity-60">
              We’ll only email about Snapthumb. Unsubscribe anytime.
            </p>
          </div>

          {/* Preview Card */}
          <div className="border rounded-2xl p-6">
            <div className="text-sm mb-2 opacity-70">Live preview</div>
            <div className="aspect-video w-full border rounded-xl grid place-items-center">
              <span className="opacity-60">Snapthumb UI preview coming soon</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs opacity-70">
              <div className="border rounded-lg p-2 text-center">16:9 Frames</div>
              <div className="border rounded-lg p-2 text-center">Logo Overlay</div>
              <div className="border rounded-lg p-2 text-center">≤ 2 MB Export</div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t">
        <div className="mx-auto max-w-5xl px-4 py-6 text-sm opacity-70 flex flex-wrap gap-4 items-center justify-between">
          <span>© {new Date().getFullYear()} Snapthumb</span>
          <div className="flex gap-4">
            <a href="#" className="hover:underline">Privacy</a>
            <a href="#" className="hover:underline">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SnapthumbLanding;
