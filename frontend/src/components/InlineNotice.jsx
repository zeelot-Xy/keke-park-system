import { CheckCircle2, Info, TriangleAlert } from "lucide-react";

const variants = {
  success: {
    icon: CheckCircle2,
    wrapper: "border-[#1E7A45]/25 bg-[#EEF7F1] text-[#1E7A45]",
    title: "Success",
  },
  info: {
    icon: Info,
    wrapper: "border-[#DCA117]/25 bg-[#FFF5D6] text-[#8D6508]",
    title: "Update",
  },
  warning: {
    icon: TriangleAlert,
    wrapper: "border-[#C43F3F]/20 bg-[#FFF1F1] text-[#9C3535]",
    title: "Attention",
  },
};

export default function InlineNotice({ type = "info", message, className = "" }) {
  if (!message) return null;

  const variant = variants[type] || variants.info;
  const Icon = variant.icon;

  return (
    <div
      className={`rounded-[1.2rem] border px-4 py-3 ${variant.wrapper} ${className}`}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold">{variant.title}</p>
          <p className="mt-1 text-sm leading-6">{message}</p>
        </div>
      </div>
    </div>
  );
}
