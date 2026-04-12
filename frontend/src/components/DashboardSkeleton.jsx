export default function DashboardSkeleton({ tone = "light" }) {
  const shellClass =
    tone === "dark"
      ? "bg-linear-to-br from-[#1B4D2F] via-[#14532D] to-[#1B4D2F]"
      : "bg-linear-to-br from-[#fff6d3] via-[#fff9eb] to-[#f7edd1]";

  const blockClass =
    tone === "dark"
      ? "bg-white/12"
      : "bg-white/85 border border-[#eadfca]";

  return (
    <div className={`min-h-screen pb-8 ${shellClass}`}>
      <div className="mx-auto max-w-7xl px-4 pt-8 lg:px-8">
        <div className={`animate-shimmer-soft rounded-2xl p-6 shadow-lg ${blockClass}`}>
          <div className="h-7 w-48 rounded-xl bg-white/45" />
          <div className="mt-4 h-4 w-72 rounded-lg bg-white/35" />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-white/30 bg-white/30 p-5"
              >
                <div className="h-12 w-12 rounded-xl bg-white/45" />
                <div className="mt-4 h-4 w-24 rounded-lg bg-white/40" />
                <div className="mt-3 h-8 w-20 rounded-lg bg-white/55" />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {[0, 1].map((item) => (
            <div
              key={item}
              className={`animate-shimmer-soft rounded-2xl p-6 shadow-lg ${blockClass}`}
            >
              <div className="h-5 w-40 rounded-lg bg-white/45" />
              <div className="mt-5 h-24 rounded-2xl bg-white/35" />
              <div className="mt-5 h-12 rounded-xl bg-white/55" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
