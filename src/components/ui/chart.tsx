import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

// -----------------------------
// THEMES
// -----------------------------
const THEMES = {
  light: "",
  dark: ".dark",
} as const

// -----------------------------
// TYPES
// -----------------------------
export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    icon?: React.ComponentType<any>
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
>

type ChartContextProps = {
  config: ChartConfig
}

// -----------------------------
// CONTEXT
// -----------------------------
const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }
  return context
}

// -----------------------------
// CONTAINER
// -----------------------------
const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig
    children: React.ReactNode
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />

        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "ChartContainer"

// -----------------------------
// STYLE INJECTION
// -----------------------------
const ChartStyle = ({
  id,
  config,
}: {
  id: string
  config: ChartConfig
}) => {
  const entries = Object.entries(config).filter(
    ([, v]) => v.color || v.theme
  )

  if (!entries.length) return null

  const styles = Object.entries(THEMES)
    .map(([theme, prefix]) => {
      const vars = entries
        .map(([key, item]) => {
          const color =
            item.theme?.[theme as keyof typeof THEMES] || item.color
          return color ? `--color-${key}: ${color};` : ""
        })
        .join("\n")

      return `${prefix} [data-chart="${id}"] { ${vars} }`
    })
    .join("\n")

  return <style dangerouslySetInnerHTML={{ __html: styles }} />
}

// -----------------------------
// TOOLTIP
// -----------------------------
const ChartTooltip = RechartsPrimitive.Tooltip

type TooltipItem = {
  name?: string
  dataKey?: string
  value?: number
  color?: string
  payload?: any
}

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    active?: boolean
    payload?: TooltipItem[]
    label?: any
    formatter?: (value: any, name: string, item: TooltipItem, index: number) => React.ReactNode
    labelFormatter?: (label: any, payload: TooltipItem[]) => React.ReactNode
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: "dot" | "line" | "dashed"
    nameKey?: string
    labelKey?: string
  }
>((props, ref) => {
  const {
    active,
    payload = [],
    label,
    formatter,
    labelFormatter,
    className,
    hideLabel,
    hideIndicator,
    indicator = "dot",
    nameKey,
    labelKey,
  } = props

  const { config } = useChart()

  if (!active || payload.length === 0) return null

  const first = payload[0]

  const getConfig = (item: TooltipItem, key: string) => {
    const rawKey =
      (item as any)?.[key] ??
      item.payload?.[key] ??
      key

    return config[rawKey];
  }

  const labelNode = (() => {
    const key = labelKey || first.dataKey || first.name || "value"
    const conf = getConfig(first, key)

    const value =
      typeof label === "string"
        ? config[label].label ?? label
        : conf.label

    if (!value) return null

    return (
      <div className="font-medium">
        {labelFormatter ? labelFormatter(value, payload) : value}
      </div>
    )
  })() 

  return (
    <div
      ref={ref}
      className={cn(
        "grid min-w-[8rem] gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl",
        className
      )}
    >
      {labelNode}

      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = nameKey || item.name || item.dataKey || "value"
          const conf = getConfig(item, key)

          const color =
            item.color || item.payload?.fill || "gray"

          return (
            <div
              key={item.dataKey ?? index}
              className="flex items-center gap-2"
            >
              {!hideIndicator && (
                <div
                  className={cn(
                    "rounded-sm",
                    indicator === "dot" && "w-2.5 h-2.5",
                    indicator === "line" && "w-4 h-1",
                    indicator === "dashed" &&
                      "w-4 h-0 border border-dashed"
                  )}
                  style={{ backgroundColor: color }}
                />
              )}

              <div className="flex flex-1 justify-between">
                <span className="text-muted-foreground">
                  {conf.label ?? item.name}
                </span>

                {item.value !== undefined && (
                  <span className="font-mono">
                    {item.value.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})
ChartTooltipContent.displayName = "ChartTooltipContent"

// -----------------------------
// LEGEND
// -----------------------------
const ChartLegend = RechartsPrimitive.Legend

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    payload?: any[]
    verticalAlign?: "top" | "bottom"
    hideIcon?: boolean
    nameKey?: string
  }
>((props, ref) => {
  const {
    payload = [],
    verticalAlign = "bottom",
    hideIcon,
    nameKey,
    className,
  } = props

  const { config } = useChart()

  if (!payload.length) return null

  return (
    <div
      ref={ref}
      className={cn(
        "flex justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      )}
    >
      {payload.map((item, index) => {
        const key = nameKey || item.dataKey || "value"
        const conf = config[key]

        return (
          <div key={index} className="flex items-center gap-1.5">
            {!hideIcon && conf.icon ? (
              <conf.icon />
            ) : (
              <div
                className="w-2 h-2 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
            )}

            {conf.label ?? item.value}
          </div>
        )
      })}
    </div>
  )
})
ChartLegendContent.displayName = "ChartLegendContent"

// -----------------------------
// EXPORTS
// -----------------------------
export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}