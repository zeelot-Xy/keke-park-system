import { motion as Motion } from "framer-motion";
import { BusFront, Zap } from "lucide-react";

export default function LoadingScreen({
  title = "Loading Keke Park",
  copy = "Preparing your dashboard and syncing the latest queue activity.",
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-[#fff6d3] via-[#fff9eb] to-[#f7edd1] px-6 py-10">
      <div className="absolute top-16 left-10 h-40 w-40 rounded-full bg-[#F4C542]/25 blur-3xl" />
      <div className="absolute right-10 bottom-10 h-56 w-56 rounded-full bg-[#14532D]/10 blur-3xl" />

      <Motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative w-full max-w-lg rounded-[2rem] border border-[#eadfca] bg-[#FFFBEA]/95 p-8 text-center shadow-[0_24px_70px_rgba(85,60,7,0.14)] backdrop-blur-sm"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-[#1B4D2F] shadow-lg">
          <Zap className="h-10 w-10 text-[#F4C542]" strokeWidth={2.5} />
        </div>

        <div className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#8d6508]">
            Keke Park System
          </p>
          <h1 className="mt-3 text-3xl font-black text-[#1D1A14]">{title}</h1>
          <p className="mt-3 text-sm leading-7 text-[#6F6758] sm:text-base">
            {copy}
          </p>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          {[0, 1, 2].map((index) => (
            <Motion.span
              key={index}
              animate={{ y: [0, -7, 0], opacity: [0.55, 1, 0.55] }}
              transition={{
                repeat: Number.POSITIVE_INFINITY,
                duration: 1,
                delay: index * 0.15,
              }}
              className="h-3 w-3 rounded-full bg-[#F4C542]"
            />
          ))}
        </div>

        <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#14532D]/8 px-4 py-2 text-sm font-semibold text-[#14532D]">
          <BusFront className="h-4 w-4" />
          Live queue updates will appear automatically
        </div>
      </Motion.div>
    </div>
  );
}
