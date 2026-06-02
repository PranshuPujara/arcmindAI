// components/MermaidDiagram.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import mermaid from "mermaid";
import { Button } from "@/components/ui/button";
import {
  Download,
  Plus,
  Minus,
  RotateCcw,
  Maximize2,
  Minimize2,
} from "lucide-react";
import * as htmlToImage from "html-to-image";

interface MermaidDiagramProps {
  chart: string;
}

// Initialize Mermaid once when the module loads
try {
  mermaid.initialize({ startOnLoad: false, securityLevel: "loose" });
} catch (e) {
  console.error("Failed to initialize mermaid", e);
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const pinchStartRef = useRef(0);
  const scaleStartRef = useRef(1);

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Center diagram dynamically
  const centerDiagram = useCallback(() => {
    if (!containerRef.current || !diagramRef.current) return;
    const container = containerRef.current;
    const diagram = diagramRef.current;

    const containerRect = container.getBoundingClientRect();
    const diagramRect = diagram.getBoundingClientRect();

    const centerX = (containerRect.width - diagramRect.width) / 2;
    const centerY = (containerRect.height - diagramRect.height) / 2;

    setPosition({ x: centerX, y: centerY });
    setScale(1);
  }, []);

  // Handle Mermaid rendering
  useEffect(() => {
    const render = async () => {
      if (!diagramRef.current) return;
      if (!chart || chart.trim().length === 0) {
        diagramRef.current.innerHTML = "";
        return;
      }
      try {
        const id = `mermaid-diagram-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, chart);
        diagramRef.current.innerHTML = svg;

        // Wait a tick for SVG layout inside browser, then center
        setTimeout(centerDiagram, 100);
      } catch (err) {
        console.error("Mermaid rendering error:", err);
        diagramRef.current.innerHTML = `<pre class="p-4 overflow-auto text-destructive bg-destructive/10 rounded">${chart}</pre>`;
      }
    };
    render();
  }, [chart, centerDiagram]);

  // Center view on resize or fullscreen toggle
  useEffect(() => {
    const handleResize = () => setTimeout(centerDiagram, 100);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [centerDiagram, isFullscreen]);

  // Zoom actions
  const zoomIn = () => setScale((s) => Math.min(s + 0.2, 5));
  const zoomOut = () => setScale((s) => Math.max(s - 0.2, 0.4));
  const resetView = () => centerDiagram();

  // Mouse pan event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch gesture event handlers (for mobile pan & pinch-zoom)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const distance = Math.hypot(
        t2.clientX - t1.clientX,
        t2.clientY - t1.clientY,
      );
      pinchStartRef.current = distance;
      scaleStartRef.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      setPosition({
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y,
      });
    } else if (e.touches.length === 2 && pinchStartRef.current > 0) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const distance = Math.hypot(
        t2.clientX - t1.clientX,
        t2.clientY - t1.clientY,
      );
      const newScale =
        (distance / pinchStartRef.current) * scaleStartRef.current;
      setScale(Math.max(0.4, Math.min(newScale, 5)));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    pinchStartRef.current = 0;
  };

  // Export diagram logic
  const downloadAsImage = async () => {
    if (!diagramRef.current) return;

    try {
      // Temporarily reset transform styles to capture clean PNG export
      const originalStyle = diagramRef.current.style.cssText;
      diagramRef.current.style.transform = "none";
      diagramRef.current.style.transition = "none";

      const dataUrl = await htmlToImage.toPng(diagramRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });

      // Restore original transform styles
      diagramRef.current.style.cssText = originalStyle;

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "architecture-diagram.png";
      link.click();
    } catch (err) {
      console.error("Failed to export diagram:", err);
    }
  };

  return (
    <div
      className={`flex flex-col gap-4 w-full ${isFullscreen ? "fixed inset-0 z-50 bg-background/95 p-6 backdrop-blur" : ""}`}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        {isFullscreen && (
          <h3 className="font-semibold text-lg">Architecture Blueprint</h3>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {/* Zoom controls */}
          <div className="flex border rounded-lg overflow-hidden bg-card text-card-foreground">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-none border-r"
              onClick={zoomOut}
              title="Zoom Out"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-none border-r"
              onClick={zoomIn}
              title="Zoom In"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-none"
              onClick={resetView}
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {/* Fullscreen Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 mr-2" />
            ) : (
              <Maximize2 className="w-4 h-4 mr-2" />
            )}
            {isFullscreen ? "Close Fullscreen" : "Fullscreen"}
          </Button>

          {/* Download Image */}
          <Button onClick={downloadAsImage} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Image
          </Button>
        </div>
      </div>

      {/* Diagram container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={resetView}
        className={`relative w-full overflow-hidden bg-card/50 rounded-xl border border-border/40 select-none ${
          isFullscreen ? "flex-1 min-h-[70vh]" : "h-[450px] sm:h-[550px]"
        } ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ touchAction: "none" }}
      >
        {/* Help tip overlay */}
        <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur text-[10px] text-muted-foreground px-2.5 py-1 rounded-md border pointer-events-none select-none">
          Drag to Pan • Pinch / Buttons to Zoom • Double Click to Reset
        </div>

        <div
          ref={diagramRef}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "top left",
            transition: isDragging ? "none" : "transform 0.15s ease-out",
          }}
          className="inline-block p-4"
        />
      </div>
    </div>
  );
};

export default MermaidDiagram;
