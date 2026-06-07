// components/mermaid-viewer.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import mermaid from "mermaid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Minus, RotateCcw, Maximize2, Minimize2 } from "lucide-react";
import { createPortal } from "react-dom";

// Initialize Mermaid once when the module loads
try {
  mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    securityLevel: "loose",
    fontFamily: "inherit",
  });
} catch (e) {
  console.error("Failed to initialize mermaid", e);
}

const escapeHtml = (unsafe: string) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

interface MermaidViewerProps {
  diagram: string;
  title?: string;
}

export function MermaidViewer({ diagram, title }: MermaidViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const pinchStartRef = useRef(0);
  const scaleStartRef = useRef(1);

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [svgContent, setSvgContent] = useState<string>("");

  // Center diagram function
  const centerDiagram = useCallback(() => {
    if (!containerRef.current || !diagramRef.current) return;
    const container = containerRef.current;
    const diagramEl = diagramRef.current;

    const containerRect = container.getBoundingClientRect();
    const diagramWidth = diagramEl.scrollWidth || diagramEl.offsetWidth;
    const diagramHeight = diagramEl.scrollHeight || diagramEl.offsetHeight;

    const centerX = (containerRect.width - diagramWidth) / 2;
    const centerY = (containerRect.height - diagramHeight) / 2;

    setPosition({ x: centerX, y: centerY });
    setScale(1);
  }, []);

  // Render diagram when input changes
  useEffect(() => {
    const renderDiagram = async () => {
      if (!diagram) {
        setSvgContent("");
        return;
      }
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

      try {
        const { svg } = await mermaid.render(id, diagram);
        setSvgContent(svg);
        setTimeout(centerDiagram, 100);
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error("Mermaid rendering error:", error);
        setSvgContent(`
          <div class="text-destructive p-4 border border-destructive rounded bg-destructive/5">
            <p class="font-semibold text-sm">Failed to render diagram</p>
            <p class="text-xs mt-1">Error: ${escapeHtml(error.message)}</p>
          </div>
        `);
      }
    };

    renderDiagram();
  }, [diagram, centerDiagram]);

  // Center view on resize or fullscreen toggle
  useEffect(() => {
    const handleResize = () => setTimeout(centerDiagram, 100);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [centerDiagram, isFullscreen]);

  // Zoom controls
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

  // Touch handlers for mobile pan & pinch-zoom
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

  const activeTitle = title || "System Architecture Diagram";

  const cardElement = (
    <Card
      className={`w-full flex flex-col ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-background p-4 md:p-6 w-screen h-screen overflow-hidden"
          : "h-[500px]"
      }`}
    >
      <CardHeader className="pb-3 flex-shrink-0 flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle className="text-lg font-semibold">{activeTitle}</CardTitle>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Zoom Controls */}
          <div className="flex border rounded-lg overflow-hidden bg-card text-card-foreground">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-none border-r"
              onClick={zoomOut}
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-none border-r"
              onClick={zoomIn}
              title="Zoom In"
              aria-label="Zoom In"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-none"
              onClick={resetView}
              title="Reset View"
              aria-label="Reset View"
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
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden px-6 pb-6 relative">
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
          className={`relative w-full h-full overflow-hidden bg-background rounded-lg border select-none ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={{ touchAction: "none" }}
        >
          {/* Help tip overlay */}
          <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur text-[10px] text-muted-foreground px-2.5 py-1 rounded-md border pointer-events-none select-none z-10">
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
            dangerouslySetInnerHTML={
              svgContent ? { __html: svgContent } : undefined
            }
          />
        </div>
      </CardContent>
    </Card>
  );

  if (isFullscreen && typeof window !== "undefined") {
    return createPortal(cardElement, document.body);
  }

  return cardElement;
}
