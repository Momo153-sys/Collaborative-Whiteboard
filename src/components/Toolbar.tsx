import { cn } from '@/lib/utils';
import type { Tool } from '@/types/whiteboard';
import { MousePointer2, Pencil, Square, Circle, Eraser, Type, LogOut } from 'lucide-react';

const tools: { id: Tool; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'select', label: 'Select (V)', icon: MousePointer2 },
  { id: 'freehand', label: 'Draw (P)', icon: Pencil },
  { id: 'rectangle', label: 'Rectangle (R)', icon: Square },
  { id: 'circle', label: 'Circle (O)', icon: Circle },
  { id: 'text', label: 'Text (T)', icon: Type },
  { id: 'eraser', label: 'Eraser (E)', icon: Eraser },
];

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  strokeColor: string;
  onColorChange: (color: string) => void;
  onSignOut: () => void;
}

const PALETTE = [
  '#1e1e1e', // Dark
  '#ff4d4d', // Red
  '#3498db', // Blue
  '#2ecc71', // Green
  '#f1c40f', // Yellow
  '#9b59b6', // Purple
  '#ffffff', // White
];

export function Toolbar({ activeTool, onToolChange, strokeColor, onColorChange, onSignOut }: ToolbarProps) {
  return (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-2xl border border-border/40 bg-background/95 backdrop-blur-md p-1.5 shadow-2xl"
    >
      {/* Tool Selection */}
      <div className="flex items-center gap-0.5">
        {tools.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            title={label}
            onClick={() => onToolChange(id)}
            className={cn(
              'relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200',
              activeTool === id
                ? 'bg-primary text-primary-foreground shadow-md scale-105'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="w-[20px] h-[20px]" />
            {activeTool === id && (
              <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary-foreground/50" />
            )}
          </button>
        ))}
      </div>

      <div className="w-px h-8 bg-border/60 mx-2" />

      {/* Color Palette */}
      <div className="flex items-center gap-2 px-1">
        {PALETTE.map((c) => (
          <button
            key={c}
            onClick={() => onColorChange(c)}
            className={cn(
              'group relative w-6 h-6 rounded-full border border-black/10 transition-all duration-200',
              strokeColor === c ? 'ring-2 ring-primary ring-offset-2 scale-110' : 'hover:scale-125'
            )}
            style={{ backgroundColor: c }}
          >
            <span className="sr-only">Select color {c}</span>
          </button>
        ))}
      </div>

      <div className="w-px h-8 bg-border/60 mx-2" />

      {/* Actions */}
      <button
        title="Sign Out"
        onClick={onSignOut}
        className="flex items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
      >
        <Icon className="w-[20px] h-[20px]" icon={LogOut} />
      </button>
    </div>
  );
}

// Helper to handle the icon sizing properly in the button
function Icon({ icon: Icon, className }: { icon: any, className?: string }) {
  return <Icon className={className} />;
}