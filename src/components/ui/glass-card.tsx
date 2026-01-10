import * as React from "react"
import { cn } from "@/lib/utils"

function GlassCard({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="glass-card"
            className={cn(
                "glass-card",
                className
            )}
            {...props}
        />
    )
}

function GlassHeader({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="glass-header"
            className={cn(
                "flex flex-col space-y-1.5 p-6",
                className
            )}
            {...props}
        />
    )
}

function GlassTitle({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="glass-title"
            className={cn("leading-none font-semibold tracking-tight", className)}
            {...props}
        />
    )
}

function GlassDescription({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="glass-description"
            className={cn("text-muted-foreground text-sm", className)}
            {...props}
        />
    )
}

function GlassContent({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="glass-content"
            className={cn("p-6 pt-0", className)}
            {...props}
        />
    )
}

function GlassFooter({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="glass-footer"
            className={cn("flex items-center p-6 pt-0", className)}
            {...props}
        />
    )
}

export {
    GlassCard,
    GlassHeader,
    GlassFooter,
    GlassTitle,
    GlassDescription,
    GlassContent,
}
