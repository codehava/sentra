import * as React from "react"
import { cn } from "@/lib/utils"

function BentoGrid({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="bento-grid"
            className={cn(
                "bento-grid",
                className
            )}
            {...props}
        />
    )
}

interface BentoItemProps extends React.ComponentProps<"div"> {
    colSpan?: 1 | 2 | 3 | 4;
    rowSpan?: 1 | 2 | 3 | 4;
}

function BentoItem({ className, colSpan = 1, rowSpan = 1, ...props }: BentoItemProps) {
    return (
        <div
            data-slot="bento-item"
            className={cn(
                "bento-item",
                // Column spans
                colSpan === 1 && "md:col-span-1",
                colSpan === 2 && "md:col-span-2",
                colSpan === 3 && "md:col-span-3",
                colSpan === 4 && "md:col-span-4",
                // Row spans
                rowSpan === 2 && "row-span-2",
                rowSpan === 3 && "row-span-3",
                rowSpan === 4 && "row-span-4",
                className
            )}
            {...props}
        />
    )
}

export { BentoGrid, BentoItem }
