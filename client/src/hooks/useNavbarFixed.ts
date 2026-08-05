import { useCallback, useEffect, useState } from "react";
import { loadNavbarFixed, saveNavbarFixed } from "@/lib/uiChromeStorage";

/** Persist + sync “pin navbar” across Settings and BiolabsNav. */
export function useNavbarFixed(): [boolean, (next: boolean) => void] {
  const [fixed, setFixedState] = useState(loadNavbarFixed);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key !== "biolabs.ui.navbarFixed.v1") return;
      setFixedState(loadNavbarFixed());
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      if (typeof detail === "boolean") setFixedState(detail);
      else setFixedState(loadNavbarFixed());
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("biolabs:navbar-fixed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("biolabs:navbar-fixed", onCustom);
    };
  }, []);

  const setFixed = useCallback((next: boolean) => {
    setFixedState(next);
    saveNavbarFixed(next);
  }, []);

  return [fixed, setFixed];
}
