import { useState } from 'react';
import type { Tool } from '@/types/whiteboard';
import { useAppwriteRealtime } from '@/hooks/use-appwrite-realtime'; // New Hook
import { useAuth } from '@/hooks/use-auth';
import { WhiteboardCanvas } from './WhiteboardCanvas';
import { Toolbar } from './Toolbar';
import { StatusBar } from './StatusBar';

export function Whiteboard() {
  const { user, signOut } = useAuth();
  const [tool, setTool] = useState<Tool>('freehand');
  const [strokeColor, setStrokeColor] = useState('#1e1e1e');

  // Appwrite uses 'name' and '$id' instead of 'display_name' and 'id'
  const userName = user?.name || user?.email.split('@')[0] || 'Anonymous';
  
  // We can store a preferred color in Appwrite's user preferences or a metadata field
  // Treat prefs as a Record so you can access the 'color' key
const userColor = (user?.prefs as Record<string, any>).color || '#3498DB';

  // This hook will now handle Appwrite Databases + Realtime subscriptions
  const { 
    shapes, 
    cursors, 
    addShape, 
    updateShape, 
    deleteShape, 
    broadcastCursor,
    isSynced 
  } = useAppwriteRealtime({
    userName,
    userColor,
    userId: user?.$id || 'anonymous',
  });

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-canvas-bg selection:bg-none">
      <Toolbar
        activeTool={tool}
        onToolChange={setTool}
        strokeColor={strokeColor}
        onColorChange={setStrokeColor}
        onSignOut={signOut}
      />
      
      <WhiteboardCanvas
        tool={tool}
        strokeColor={strokeColor}
        shapes={shapes}
        cursors={cursors}
        userId={user?.$id || 'anonymous'}
        onAddShape={addShape}
        onUpdateShape={updateShape}
        onDeleteShape={deleteShape}
        onCursorMove={broadcastCursor}
      />

      <StatusBar
        shapeCount={shapes.length}
        peerCount={Object.keys(cursors).length} // Appwrite Realtime usually returns an object for presence
        userName={userName}
        userColor={userColor}
        isSynced={isSynced}
      />
    </div>
  );
}