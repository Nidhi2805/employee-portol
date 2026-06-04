import { cn } from "../../lib/utils";

export default function Avatar({ name = "", size = "md", className }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sizes = {
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-12 w-12 text-base",
  };

  return (
    <div className={cn(
      "rounded-full bg-primary-600 text-white flex items-center justify-center font-semibold flex-shrink-0",
      sizes[size],
      className
    )}>
      {initials || "?"}
    </div>
  );
}