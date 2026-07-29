export interface ExerciseRow {
  exerciseId: string;
  name: string;
  primaryMuscleGroup: string;
  equipment: string;
  defaultSets: number;
  defaultReps: number;
  supersetGroup: number | null;
  imageUrl: string | null;
  videoUrl: string | null;
}

export interface LoggedSet {
  id: string;
  exerciseId: string;
  setNumber: number;
  weightKg: number;
  repsCompleted: number;
  isWarmup: boolean;
}

export interface LastSet {
  setNumber: number;
  weightKg: number;
  repsCompleted: number;
  isWarmup: boolean;
}

export type LastSets = LastSet[];

export interface ExerciseBest {
  bestWeightKg: number;
  bestSetVolume: number;
}

/** What kind of personal best a set just set, if any. */
export type PrKind = "weight" | "volume" | null;
