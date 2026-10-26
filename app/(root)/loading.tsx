export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading files"
      className="space-y-6 p-4 motion-safe:animate-pulse sm:p-7"
    >
      <span className="sr-only">Loading your files…</span>
      <div aria-hidden="true" className="h-10 w-48 rounded-xl bg-light-300" />
      <div
        aria-hidden="true"
        className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
      >
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-52 rounded-2xl bg-white" />
        ))}
      </div>
    </div>
  );
}
