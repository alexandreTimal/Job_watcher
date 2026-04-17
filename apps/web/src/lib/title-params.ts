import type { Branch } from "@jobfindeer/validators";
import { calibrationByBranchSchemas } from "@jobfindeer/validators";

export function deriveSeniorityLevel(years: number | null | undefined): string {
  if (years === null || years === undefined || !Number.isFinite(years) || years < 0) {
    return "junior";
  }
  if (years < 3) return "junior";
  if (years <= 7) return "confirme";
  return "senior";
}

const VALID_BRANCHES: Branch[] = ["1", "2", "3", "4", "5"];

function isBranch(value: unknown): value is Branch {
  return typeof value === "string" && (VALID_BRANCHES as string[]).includes(value);
}

function parseCalibration<B extends Branch>(
  branch: B,
  calibrationData: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!calibrationData) return {};
  const schema = calibrationByBranchSchemas[branch];
  const result = schema.safeParse(calibrationData);
  if (result.success) return result.data as Record<string, unknown>;
  // Schema drift: fall back to raw shape but with defensive access downstream.
  return calibrationData;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

export function buildTitleGenParams(
  branch: string | null | undefined,
  profile: {
    currentTitle?: string | null;
    experienceYears?: number | null;
    educationLevel?: string | null;
  },
  calibrationData: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!isBranch(branch)) {
    throw new Error(`Branch invalide: ${String(branch)}. Attendu: "1"..."5".`);
  }

  const cal = parseCalibration(branch, calibrationData);
  const seniority = deriveSeniorityLevel(profile.experienceYears);
  const currentTitle = (profile.currentTitle ?? "").trim() || "Emploi";

  switch (branch) {
    case "1":
      return {
        branch: "1",
        current_job_title: currentTitle,
        current_seniority_level: seniority,
      };
    case "2": {
      const types = stringArray(cal.responsibilityTypes);
      return {
        branch: "2",
        current_job_title: currentTitle,
        current_seniority_level: seniority,
        responsibility_jump_type: types.length > 0 ? types : ["hierarchy_title"],
      };
    }
    case "3": {
      const dropMap: Record<string, string> = {
        none: "none",
        up_to_10: "up_to_10_percent",
        up_to_20: "up_to_20_percent",
        more_than_20: "not_priority",
      };
      const trainingSet = new Set(["self_learning", "employer_paid", "none"]);
      const training = typeof cal.trainingWillingness === "string" && trainingSet.has(cal.trainingWillingness)
        ? cal.trainingWillingness
        : "none";
      return {
        branch: "3",
        current_job_title: currentTitle,
        target_jobs: stringArray(cal.pivotJobs),
        salary_drop_tolerance: dropMap[String(cal.salaryDropTolerance)] ?? "none",
        training_willingness: training,
      };
    }
    case "4": {
      const levelMap: Record<string, string> = {
        junior: "junior_only",
        intermediate: "intermediate_valorizing_past",
        both: "both",
      };
      return {
        branch: "4",
        target_jobs: stringArray(cal.targetJobs),
        seniority_acceptance: levelMap[String(cal.acceptedLevel)] ?? "both",
      };
    }
    case "5": {
      const contractMap: Record<string, string> = {
        alternance: "apprenticeship",
        stage: "internship",
        first_job: "first_job",
      };
      const studyField = typeof cal.studyField === "string" && cal.studyField.trim().length > 0
        ? cal.studyField.trim()
        : "Formation generale";
      return {
        branch: "5",
        education_level: (profile.educationLevel ?? "").trim() || "Bac+3",
        education_field: studyField,
        contract_type: contractMap[String(cal.contractType)] ?? "first_job",
      };
    }
  }
}
