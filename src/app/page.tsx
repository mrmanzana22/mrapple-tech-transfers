"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { useAuth } from "@/hooks/use-auth";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, loading, login } = useAuth();

  // Redirect to panel if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push("/tecnico");
    }
  }, [isAuthenticated, loading, router]);

  const handleLoginSuccess = () => {
    router.push("/tecnico");
  };

  // Show nothing while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If authenticated, show loading while redirecting
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <LoginForm onSuccess={handleLoginSuccess} onLogin={login} />;
}
