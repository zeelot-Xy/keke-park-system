import { Link } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { ArrowLeft, MapPinned, TriangleAlert, Zap } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-[#fff6d3] via-[#fff9eb] to-[#f7edd1] px-6 py-10">
      <div className="absolute top-12 left-8 h-44 w-44 rounded-full bg-[#F4C542]/25 blur-3xl" />
      <div className="absolute right-8 bottom-8 h-60 w-60 rounded-full bg-[#14532D]/10 blur-3xl" />

      <Motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative w-full max-w-3xl overflow-hidden rounded-[2.25rem] border border-[#eadfca] bg-[#FFFBEA]/95 p-8 shadow-[0_24px_70px_rgba(85,60,7,0.14)] backdrop-blur-sm lg:p-10"
      >
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="rounded-[1.8rem] bg-linear-to-br from-[#F4C542] via-[#DCA117] to-[#F4C542] p-8 text-[#14532D]">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1B4D2F] shadow-lg">
              <Zap className="h-8 w-8 text-[#F4C542]" strokeWidth={2.5} />
            </div>
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.28em] text-[#14532D]/75">
              Error 404
            </p>
            <h1 className="mt-3 text-5xl font-black">Park not found.</h1>
            <p className="mt-4 text-base leading-8 text-[#14532D]/82">
              The page you tried to reach is not part of this route map. Let&apos;s
              get you back to a working screen quickly.
            </p>
          </div>

          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#FFE28A]/60 px-4 py-2 text-sm font-semibold text-[#8d6508]">
              <TriangleAlert className="h-4 w-4" />
              Page unavailable
            </div>
            <h2 className="mt-4 text-3xl font-black text-[#1D1A14] sm:text-4xl">
              This stop doesn&apos;t exist in the app.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#6F6758] sm:text-base">
              Use the actions below to head back to login or return to the app
              home route. If you followed an old link, it may have expired.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1B4D2F] px-5 py-3.5 font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#14532D]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F4C542] px-5 py-3.5 font-bold text-[#1D1A14] transition hover:-translate-y-0.5 hover:bg-[#DCA117]"
              >
                <MapPinned className="h-4 w-4" />
                Go to Home Route
              </Link>
            </div>
          </div>
        </div>
      </Motion.div>
    </div>
  );
}
