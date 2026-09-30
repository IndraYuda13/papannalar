"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/ui/lib/cn";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-3 rounded-tombol font-semibold transition-[background-color,box-shadow,transform] duration-150 active:translate-y-px motion-reduce:transform-none motion-reduce:transition-none disabled:transform-none disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-pn-teal-800",
        outline:
          "border border-primary bg-card text-primary hover:bg-secondary",
      },
      size: {
        default: "min-h-12 min-w-12 px-5 py-3 text-base leading-6",
        board: "min-h-24 min-w-24 px-8 py-4 text-[28px] leading-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
