import { BusFront, Sparkles } from "lucide-react";

export default function BrandMark({ compact = false }) {
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-[1.6rem] ${
        compact ? "h-14 w-14" : "h-18 w-18"
      } bg-linear-to-br from-[#f7d664] via-[#f4c542] to-[#d9a015] text-[#1b4d2f] shadow-[0_18px_40px_rgba(185,134,18,0.28)]`}
    >
      <BusFront size={compact ? 26 : 34} strokeWidth={2.2} />
      <span className="absolute -right-1 -top-1 rounded-full bg-[#1b4d2f] p-1 text-[#f7d36a] shadow-md">
        <Sparkles size={compact ? 12 : 14} />
      </span>
    </div>
  );
}
