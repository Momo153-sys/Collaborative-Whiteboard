import { useState } from 'react';
import type { Tool } from '@/types/whiteboard';
import { useAppwriteRealtime } from '@/hooks/use-appwrite-realtime'; 
import { useAuth } from '@/hooks/use-auth';
import { WhiteboardCanvas } from './WhiteboardCanvas';
import { Toolbar } from './Toolbar';
import { StatusBar } from './StatusBar';

export function Whiteboard() {
  const { user, signOut } = useAuth();
  const [tool, setTool] = useState<Tool>('freehand');
  const [strokeColor, setStrokeColor] = useState('#1e1e1e');

  // This should ideally come from a URL param like /board/:id
  const currentRoomId = "global-collaboration-space";

  const userName = user?.name || user?.email.split('@')[0] || 'Anonymous';
  
  // Safe cast for user preferences
  const userColor = (user?.prefs as Record<string, any>)?.color || '#3498DB';

  const { 
    shapes, 
    cursors, 
    addShape, 
    updateShape, 
    deleteShape, 
    broadcastCursor,
    isSynced 
  } = useAppwriteRealtime({
    roomId: currentRoomId,
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
        roomId={currentRoomId} // FIXED: Added this prop so drawings are room-aware
        onAddShape={addShape}
        onUpdateShape={updateShape}
        onDeleteShape={deleteShape}
        onCursorMove={broadcastCursor}
      />

      <StatusBar
        shapeCount={shapes.length}
        // peerCount tracks other cursors + you
        peerCount={Object.keys(cursors).length + 1} 
        userName={userName}
        userColor={userColor}
        isSynced={isSynced}
      />
    </div>
  );
}