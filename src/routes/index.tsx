import { createFileRoute } from "@tanstack/react-router";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Whiteboard } from "@/components/Whiteboard";
import { AuthPage } from "@/components/AuthPage";

export const Route = createFileRoute("/")({
  component: Index,
});

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas-bg">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return <AuthPage />;
  return <Whiteboard />;
}

function Index() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
