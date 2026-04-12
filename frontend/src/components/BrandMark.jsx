import { BusFront, Sparkles } from "lucide-react";

export default function BrandMark({ compact = false }) {
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-[1.6rem] ${
        compact ? "h-14 w-14" : "h-18 w-18"
      } bg-[#1b4d2f] text-[#f8d25c] shadow-[0_18px_40px_rgba(27,77,47,0.24)]`}
    >
      <BusFront size={compact ? 26 : 34} strokeWidth={2.2} />
      <span className="absolute -right-1 -top-1 rounded-full bg-white p-1 text-[#d89d14] shadow-md">
        <Sparkles size={compact ? 12 : 14} />
      </span>
    </div>
  );
}
