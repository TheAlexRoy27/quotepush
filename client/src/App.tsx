import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import LeadsPage from "./pages/LeadsPage";
import TemplatePage from "./pages/TemplatePage";
import SettingsPage from "./pages/SettingsPage";
import WebhookPage from "./pages/WebhookPage";
import LibraryPage from "./pages/LibraryPage";
import DashboardLayout from "./components/DashboardLayout";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path={"/"} component={LeadsPage} />
        <Route path={"/leads"} component={LeadsPage} />
        <Route path={"/template"} component={TemplatePage} />
        <Route path={"/settings"} component={SettingsPage} />
        <Route path={"/webhook"} component={WebhookPage} />
        <Route path={"/library"} component={LibraryPage} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
