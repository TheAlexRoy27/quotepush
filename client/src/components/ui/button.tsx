import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-1 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // ── Primary: blue→violet gradient with glow on hover ──────────────
        default:
          "bg-gradient-to-r from-blue-500 to-violet-600 text-white shadow-sm " +
          "hover:from-blue-400 hover:to-violet-500 hover:shadow-[0_0_18px_4px_rgba(99,102,241,0.40)] hover:-translate-y-px " +
          "active:translate-y-0 active:shadow-none",

        // ── Destructive: red gradient with red glow ────────────────────────
        destructive:
          "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-sm " +
          "hover:from-red-400 hover:to-rose-500 hover:shadow-[0_0_16px_4px_rgba(239,68,68,0.38)] hover:-translate-y-px " +
          "active:translate-y-0 active:shadow-none " +
          "focus-visible:ring-destructive/40",

        // ── Outline: indigo border, glows blue on hover ────────────────────
        outline:
          "border border-indigo-500/40 bg-transparent text-indigo-300 " +
          "hover:bg-indigo-500/10 hover:border-indigo-400 hover:text-indigo-200 hover:shadow-[0_0_10px_2px_rgba(99,102,241,0.22)] " +
          "dark:border-indigo-500/40 dark:text-indigo-300 dark:hover:bg-indigo-500/10",

        // ── Secondary: subtle filled, no glow ─────────────────────────────
        secondary:
          "bg-secondary text-secondary-foreground " +
          "hover:bg-secondary/70 hover:-translate-y-px " +
          "active:translate-y-0",

        // ── Ghost: invisible until hovered, then soft indigo tint ─────────
        ghost:
          "text-muted-foreground " +
          "hover:bg-indigo-500/10 hover:text-indigo-200 " +
          "dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200",

        // ── Link: underline style ──────────────────────────────────────────
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
