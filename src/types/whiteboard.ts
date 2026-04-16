// Appwrite Document Type
// Use this when fetching from the database
import type {  Models } from 'appwrite';

// whiteboard.ts

export type Tool = 'select' | 'freehand' | 'rectangle' | 'circle' | 'eraser' | 'text';

export interface Point {
  x: number;
  y: number;
}

// Base structure for what we SEND to Appwrite
export interface BaseShape {
  id: string; // We'll map this to Appwrite's $id
  type: Tool;
  color: string;
  strokeWidth: number;
  userId: string;
}

export interface FreehandShape extends BaseShape {
  type: 'freehand';
  points: string; // Appwrite doesn't support nested number arrays well; 
                  // It's better to store as a JSON string or a flat string.
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

export type Shape = FreehandShape | RectangleShape | CircleShape | TextShape;



export type ShapeDocument = Shape & Models.Document;

export interface CursorInfo {
  x: number;
  y: number;
  userName: string;   // Changed from name
  userColor: string;  // Changed from color
  userId: string; // Added to identify whose cursor is whose
}