/**
 * Builds the LLM title generation parameters from profile + calibration data.
 * Shared between onboarding flow and settings page.
 */

export function deriveSeniorityLevel(years: number | null | undefined): string {
  if (!years || years < 3) return "junior";
  if (years <= 7) return "confirme";
  return "senior";
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
  const cal = calibrationData ?? {};
  const seniority = deriveSeniorityLevel(profile.experienceYears);

  switch (branch) {
    case "1":
      return {
        branch: "1",
        current_job_title: profile.currentTitle ?? "Emploi",
        current_seniority_level: seniority,
      };
    case "2":
      return {
        branch: "2",
        current_job_title: profile.currentTitle ?? "Emploi",
        current_seniority_level: seniority,
        responsibility_jump_type: cal.responsibilityTypes ?? ["hierarchy_title"],
      };
    case "3": {
      const dropMap: Record<string, string> = {
        none: "none",
        up_to_10: "up_to_10_percent",
        up_to_20: "up_to_20_percent",
        more_than_20: "not_priority",
      };
      return {
        branch: "3",
        current_job_title: profile.currentTitle ?? "Emploi",
        target_jobs: cal.pivotJobs ?? [],
        salary_drop_tolerance: dropMap[String(cal.salaryDropTolerance)] ?? "none",
        training_willingness: cal.trainingWillingness ?? "none",
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
        target_jobs: cal.targetJobs ?? [],
        seniority_acceptance: levelMap[String(cal.acceptedLevel)] ?? "both",
      };
    }
    case "5": {
      const contractMap: Record<string, string> = {
        alternance: "apprenticeship",
        stage: "internship",
        first_job: "first_job",
      };
      return {
        branch: "5",
        education_level: profile.educationLevel ?? "Bac+3",
        education_field: cal.studyField ?? "Formation generale",
        contract_type: contractMap[String(cal.contractType)] ?? "first_job",
      };
    }
    default:
      return {
        branch: "1",
        current_job_title: profile.currentTitle ?? "Emploi",
        current_seniority_level: seniority,
      };
  }
}
