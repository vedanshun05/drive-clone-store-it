import { toast as sonnerToast } from "sonner";
import type { ReactNode } from "react";

interface ToastProps {
  description: string | ReactNode;
  className?: string;
  variant?: "default" | "destructive";
}

export const useToast = () => ({
  toast: ({ description, className, variant }: ToastProps) => {
    if (variant === "destructive") {
      sonnerToast.error(description, { className });
    } else {
      sonnerToast(description, { className });
    }
  },
});
