// src/pages/Settings.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Users,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getClientProfile, updateClientProfile } from "@/services/analysis";

export default function Settings() {
  /** flash notice */
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const flash = (text: string, kind: "ok" | "err" = "ok") => {
    setNotice({ kind, text });
    setTimeout(() => setNotice(null), 2200);
  };

  /** profile */
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  // Store original values to detect changes
  const [originalFirstName, setOriginalFirstName] = useState("");
  const [originalLastName, setOriginalLastName] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");

  /** Load profile on mount */
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const profile = await getClientProfile();
        
        // Split name into first and last name if it contains a space
        const nameParts = profile.name ? profile.name.split(" ") : [];
        if (nameParts.length > 1) {
          setFirstName(nameParts.slice(0, -1).join(" "));
          setLastName(nameParts[nameParts.length - 1]);
          setOriginalFirstName(nameParts.slice(0, -1).join(" "));
          setOriginalLastName(nameParts[nameParts.length - 1]);
        } else if (nameParts.length === 1) {
          setFirstName(nameParts[0]);
          setLastName("");
          setOriginalFirstName(nameParts[0]);
          setOriginalLastName("");
        }
        
        setEmail(profile.email || "");
        setOriginalEmail(profile.email || "");
      } catch (err: any) {
        console.error("Failed to load profile:", err);
        flash(err?.message || "Failed to load profile", "err");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  /** Save profile */
  const saveProfile = async () => {
    try {
      setSaving(true);
      
      // Check if there are any changes in non-password fields
      const hasNameChange = firstName.trim() !== originalFirstName || lastName.trim() !== originalLastName;
      const hasEmailChange = email.trim() !== originalEmail;
      
      // Check if password fields are both filled (optional)
      const hasPasswordChange = currentPassword.trim() !== "" && newPassword.trim() !== "";
      
      // If no changes in name/email AND no password change, don't save
      if (!hasNameChange && !hasEmailChange && !hasPasswordChange) {
        flash("No changes to save", "err");
        return;
      }
      
      // Only validate password if BOTH fields are provided
      if (hasPasswordChange) {
        if (newPassword.length < 6) {
          flash("New password must be at least 6 characters", "err");
          return;
        }
      }
      
      // If only one password field is filled, ignore it (don't show error, just don't include it)
      // Build update payload
      const updateData: any = {};
      
      // Only include fields that have changed
      if (hasNameChange) {
        updateData.first_name = firstName.trim();
        updateData.last_name = lastName.trim();
      }
      
      if (hasEmailChange) {
        updateData.email = email.trim();
      }
      
      // Only include password if both fields are provided
      if (hasPasswordChange) {
        updateData.current_password = currentPassword;
        updateData.new_password = newPassword;
      }
      
      // Update profile
      const updatedProfile = await updateClientProfile(updateData);
      
      // Update original values
      const nameParts = updatedProfile.name ? updatedProfile.name.split(" ") : [];
      if (nameParts.length > 1) {
        setOriginalFirstName(nameParts.slice(0, -1).join(" "));
        setOriginalLastName(nameParts[nameParts.length - 1]);
      } else if (nameParts.length === 1) {
        setOriginalFirstName(nameParts[0]);
        setOriginalLastName("");
      }
      setOriginalEmail(updatedProfile.email || "");
      
      flash("Profile updated successfully");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      flash(err?.message || "Failed to update profile", "err");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6 text-orange-600" />
          <h1 className="text-2xl font-semibold">Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage your account settings.
        </p>
      </div>

      {/* notice */}
      {notice && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            notice.kind === "ok"
              ? "border-teal-200 bg-teal-50 text-teal-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {notice.text}
        </div>
      )}

        {/* PROFILE */}
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading profile...</p>
                </div>
          ) : (
            <>
              {/* fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first">First name</Label>
                  <Input 
                    id="first" 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last">Last name</Label>
                  <Input 
                    id="last" 
                    value={lastName} 
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* password */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="curr-pass">Current password (optional)</Label>
                  <Input 
                    id="curr-pass" 
                    type="password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={saving}
                    placeholder="Only required if changing password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-pass">New password (optional)</Label>
                  <Input 
                    id="new-pass" 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={saving}
                    placeholder="Only required if changing password"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={saveProfile}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </>
                )}
              </CardContent>
            </Card>
    </div>
  );
}
