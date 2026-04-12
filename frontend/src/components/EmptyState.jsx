import { motion as Motion } from "framer-motion";

export default function EmptyState({
  icon: Icon,
  title,
  copy,
  tone = "light",
  className = "",
}) {
  const toneClass =
    tone === "warm"
      ? "border-[#DCA117]/20 bg-[#FFF6D9] text-[#6F6758]"
      : "border-[#D8D0BD] bg-[#FBF8F1] text-[#6F6758]";

  return (
    <Motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-[1.6rem] border p-10 text-center ${toneClass} ${className}`}
    >
      {Icon ? (
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[#14532D] shadow-sm">
          <Icon className="h-8 w-8" />
        </div>
      ) : null}
      <h3 className="text-xl font-black text-[#1D1A14]">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 sm:text-base">
        {copy}
      </p>
    </Motion.div>
  );
}
