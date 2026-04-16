import type { Shape, CursorInfo } from "@/types/whiteboard"

// -----------------------------
// MAIN RENDER
// -----------------------------
export function renderCanvas(
  ctx: CanvasRenderingContext2D,
  shapes: Shape[],
  cursors: Record<string, CursorInfo>,
  selectedId: string | null,
  previewShape: Shape | null,
  canvasWidth: number,
  canvasHeight: number
) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  // Draw shapes
  for (const shape of shapes) {
    drawShape(ctx, shape, shape.id === selectedId)
  }

  // Draw preview
  if (previewShape) {
    drawShape(ctx, previewShape, false)
  }

  // Draw cursors
  Object.values(cursors).forEach((cursor) => {
     drawCursor(ctx, cursor)
  })
}

// -----------------------------
// SHAPES
// -----------------------------
function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  selected: boolean
) {
  ctx.save()

  ctx.strokeStyle = shape.color
  ctx.lineWidth = shape.strokeWidth
  ctx.lineCap = "round"
  ctx.lineJoin = "round"

  switch (shape.type) {
    case "freehand": {
      const pts = shape.points
      if (!pts || pts.length < 4) break

      ctx.beginPath()
      ctx.moveTo(Number(pts[0]), Number(pts[1]))

      for (let i = 2; i < pts.length - 1; i += 2) {
        const x = Number(pts[i])
        const y = Number(pts[i + 1])
          ctx.lineTo(x, y)
      }

      ctx.stroke()
      break
    }

    case "rectangle": {
      ctx.beginPath()
      ctx.rect(shape.x, shape.y, shape.width, shape.height)
      ctx.stroke()
      break
    }

    case "circle": {
      ctx.beginPath()
      ctx.arc(shape.cx, shape.cy, shape.radius, 0, Math.PI * 2)
      ctx.stroke()
      break
    }

    case "text": {
      ctx.save()
      ctx.font = `${shape.fontSize}px Inter, system-ui, sans-serif`
      ctx.fillStyle = shape.color
      ctx.textBaseline = "top"

      const lines = (shape.content || "").split("\n");

      lines.forEach((line, i) => {
        ctx.fillText(line, shape.x, shape.y + i * shape.fontSize * 1.3)
      })

      ctx.restore()
      break
    }

    default: {
  const _exhaustive: never = shape;
  return _exhaustive;
}
  }

  // -----------------------------
  // SELECTION BOX
  // -----------------------------
  if (selected) {
    const bb = getBoundingBox(shape)

    if (bb) {
      ctx.save()
      ctx.strokeStyle = "#3b82f6"
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])

      ctx.strokeRect(
        bb.x - 8,
        bb.y - 8,
        bb.width + 16,
        bb.height + 16
      )

      ctx.setLineDash([])
      ctx.restore()
    }
  }

  ctx.restore()
}

// -----------------------------
// CURSOR
// -----------------------------
function drawCursor(ctx: CanvasRenderingContext2D, cursor: CursorInfo) {
  const {
    x,
    y,
    userName = "User",
    userColor = "#000",
  } = cursor

  ctx.save()

  // Shadow
  ctx.shadowBlur = 4
  ctx.shadowColor = "rgba(0,0,0,0.2)"
  ctx.shadowOffsetY = 2

  // Cursor shape
  ctx.fillStyle = userColor
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y + 18)
  ctx.lineTo(x + 5, y + 14)
  ctx.lineTo(x + 10, y + 22)
  ctx.lineTo(x + 13, y + 20)
  ctx.lineTo(x + 8, y + 12)
  ctx.lineTo(x + 14, y + 10)
  ctx.closePath()
  ctx.fill()

  // Reset shadow
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  // Label
  ctx.font = "500 12px Inter, system-ui, sans-serif"

  const textWidth = ctx.measureText(userName).width
  const padding = 6
  const boxX = x + 12
  const boxY = y + 22
  const boxW = textWidth + padding * 2
  const boxH = 20
  const radius = 4

  ctx.fillStyle = userColor

  // Fallback for roundRect (browser compatibility)
  drawRoundedRect(ctx, boxX, boxY, boxW, boxH, radius)
  ctx.fill()

  ctx.fillStyle = "#fff"
  ctx.fillText(userName, boxX + padding, boxY + 14)

  ctx.restore()
}

