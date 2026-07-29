import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Bot, Bell, Shield, ArrowRight } from "lucide-react";
import coachLogo from "@/assets/coach-logo.png";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        navigate({ to: "/dashboard", replace: true });
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Navbar */}
      <nav className="h-16 border-b flex items-center justify-between px-6 lg:px-12 sticky top-0 bg-background/80 backdrop-blur z-50">
        <div className="flex items-center gap-3">
          <img src={coachLogo} alt="Coach Logo" className="h-8 w-8" />
          <span className="font-bold text-xl tracking-tight">Coach</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/auth" className="text-sm font-medium hover:text-primary transition-colors">
            Sign In
          </Link>
          <Button asChild size="sm" className="rounded-full px-6">
            <Link to="/auth">Get Started</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 lg:py-32 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-tight">
            Meet your ultimate <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">Task Companion</span>
          </h1>
          <p className="text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Stop losing track of your goals. Coach combines smart task management with an AI assistant to keep you focused, organized, and ahead of schedule.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Button asChild size="lg" className="rounded-full px-8 h-14 text-lg">
              <Link to="/auth">
                Start for free <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="bg-muted/30 py-24 px-6 lg:px-12 border-t">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-3xl lg:text-4xl font-bold">Everything you need to succeed</h2>
            <p className="text-muted-foreground text-lg">Powerful features designed to supercharge your productivity.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              icon={<CheckCircle2 className="h-6 w-6 text-emerald-500" />}
              title="Smart Tasks"
              description="Organize your day with prioritize lists, due dates, and custom notes."
            />
            <FeatureCard 
              icon={<Bot className="h-6 w-6 text-blue-500" />}
              title="AI Coaching"
              description="Chat with your personal assistant to break down complex goals into actionable steps."
            />
            <FeatureCard 
              icon={<Bell className="h-6 w-6 text-orange-500" />}
              title="Daily Briefings"
              description="Start your morning with a clear overview of what's due today and what's overdue."
            />
            <FeatureCard 
              icon={<Shield className="h-6 w-6 text-purple-500" />}
              title="Secure Platform"
              description="Your data is protected with enterprise-grade security and row-level database policies."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-6 lg:px-12 bg-muted/10 text-center text-muted-foreground">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={coachLogo} alt="Coach Logo" className="h-6 w-6 grayscale opacity-50" />
            <span className="font-semibold">Coach</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/privacy-policy" className="text-sm hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-service" className="text-sm hover:text-foreground transition-colors">Terms of Service</Link>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} Okikes Enterprises. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-background border rounded-2xl p-6 space-y-4 hover:shadow-lg transition-all hover:-translate-y-1 duration-300">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
