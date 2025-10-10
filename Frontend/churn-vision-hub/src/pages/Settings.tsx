// src/pages/Settings.tsx
"use client";

import { useMemo, useState } from "react";
import {
  Settings as SettingsIcon,
  Users, Shield, Key, CreditCard, Cloud, TestTube,
  Copy, Eye, EyeOff, Trash2, Plus, Crown, LockKeyhole,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

/** tiny helpers */
const mask = (s: string) => "•".repeat(Math.max(16, s.length));
const today = () => new Date().toISOString().slice(0, 10);

type Member = { name: string; email: string; role: "Admin" | "Editor" | "Viewer"; avatar: string };
type Tab = "profile" | "organization" | "api-keys" | "billing" | "credentials";

export default function Settings() {
  /** flash notice */
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const flash = (text: string, kind: "ok" | "err" = "ok") => {
    setNotice({ kind, text });
    setTimeout(() => setNotice(null), 2200);
  };

  /** tabs */
  const [tab, setTab] = useState<Tab>("profile");

  /** profile */
  const [firstName, setFirstName] = useState("John");
  const [lastName, setLastName] = useState("Doe");
  const [email, setEmail] = useState("john.doe@company.com");

  /** org */
  const [orgName, setOrgName] = useState("CloudFlow Technologies");
  const [members, setMembers] = useState<Member[]>([
    { name: "John Doe",  email: "john.doe@company.com",  role: "Admin",  avatar: "JD" },
    { name: "Jane Smith", email: "jane.smith@company.com", role: "Editor", avatar: "JS" },
    { name: "Mike Johnson", email: "mike.johnson@company.com", role: "Viewer", avatar: "MJ" },
  ]);

  /** api keys */
  const [keys, setKeys] = useState(
    [
      { id: "1", name: "Production API Key", key: "cf_prod_1234567890abcdef", created: "2025-01-15", lastUsed: "2025-08-12" },
      { id: "2", name: "Development API Key", key: "cf_dev_abcdef1234567890", created: "2025-01-10", lastUsed: "2025-08-15" },
    ] as { id: string; name: string; key: string; created: string; lastUsed: string }[]
  );
  const [reveal, setReveal] = useState<Record<string, boolean>>({});

  /** billing */
  const [billingCompany, setBillingCompany] = useState("CloudFlow Technologies");
  const [billingCountry, setBillingCountry] = useState("us");
  const [billingAddress, setBillingAddress] = useState("123 Main Street");
  const [emailReceipts, setEmailReceipts] = useState(true);

  /** credentials */
  const [provider, setProvider] = useState<"aws" | "azure" | "gcp">("aws");
  // aws
  const [awsAccessKey, setAwsAccessKey] = useState("");
  const [awsSecretKey, setAwsSecretKey] = useState("");
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  // azure
  const [azureClientId, setAzureClientId] = useState("");
  const [azureSecret, setAzureSecret] = useState("");
  const [azureTenant, setAzureTenant] = useState("");
  // gcp
  const [gcpProjectId, setGcpProjectId] = useState("");
  const [gcpJson, setGcpJson] = useState("");

  /** actions */
  const save = (section: string) => flash(`Saved ${section}.`);
  const copy = async (v: string, label = "Copied") => {
    try {
      await navigator.clipboard.writeText(v);
      flash(label);
    } catch {
      flash("Copy failed", "err");
    }
  };
  const generateKey = () => {
    const id = crypto.randomUUID();
    const rand = Math.random().toString(36).slice(2, 10);
    const key = `cf_${rand}_${Date.now()}`;
    setKeys((k) => [{ id, name: "New API Key", key, created: today(), lastUsed: "—" }, ...k]);
    flash("New API key generated");
  };
  const testConnection = () => {
    // stub: wire to backend later
    flash(`Verified ${provider.toUpperCase()} credentials.`);
  };

  /** small tab button */
  const TabBtn = ({ v, children }: { v: Tab; children: React.ReactNode }) => (
    <Button
      variant={tab === v ? "secondary" : "ghost"}
      onClick={() => setTab(v)}
      className={`inline-flex items-center gap-2 ${tab === v ? "bg-orange-50 text-orange-700 hover:bg-orange-100" : ""}`}
    >
      {children}
    </Button>
  );

  return (
    <div className="p-6 space-y-6">
      {/* header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6 text-orange-600" />
          <h1 className="text-2xl font-semibold">Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage your account, organization, keys, billing, and cloud connections.
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

      {/* tabs strip */}
      <Card>
        <CardContent className="flex flex-wrap gap-2 p-3">
          <TabBtn v="profile"><Users className="h-4 w-4" /> Profile</TabBtn>
          <TabBtn v="organization"><Shield className="h-4 w-4" /> Organization</TabBtn>
          <TabBtn v="api-keys"><Key className="h-4 w-4" /> API Keys</TabBtn>
          <TabBtn v="billing"><CreditCard className="h-4 w-4" /> Billing</TabBtn>
          <TabBtn v="credentials"><Cloud className="h-4 w-4" /> Cloud Credentials</TabBtn>
        </CardContent>
      </Card>

      {/* PANEL CONTENT */}
      <div className="space-y-6">
        {/* PROFILE */}
        {tab === "profile" && (
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* avatar */}
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-gray-100 text-lg font-semibold text-gray-600">
                  JD
                </div>
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="avatar"
                    className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <input id="avatar" type="file" className="hidden" />
                    Change Avatar
                  </Label>
                  <p className="text-xs text-muted-foreground">JPG/PNG/GIF up to 5MB</p>
                </div>
              </div>

              {/* fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first">First name</Label>
                  <Input id="first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last">Last name</Label>
                  <Input id="last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>

              {/* password */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="curr-pass">Current password</Label>
                  <Input id="curr-pass" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-pass">New password</Label>
                  <Input id="new-pass" type="password" />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => save("profile")}>Save changes</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ORGANIZATION */}
        {tab === "organization" && (
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="org">Organization name</Label>
                <Input id="org" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Team members</h3>
                  <p className="text-xs text-muted-foreground">Manage roles & invites</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    const name = prompt("Member name?");
                    const email = name ? prompt("Member email?") : null;
                    if (!name || !email) return;
                    setMembers((arr) => [
                      ...arr,
                      { name, email, role: "Viewer", avatar: (name.split(" ").map(s=>s[0]).join("") || "U").slice(0,2).toUpperCase() },
                    ]);
                    flash("Invitation created");
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Invite
                </Button>
              </div>

              <div className="space-y-3">
                {members.map((m, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                        {m.avatar}
                      </div>
                      <div>
                        <p className="font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        m.role === "Admin" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
                      }`}>
                        {m.role === "Admin" && <Crown className="mr-1 inline h-3 w-3" />}
                        {m.role}
                      </span>
                      <select
                        className="rounded-md border px-2 py-1 text-sm"
                        value={m.role}
                        onChange={(e) => {
                          const role = e.target.value as Member["role"];
                          setMembers((arr) => arr.map((x, idx) => (idx === i ? { ...x, role } : x)));
                        }}
                      >
                        <option>Admin</option>
                        <option>Editor</option>
                        <option>Viewer</option>
                      </select>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setMembers((arr) => arr.filter((_, idx) => idx !== i))}
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button onClick={() => save("organization")}>Save changes</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* API KEYS */}
        {tab === "api-keys" && (
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Your keys</h3>
                  <p className="text-xs text-muted-foreground">Rotate regularly and keep them secret.</p>
                </div>
                <Button variant="outline" onClick={generateKey}>
                  <Plus className="h-4 w-4 mr-1" />
                  Generate key
                </Button>
              </div>

              <div className="space-y-4">
                {keys.map((k) => (
                  <div key={k.id} className="space-y-2 rounded-md border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{k.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Created: {k.created} • Last used: {k.lastUsed}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setReveal((r) => ({ ...r, [k.id]: !r[k.id] }))}
                          title={reveal[k.id] ? "Hide" : "Show"}
                        >
                          {reveal[k.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => copy(k.key, "API key copied")} title="Copy">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Delete this API key? Apps using it will stop working.")) {
                              setKeys((arr) => arr.filter((x) => x.id !== k.id));
                              flash("API key deleted");
                            }
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-md bg-gray-50 p-2 font-mono text-sm">
                      {reveal[k.id] ? k.key : mask(k.key)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* BILLING */}
        {tab === "billing" && (
          <Card>
            <CardHeader>
              <CardTitle>Billing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-md border border-orange-200 bg-orange-50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-orange-700">Pro Plan</h3>
                    <p className="text-xs text-orange-700/80">Advanced features for growing teams</p>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-xl font-bold text-orange-800">$29</span>
                      <span className="text-xs text-orange-700/80">/month</span>
                    </div>
                  </div>
                  <span className="rounded-full bg-orange-600 px-3 py-1 text-xs font-medium text-white">Current plan</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" value={billingCompany} onChange={(e) => setBillingCompany(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <select
                    id="country"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={billingCountry}
                    onChange={(e) => setBillingCountry(e.target.value)}
                  >
                    <option value="us">United States</option>
                    <option value="ca">Canada</option>
                    <option value="uk">United Kingdom</option>
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="addr">Address</Label>
                  <Input id="addr" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded bg-teal-600 text-white">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">•••• •••• •••• 4242</p>
                    <p className="text-xs text-muted-foreground">Expires 12/25</p>
                  </div>
                </div>
                <Button variant="outline">Update</Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch id="emailReceipts" checked={emailReceipts} onCheckedChange={setEmailReceipts} />
                  <Label htmlFor="emailReceipts">Email me receipts and billing updates</Label>
                </div>
                <Button onClick={() => save("billing")}>Save changes</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CREDENTIALS */}
        {tab === "credentials" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Cloud Credentials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* provider chips */}
                <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
                  <Button
                    variant={provider === "aws" ? "secondary" : "outline"}
                    onClick={() => setProvider("aws")}
                  >
                    <Cloud className="h-4 w-4 mr-2" /> AWS
                  </Button>
                  <Button
                    variant={provider === "azure" ? "secondary" : "outline"}
                    onClick={() => setProvider("azure")}
                  >
                    <Cloud className="h-4 w-4 mr-2" /> Azure
                  </Button>
                  <Button
                    variant={provider === "gcp" ? "secondary" : "outline"}
                    onClick={() => setProvider("gcp")}
                  >
                    <Cloud className="h-4 w-4 mr-2" /> GCP
                  </Button>

                  <div className="ml-auto flex items-center gap-2">
                    <Button variant="outline" onClick={testConnection}>
                      <TestTube className="h-4 w-4 mr-2" />
                      Test connection
                    </Button>
                    <Button onClick={() => save("cloud credentials")}>Save</Button>
                  </div>
                </div>

                {/* forms */}
                {provider === "aws" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="aws-ak">Access Key ID</Label>
                      <Input id="aws-ak" value={awsAccessKey} onChange={(e) => setAwsAccessKey(e.target.value)} placeholder="AKIA..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="aws-sk">Secret Access Key</Label>
                      <Input id="aws-sk" type="password" value={awsSecretKey} onChange={(e) => setAwsSecretKey(e.target.value)} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="aws-region">Default Region</Label>
                      <Input id="aws-region" value={awsRegion} onChange={(e) => setAwsRegion(e.target.value)} placeholder="us-east-1" />
                    </div>
                    <p className="col-span-full rounded-md border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800">
                      <LockKeyhole className="mr-1 inline h-4 w-4" />
                      Keys are encrypted at rest. Prefer scoped IAM users with least privilege.
                    </p>
                  </div>
                )}

                {provider === "azure" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="az-client">Client ID</Label>
                      <Input id="az-client" value={azureClientId} onChange={(e) => setAzureClientId(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="az-secret">Client Secret</Label>
                      <Input id="az-secret" type="password" value={azureSecret} onChange={(e) => setAzureSecret(e.target.value)} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="az-tenant">Tenant ID</Label>
                      <Input id="az-tenant" value={azureTenant} onChange={(e) => setAzureTenant(e.target.value)} />
                    </div>
                  </div>
                )}

                {provider === "gcp" && (
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gcp-project">Project ID</Label>
                      <Input id="gcp-project" value={gcpProjectId} onChange={(e) => setGcpProjectId(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gcp-json">Service Account JSON</Label>
                      <textarea
                        id="gcp-json"
                        className="min-h-[96px] w-full rounded-md border px-3 py-2 text-sm"
                        value={gcpJson}
                        onChange={(e) => setGcpJson(e.target.value)}
                        placeholder='{"type":"service_account",...}'
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Danger zone */}
            <Card>
              <CardHeader>
                <CardTitle>Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between rounded-md border p-4">
                  <div>
                    <p className="font-medium">Delete workspace</p>
                    <p className="text-xs text-muted-foreground">This will permanently remove this workspace and its data.</p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (confirm("Delete this workspace? This cannot be undone.")) {
                        flash("Workspace deleted");
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