// -----------------------------
// ROUNDED RECT (SAFE)
// -----------------------------
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// -----------------------------
export function getBoundingBox(shape: Shape): { x: number; y: number; width: number; height: number } | null {
  switch (shape.type) {
    case 'freehand': {
      const pts = shape.points;
      if (!pts || pts.length < 2) return null;
      
      let minX = Number(pts[0]), minY = Number(pts[1]), maxX = Number(pts[0]), maxY = Number(pts[1]);
      
      for (let i = 2; i < pts.length; i += 2) {
        const px = Number(pts[i]);
        const py = Number(pts[i + 1]);
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    case 'rectangle':
      return { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
    case 'circle':
      return { 
        x: shape.cx - shape.radius, 
        y: shape.cy - shape.radius, 
        width: shape.radius * 2, 
        height: shape.radius * 2 
      };
    case 'text': {
      const lines = (shape.content || "").split('\n');
      const lineHeight = shape.fontSize * 1.3;
      const height = lines.length * lineHeight;
      // Rough estimate for width: approx 60% of font size per character
      const width = Math.max(...lines.map(l => l.length)) * shape.fontSize * 0.6;
      return { x: shape.x, y: shape.y, width, height };
    }
    default:
      return null;
  }
}

// -----------------------------
// HELPER: HIT TEST
// -----------------------------
export function hitTest(shape: Shape, px: number, py: number): boolean {
  const bb = getBoundingBox(shape);
  if (!bb) return false;
  
  const margin = 10; // Extra padding to make small shapes easier to click
  return (
    px >= bb.x - margin &&
    px <= bb.x + bb.width + margin &&
    py >= bb.y - margin &&
    py <= bb.y + bb.height + margin
  );
}

/**
 * Helper to get the reference point (x, y) for dragging.
 * For rectangles/text, it's just x/y. For circles, it's cx/cy.
 */
export function getBBForDrag(shape: any) {
  if (shape.type === 'circle') {
    return { x: shape.cx, y: shape.cy };
  }
  if (shape.type === 'freehand') {
    // For freehand, we use the first point as the drag anchor
    const pts = typeof shape.points === 'string' ? JSON.parse(shape.points) : shape.points;
    return { x: pts[0], y: pts[1] };
  }
  // Default for rectangle and text
  return { x: shape.x, y: shape.y };
}

/**
 * Calculates new coordinates for a shape during dragging.
 * This is called frequently (on mouseMove), so we keep it light.
 */
export function moveShape(
  shape: Shape, 
  newX: number, 
  newY: number, 
  onUpdate: (id: string, updates: Partial<Shape>) => void
) {
  switch (shape.type) {
    case 'rectangle':
    case 'text':
      onUpdate(shape.id, { x: newX, y: newY });
      break;

    case 'circle':
      // Circles use cx/cy for the center
      onUpdate(shape.id, { cx: newX, cy: newY });
      break;

    case 'freehand': {
      // Moving freehand is tricky because it's a list of points.
      // We calculate the delta (change) from the first point.
      const pts = typeof shape.points === 'string' ? JSON.parse(shape.points) : shape.points;
      const dx = newX - Number(pts[0]);
      const dy = newY - Number(pts[1]);
      
      const newPoints = [];
      for (let i = 0; i < pts.length; i += 2) {
        newPoints.push(Number(pts[i]) + dx);
        newPoints.push(Number(pts[i + 1]) + dy);
      }
      
      onUpdate(shape.id, { 
  points: (typeof shape.points === 'string' 
    ? JSON.stringify(newPoints) 
    : newPoints) as string // Cast to match the expected update type
});
      break;
    }
  }
}