import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { 
  Bot, 
  Calendar, 
  Mail, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Sparkles,
  Command
} from "lucide-react";
import coachLogo from "@/assets/coach-logo.png";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate({ to: "/dashboard", replace: true });
      }
    });

    // Listen for auth state changes (catches OAuth redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        if (session.provider_refresh_token) {
          await supabase.rpc('set_google_refresh_token', { 
            token: session.provider_refresh_token 
          });
        }
        navigate({ to: "/dashboard", replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-hidden selection:bg-primary/30">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[150px]" />
      </div>

      {/* Glassmorphic Navbar */}
      <nav className="fixed top-0 inset-x-0 h-16 border-b border-white/10 bg-black/50 backdrop-blur-xl z-50 px-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={coachLogo} alt="Coach Logo" className="h-8 w-8" />
          <span className="font-bold text-xl tracking-tight">Coach</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#how-it-works" className="text-sm font-medium text-white/70 hover:text-white transition-colors hidden sm:block">
            How it works
          </a>
          <a href="#features" className="text-sm font-medium text-white/70 hover:text-white transition-colors hidden sm:block">
            Features
          </a>
          <Link to="/auth" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
            Sign In
          </Link>
          <Button asChild size="sm" className="rounded-full px-6 bg-white text-black hover:bg-white/90">
            <Link to="/auth">Get Started</Link>
          </Button>
        </div>
      </nav>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium mb-8 text-blue-300"
          >
            <Sparkles className="h-4 w-4" />
            <span>Agent-as-a-Service is here</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl lg:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.1]"
          >
            Your personal AI assistant that <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">actually does the work.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-xl text-white/60 max-w-2xl"
          >
            Coach isn't just another to-do list. It's a fully autonomous agent that connects to your Gmail and Calendar to organize your life on autopilot.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <Button asChild size="lg" className="rounded-full px-8 h-14 text-lg bg-white text-black hover:bg-white/90 w-full sm:w-auto">
              <Link to="/auth">
                Deploy your Agent <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-8 h-14 text-lg border-white/20 hover:bg-white/10 w-full sm:w-auto">
              <a href="#how-it-works">See how it works</a>
            </Button>
          </motion.div>

          {/* Hero Image Mockup */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-20 w-full max-w-5xl mx-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-2 shadow-2xl overflow-hidden"
          >
            <div className="rounded-xl border border-white/10 bg-black overflow-hidden flex flex-col h-[400px]">
              <div className="h-10 border-b border-white/10 flex items-center px-4 gap-2 bg-white/5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="p-8 flex-1 flex flex-col items-center justify-center text-white/40 space-y-4">
                <Bot className="h-16 w-16 text-blue-400" />
                <div className="text-xl font-medium text-white/80">"I've read your emails and scheduled 3 meetings for tomorrow."</div>
                <div className="flex gap-2">
                  <div className="px-3 py-1 rounded-full bg-white/10 text-xs flex items-center gap-1"><Mail className="h-3 w-3"/> Gmail Synced</div>
                  <div className="px-3 py-1 rounded-full bg-white/10 text-xs flex items-center gap-1"><Calendar className="h-3 w-3"/> Calendar Synced</div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* How it Works */}
        <section id="how-it-works" className="py-24 px-6 lg:px-12 border-t border-white/5 relative">
          <div className="max-w-6xl mx-auto space-y-16">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight">An assistant with agency.</h2>
              <p className="text-white/60 text-lg">Connect your accounts once, and let the AI handle the rest. Chat naturally to execute complex workflows.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <WorkCard 
                step="01"
                title="Connect Integrations"
                description="Securely link your Google Workspace. We use industry-standard OAuth with strict scopes."
                icon={<ShieldCheck className="h-6 w-6 text-emerald-400" />}
              />
              <WorkCard 
                step="02"
                title="Converse Naturally"
                description="Speak or type your requests. Ask it to summarize emails, draft replies, or shift appointments."
                icon={<Command className="h-6 w-6 text-blue-400" />}
              />
              <WorkCard 
                step="03"
                title="Autonomous Execution"
                description="The agent uses tools to execute tasks across your apps without you lifting a finger."
                icon={<Zap className="h-6 w-6 text-purple-400" />}
              />
            </div>
          </div>
        </section>

        {/* Bento Grid Features */}
        <section id="features" className="py-24 px-6 lg:px-12 border-t border-white/5 bg-white/[0.02]">
          <div className="max-w-6xl mx-auto space-y-16">
            <div className="text-center space-y-4">
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight">Everything you need.</h2>
              <p className="text-white/60 text-lg">Powerful primitives designed for absolute productivity.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[250px]">
              <motion.div 
                whileHover={{ scale: 0.98 }}
                className="col-span-1 md:col-span-2 rounded-3xl border border-white/10 bg-white/5 p-8 flex flex-col justify-end relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Bot className="h-10 w-10 text-blue-400 mb-4" />
                <h3 className="text-2xl font-bold mb-2">Conversational UI</h3>
                <p className="text-white/60">Talk to your tasks. Our AI understands context, intent, and urgency to help you manage your day.</p>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 0.98 }}
                className="col-span-1 rounded-3xl border border-white/10 bg-white/5 p-8 flex flex-col justify-end relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-bl from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CheckCircle2 className="h-10 w-10 text-orange-400 mb-4" />
                <h3 className="text-2xl font-bold mb-2">Smart Tasks</h3>
                <p className="text-white/60">Auto-categorized and prioritized to-dos.</p>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 0.98 }}
                className="col-span-1 rounded-3xl border border-white/10 bg-white/5 p-8 flex flex-col justify-end relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Mail className="h-10 w-10 text-purple-400 mb-4" />
                <h3 className="text-2xl font-bold mb-2">Inbox Triage</h3>
                <p className="text-white/60">Let the AI read, summarize, and draft replies.</p>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 0.98 }}
                className="col-span-1 md:col-span-2 rounded-3xl border border-white/10 bg-white/5 p-8 flex flex-col justify-end relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-tl from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Calendar className="h-10 w-10 text-emerald-400 mb-4" />
                <h3 className="text-2xl font-bold mb-2">Calendar Control</h3>
                <p className="text-white/60">View upcoming events, schedule meetings, and resolve conflicts instantly through chat.</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6 lg:px-12">
          <div className="max-w-5xl mx-auto rounded-[3rem] bg-gradient-to-b from-white/10 to-white/5 border border-white/10 p-12 lg:p-20 text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-blue-500/10 blur-[100px] pointer-events-none" />
            <h2 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6 relative z-10">Stop managing tasks. <br/>Start executing.</h2>
            <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto relative z-10">
              Join the future of personal productivity. Deploy your autonomous agent in seconds.
            </p>
            <Button asChild size="lg" className="rounded-full px-10 h-14 text-lg bg-white text-black hover:bg-white/90 relative z-10">
              <Link to="/auth">Get Started for Free</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6 lg:px-12 bg-black relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src={coachLogo} alt="Coach Logo" className="h-6 w-6 grayscale" />
            <span className="font-semibold text-lg tracking-tight text-white/90">Coach</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6">
            <Link to="/privacy-policy" className="text-sm font-medium text-white/50 hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-service" className="text-sm font-medium text-white/50 hover:text-white transition-colors">Terms of Service</Link>
            <a href="mailto:okikeenterprises@gmail.com" className="text-sm font-medium text-white/50 hover:text-white transition-colors">Contact</a>
          </div>

          <p className="text-sm text-white/40">© {new Date().getFullYear()} Okikes Enterprises.</p>
        </div>
      </footer>
    </div>
  );
}

function WorkCard({ step, title, description, icon }: { step: string, title: string, description: string, icon: React.ReactNode }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          {icon}
        </div>
        <span className="text-5xl font-black text-white/5">{step}</span>
      </div>
      <div>
        <h3 className="text-2xl font-bold mb-3">{title}</h3>
        <p className="text-white/60 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}
