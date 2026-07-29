import { z } from "zod";
import {
  equipmentEnum,
  muscleGroupEnum,
  splitTypeEnum,
} from "@/lib/db/schema";

export const muscleGroupSchema = z.enum(muscleGroupEnum.enumValues);
export const equipmentSchema = z.enum(equipmentEnum.enumValues);
export const splitTypeSchema = z.enum(splitTypeEnum.enumValues);

export const templateExerciseInputSchema = z.object({
  exerciseId: z.string().uuid(),
  defaultSets: z.number().int().min(1).max(20),
  defaultReps: z.number().int().min(1).max(100),
  exerciseOrder: z.number().int().min(0),
  supersetGroup: z.number().int().min(1).max(10).nullable().optional(),
});

export const createTemplateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  splitType: splitTypeSchema.default("custom"),
  estimatedMinutes: z.number().int().min(10).max(240).default(60),
  exercises: z.array(templateExerciseInputSchema).max(40).default([]),
});

export const updateTemplateSchema = createTemplateSchema.partial({
  name: true,
  splitType: true,
  estimatedMinutes: true,
  exercises: true,
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type TemplateExerciseInput = z.infer<typeof templateExerciseInputSchema>;

/* -------------------------------------------------------------------------- */
/*                                  sessions                                   */
/* -------------------------------------------------------------------------- */

export const sessionPlanEntrySchema = z.object({
  exerciseId: z.string().uuid(),
  defaultSets: z.number().int().min(1).max(20),
  defaultReps: z.number().int().min(1).max(100),
  exerciseOrder: z.number().int().min(0),
  supersetGroup: z.number().int().min(1).max(10).nullable().optional(),
});

export const startSessionSchema = z.object({
  workoutTemplateId: z.string().uuid().nullable().optional(),
  plan: z.array(sessionPlanEntrySchema).max(40).nullable().optional(),
});

export const generateWorkoutSchema = z.object({
  targetMinutes: z.number().int().min(10).max(240),
});

export const updateSessionSchema = z.object({
  notes: z.string().max(2000).nullable().optional(),
});

export const logSetSchema = z.object({
  exerciseId: z.string().uuid(),
  // Accepted for backwards compatibility but ignored — the server assigns the
  // set number so concurrent/after-delete logging can't collide.
  setNumber: z.number().int().min(1).max(200).optional(),
  weightKg: z.number().min(0).max(1000),
  repsCompleted: z.number().int().min(0).max(200),
  rpe: z.number().min(1).max(10).nullable().optional(),
  isWarmup: z.boolean().optional().default(false),
});

export const updateSetSchema = z
  .object({
    weightKg: z.number().min(0).max(1000).optional(),
    repsCompleted: z.number().int().min(0).max(200).optional(),
    rpe: z.number().min(1).max(10).nullable().optional(),
    isWarmup: z.boolean().optional(),
  })
  // Drizzle throws "No values to set" on an empty update object, which
  // surfaced as a 500. Reject it as the 400 it actually is.
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update",
  });

export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type LogSetInput = z.infer<typeof logSetSchema>;
export type UpdateSetInput = z.infer<typeof updateSetSchema>;
export type GenerateWorkoutInput = z.infer<typeof generateWorkoutSchema>;
export type SessionPlanEntryInput = z.infer<typeof sessionPlanEntrySchema>;

/* -------------------------------------------------------------------------- */
/*                              bug reports                                    */
/* -------------------------------------------------------------------------- */

export const bugReportSchema = z.object({
  title: z.string().trim().min(3, "Add a short title").max(120),
  description: z.string().trim().min(10, "Describe what happened").max(5000),
  url: z.string().url().max(500).optional(),
});

export type BugReportInput = z.infer<typeof bugReportSchema>;
