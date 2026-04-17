import type { Shape, CursorInfo } from "@/types/whiteboard";

// Helper to safely get points array from the Appwrite string
const getPointsArray = (points: string): number[] => {
  try {
    const parsed = JSON.parse(points);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

export function renderCanvas(
  ctx: CanvasRenderingContext2D,
  shapes: Shape[],
  cursors: Record<string, CursorInfo>,
  selectedId: string | null,
  previewShape: Shape | null,
  canvasWidth: number,
  canvasHeight: number
) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Draw shapes
  for (const shape of shapes) {
    drawShape(ctx, shape, shape.id === selectedId);
  }

  // Draw preview (ghost drawing while dragging mouse)
  if (previewShape) {
    drawShape(ctx, previewShape, false);
  }

  // Draw cursors of other users
  Object.values(cursors).forEach((cursor) => {
    drawCursor(ctx, cursor, canvasWidth, canvasHeight);
  });
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  selected: boolean
) {
  ctx.save();

  ctx.strokeStyle = shape.color;
  ctx.lineWidth = shape.strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (shape.type) {
    case "freehand": {
      const pts = getPointsArray(shape.points); // FIX: Parse from string
      if (pts.length < 4) break;

      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length - 1; i += 2) {
        ctx.lineTo(pts[i], pts[i + 1]);
      }
      ctx.stroke();
      break;
    }

    case "rectangle": {
      ctx.beginPath();
      ctx.rect(shape.x, shape.y, shape.width, shape.height);
      ctx.stroke();
      break;
    }

    case "circle": {
      ctx.beginPath();
      ctx.arc(shape.cx, shape.cy, shape.radius, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    case "text": {
      ctx.font = `${shape.fontSize}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = shape.color;
      ctx.textBaseline = "top";
      const lines = (shape.content || "").split("\n");
      lines.forEach((line, i) => {
        ctx.fillText(line, shape.x, shape.y + i * shape.fontSize * 1.3);
      });
      break;
    }
  }

  // Selection box logic
  if (selected) {
    const bb = getBoundingBox(ctx, shape);
    if (bb) {
      const pad = 10;
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(bb.x - pad, bb.y - pad, bb.width + pad * 2, bb.height + pad * 2);
    }
  }

  ctx.restore();
}

function drawCursor(
  ctx: CanvasRenderingContext2D,
  cursor: CursorInfo,
  canvasWidth: number,
  canvasHeight: number
) {
  const { x, y, userName = "User", userColor = "#3b82f6" } = cursor;
  ctx.save();
  
  // Custom cursor path
  ctx.fillStyle = userColor;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + 18);
  ctx.lineTo(x + 5, y + 14);
  ctx.lineTo(x + 10, y + 22);
  ctx.lineTo(x + 13, y + 20);
  ctx.lineTo(x + 8, y + 12);
  ctx.lineTo(x + 14, y + 10);
  ctx.closePath();
  ctx.fill();

  // Name tag
  ctx.font = "500 12px Inter, sans-serif";
  const textWidth = ctx.measureText(userName).width;
  const boxW = textWidth + 12;
  const boxH = 20;

  let boxX = Math.min(x + 12, canvasWidth - boxW - 4);
  let boxY = Math.min(y + 22, canvasHeight - boxH - 4);

  ctx.fillStyle = userColor;
  drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 4);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.fillText(userName, boxX + 6, boxY + 14);
  ctx.restore();
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r); // Simplified modern API
}

export function getBoundingBox(
  ctx: CanvasRenderingContext2D,
  shape: Shape
) {
  switch (shape.type) {
    case "freehand": {
      const pts = getPointsArray(shape.points); // FIX: Parse string
      if (pts.length < 2) return null;
      let minX = pts[0], minY = pts[1], maxX = pts[0], maxY = pts[1];
      for (let i = 2; i < pts.length; i += 2) {
        minX = Math.min(minX, pts[i]);
        maxX = Math.max(maxX, pts[i]);
        minY = Math.min(minY, pts[i+1]);
        maxY = Math.max(maxY, pts[i+1]);
      }
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    case "rectangle": return { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
    case "circle": return { x: shape.cx - shape.radius, y: shape.cy - shape.radius, width: shape.radius * 2, height: shape.radius * 2 };
    case "text": {
      ctx.font = `${shape.fontSize}px Inter, sans-serif`;
      const lines = (shape.content || "").split("\n");
      const width = Math.max(...lines.map(l => ctx.measureText(l).width));
      return { x: shape.x, y: shape.y, width, height: lines.length * shape.fontSize * 1.3 };
    }
  }
}

export function hitTest(shape: Shape, px: number, py: number): boolean {
  const margin = 10;
  if (shape.type === "circle") {
    const dx = px - shape.cx;
    const dy = py - shape.cy;
    return Math.sqrt(dx * dx + dy * dy) <= shape.radius + margin;
  }
  
  // Use a temporary canvas context for measurement-free bounding box check
  const dummyCtx = document.createElement('canvas').getContext('2d')!;
  const box = getBoundingBox(dummyCtx, shape);
  if (!box) return false;

  return (
    px >= box.x - margin &&
    px <= box.x + box.width + margin &&
    py >= box.y - margin &&
    py <= box.y + box.height + margin
  );
}

export function getBBForDrag(shape: Shape) {
  if (shape.type === "circle") return { x: shape.cx, y: shape.cy };
  if (shape.type === "freehand") {
    const pts = getPointsArray(shape.points);
    return { x: pts[0] || 0, y: pts[1] || 0 };
  }
  return { x: (shape as any).x, y: (shape as any).y };
}

export function moveShape(
  shape: Shape,
  newX: number,
  newY: number,
  onUpdate: (id: string, updates: Partial<Shape>) => void
) {
  switch (shape.type) {
    case "rectangle":
    case "text":
      onUpdate(shape.id, { x: newX, y: newY });
      break;
    case "circle":
      onUpdate(shape.id, { cx: newX, cy: newY });
      break;
    case "freehand": {
      const pts = getPointsArray(shape.points);
      const dx = newX - pts[0];
      const dy = newY - pts[1];
      const newPoints = pts.map((p, i) => (i % 2 === 0 ? p + dx : p + dy));
      onUpdate(shape.id, { points: JSON.stringify(newPoints) }); // FIX: Save as string
      break;
    }
  }
}