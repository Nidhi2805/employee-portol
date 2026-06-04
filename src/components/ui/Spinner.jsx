import { cn } from "../../lib/utils";

export default function Spinner({ className }) {
  return (
    <div className={cn(
      "animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full",
      className
    )} />
  );
}