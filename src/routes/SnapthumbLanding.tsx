import { Link } from "react-router-dom";

export default function SnapthumbLanding() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
        <div className="text-lg font-semibold tracking-tight">Snapthumb</div>
        <nav className="flex gap-6 text-sm">
          <a href="#features" className="opacity-80 hover:opacity-100">Features</a>
          <a href="#faq" className="opacity-80 hover:opacity-100">FAQ</a>
          <a href="https://github.com" className="opacity-80 hover:opacity-100">GitHub</a>
        </nav>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-6">
        {/* Hero */}
        <section className="py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-6xl font-semibold leading-tight">
              Free YouTube Thumbnail Maker.
            </h1>
            <p className="mt-4 text-lg opacity-90 max-w-prose">
              Grab a frame, drop your logo, add text, and export under 2MB.
              Pro results without bloated software.
            </p>
            <p className="mt-3 text-sm opacity-70">
              1) Import video → 2) Pick frame → 3) Add logo/text → 4) Export &lt;2MB
            </p>
            <div className="mt-8 flex gap-3">
              <Link
                to="/app"
                className="inline-flex items-center rounded-2xl px-6 py-3 bg-white text-black font-medium hover:opacity-90"
              >
                Open the App
              </Link>
              <a
                href="#features"
                className="inline-flex items-center rounded-2xl px-6 py-3 border border-white/20 hover:bg-white/5"
              >
                See features
              </a>
            </div>
            <p className="mt-3 text-sm opacity-70">
              100% free • No sign-up • Works in your browser
            </p>
          </div>

          {/* Hero image (uses your social preview) */}
          <div className="rounded-2xl overflow-hidden border border-white/10">
            <img
              src="/snapthumb-preview.png"
              alt="Snapthumb preview"
              className="w-full h-auto"
            />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-semibold">Why creators like it</h2>
          <ul className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <li className="p-5 rounded-2xl border border-white/10">
              <div className="font-medium">Frame-grab in 1 click</div>
              <p className="text-sm opacity-80 mt-1">Import video, scrub, capture the perfect moment.</p>
            </li>
            <li className="p-5 rounded-2xl border border-white/10">
              <div className="font-medium">Logo & text overlays</div>
              <p className="text-sm opacity-80 mt-1">Drag-resize overlays, font controls, undo/restart.</p>
            </li>
            <li className="p-5 rounded-2xl border border-white/10">
              <div className="font-medium">Under 2MB exports</div>
              <p className="text-sm opacity-80 mt-1">Optimized defaults for YouTube’s limits.</p>
            </li>
          </ul>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-semibold">FAQ</h2>
          <div className="mt-6 space-y-5">
            <details className="group border border-white/10 rounded-2xl p-5">
              <summary className="cursor-pointer font-medium">Is it really free?</summary>
              <p className="mt-2 opacity-80 text-sm">Yes. The vision is free forever with tasteful ads.</p>
            </details>
            <details className="group border border-white/10 rounded-2xl p-5">
              <summary className="cursor-pointer font-medium">Do my files upload anywhere?</summary>
              <p className="mt-2 opacity-80 text-sm">No. Everything runs locally in your browser.</p>
            </details>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 opacity-70 text-sm">
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>© {new Date().getFullYear()} Snapthumb</div>
            <div className="flex gap-4">
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
