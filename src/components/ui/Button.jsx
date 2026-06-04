import { cn } from "../../lib/utils";
import Spinner from "./Spinner";

const variants = {
  primary:   "bg-primary-600 hover:bg-primary-700 text-white",
  secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700",
  danger:    "bg-red-500 hover:bg-red-600 text-white",
  ghost:     "hover:bg-gray-100 text-gray-600",
  success:   "bg-green-500 hover:bg-green-600 text-white",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  className,
  ...props
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Spinner className="h-3.5 w-3.5 border-white" />}
      {children}
    </button>
  );
}