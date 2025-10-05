import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import DashboardPage from "@/pages/dashboard-page";
import AuthPage from "@/pages/auth-page";
import TimeEntriesPage from "@/pages/time-entries-page";
import TopicsPage from "@/pages/topics-page";
import ReportsPage from "@/pages/reports-page";
import SettingsPage from "@/pages/settings-page";
import TeamsPage from "@/pages/teams-page";
import TeamStatsPage from "@/pages/team-stats-page";
import AddDirectMemberPage from "@/pages/add-direct-member";
import InvitationHandlerPage from "@/pages/invitation-handler-page";
import SuggestionsPage from "@/pages/suggestions-page";
import InsightsPage from "@/pages/insights-page";
import { ThemeProvider } from "@/components/theme-provider";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/time-entries" component={TimeEntriesPage} />
      <ProtectedRoute path="/topics" component={TopicsPage} />
      <ProtectedRoute path="/insights" component={InsightsPage} />
      <ProtectedRoute path="/reports" component={ReportsPage} />
      <ProtectedRoute path="/teams" component={TeamsPage} />
      <ProtectedRoute path="/teams/:teamId/stats" component={TeamStatsPage} />
      <ProtectedRoute path="/suggestions" component={SuggestionsPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/teams/:teamId/add-member" component={AddDirectMemberPage} />
      {/* הגדרת כל נתיבי ההזמנות האפשריים */}
      <Route path="/invitations/:token" component={InvitationHandlerPage} />
      <Route path="/accept-invitation/:token" component={InvitationHandlerPage} />
      <Route path="/invitation/:token" component={InvitationHandlerPage} />
      {/* נתיב כללי שיתפוס הכל */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;