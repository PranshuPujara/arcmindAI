"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Minus } from "lucide-react";

interface DiagramPreviewPanelProps {
  diagramRef: React.RefObject<HTMLDivElement | null>;
  renderError: string | null;
  onOpenAIDialog: () => void;
}

export function DiagramPreviewPanel({
  diagramRef,
  renderError,
  onOpenAIDialog,
}: DiagramPreviewPanelProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const pinchStartRef = useRef(0);
  const scaleStartRef = useRef(1);

  // Center diagram on load or update
  const centerDiagram = useCallback(() => {
    if (!containerRef.current || !diagramRef.current) return;

    const container = containerRef.current;
    const diagram = diagramRef.current;

    const containerRect = container.getBoundingClientRect();
    const diagramWidth = diagram.scrollWidth || diagram.offsetWidth;
    const diagramHeight = diagram.scrollHeight || diagram.offsetHeight;

    const centerX = (containerRect.width - diagramWidth) / 2;
    const centerY = (containerRect.height - diagramHeight) / 2;

    setPosition({ x: centerX, y: centerY });
    setScale(1);
  }, [diagramRef]);

  // Auto center on diagram change
  useEffect(() => {
    if (!diagramRef.current) return;

    const observer = new MutationObserver(() => {
      setTimeout(centerDiagram, 100);
    });

    observer.observe(diagramRef.current, {
      childList: true,
      subtree: true,
    });

    setTimeout(centerDiagram, 100);

    return () => observer.disconnect();
  }, [diagramRef, centerDiagram]);

  // 🔍 Only button zoom (no gestures)
  const zoomIn = () => setScale((s) => Math.min(s + 0.2, 6));
  const zoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));
  const resetView = () => centerDiagram();

  // 🖱️ Drag to pan
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

  // 📱 Touch drag and pinch-to-zoom
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
      setScale(Math.max(0.5, Math.min(newScale, 6)));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    pinchStartRef.current = 0;
  };

  return (
    <Card className="h-full border-0 rounded-none flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          Preview
          {renderError && (
            <span className="text-destructive text-sm font-normal">
              (Syntax Error)
            </span>
          )}
        </CardTitle>

        {/* Zoom Controls */}
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={zoomOut}>
            <Minus className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={zoomIn}>
            <Plus className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={resetView}>
            Reset
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden px-4 relative">
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`w-full h-full overflow-hidden bg-background p-2 rounded-lg border ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={{ touchAction: "none" }}
        >
          <div
            ref={diagramRef}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: "top left",
              transition: isDragging ? "none" : "transform 0.2s ease-out",
            }}
            className="inline-block"
          />
        </div>
      </CardContent>

      <div className="px-4 pb-4">
        <Button className="w-full cursor-pointer" onClick={onOpenAIDialog}>
          Use AI to Improve
        </Button>
      </div>
    </Card>
  );
}
