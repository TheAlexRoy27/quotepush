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
import AuthPage from "./pages/AuthPage";
import BillingPage from "./pages/BillingPage";
import OrgPage from "./pages/OrgPage";
import OnboardingPage from "./pages/OnboardingPage";
import AcceptInvitePage from "./pages/AcceptInvitePage";
import AdminPage from "./pages/AdminPage";
import DripPage from "./pages/DripPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import OwnerLoginPage from "./pages/OwnerLoginPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import KeywordPromotionPage from "./pages/KeywordPromotionPage";
import ReferralPage from "./pages/ReferralPage";

function Router() {
  return (
    <Switch>
      <Route path={"/auth"} component={AuthPage} />
      <Route path={"/onboarding"} component={OnboardingPage} />
      <Route path={"/invite/:token"} component={AcceptInvitePage} />
      <Route path={"/admin"} component={AdminPage} />
      <Route path={"/owner-login"} component={OwnerLoginPage} />
      <Route path={"/terms"} component={TermsPage} />
      <Route path={"/privacy"} component={PrivacyPage} />
      <Route>
        <DashboardLayout>
          <Switch>
            <Route path={"/"} component={LeadsPage} />
            <Route path={"/leads"} component={LeadsPage} />
            <Route path={"/template"} component={TemplatePage} />
            <Route path={"/settings"} component={SettingsPage} />
            <Route path={"/webhook"} component={WebhookPage} />
            <Route path={"/library"} component={LibraryPage} />
            <Route path={"/drip"} component={DripPage} />
            <Route path={"/analytics"} component={AnalyticsPage} />
            <Route path={"/billing"} component={BillingPage} />
            <Route path={"/organization"} component={OrgPage} />
            <Route path={"/keyword-promotion"} component={KeywordPromotionPage} />
            <Route path={"/referrals"} component={ReferralPage} />
            <Route path={"/404"} component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </DashboardLayout>
      </Route>
    </Switch>
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
