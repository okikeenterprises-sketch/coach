import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/terms-of-service")({
  component: TermsOfService,
});

function TermsOfService() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-6 lg:px-12 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        <Button variant="ghost" asChild className="-ml-4 mb-4">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </Link>
        </Button>
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight">Terms of Service</h1>
          <p className="text-muted-foreground">Last Updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <p>
            Please read these terms of service ("Terms", "Terms of Service") carefully before using the Okikes Coach application (the "Service") operated by Okikes Enterprises ("us", "we", or "our").
          </p>

          <h2 className="text-2xl font-bold mt-8">1. Acceptance of Terms</h2>
          <p>
            By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of the terms then you may not access the Service.
          </p>

          <h2 className="text-2xl font-bold mt-8">2. Description of Service</h2>
          <p>
            Okikes Coach is an AI-powered personal task management application. We provide features to help users manage their schedules, chat with an AI assistant, and integrate with third-party platforms such as Google.
          </p>

          <h2 className="text-2xl font-bold mt-8">3. Accounts</h2>
          <p>
            When you create an account with us, you must provide us with information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
          </p>

          <h2 className="text-2xl font-bold mt-8">4. Google API Integration</h2>
          <p>
            Our Service may allow you to integrate with Google APIs (e.g., Gmail, Google Calendar). By choosing to integrate, you grant us permission to access your Google account data as described in our <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>. You can revoke this access at any time through your Google Account permissions page.
          </p>

          <h2 className="text-2xl font-bold mt-8">5. Intellectual Property</h2>
          <p>
            The Service and its original content, features and functionality are and will remain the exclusive property of Okikes Enterprises and its licensors.
          </p>

          <h2 className="text-2xl font-bold mt-8">6. Termination</h2>
          <p>
            We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
          </p>

          <h2 className="text-2xl font-bold mt-8">7. Limitation of Liability</h2>
          <p>
            In no event shall Okikes Enterprises, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
          </p>

          <h2 className="text-2xl font-bold mt-8">8. Changes</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. What constitutes a material change will be determined at our sole discretion.
          </p>

          <h2 className="text-2xl font-bold mt-8">9. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us at <strong>okikeenterprises@gmail.com</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
