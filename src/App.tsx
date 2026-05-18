import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import TrialShare from "./pages/TrialShare.tsx";
import Trial from "./pages/Trial.tsx";
import About from "./pages/About.tsx";
import PartyNew from "./pages/PartyNew.tsx";
import Room from "./pages/Room.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner position="top-center" richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<About />} />
          <Route path="/t/:slug" element={<Trial />} />
          <Route path="/t/:slug/share" element={<TrialShare />} />
          <Route path="/party/new" element={<PartyNew />} />
          <Route path="/r/:code" element={<Room />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
