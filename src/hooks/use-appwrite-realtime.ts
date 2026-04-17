import { useEffect, useState, useCallback } from 'react';
import { client, databases, DATABASE_ID, SHAPES_COLLECTION_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import type { Shape, CursorInfo } from '@/types/whiteboard';

// Pulling Presence ID from env
const PRESENCE_COLLECTION_ID = import.meta.env.VITE_APPWRITE_PRESENCE_COLLECTION_ID;

interface UseAppwriteRealtimeProps {
  roomId: string; // Crucial for collaboration isolation
  userName: string;
  userColor: string;
  userId: string;
}

export function useAppwriteRealtime({ roomId, userName, userColor, userId }: UseAppwriteRealtimeProps) {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [cursors, setCursors] = useState<Record<string, CursorInfo>>({});
  const [isSynced, setIsSynced] = useState(false);

  // --- 1. Initial Load: Fetch shapes ONLY for the current room ---
  useEffect(() => {
    const fetchShapes = async () => {
      try {
        const response = await databases.listDocuments(
          DATABASE_ID,
          SHAPES_COLLECTION_ID,
          [
            Query.equal('roomId', roomId), 
            Query.limit(100)
          ]
        );
        
        const loadedShapes = response.documents.map((doc: any) => ({
          ...doc,
          id: doc.$id,
        })) as Shape[];
        
        setShapes(loadedShapes);
        setIsSynced(true);
      } catch (error) {
        console.error('Error fetching shapes:', error);
      }
    };

    fetchShapes();
  }, [roomId]);

  // --- 2. Realtime Subscriptions: Filtered by Collection & Room ---
  useEffect(() => {
    const unsubscribe = client.subscribe(
      [
        `databases.${DATABASE_ID}.collections.${SHAPES_COLLECTION_ID}.documents`,
        `databases.${DATABASE_ID}.collections.${PRESENCE_COLLECTION_ID}.documents`
      ],
      (response) => {
        const payload = response.payload as any;

        // --- Handle Shape Collection Events ---
        if (response.events.some(e => e.includes(SHAPES_COLLECTION_ID))) {
          // Verify room match so users on board A don't see board B's drawings
          if (payload.roomId !== roomId) return;

          if (response.events.some(e => e.includes(".create"))) {
            if (payload.userId !== userId) {
              setShapes((prev) => [...prev, { ...payload, id: payload.$id }]);
            }
          }

          if (response.events.some(e => e.includes(".update"))) {
            setShapes((prev) => 
              prev.map(s => s.id === payload.$id ? { ...payload, id: payload.$id } : s)
            );
          }

          if (response.events.some(e => e.includes(".delete"))) {
            setShapes((prev) => prev.filter((s) => s.id !== payload.$id));
          }
        }

        // --- Handle Presence Collection Events (Cursors) ---
        if (response.events.some(e => e.includes(PRESENCE_COLLECTION_ID))) {
          // If the cursor update is for this room
          if (payload.roomId === roomId && payload.userId !== userId) {
            if (response.events.some(e => e.includes(".create") || e.includes(".update"))) {
              setCursors((prev) => ({
                ...prev,
                [payload.userId]: {
                  x: payload.x,
                  y: payload.y,
                  userName: payload.userName,
                  userColor: payload.userColor,
                  userId: payload.userId
                },
              }));
            }
          }

          // If a user leaves the app or closes the tab (document deleted)
          if (response.events.some(e => e.includes(".delete"))) {
            setCursors((prev) => {
              const newCursors = { ...prev };
              // We assume the document ID in Presence is the userId
              delete newCursors[payload.$id]; 
              return newCursors;
            });
          }
        }
      }
    );

    return () => {
      unsubscribe();
      // Clean up presence when user unmounts/leaves
      databases.deleteDocument(DATABASE_ID, PRESENCE_COLLECTION_ID, userId).catch(() => {});
    };
  }, [roomId, userId]);

  // --- 3. Actions: Methods for the UI to call ---

  const addShape = async (shape: Omit<Shape, 'id'>) => {
    try {
      const tempId = ID.unique();
      
      // 1. Start with the base data
      // We cast to 'any' to allow dynamic property assignment for the DB document
      const shapeData: any = {
        ...shape,
        roomId,
        userId,
      };

      // 2. Explicitly round based on the shape type
      // We cast the property to 'number' to satisfy the Math.round argument requirement
      if ('x' in shape) {
        shapeData.x = Math.round((shape as any).x || 0);
      }
      if ('y' in shape) {
        shapeData.y = Math.round((shape as any).y || 0);
      }
      if ('width' in shape) {
        shapeData.width = Math.round((shape as any).width || 0);
      }
      if ('height' in shape) {
        shapeData.height = Math.round((shape as any).height || 0);
      }
      if ('cx' in shape) {
        shapeData.cx = Math.round((shape as any).cx || 0);
      }
      if ('cy' in shape) {
        shapeData.cy = Math.round((shape as any).cy || 0);
      }
      if ('radius' in shape) {
        shapeData.radius = Math.round((shape as any).radius || 0);
      }

      // 3. Optimistic UI update
      setShapes((prev) => [...prev, { ...shapeData, id: tempId } as Shape]);

      // 4. Send to Appwrite
      await databases.createDocument(
        DATABASE_ID,
        SHAPES_COLLECTION_ID,
        tempId,
        shapeData
      );
    } catch (error) {
      console.error('Failed to save shape:', error);
    }
  };

  const broadcastCursor = async (x: number, y: number) => {
  if (!userId || userId === 'anonymous') return;

  const cursorData = {
    x,
    y,
    userName,
    userColor,
    roomId,
    userId,
  };

  try {
    // 1. Try to update the existing document for this user
    await databases.updateDocument(
      DATABASE_ID,
      PRESENCE_COLLECTION_ID,
      userId, // We use userId as the document ID
      cursorData
    );
  } catch (error: any) {
    // 2. If error code is 404, the document doesn't exist yet, so create it
    if (error.code === 404) {
      try {
        await databases.createDocument(
          DATABASE_ID,
          PRESENCE_COLLECTION_ID,
          userId, // Set the document ID to the userId
          cursorData
        );
      } catch (createError) {
        // Ignore "already exists" errors here in case of race conditions
        console.error("Error creating cursor:", createError);
      }
    } else {
      console.error("Error updating cursor:", error);
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

  const updateShape = async (id: string, updates: Partial<Shape>) => {
    try {
      // Round any incoming numerical updates
      const sanitizedUpdates: any = { ...updates };
      ['x', 'y', 'width', 'height', 'radius', 'cx', 'cy'].forEach(key => {
        if (typeof sanitizedUpdates[key] === 'number') {
          sanitizedUpdates[key] = Math.round(sanitizedUpdates[key]);
        }
      });

      setShapes((prev) => prev.map(s => s.id === id ? { ...s, ...sanitizedUpdates } : s));
      await databases.updateDocument(DATABASE_ID, SHAPES_COLLECTION_ID, id, sanitizedUpdates);
    } catch (error) {
      console.error('Failed to update shape:', error);
    }
  };

  return {
    shapes,
    cursors,
    addShape,
    deleteShape,
    updateShape,
    broadcastCursor,
    isSynced,
  };
}