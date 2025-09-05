export default function Terms() {
  return (
    <div className="min-h-screen bg-black text-white">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold">Terms of Use</h1>
        <p className="mt-4 opacity-80">
          Snapthumb is provided “as is” without warranty. You are responsible for any
          content you create and upload to third-party platforms.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Acceptable Use</h2>
        <ul className="mt-2 list-disc pl-6 opacity-80">
          <li>No illegal content or rights infringement.</li>
          <li>No attempts to break or exploit the service.</li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold">Liability</h2>
        <p className="mt-2 opacity-80">
          We are not liable for any loss or damage arising from use of Snapthumb.
        </p>

        <p className="mt-10 text-sm opacity-60">Last updated: 5 Sep 2025</p>
        <a href="/" className="inline-block mt-8 rounded-2xl px-5 py-3 bg-white text-black">
          ← Back to home
        </a>
      </main>
    </div>
  );
}
