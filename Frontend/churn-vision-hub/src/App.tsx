import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Dashboard from "./pages/Dashboard";
import EventExplorer from "./pages/EventExplorer"; // adjust path if needed
import ChurnPrediction from "./pages/ChurnPrediction";
import CustomerProfile from "./pages/CustomerProfile";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import BulkUpload from "./pages/BulkUpload";
import OnboardingIntro from "./pages/onboarding/Intro";
import Documentation from "./pages/Documentation";
import { DashboardLayout } from "./components/layouts/DashboardLayout";
import { OnboardingLayout } from "./components/layouts/OnboardingLayout";
import NotFound from "./pages/NotFound";



const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/docs" element={<Documentation />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Onboarding routes */}
          <Route path="/onboarding" element={<OnboardingLayout />}>
            <Route path="intro" element={<OnboardingIntro />} />
            <Route path="api-key" element={<div>API Key setup coming soon</div>} />
            <Route path="tracking" element={<div>Tracking setup coming soon</div>} />
            <Route path="test" element={<div>Test events coming soon</div>} />
            <Route path="next" element={<div>Next steps coming soon</div>} />
          </Route>
          
          {/* Dashboard routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            {/* <Route path="events" element={<div>Event Explorer coming soon</div>} /> */}
            <Route path="events" element={<EventExplorer />} />
            <Route path="churn" element={<ChurnPrediction />} />
            <Route path="customers" element={<CustomerProfile/>} />
            <Route path="bulk-upload" element={<BulkUpload/>} />
            <Route path="reports" element={<Reports/>} />
            <Route path="settings" element={<Settings/>} />
          </Route>
          
          {/* Documentation routes */}
          <Route path="/docs" element={<div>API Documentation coming soon</div>} />
          {/* <Route path="/admin" element={<div>Admin Panel coming soon</div>} /> */}
          
          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
