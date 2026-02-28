import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Explorer from "./pages/Explorer";
import Gauntlet from "./pages/Gauntlet";
import GauntletPlay from "./pages/GauntletPlay";
import Feed from "./pages/Feed";
import Conversation from "./pages/Conversation";
import Results from "./pages/Results";
import LanguageSelect from "./pages/LanguageSelect";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/modes/explorer" element={<Feed />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/modes/gauntlet" element={<Gauntlet />} />
            <Route path="/gauntlet/play" element={<GauntletPlay />} />
            <Route path="/scenario/:id" element={<Conversation />} />
            <Route path="/results" element={<Results />} />
            <Route path="/language-select" element={<LanguageSelect />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
