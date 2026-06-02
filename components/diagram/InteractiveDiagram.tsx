"use client";

import { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { useDiagram } from "@/lib/contexts/DiagramContext";

/**
 * InteractiveDiagram component initializes a D3 workspace that scales to its parent container.
 * This is the base component for the Stream 2 Core Rendering Engine milestone.
 */
export default function InteractiveDiagram() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { isD3Enabled } = useDiagram();

  // Use ResizeObserver to keep track of the container's dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Use contentRect for accurate sizing
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Initialize and update the SVG viewBox and placeholder content
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || dimensions.height === 0)
      return;

    const svg = d3.select(svgRef.current);

    // Update viewBox dynamically to match dimensions
    svg.attr("viewBox", `0 0 ${dimensions.width} ${dimensions.height}`);

    // Initial placeholder rendering logic
    // Clear previous elements (important for hot-reloading or manual updates)
    svg.selectAll("*").remove();

    // Background rect to capture events (useful for future pan/zoom)
    svg
      .append("rect")
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .attr("fill", "transparent");

    // Placeholder content
    const g = svg.append("g");

    g.append("text")
      .attr("x", dimensions.width / 2)
      .attr("y", dimensions.height / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "currentColor")
      .attr("class", "text-muted-foreground opacity-50 text-sm font-mono")
      .text("D3 Canvas Initialized");

    g.append("text")
      .attr("x", dimensions.width / 2)
      .attr("y", dimensions.height / 2 + 25)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "currentColor")
      .attr("class", "text-muted-foreground/30 text-[10px] font-mono")
      .text(
        `${Math.round(dimensions.width)}px x ${Math.round(dimensions.height)}px`,
      );

    // Draw a subtle border inside the SVG to visualize the bounds
    g.append("rect")
      .attr("x", 10)
      .attr("y", 10)
      .attr("width", dimensions.width - 20)
      .attr("height", dimensions.height - 20)
      .attr("fill", "none")
      .attr("stroke", "currentColor")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,4")
      .attr("class", "text-border/20");
  }, [dimensions]);

  if (!isD3Enabled) return null;

  return (
    <div
      ref={containerRef}
      className="w-full h-[500px] min-h-[400px] rounded-2xl border border-border/40 bg-card/30 overflow-hidden backdrop-blur-sm shadow-inner relative flex items-center justify-center transition-all duration-500"
    >
      <svg
        ref={svgRef}
        className="w-full h-full block touch-none"
        preserveAspectRatio="xMidYMid meet"
      />

      {/* Dev Mode Badge */}
      <div className="absolute top-4 right-4 px-2 py-1 bg-primary/10 border border-primary/20 rounded text-[10px] font-mono text-primary uppercase tracking-widest pointer-events-none">
        D3 Alpha
      </div>
    </div>
  );
}
