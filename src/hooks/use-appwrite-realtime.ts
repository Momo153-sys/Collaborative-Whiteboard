import { useEffect, useState, useRef } from 'react';
import { client, databases, DATABASE_ID, SHAPES_COLLECTION_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import type { Shape, CursorInfo } from '@/types/whiteboard';

interface UseAppwriteRealtimeProps {
  userName: string;
  userColor: string;
  userId: string;
}

export function useAppwriteRealtime({ userName, userColor, userId }: UseAppwriteRealtimeProps) {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [cursors, setCursors] = useState<Record<string, CursorInfo>>({});
  const [isSynced, setIsSynced] = useState(false);

  // 1. Initial Load: Fetch all shapes from the database
  useEffect(() => {
    const fetchShapes = async () => {
      try {
        const response = await databases.listDocuments(
          DATABASE_ID,
          SHAPES_COLLECTION_ID,
          [Query.limit(100)] // Adjust limit as needed
        );
        // Map Appwrite documents to our Shape type
        const loadedShapes = response.documents.map((doc: any) => ({
          ...doc,
          id: doc.$id, // Map Appwrite $id back to our generic id
        })) as Shape[];
        
        setShapes(loadedShapes);
        setIsSynced(true);
      } catch (error) {
        console.error('Error fetching shapes:', error);
      }
    };

    fetchShapes();
  }, []);

  // 2. Realtime Subscriptions: Listen for Database changes & Cursor events
  useEffect(() => {
    // Subscribe to both database changes and "presence" events
    const unsubscribe = client.subscribe(
      [
        `databases.${DATABASE_ID}.collections.${SHAPES_COLLECTION_ID}.documents`,
        `channels.presence` // Custom channel for cursors
      ],
      (response) => {
        // Handle Database Events (Shapes)
        if (response.events.includes("databases.*.collections.*.documents.*.create")) {
          const newShape = response.payload as any;
          if (newShape.userId !== userId) { // Don't add if we are the creator
            setShapes((prev) => [...prev, { ...newShape, id: newShape.$id }]);
          }
        }

        if (response.events.includes("databases.*.collections.*.documents.*.delete")) {
          const deletedId = (response.payload as any).$id;
          setShapes((prev) => prev.filter((s) => s.id !== deletedId));
        }

        // Handle Custom Cursor Events
        if (response.events.includes("channels.presence.broadcast")) {
          const cursorData = response.payload as CursorInfo;
          if (cursorData.userId !== userId) {
            setCursors((prev) => ({
              ...prev,
              [cursorData.userId]: cursorData,
            }));
          }
        }
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // 3. Actions: Methods for the UI to call
  const addShape = async (shape: Omit<Shape, 'id'>) => {
    try {
      // Optimistic UI update: Add locally first for zero lag
      const tempId = ID.unique();
      const newShape = { ...shape, id: tempId } as Shape;
      setShapes((prev) => [...prev, newShape]);

      await databases.createDocument(
        DATABASE_ID,
        SHAPES_COLLECTION_ID,
        tempId,
        shape
      );
    } catch (error) {
      console.error('Failed to save shape:', error);
      // Optional: Rollback local state on failure
    }
  };

  const broadcastCursor = async (x: number, y: number) => {
  try {
    // We use the userId as the document ID so it's a simple overwrite
    await databases.updateDocument(
      DATABASE_ID,
      import.meta.env.VITE_APPWRITE_PRESENCE_COLLECTION_ID,
      userId, 
      { x, y, userName, userColor }
    );
  } catch (error: any) {
    // If the document doesn't exist yet (first move), create it
    if (error.code === 404) {
      await databases.createDocument(
        DATABASE_ID,
        import.meta.env.VITE_APPWRITE_PRESENCE_COLLECTION_ID,
        userId,
        { x, y, userName, userColor }
      );
    }
  }
};

  const deleteShape = async (id: string) => {
    try {
      setShapes((prev) => prev.filter((s) => s.id !== id));
      await databases.deleteDocument(DATABASE_ID, SHAPES_COLLECTION_ID, id);
    } catch (error) {
      console.error('Failed to delete shape:', error);
    }
  };

  return {
    shapes,
    cursors,
    addShape,
    deleteShape,
    broadcastCursor,
    isSynced,
    updateShape: () => {}, // Implement update logic if needed
  };
}