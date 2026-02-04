import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center border text-micro font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Size badge - PIDY spec: #252525 background, 6px radius
        default: "px-2 py-0.5 bg-[#252525] border-transparent rounded-sm text-white",
        // Accent badge - PIDY spec: #E8C4A0 at 20% opacity
        accent: "px-2 py-0.5 bg-[#E8C4A0]/20 border-[#E8C4A0]/40 rounded-sm text-[#E8C4A0]",
        // Status badges - PIDY spec: status color at 20% opacity
        success: "px-1.5 py-1 bg-success/20 border-transparent rounded-sm text-success",
        warning: "px-1.5 py-1 bg-warning/20 border-transparent rounded-sm text-warning",
        error: "px-1.5 py-1 bg-destructive/20 border-transparent rounded-sm text-destructive",
        // Keep some common variants
        secondary: "px-2 py-0.5 bg-secondary border-transparent rounded-sm text-secondary-foreground",
        outline: "px-2 py-0.5 rounded-sm text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
