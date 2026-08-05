import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import Boa5RouteTransition from "./components/Boa5RouteTransition";
import LocaleSuggestionBanner from "./components/LocaleSuggestionBanner";
import { LocaleProvider, useLocale } from "./contexts/LocaleContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import {
  BINARY_PATH,
  HELIX_PATH,
  LEGACY_GASTER_PATH,
  LEGACY_WORKSPACE_PATH,
  PHAELEON_PATH,
} from "./lib/routes";
import Landing from "./pages/Landing";
import Binary from "./pages/binary/Binary";
import Helix from "./pages/helix/Helix";
import Phaeleon from "./pages/phaeleon/Phaeleon";
import Settings from "./pages/Settings";


function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Landing} />
      <Route path={BINARY_PATH} component={Binary} />
      <Route path={HELIX_PATH} component={Helix} />
      <Route path={PHAELEON_PATH} component={Phaeleon} />
      <Route path={LEGACY_GASTER_PATH}>
        <Redirect to={HELIX_PATH} />
      </Route>
      <Route path={LEGACY_WORKSPACE_PATH}>
        <Redirect to={HELIX_PATH} />
      </Route>
      <Route path={"/settings"} component={Settings} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LocaleProvider>
        <AppShell />
      </LocaleProvider>
    </ErrorBoundary>
  );
}

/** Remount routed UI when locale changes so dock titles and stale subtrees refresh. */
function AppShell() {
  const { resolvedLocale } = useLocale();

  return (
    <ThemeProvider key={resolvedLocale}>
      <TooltipProvider>
        <div className="h-full overflow-hidden">
          <Toaster />
          <Boa5RouteTransition />
          <LocaleSuggestionBanner />
          <Router />
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
