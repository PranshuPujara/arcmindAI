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

  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const svgSelectionRef = useRef<d3.Selection<
    SVGSVGElement,
    unknown,
    null,
    undefined
  > | null>(null);
  const gZoomRef = useRef<d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  > | null>(null);

  const fitToScreen = (opts?: { padding?: number }) => {
    const svgEl = svgRef.current;
    const gZoom = gZoomRef.current;
    const svgSel = svgSelectionRef.current;

    if (!svgEl || !gZoom || !svgSel) return;

    const padding = opts?.padding ?? 24;

    // Compute bounds based on current node/link positions.
    // Prefer the rendered geometry inside gZoom.
    const bounds = ((): {
      x: number;
      y: number;
      width: number;
      height: number;
    } | null => {
      try {
        const nodeCircles = gZoom.selectAll("circle").nodes();
        if (nodeCircles.length === 0) return null;

        const xs: number[] = [];
        const ys: number[] = [];
        for (const n of nodeCircles) {
          const el = n as SVGCircleElement;
          const cx = Number(el.getAttribute("cx") ?? 0);
          const cy = Number(el.getAttribute("cy") ?? 0);
          const r = Number(el.getAttribute("r") ?? 0);
          xs.push(cx - r);
          xs.push(cx + r);
          ys.push(cy - r);
          ys.push(cy + r);
        }

        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        return {
          x: minX,
          y: minY,
          width: Math.max(1, maxX - minX),
          height: Math.max(1, maxY - minY),
        };
      } catch {
        return null;
      }
    })();

    if (!bounds) return;

    const viewportWidth = dimensions.width;
    const viewportHeight = dimensions.height;
    if (!viewportWidth || !viewportHeight) return;

    const scale = Math.min(
      (viewportWidth - padding * 2) / bounds.width,
      (viewportHeight - padding * 2) / bounds.height,
    );

    const clampedScale = Math.max(0.1, Math.min(5, scale));

    const targetX = bounds.x + bounds.width / 2;
    const targetY = bounds.y + bounds.height / 2;

    // D3 zoom transform uses: screen = (world * k) + (tx, ty)
    // We want target center to map to viewport center.
    const k = clampedScale;
    const tx = viewportWidth / 2 - targetX * k;
    const ty = viewportHeight / 2 - targetY * k;

    const t = d3.zoomIdentity.translate(tx, ty).scale(k);

    svgSel.call(zoomRef.current!, t);
  };

  // Initialize and update the SVG viewBox and force-directed graph
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || dimensions.height === 0)
      return;

    const svgSel = d3.select(svgRef.current);
    svgSelectionRef.current = svgSel;

    // Update viewBox dynamically to match dimensions
    svgSel.attr("viewBox", `0 0 ${dimensions.width} ${dimensions.height}`);

    // Clear previous elements before rendering
    svgSel.selectAll("*").remove();

    // Create zoom viewport group that holds ALL drawable diagram content
    const gZoom = svgSel.append("g").attr("class", "d3-zoom-viewport");
    gZoomRef.current = gZoom;

    // Attach d3.zoom to the SVG
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .filter((event) => {
        // Allow mouse drag + wheel + touch/pinch.
        // Disallow right-click.
        return !("button" in (event as any) && (event as any).button === 2);
      })
      .on("zoom", (event) => {
        gZoom.attr("transform", event.transform.toString());
      });

    zoomRef.current = zoom;
    svgSel.call(zoom);

    // Temporary graph data used to validate the D3 force simulation.
    type DiagramNode = d3.SimulationNodeDatum & { id: string };
    type DiagramLink = d3.SimulationLinkDatum<DiagramNode>;

    const nodes: DiagramNode[] = [
      { id: "Frontend" },
      { id: "CDN" },
      { id: "Load Balancer" },
      { id: "API Gateway" },
      { id: "Auth Service" },
      { id: "Backend" },
      { id: "Notification Service" },
      { id: "Database" },
      { id: "Cache" },
      { id: "Queue" },
      { id: "Worker" },
      { id: "Object Storage" },
      { id: "Third-Party API" },
      { id: "Monitoring" },
    ];

    const links: DiagramLink[] = [
      { source: "Frontend", target: "CDN" },
      { source: "Frontend", target: "Load Balancer" },
      { source: "Load Balancer", target: "API Gateway" },
      { source: "API Gateway", target: "Auth Service" },
      { source: "API Gateway", target: "Backend" },
      { source: "Auth Service", target: "Database" },
      { source: "Auth Service", target: "Monitoring" },
      { source: "Backend", target: "Database" },
      { source: "Backend", target: "Cache" },
      { source: "Backend", target: "Queue" },
      { source: "Backend", target: "Object Storage" },
      { source: "Backend", target: "Notification Service" },
      { source: "Backend", target: "Third-Party API" },
      { source: "Backend", target: "Monitoring" },
      { source: "Worker", target: "Queue" },
      { source: "Worker", target: "Database" },
      { source: "Worker", target: "Object Storage" },
      { source: "Worker", target: "Monitoring" },
      { source: "Notification Service", target: "Third-Party API" },
      { source: "Notification Service", target: "Monitoring" },
    ];

    const g = gZoom.append("g").attr("class", "d3-diagram");

    const link = g
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "currentColor")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 2);

    const node = g
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", 20)
      .attr("fill", "currentColor")
      .attr("opacity", 0.8);

    const label = g
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .text((d) => d.id)
      .attr("font-size", 12)
      .attr("text-anchor", "middle")
      .attr("dy", 35)
      .attr("fill", "currentColor");

    // Initialize the physics engine
    const simulation = d3
      .forceSimulation<DiagramNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<DiagramNode, DiagramLink>(links)
          .id((d) => d.id)
          .distance(150),
      )
      .force("charge", d3.forceManyBody().strength(-1000))
      .force("collision", d3.forceCollide(60))
      .force(
        "center",
        d3.forceCenter(dimensions.width / 2, dimensions.height / 2),
      )
      .force("x", d3.forceX(dimensions.width / 2).strength(0.05))
      .force("y", d3.forceY(dimensions.height / 2).strength(0.05));

    simulation.on("tick", () => {
      link
        .attr("x1", (d: DiagramLink) => (d.source as DiagramNode).x ?? 0)
        .attr("y1", (d: DiagramLink) => (d.source as DiagramNode).y ?? 0)
        .attr("x2", (d: DiagramLink) => (d.target as DiagramNode).x ?? 0)
        .attr("y2", (d: DiagramLink) => (d.target as DiagramNode).y ?? 0);

      node
        .attr("cx", (d: DiagramNode) => d.x ?? 0)
        .attr("cy", (d: DiagramNode) => d.y ?? 0);

      label
        .attr("x", (d: DiagramNode) => d.x ?? 0)
        .attr("y", (d: DiagramNode) => d.y ?? 0);
    });

    simulation.on("end", () => {
      simulation.stop();
      // Fit after simulation stabilizes
      fitToScreen({ padding: 28 });
    });

    // Fit immediately once nodes exist (positions will update quickly)
    const raf = window.requestAnimationFrame(() => {
      fitToScreen({ padding: 28 });
    });

    // Clean up
    return () => {
      window.cancelAnimationFrame(raf);
      simulation.stop();
    };
  }, [dimensions]);

  const handleZoomIn = () => {
    const svgSel = svgSelectionRef.current;
    if (!svgSel || !zoomRef.current) return;
    svgSel.transition().duration(150).call(zoomRef.current.scaleBy, 1.2);
  };

  const handleZoomOut = () => {
    const svgSel = svgSelectionRef.current;
    if (!svgSel || !zoomRef.current) return;
    svgSel
      .transition()
      .duration(150)
      .call(zoomRef.current.scaleBy, 1 / 1.2);
  };

  const handleReset = () => fitToScreen({ padding: 28 });

  if (!isD3Enabled) return null;

  return (
    <div
      ref={containerRef}
      className="w-full h-125 min-h-100 rounded-2xl border border-border/40 bg-card/30 overflow-hidden backdrop-blur-sm shadow-inner relative flex items-center justify-center transition-all duration-500"
    >
      {/* Floating viewport controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <div className="inline-flex rounded-xl border border-border/40 bg-background/60 backdrop-blur px-1 py-1 shadow-sm">
          <button
            type="button"
            onClick={handleZoomIn}
            className="px-2 py-1 text-xs rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors"
            aria-label="Zoom in"
            title="Zoom In"
          >
            Zoom In
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="px-2 py-1 text-xs rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors"
            aria-label="Zoom out"
            title="Zoom Out"
          >
            Zoom Out
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-2 py-1 text-xs rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors"
            aria-label="Reset view"
            title="Reset View (Fit to Screen)"
          >
            Reset View
          </button>
        </div>
      </div>
      <svg
        ref={svgRef}
        className="w-full h-full block touch-none"
        preserveAspectRatio="xMidYMid meet"
      />

      {/* Dev Mode Badge */}
      <div className="absolute top-4 right-4 translate-x-0 translate-y-12 px-2 py-1 bg-primary/10 border border-primary/20 rounded text-[10px] font-mono text-primary uppercase tracking-widest pointer-events-none">
        D3 Alpha
      </div>
    </div>
  );
}
