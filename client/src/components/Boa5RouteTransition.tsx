import React, { useEffect, useState } from "react";
import LandingToBoa5Transition from "@/components/LandingToBoa5Transition";
import {
  BOA5_TRANSITION_END_EVENT,
  BOA5_TRANSITION_EVENT,
  peekBoa5Transition,
} from "@/lib/ai/greetingHandoff";

/**
 * App-shell overlay — survives Landing → /binary navigation.
 */
export default function Boa5RouteTransition() {
  const [state, setState] = useState<{ active: boolean; text: string }>(() => {
    const peek = peekBoa5Transition();
    return peek ? { active: true, text: peek.userText } : { active: false, text: "" };
  });

  useEffect(() => {
    const onStart = (e: Event) => {
      const detail = (e as CustomEvent<{ userText?: string }>).detail;
      setState({ active: true, text: detail?.userText?.trim() || "" });
    };
    const onEnd = () => setState({ active: false, text: "" });
    window.addEventListener(BOA5_TRANSITION_EVENT, onStart);
    window.addEventListener(BOA5_TRANSITION_END_EVENT, onEnd);
    return () => {
      window.removeEventListener(BOA5_TRANSITION_EVENT, onStart);
      window.removeEventListener(BOA5_TRANSITION_END_EVENT, onEnd);
    };
  }, []);

  return <LandingToBoa5Transition active={state.active} userText={state.text} />;
}
