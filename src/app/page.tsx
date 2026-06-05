"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { useAuth } from "@/hooks/use-auth";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, tecnico, loading, login } = useAuth();

  // Redirect based on role if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated && tecnico) {
      const destination = tecnico.rol === 'jefe' ? '/jefe' : '/tecnico';
      router.push(destination);
    }
  }, [isAuthenticated, tecnico, loading, router]);

  const handleLoginSuccess = (rol?: string) => {
    const destination = rol === 'jefe' ? '/jefe' : '/tecnico';
    router.push(destination);
  };

  // Show nothing while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-9 w-9 rounded-full border-2 border-border border-t-primary animate-spin" />
      </div>
    );
  }

  // If authenticated, show loading while redirecting
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-9 w-9 rounded-full border-2 border-border border-t-primary animate-spin" />
      </div>
    );
  }

  return <LoginForm onSuccess={handleLoginSuccess} onLogin={login} />;
}
