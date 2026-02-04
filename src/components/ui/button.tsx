import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-subtitle font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary button with PIDY gradient (#E8C4A0 → #D4A574)
        default: "rounded-xl bg-gradient-to-r from-[#E8C4A0] to-[#D4A574] text-[#1A1A1A] hover:opacity-90 active:scale-[0.98]",
        // Secondary button - PIDY spec
        secondary: "rounded-2xl border border-[#333333] bg-transparent text-primary hover:bg-[#333333]/20",
        destructive: "rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "rounded-xl border border-border bg-transparent hover:bg-accent/10 hover:text-accent-foreground",
        ghost: "rounded-xl hover:bg-accent/10 hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Icon button - PIDY spec
        icon: "rounded-full bg-card hover:bg-surface-light",
        // Keep glass variant for special cases
        glass: "rounded-xl bg-card/50 backdrop-blur-lg border border-border/50 text-foreground hover:bg-card/70 hover:border-primary/50",
      },
      size: {
        default: "h-12 px-4 py-3",           // 48px - PIDY spec
        sm: "h-9 rounded-lg px-3",
        lg: "h-14 rounded-2xl px-5 py-4",   // 56px - PIDY spec large
        icon: "h-10 w-10",                   // 40px - PIDY spec
        "icon-lg": "h-11 w-11",              // 44px - PIDY spec
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
