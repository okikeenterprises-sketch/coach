import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [displayName, setDisplayName] = useState("");
  const [pushTime, setPushTime] = useState("08:00");
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [pushPerm, setPushPerm] = useState<NotificationPermission>("default");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
      if (prof) {
        setDisplayName(prof.display_name ?? "");
        setPushTime(prof.push_time);
        setEmailEnabled(prof.email_enabled);
      }
    });
    if (typeof Notification !== "undefined") setPushPerm(Notification.permission);
  }, []);

  async function save() {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: u.user.id, display_name: displayName, push_time: pushTime, email_enabled: emailEnabled });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Saved");
  }

  async function requestPush() {
    if (typeof Notification === "undefined") {
      toast.error("Notifications not supported in this browser");
      return;
    }
    const p = await Notification.requestPermission();
    setPushPerm(p);
    if (p === "granted") {
      new Notification("Coach is ready", { body: "I'll nudge you about tasks here." });
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Tune Coach to your liking.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Display name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Daily nudge time</Label>
            <Input type="time" value={pushTime} onChange={(e) => setPushTime(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              While Coach is open in this browser, you'll get a notification at this time with your day's summary.
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 pt-2">
            <div>
              <Label>Browser notifications</Label>
              <p className="text-xs text-muted-foreground">Permission: {pushPerm}</p>
            </div>
            <Button variant="outline" onClick={requestPush} disabled={pushPerm === "granted"}>
              {pushPerm === "granted" ? "Enabled" : "Enable"}
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label>Email reminders</Label>
              <p className="text-xs text-muted-foreground">Daily digest to your inbox (coming soon).</p>
            </div>
            <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
    </div>
  );
}
