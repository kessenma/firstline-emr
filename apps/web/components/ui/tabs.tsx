// apps/web/components/ui/tabs.tsx
"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/classNames";

const Tabs = TabsPrimitive.Root;

const tabsListVariants = cva("inline-flex items-center justify-center", {
  variants: {
    variant: {
      default: "h-10 rounded-md bg-muted p-1 text-muted-foreground",
      styled: "w-full",
      underline: "border-b border-border",
      pills: "gap-2",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> &
    VariantProps<typeof tabsListVariants>
>(({ className, variant, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(tabsListVariants({ variant }), className)}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const tabsTriggerVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "rounded-sm px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        styled:
          "relative flex-1 border border-border rounded-lg p-2 text-left hover:border-border/80 cursor-pointer data-[state=active]:border-transparent data-[state=active]:shadow-xs first:rounded-r-none [&:not(:first-child):not(:last-child)]:rounded-none last:rounded-l-none first:border-r-0 [&:not(:first-child):not(:last-child)]:border-r-0",
        underline:
          "border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:text-primary",
        pills:
          "rounded-full px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> &
    VariantProps<typeof tabsTriggerVariants> & {
      showCheckmark?: boolean;
    }
>(({ className, variant, showCheckmark = false, children, ...props }, ref) => {
  const isStyled = variant === "styled";

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(tabsTriggerVariants({ variant }), className)}
      {...props}
    >
      {children}
      {isStyled && showCheckmark && (
        <div
          className={cn(
            "absolute inset-0 border-2 border-primary rounded-lg overflow-hidden opacity-0 pointer-events-none",
            "data-[state=active]:opacity-100",
            "first:rounded-r-none [&:not(:first-child):not(:last-child)]:rounded-none last:rounded-l-none",
          )}
        >
          <div className="absolute top-2 right-2 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-primary-foreground"
            >
              <path
                d="M10 3L4.5 8.5L2 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      )}
    </TabsPrimitive.Trigger>
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };

// Legacy exports for backward compatibility with styled-tabs
export const StyledTabs = {
  Root: Tabs,
  List: React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.List>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
  >((props, ref) => <TabsList ref={ref} variant="styled" {...props} />),
  Trigger: React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
  >((props, ref) => (
    <TabsTrigger ref={ref} variant="styled" showCheckmark {...props} />
  )),
  Content: TabsContent,
};

StyledTabs.List.displayName = "StyledTabsList";
StyledTabs.Trigger.displayName = "StyledTabsTrigger";
