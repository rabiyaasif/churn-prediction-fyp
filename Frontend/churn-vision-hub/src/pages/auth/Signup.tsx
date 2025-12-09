import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Eye, EyeOff, CheckCircle } from "lucide-react";

export default function Signup() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    email: "",
    password: "",
    websiteUrl: "",
    domain: ""
  });
  const [errors, setErrors] = useState({
    businessName: "",
    email: "",
    password: "",
    websiteUrl: "",
    domain: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset errors
    const newErrors = {
      businessName: "",
      email: "",
      password: "",
      websiteUrl: "",
      domain: ""
    };

    // Validate all fields
    let hasErrors = false;
    if (!formData.businessName || !formData.businessName.trim()) {
      newErrors.businessName = "Business name is required";
      hasErrors = true;
    }
    if (!formData.email || !formData.email.trim()) {
      newErrors.email = "Email is required";
      hasErrors = true;
    }
    if (!formData.domain || !formData.domain.trim()) {
      newErrors.domain = "Domain is required";
      hasErrors = true;
    }
    if (!formData.websiteUrl || !formData.websiteUrl.trim()) {
      newErrors.websiteUrl = "Website URL is required";
      hasErrors = true;
    }
    if (!formData.password || !formData.password.trim()) {
      newErrors.password = "Password is required";
      hasErrors = true;
    }

    if (hasErrors) {
      setErrors(newErrors);
      return;
    }

    // Clear errors if validation passes
    setErrors({ businessName: "", email: "", password: "", websiteUrl: "", domain: "" });

    try {
      const response = await fetch("http://localhost:8000/clients/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: formData.businessName, // map your form fields
          email: formData.email,
          domain: formData.domain, // assuming this is the domain
          password: formData.password,
          url: formData.websiteUrl
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      localStorage.setItem("api_key", data.api_key);
      localStorage.setItem("client_id", data.client_id);
      console.log("Signup successful:", data);

      // Redirect to documentation
      console.log("Redirecting to /docs...");
      window.location.href = "/docs";

    } catch (error) {
      console.error("Signup failed:", error);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-dashboard flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">ChurnPredict</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Create your account</h1>
          <p className="text-muted-foreground">Start predicting and preventing churn today</p>
        </div>

        <Card className="shadow-card-hover">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Get started for free</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  type="text"
                  placeholder="Your Company Inc."
                  value={formData.businessName}
                  onChange={(e) => {
                    setFormData({ ...formData, businessName: e.target.value });
                    if (errors.businessName) {
                      setErrors({ ...errors, businessName: "" });
                    }
                  }}
                  className={errors.businessName ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.businessName && (
                  <p className="text-sm text-destructive mt-1">{errors.businessName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email) {
                      setErrors({ ...errors, email: "" });
                    }
                  }}
                  className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  type="text"
                  placeholder="Pet Store"
                  value={formData.domain}
                  onChange={(e) => {
                    setFormData({ ...formData, domain: e.target.value });
                    if (errors.domain) {
                      setErrors({ ...errors, domain: "" });
                    }
                  }}
                  className={errors.domain ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.domain && (
                  <p className="text-sm text-destructive mt-1">{errors.domain}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="websiteUrl">Website URL</Label>
                <Input
                  id="websiteUrl"
                  type="url"
                  placeholder="https://yourcompany.com"
                  value={formData.websiteUrl}
                  onChange={(e) => {
                    setFormData({ ...formData, websiteUrl: e.target.value });
                    if (errors.websiteUrl) {
                      setErrors({ ...errors, websiteUrl: "" });
                    }
                  }}
                  className={errors.websiteUrl ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.websiteUrl && (
                  <p className="text-sm text-destructive mt-1">{errors.websiteUrl}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      if (errors.password) {
                        setErrors({ ...errors, password: "" });
                      }
                    }}
                    className={errors.password ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive mt-1">{errors.password}</p>
                )}
              </div>

              <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
                Create Account
              </Button>
            </form>

            <div className="mt-6 space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">What you get</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-muted-foreground">14-day free trial</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-muted-foreground">Unlimited customer tracking</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-muted-foreground">AI-powered predictions</span>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <span className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          By creating an account, you agree to our{" "}
          <a href="#" className="text-primary hover:underline">Terms of Service</a> and{" "}
          <a href="#" className="text-primary hover:underline">Privacy Policy</a>
        </div>
      </div>
    </div>
  );
}