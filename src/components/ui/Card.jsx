import { cn } from "../../lib/utils";

export default function Card({ children, className, ...props }) {
  return (
    <div
      className={cn("bg-white rounded-xl shadow-sm border border-gray-100 p-5", className)}
      {...props}
    >
      {children}
    </div>
  );
}