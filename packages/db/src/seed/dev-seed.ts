import { db } from "../client";
import { users, userProfiles, userPreferences, sourceConfigs } from "../schema";

async function seed() {
  console.log("Seeding dev database...");

  // 1. Source configs
  const sources = [
    { name: "france-travail", type: "api" as const, active: true },
    { name: "wttj", type: "scraping" as const, active: true },
    { name: "hellowork", type: "scraping" as const, active: true },
  ];

  for (const source of sources) {
    await db
      .insert(sourceConfigs)
      .values(source)
      .onConflictDoNothing({ target: sourceConfigs.name });
  }
  console.log("  ✓ 3 source_configs inserted");

  // 2. Dev user
  const DEV_USER_ID = "dev-user-001";
  await db
    .insert(users)
    .values({
      id: DEV_USER_ID,
      name: "Dev User",
      email: "dev@jobfindeer.local",
      role: "candidate",
    })
    .onConflictDoNothing({ target: users.id });
  console.log("  ✓ Dev user created (dev-user-001)");

  // 3. Dev profile
  await db
    .insert(userProfiles)
    .values({
      userId: DEV_USER_ID,
      hardSkills: ["TypeScript", "React", "Node.js", "PostgreSQL", "Docker"],
      softSkills: ["Communication", "Leadership"],
      skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "Docker", "Communication", "Leadership"],
      experienceYears: 5,
      currentLocation: "Lyon",
      currentTitle: "Développeur Full-Stack",
      languages: [
        { name: "Français", level: "natif" },
        { name: "Anglais", level: "B2" },
      ],
      educationLevel: "Bac+5",
      rawExtraction: { source: "dev-seed" },
    })
    .onConflictDoNothing({ target: userProfiles.userId });
  console.log("  ✓ Dev profile created");

  // 4. Dev preferences
  await db
    .insert(userPreferences)
    .values({
      userId: DEV_USER_ID,
      contractTypes: ["CDI", "Freelance"],
      salaryMin: 45000,
      salaryMax: 65000,
      remotePreference: "hybrid",
      sectors: ["Tech", "SaaS"],
      locations: [{ label: "Lyon", radius: 30 }],
      negativeKeywords: ["PHP", "stage", "alternance"],
    })
    .onConflictDoNothing({ target: userPreferences.userId });
  console.log("  ✓ Dev preferences created");

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
