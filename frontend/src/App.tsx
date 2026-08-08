import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { LandingPage } from "@/components/pages/LandingPage";
import { Dashboard } from "@/components/pages/Dashboard";
import { NewInvestigation } from "@/components/pages/NewInvestigation";
import { InvestigationDetailPage } from "@/components/pages/InvestigationDetail";
import { Settings } from "@/components/pages/Settings";
import { ReportsPage } from "@/components/pages/ReportsPage";
import { NotFound } from "@/components/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Layout />}>
            <Route index element={<Dashboard />} />
          </Route>

          <Route element={<Layout />}>
            <Route path="/investigations/new" element={<NewInvestigation />} />
            <Route path="/investigations/:investigation_id" element={<InvestigationDetailPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;