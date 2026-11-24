"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

export interface Tab {
  id: string
  label: string
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  tabs: Tab[]
  activeTab?: string
  onTabChange?: (tabId: string) => void
  hoverClassName?: string
  activeIndicatorClassName?: string
  tabClassName?: string
  activeTabClassName?: string
  inactiveTabClassName?: string
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      className,
      tabs,
      activeTab,
      onTabChange,
      hoverClassName,
      activeIndicatorClassName,
      tabClassName,
      activeTabClassName,
      inactiveTabClassName,
      ...props
    },
    ref
  ) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
    const [activeIndex, setActiveIndex] = useState(0)
    const [hoverStyle, setHoverStyle] = useState<React.CSSProperties>({})
    const [activeStyle, setActiveStyle] = useState<React.CSSProperties>({ left: "0px", width: "0px" })
    const tabRefs = useRef<(HTMLDivElement | null)[]>([])

    // Sync activeIndex with external activeTab
    useEffect(() => {
      if (activeTab !== undefined) {
        const foundIndex = tabs.findIndex((tab) => tab.id === activeTab)
        if (foundIndex !== -1) {
          setActiveIndex(foundIndex)
        }
      }
    }, [activeTab, tabs])

    useEffect(() => {
      if (hoveredIndex !== null) {
        const hoveredElement = tabRefs.current[hoveredIndex]
        if (hoveredElement) {
          const { offsetLeft, offsetWidth } = hoveredElement
          setHoverStyle({
            left: `${offsetLeft}px`,
            width: `${offsetWidth}px`,
          })
        }
      }
    }, [hoveredIndex])

    useEffect(() => {
      const activeElement = tabRefs.current[activeIndex]
      if (activeElement) {
        const { offsetLeft, offsetWidth } = activeElement
        setActiveStyle({
          left: `${offsetLeft}px`,
          width: `${offsetWidth}px`,
        })
      }
    }, [activeIndex, tabs])

    useEffect(() => {
      requestAnimationFrame(() => {
        const initialIdx =
          activeTab !== undefined
            ? Math.max(0, tabs.findIndex((t) => t.id === activeTab))
            : 0
        const firstElement = tabRefs.current[initialIdx] || tabRefs.current[0]
        if (firstElement) {
          const { offsetLeft, offsetWidth } = firstElement
          setActiveStyle({
            left: `${offsetLeft}px`,
            width: `${offsetWidth}px`,
          })
        }
      })
    }, [activeTab, tabs])

    return (
      <div 
        ref={ref} 
        className={cn("relative", className)} 
        {...props}
      >
        <div className="relative">
          {/* Hover Highlight */}
          <div
            className={cn(
              "absolute h-[30px] transition-all duration-300 ease-out rounded-[6px] flex items-center pointer-events-none",
              hoverClassName || "bg-[#0e0f1114] dark:bg-[#ffffff1a]"
            )}
            style={{
              ...hoverStyle,
              opacity: hoveredIndex !== null ? 1 : 0,
            }}
          />

          {/* Active Indicator */}
          <div
            className={cn(
              "absolute bottom-[-6px] h-[2px] transition-all duration-300 ease-out pointer-events-none",
              activeIndicatorClassName || "bg-[#0e0f11] dark:bg-white"
            )}
            style={activeStyle}
          />

          {/* Tabs */}
          <div className="relative flex space-x-[6px] items-center">
            {tabs.map((tab, index) => (
              <div
                key={tab.id}
                ref={(el) => (tabRefs.current[index] = el)}
                className={cn(
                  "px-3 py-2 cursor-pointer transition-colors duration-300 h-[30px]",
                  tabClassName,
                  index === activeIndex 
                    ? activeTabClassName || "text-[#0e0e10] dark:text-white" 
                    : inactiveTabClassName || "text-[#0e0f1199] dark:text-[#ffffff99]"
                )}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => {
                  setActiveIndex(index)
                  onTabChange?.(tab.id)
                }}
              >
                <div className="text-sm font-medium leading-5 whitespace-nowrap flex items-center justify-center h-full">
                  {tab.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
)
Tabs.displayName = "Tabs"

export { Tabs }
