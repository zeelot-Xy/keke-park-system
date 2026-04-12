import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

export default function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  error,
  hint,
  className = "",
  inputClassName = "",
  icon: Icon,
  name,
  onBlur,
  maxLength,
  required = false,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = useId();

  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#3f392e]">
          {Icon ? <Icon size={16} className="text-[#1b4d2f]" /> : null}
          {label}
        </span>
      )}
      <div
        className={`flex items-center gap-3 rounded-[1.35rem] border bg-white px-4 py-4 shadow-sm transition focus-within:border-[#f4c542] focus-within:ring-4 focus-within:ring-[#f4c542]/20 ${
          error ? "border-[#d95d5d] bg-[#fff5f5] focus-within:ring-[#d95d5d]/15" : "border-[#d8d0bd]"
        } ${inputClassName}`}
      >
        {Icon ? <Icon size={18} className="text-[#1b4d2f]" /> : null}
        <input
          id={inputId}
          type={showPassword ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          className="w-full bg-transparent text-base outline-none placeholder:text-[#9d9486]"
          maxLength={maxLength}
          required={required}
        />
        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#7b725f] transition hover:bg-[#fff4cf] hover:text-[#1b4d2f]"
          aria-label={showPassword ? "Hide password" : "Show password"}
          aria-controls={inputId}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {hint ? <p className="mt-2 text-sm text-[#6f6758]">{hint}</p> : null}
      {error ? <p className="mt-2 text-sm text-[#c43f3f]">{error}</p> : null}
    </label>
  );
}
