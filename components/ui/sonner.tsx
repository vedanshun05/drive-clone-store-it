"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="light"
    className="toaster group"
    toastOptions={{
      classNames: {
        toast:
          "border-2! border-line! rounded-xl! shadow-drop-2! font-sans!",
      },
    }}
    {...props}
  />
);

export { Toaster };
