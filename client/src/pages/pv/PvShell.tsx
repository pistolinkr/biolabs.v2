import React from "react";
import { Route, Switch } from "wouter";
import Af3ResultLoader from "@/components/workbench/Af3ResultLoader";
import BoltzResultLoader from "@/components/workbench/BoltzResultLoader";
import Evo2ResultLoader from "@/components/workbench/Evo2ResultLoader";
import GenmolResultLoader from "@/components/workbench/GenmolResultLoader";
import MsaResultLoader from "@/components/workbench/MsaResultLoader";
import { AiJobsProvider } from "@/contexts/AiJobsContext";
import { ViewerProvider } from "@/contexts/ViewerContext";
import Boltz2Page from "./Boltz2Page";
import Evo2Page from "./Evo2Page";
import ExternalApiTechPage from "./ExternalApiTechPage";
import GenmolPage from "./GenmolPage";
import MsaSearchPage from "./MsaSearchPage";
import OpenfoldPage from "./OpenfoldPage";
import PvWorkbench from "./PvWorkbench";

/**
 * Nested under `/pv` (wouter `nest`). Child paths are relative: `/msa-search` → `/pv/msa-search`.
 */
export default function PvShell() {
  return (
    <AiJobsProvider>
      <ViewerProvider>
        <Af3ResultLoader />
        <BoltzResultLoader />
        <GenmolResultLoader />
        <Evo2ResultLoader />
        <MsaResultLoader />
        <Switch>
          <Route path="/api-tech" component={ExternalApiTechPage} />
          <Route path="/msa-search" component={MsaSearchPage} />
          <Route path="/openfold" component={OpenfoldPage} />
          <Route path="/evo2" component={Evo2Page} />
          <Route path="/boltz2" component={Boltz2Page} />
          <Route path="/genmol" component={GenmolPage} />
          <Route path="/" component={PvWorkbench} />
          <Route component={PvWorkbench} />
        </Switch>
      </ViewerProvider>
    </AiJobsProvider>
  );
}
