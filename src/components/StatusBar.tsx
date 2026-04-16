interface StatusBarProps {
  shapeCount: number;
  peerCount: number;
  userName: string;
  userColor: string;
  isSynced?: boolean; // Added to show Appwrite connection status
}

export function StatusBar({ 
  shapeCount, 
  peerCount, 
  userName, 
  userColor,
  isSynced = true 
}: StatusBarProps) {
  return (
    <div
      className="absolute bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-full border border-border/40 bg-background/80 backdrop-blur-md px-4 py-1.5 text-[11px] font-medium text-muted-foreground shadow-2xl"
    >
      {/* User Identity */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <span 
            className="block w-2.5 h-2.5 rounded-full border border-white/20" 
            style={{ backgroundColor: userColor }} 
          />
          {isSynced && (
            <span 
              className="absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping opacity-40" 
              style={{ backgroundColor: userColor }} 
            />
          )}
        </div>
        <span className="text-foreground">{userName}</span>
      </div>

      <span className="w-px h-3 bg-border/60" />

      {/* Stats Section */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <strong className="text-foreground">{shapeCount}</strong> 
          {shapeCount === 1 ? 'shape' : 'shapes'}
        </span>
        
        <span className="w-1 h-1 rounded-full bg-border/60" />

        <span className="flex items-center gap-1">
          <strong className="text-foreground">{peerCount}</strong> 
          {peerCount === 1 ? 'peer' : 'peers'} online
        </span>
      </div>

      {/* Connection Indicator */}
      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${isSynced ? 'text-emerald-500' : 'text-amber-500'}`}>
        <div className={`w-1 h-1 rounded-full bg-current ${!isSynced && 'animate-pulse'}`} />
        <span className="uppercase tracking-widest text-[9px] font-bold">
          {isSynced ? 'Live' : 'Syncing'}
        </span>
      </div>
    </div>
  );
}