"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Save, Mail, Clock, User } from "lucide-react";

export default function ReportSchedulePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [enabled, setEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [scheduleTime, setScheduleTime] = useState("21:00");

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      const res = await fetch("/api/admin/reports/schedule");
      if (res.ok) {
        const data = await res.json();
        if (data.schedule) {
          setEnabled(data.schedule.enabled);
          setEmailAddress(data.schedule.emailAddress);
          setOwnerName(data.schedule.ownerName);
          setScheduleTime(data.schedule.scheduleTime);
        }
      }
    } catch (error) {
      console.error("Failed to fetch schedule", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (enabled && (!emailAddress || !ownerName || !scheduleTime)) {
      toast.error("Please fill in all fields to enable scheduled reports.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/reports/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled,
          emailAddress,
          ownerName,
          scheduleTime,
        }),
      });

      if (res.ok) {
        toast.success("Schedule configuration saved successfully!");
        router.refresh();
      } else {
        toast.error("Failed to save schedule configuration.");
      }
    } catch (error) {
      toast.error("An error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#A7066A]" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Report Schedule</h1>
        <p className="text-sm text-slate-500">
          Configure the automated daily sales summary email report.
        </p>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Daily Sales Summary</CardTitle>
              <CardDescription>
                Automatically generate and email the daily sales summary (PDF and Excel).
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                checked={enabled} 
                onCheckedChange={setEnabled} 
                className="data-[state=checked]:bg-[#A7066A]"
              />
              <Label className="font-medium">{enabled ? "Enabled" : "Disabled"}</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          
          <div className="space-y-2">
            <Label htmlFor="ownerName" className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-400" />
              Owner Name
            </Label>
            <Input
              id="ownerName"
              placeholder="e.g. John Doe"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              disabled={!enabled}
              className="max-w-md"
            />
            <p className="text-xs text-slate-500">This name will be used in the email greeting.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailAddress" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" />
              Recipient Email Address
            </Label>
            <Input
              id="emailAddress"
              type="email"
              placeholder="e.g. owner@soharpetcenter.com"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              disabled={!enabled}
              className="max-w-md"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduleTime" className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              Delivery Time (24h)
            </Label>
            <Input
              id="scheduleTime"
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              disabled={!enabled}
              className="max-w-[150px]"
            />
            <p className="text-xs text-slate-500">The time of day the automated email will be triggered.</p>
          </div>

        </CardContent>
        <CardFooter className="bg-slate-50 border-t border-slate-100 flex justify-end p-4">
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-[#A7066A] hover:bg-[#8A0558] text-white"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Configuration
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
