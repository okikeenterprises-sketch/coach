import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/privacy-policy")({
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-6 lg:px-12 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        <Button variant="ghost" asChild className="-ml-4 mb-4">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </Link>
        </Button>
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
          <p className="text-muted-foreground">Last Updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <p>
            Welcome to Okikes Coach ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy.
            This Privacy Policy explains how we collect, use, and share your information when you use our website and application.
          </p>

          <h2 className="text-2xl font-bold mt-8">1. Information We Collect</h2>
          <p>We collect information that you provide to us directly, including:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Account Information:</strong> When you register, we collect your name, email address, and authentication credentials.</li>
            <li><strong>Tasks and Chat Data:</strong> We store the tasks you create, your chat history with the AI assistant, and your notes to provide our service.</li>
            <li><strong>Google User Data:</strong> If you authorize Google Integrations, we securely access data via Google APIs as described below.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-8">2. Use of Google User Data (Restricted Scopes)</h2>
          <p>
            Our application requests access to sensitive Google APIs (Gmail and Google Calendar) to act as your intelligent personal assistant. We strictly adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-primary hover:underline">Google API Services User Data Policy</a>, including the Limited Use requirements.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Calendar Access:</strong> We read and create calendar events strictly to help you manage your schedule and respond to your direct queries in the AI chat.</li>
            <li><strong>Gmail Access:</strong> We read and send emails on your behalf strictly when you instruct the AI assistant to perform these actions.</li>
            <li><strong>Limited Use:</strong> Our use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements. We do not use your Google data for targeted advertising, nor do we sell it to third parties.</li>
            <li><strong>Data Retention & Deletion:</strong> Your Google OAuth tokens are stored securely and encrypted. We do not permanently store your email contents; they are fetched temporarily during chat sessions. You can revoke access at any time from your Google Account settings, which will delete our access tokens.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-8">3. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide, operate, and maintain our application.</li>
            <li>Process and fulfill the commands you give the AI assistant.</li>
            <li>Improve, personalize, and expand our services.</li>
            <li>Communicate with you for customer support and updates.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-8">4. Sharing Your Information</h2>
          <p>
            We only share your information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations. We use third-party AI models to process your chat messages; however, your sensitive Google User Data (like emails) is only sent to the AI when explicitly required to answer your query.
          </p>

          <h2 className="text-2xl font-bold mt-8">5. Security of Your Information</h2>
          <p>
            We implement appropriate technical and organizational security measures designed to protect the security of any personal information we process. Data in our database is protected by Row Level Security (RLS) policies ensuring isolation between users.
          </p>

          <h2 className="text-2xl font-bold mt-8">6. Contact Us</h2>
          <p>
            If you have questions or comments about this notice, you may email us at <strong>okikeenterprises@gmail.com</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
