export default function Privacy() {
  return (
    <div className="min-h-screen bg-black text-white">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold">Privacy Policy</h1>
        <p className="mt-4 opacity-80">
          Snapthumb runs entirely in your browser. We do not upload your videos, images,
          or thumbnails to our servers.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Data</h2>
        <ul className="mt-2 list-disc pl-6 opacity-80">
          <li>Local-only editing and export.</li>
          <li>Visit analytics via Vercel Analytics (no personal profiles).</li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold">Contact</h2>
        <p className="mt-2 opacity-80">Questions: hello@snapthumb.app</p>

        <p className="mt-10 text-sm opacity-60">Last updated: 5 Sep 2025</p>
        <a href="/" className="inline-block mt-8 rounded-2xl px-5 py-3 bg-white text-black">
          ← Back to home
        </a>
      </main>
    </div>
  );
}
