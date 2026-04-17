import type { Models } from 'appwrite';

// Available tools in the whiteboard
export type Tool = 'select' | 'freehand' | 'rectangle' | 'circle' | 'eraser' | 'text';

export interface Point {
  x: number;
  y: number;
}

// --- Base structure for what we SEND to Appwrite ---
export interface BaseShape {
  id: string;      // Mapped to Appwrite's $id in the hook
  type: Tool;
  color: string;
  strokeWidth: number;
  userId: string;
  roomId: string;  // REQUIRED: To isolate drawings to specific boards
}

export interface FreehandShape extends BaseShape {
  type: 'freehand';
  points: string;  // Stored as JSON.stringify([x1, y1, x2, y2...])
}

export interface RectangleShape extends BaseShape {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleShape extends BaseShape {
  type: 'circle';
  cx: number;
  cy: number;
  radius: number;
}

export interface TextShape extends BaseShape {
  type: 'text';
  x: number;
  y: number;
  content: string;
  fontSize: number;
}

// The union type for all possible shapes
export type Shape = FreehandShape | RectangleShape | CircleShape | TextShape;

// Represents the document as it comes back from the Appwrite SDK
export type ShapeDocument = Shape & Models.Document;

// --- Presence / Cursor Data ---
export interface CursorInfo {
  x: number;
  y: number;
  userName: string;
  userColor: string;
  userId: string;
  roomId: string; // REQUIRED: To ensure you only see cursors in your current room
}