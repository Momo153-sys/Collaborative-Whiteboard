import { useRef, useEffect, useCallback, useState } from 'react';
import type { Tool, Shape, Point, CursorInfo } from '@/types/whiteboard';
import { renderCanvas, hitTest, getBBForDrag, moveShape } from '@/lib/canvas-renderer';

interface WhiteboardCanvasProps {
  tool: Tool;
  strokeColor: string;
  shapes: Shape[];
  cursors: Record<string, CursorInfo>;
  userId: string;
  roomId: string; 
  onAddShape: (shape: Omit<Shape, 'id'>) => void;
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
  roomId,
  onAddShape,
  onUpdateShape,
  onDeleteShape,
  onCursorMove,
}: WhiteboardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const isDrawing = useRef(false);
  const pointerIdRef = useRef<number | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const previewShapeRef = useRef<Shape | null>(null);
  const startPosRef = useRef<Point>({ x: 0, y: 0 });
  const dragOffsetRef = useRef<Point>({ x: 0, y: 0 });
  const currentIdRef = useRef<string>('');
  const throttleRef = useRef(0);

  const [textInput, setTextInput] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0, y: 0, visible: false,
  });
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // --- 1. Canvas Setup ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // --- 2. Render Loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.getContext('2d')) return;
    const render = () => {
      renderCanvas(
        canvas.getContext('2d')!,
        shapes,
        cursors,
        selectedId,
        previewShapeRef.current,
        window.innerWidth,
        window.innerHeight
      );
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [shapes, cursors, selectedId]);

  // --- 3. Pos Helper (Float-friendly but clean) ---
  const getPos = useCallback((e: React.PointerEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
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
        roomId,
        x: textInput.x,
        y: textInput.y,
        content,
        fontSize: 18,
      }as any);
    }
    setTextInput({ x: 0, y: 0, visible: false });
  }, [textInput, strokeColor, userId, roomId, onAddShape]);

  // --- 4. Pointer Event Logic ---
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (textInput.visible) { commitText(); return; }
    
    const pos = getPos(e);
    isDrawing.current = true;
    pointerIdRef.current = e.pointerId;
    startPosRef.current = pos;
    canvasRef.current?.setPointerCapture(e.pointerId);

    if (tool === 'select') {
      let found: string | null = null;
      for (let i = shapes.length - 1; i >= 0; i--) {
        if (hitTest(shapes[i], pos.x, pos.y)) {
          found = shapes[i].id;
          const bb = getBBForDrag(shapes[i]);
          dragOffsetRef.current = { x: pos.x - bb.x, y: pos.y - bb.y };
          break;
        }
      }
      setSelectedId(found);
      currentIdRef.current = found || '';
      return;
    }

    if (tool === 'eraser') {
  // We slice() to create a copy so we don't mutate the original shapes array
  const target = [...shapes].reverse().find(s => hitTest(s, pos.x, pos.y));
  if (target) onDeleteShape(target.id);
  return;
}

    if (tool === 'text') {
      setTextInput({ x: pos.x, y: pos.y, visible: true });
      isDrawing.current = false;
      return;
    }

    // DRAWING START
    currentIdRef.current = crypto.randomUUID();
    if (tool === 'freehand') {
      previewShapeRef.current = {
        id: currentIdRef.current,
        type: 'freehand',
        color: strokeColor,
        strokeWidth: 2,
        userId,
        roomId,
        points: JSON.stringify([pos.x, pos.y]),
      } as any;
    }
  }, [tool, shapes, strokeColor, getPos, userId, roomId, textInput, commitText, onDeleteShape]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const pos = getPos(e);
    
    // Throttle cursor broadcast to ~30fps
    const now = Date.now();
    if (now - throttleRef.current > 32) {
      throttleRef.current = now;
      onCursorMove(pos.x, pos.y);
    }

    if (!isDrawing.current) return;

    if (tool === 'select' && currentIdRef.current) {
      const s = shapes.find(sh => sh.id === currentIdRef.current);
      if (s) moveShape(s, pos.x - dragOffsetRef.current.x, pos.y - dragOffsetRef.current.y, onUpdateShape);
      return;
    }

    if (tool === 'freehand' && previewShapeRef.current) {
      const pts = JSON.parse((previewShapeRef.current as any).points);
      previewShapeRef.current = {
        ...previewShapeRef.current,
        points: JSON.stringify([...pts, pos.x, pos.y]),
      } as any;
    }

    if (tool === 'rectangle') {
      const x = Math.min(pos.x, startPosRef.current.x);
      const y = Math.min(pos.y, startPosRef.current.y);
      const width = Math.abs(pos.x - startPosRef.current.x);
      const height = Math.abs(pos.y - startPosRef.current.y);
      previewShapeRef.current = {
        id: currentIdRef.current, type: 'rectangle', color: strokeColor, strokeWidth: 2, userId, roomId, x, y, width, height
      };
    }

    if (tool === 'circle') {
      const dx = pos.x - startPosRef.current.x;
      const dy = pos.y - startPosRef.current.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      previewShapeRef.current = {
        id: currentIdRef.current, type: 'circle', color: strokeColor, strokeWidth: 2, userId, roomId, cx: startPosRef.current.x, cy: startPosRef.current.y, radius
      };
    }
  }, [tool, shapes, strokeColor, getPos, userId, roomId, onUpdateShape, onCursorMove]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDrawing.current = false;
    canvasRef.current?.releasePointerCapture(e.pointerId);

    if (previewShapeRef.current && !['select', 'eraser', 'text'].includes(tool)) {
      const { id, ...shapeData } = previewShapeRef.current;
      onAddShape({ ...shapeData, roomId });
      previewShapeRef.current = null;
    }
  }, [tool, onAddShape, roomId]);

  return (
    <div className="relative w-full h-full touch-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 bg-canvas-bg"
        style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      {textInput.visible && (
        <textarea
          ref={textAreaRef}
          autoFocus
          className="absolute z-50 bg-transparent border-2 border-blue-500 rounded p-1 outline-none overflow-hidden"
          style={{ left: textInput.x, top: textInput.y, color: strokeColor, fontSize: '18px', lineHeight: '1.3' }}
          onBlur={commitText}
          rows={1}
          onChange={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
        />
      )}
    </div>
  );
}