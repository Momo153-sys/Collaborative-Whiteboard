import { useRef, useEffect, useCallback, useState } from 'react';
import type { Tool, Shape, Point, CursorInfo } from '@/types/whiteboard';
import { renderCanvas, hitTest, getBBForDrag, moveShape } from '@/lib/canvas-renderer';
import { ID } from 'appwrite'; // Use Appwrite's ID generator for consistency

interface WhiteboardCanvasProps {
  tool: Tool;
  strokeColor: string;
  shapes: Shape[];
  cursors: Record<string, CursorInfo>; // Changed from Map for Appwrite compatibility
  userId: string;
  onAddShape: (shape: Omit<Shape, 'id'>) => void; // Let the hook/Appwrite handle the ID
  onUpdateShape: (id: string, updates: Partial<Shape>) => void;
  onDeleteShape: (id: string) => void;
  onCursorMove: (x: number, y: number) => void;
}

export function WhiteboardCanvas({
  tool,
  strokeColor,
  shapes,
  cursors,
  userId,
  onAddShape,
  onUpdateShape,
  onDeleteShape,
  onCursorMove,
}: WhiteboardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const isDrawing = useRef(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const previewShapeRef = useRef<Shape | null>(null);
  const startPosRef = useRef<Point>({ x: 0, y: 0 });
  const dragOffsetRef = useRef<Point>({ x: 0, y: 0 });
  const currentIdRef = useRef<string>('');
  const throttleRef = useRef(0);
  const [textInput, setTextInput] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Resize logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // Pass cursors directly (renderer will need to handle Object.values or Map)
      renderCanvas(ctx, shapes, cursors, selectedId, previewShapeRef.current, window.innerWidth, window.innerHeight);
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [shapes, cursors, selectedId]);

  const getPos = useCallback((e: React.PointerEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const commitText = useCallback(() => {
    if (!textAreaRef.current || !textInput.visible) return;
    const content = textAreaRef.current.value.trim();
    if (content) {
      onAddShape({
        type: 'text',
        color: strokeColor,
        strokeWidth: 2,
        userId,
        x: textInput.x,
        y: textInput.y,
        content,
        fontSize: 18,
      } as any);
    }
    setTextInput({ x: 0, y: 0, visible: false });
  }, [textInput, strokeColor, userId, onAddShape]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (textInput.visible) {
      commitText();
      return;
    }

    const pos = getPos(e);
    isDrawing.current = true;
    startPosRef.current = pos;
    canvasRef.current?.setPointerCapture(e.pointerId);

    if (tool === 'select') {
      let found: string | null = null;
      for (let i = shapes.length - 1; i >= 0; i--) {
        if (hitTest(shapes[i], pos.x, pos.y)) {
          found = shapes[i].id;
          const s = shapes[i];
          const bb = getBBForDrag(s);
            dragOffsetRef.current = { x: pos.x - bb.x, y: pos.y - bb.y };

          break;
        }
      }
      setSelectedId(found);
      currentIdRef.current = found || '';
    } else if (tool === 'eraser') {
      for (let i = shapes.length - 1; i >= 0; i--) {
        if (hitTest(shapes[i], pos.x, pos.y)) {
          onDeleteShape(shapes[i].id);
          break;
        }
      }
    } else if (tool === 'text') {
      setTextInput({ x: pos.x, y: pos.y, visible: true });
      isDrawing.current = false;
      setTimeout(() => textAreaRef.current?.focus(), 50);
    } else if (tool === 'freehand') {
      const id = ID.unique();
      currentIdRef.current = id;
      previewShapeRef.current = {
        id, type: 'freehand', color: strokeColor, strokeWidth: 2, userId,
        points: JSON.stringify([pos.x, pos.y]),
      };
    } else {
      currentIdRef.current = ID.unique();
    }
  }, [tool, strokeColor, shapes, getPos, userId, onDeleteShape, textInput, commitText]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const pos = getPos(e);

    const now = Date.now();
    if (now - throttleRef.current > 32) { // Slightly increased throttle for real-time stability
      throttleRef.current = now;
      onCursorMove(pos.x, pos.y);
    }

    if (!isDrawing.current) return;

    if (tool === 'eraser') {
      for (let i = shapes.length - 1; i >= 0; i--) {
        if (hitTest(shapes[i], pos.x, pos.y)) {
          onDeleteShape(shapes[i].id);
          break;
        }
      }
      return;
    }

    if (tool === 'select' && currentIdRef.current) {
      const s = shapes.find(sh => sh.id === currentIdRef.current);
      if (!s) return;
      const dx = pos.x - dragOffsetRef.current.x;
      const dy = pos.y - dragOffsetRef.current.y;
      moveShape(s, dx, dy, onUpdateShape);
    } else if (tool === 'freehand' && previewShapeRef.current) {
      const prev = previewShapeRef.current as Shape & { points: number[] };
      prev.points = [...prev.points, pos.x, pos.y]; // Immutable update
    } else if (tool === 'rectangle') {
      const w = pos.x - startPosRef.current.x;
      const h = pos.y - startPosRef.current.y;
      previewShapeRef.current = {
        id: currentIdRef.current, type: 'rectangle', color: strokeColor, strokeWidth: 2, userId,
        x: w < 0 ? pos.x : startPosRef.current.x,
        y: h < 0 ? pos.y : startPosRef.current.y,
        width: Math.abs(w), height: Math.abs(h),
      };
    } else if (tool === 'circle') {
      const dx = pos.x - startPosRef.current.x;
      const dy = pos.y - startPosRef.current.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      previewShapeRef.current = {
        id: currentIdRef.current, type: 'circle', color: strokeColor, strokeWidth: 2, userId,
        cx: startPosRef.current.x, cy: startPosRef.current.y, radius,
      };
    }
  }, [tool, strokeColor, shapes, getPos, onCursorMove, onUpdateShape, userId, onDeleteShape]);

  const handlePointerUp = useCallback(() => {
    isDrawing.current = false;
    if (previewShapeRef.current && tool !== 'select' && tool !== 'eraser' && tool !== 'text') {
      onAddShape(previewShapeRef.current);
      previewShapeRef.current = null;
    }
  }, [tool, onAddShape]);

  const handleTextKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setTextInput({ x: 0, y: 0, visible: false });
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commitText();
    }
  }, [commitText]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 bg-canvas-bg"
        style={{ touchAction: 'none', cursor: tool === 'select' ? 'default' : 'crosshair' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      {textInput.visible && (
        <textarea
          ref={textAreaRef}
          className="absolute z-40 bg-transparent border-2 border-primary rounded-md px-2 py-1 text-foreground outline-none resize-none shadow-lg"
          style={{
            left: textInput.x,
            top: textInput.y,
            fontSize: 18,
            fontFamily: 'inherit',
            minWidth: 150,
            color: strokeColor,
          }}
          onKeyDown={handleTextKeyDown}
          onBlur={commitText}
          rows={1}
        />
      )}
    </>
  );
}

// ... helper functions (moveShape, getBBForDrag) remain same