/** Placeholder types for MD, folding trajectories, docking — no runtime integration yet. */
export type SimulationRunState = "idle" | "queued" | "running" | "completed" | "failed";

export interface TrajectoryHandle {
  id: string;
  format: "placeholder";
}

export interface DockingJob {
  id: string;
  status: "stub";
}

export interface MutationVariant {
  id: string;
  label: string;
  status: "planned";
}
