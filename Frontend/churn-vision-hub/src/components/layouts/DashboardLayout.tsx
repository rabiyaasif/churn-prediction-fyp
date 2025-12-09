import { useState, useEffect } from "react";
import { Outlet, useLocation, NavLink, useNavigate } from "react-router-dom";
import { getClientProfile } from "@/services/analysis";

import { 
  BarChart3, Compass, AlertTriangle, Users, 
  FileText, Settings, Book, Shield, User,
  ChevronDown, Menu, X, Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const sidebarItems = [
  { title: "Dashboard", icon: BarChart3, path: "/dashboard", badge: null },
  // { title: "Event Explorer", icon: Compass, path: "/events", badge: null },
  { title: "Event Explorer", icon: Compass, path: "/dashboard/events", badge: null },

  { title: "Churn Prediction", icon: AlertTriangle, path: "/dashboard/churn", badge: "12" },
  { title: "Customer Profiles", icon: Users, path: "/dashboard/customers", badge: null },
  { title: "Bulk Upload", icon: Upload, path: "/dashboard/bulk-upload", badge: null },
  { title: "Reports", icon: FileText, path: "/dashboard/reports", badge: null },
  { title: "Settings", icon: Settings, path: "/dashboard/settings", badge: null },
];

const bottomItems = [
  { title: "API Documentation", icon: Book, path: "/docs", badge: null },
  // { title: "Admin Panel", icon: Shield, path: "/admin", badge: null, adminOnly: true },
];

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clientName, setClientName] = useState("Loading...");
  const [clientEmail, setClientEmail] = useState("Loading...");
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  // Load client profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await getClientProfile();
        setClientName(profile.name || "User");
        setClientEmail(profile.email || "");
      } catch (err: any) {
        console.error("Failed to load profile:", err);
        setClientName("User");
        setClientEmail("");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("api_key");
    localStorage.removeItem("client_id");
    // console.log("Logging out, going to Landing...");
    navigate("/", { replace: true }); // ✅ Redirects to Landing.tsx
  };


  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-dashboard">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-sidebar text-sidebar-foreground
        transition-transform duration-300 ease-smooth shadow-sidebar
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-6 border-b border-sidebar-border">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">ChurnPredict</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col p-4 space-y-1">
          {sidebarItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={`
                flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium
                transition-colors duration-200 group
                ${isActive(item.path) 
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }
              `}
            >
              <div className="flex items-center space-x-3">
                <item.icon className="w-4 h-4" />
                <span>{item.title}</span>
              </div>
              {item.badge && (
                <Badge variant="secondary" className="text-xs">
                  {item.badge}
                </Badge>
              )}
            </NavLink>
          ))}

          {/* Divider */}
          <div className="border-t border-sidebar-border my-4" />

          {bottomItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={`
                flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium
                transition-colors duration-200
                ${isActive(item.path) 
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }
              `}
            >
              <div className="flex items-center space-x-3">
                <item.icon className="w-4 h-4" />
                <span>{item.title}</span>
              </div>
            </NavLink>
          ))}
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start space-x-3 text-sidebar-foreground hover:bg-sidebar-accent">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{loading ? "Loading..." : clientName}</p>
                  <p className="text-xs text-sidebar-foreground/70">{loading ? "" : clientEmail || "No email"}</p>
                </div>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleLogout}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Bar */}
        <header className="bg-card border-b border-card-border sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="space-x-2">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <User className="w-3 h-3 text-primary-foreground" />
                    </div>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleLogout}>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}