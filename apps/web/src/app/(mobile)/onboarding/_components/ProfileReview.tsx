"use client";

import { useState } from "react";
import { Button } from "@jobfindeer/ui/button";
import { Input } from "@jobfindeer/ui/input";
import { Label } from "@jobfindeer/ui/label";
import type { ExtractedProfile } from "@jobfindeer/validators";

export function ProfileReview({
  profile,
  onConfirm,
}: {
  profile: ExtractedProfile;
  onConfirm: (profile: ExtractedProfile) => void;
}) {
  const [skills, setSkills] = useState(profile.skills.join(", "));
  const [experienceYears, setExperienceYears] = useState(
    profile.experienceYears?.toString() ?? "",
  );
  const [location, setLocation] = useState(profile.currentLocation ?? "");
  const [title, setTitle] = useState(profile.currentTitle ?? "");

  function handleConfirm() {
    onConfirm({
      skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
      experienceYears: experienceYears ? parseInt(experienceYears, 10) : null,
      currentLocation: location || null,
      currentTitle: title || null,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Vérifie ton profil</h2>
      <div className="flex flex-col gap-3">
        <div>
          <Label htmlFor="title">Poste actuel</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="skills">Compétences (séparées par des virgules)</Label>
          <Input id="skills" value={skills} onChange={(e) => setSkills(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="experience">Années d'expérience</Label>
          <Input
            id="experience"
            type="number"
            value={experienceYears}
            onChange={(e) => setExperienceYears(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="location">Localisation</Label>
          <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
      </div>
      <Button onClick={handleConfirm} className="min-h-[44px]">
        Valider mon profil
      </Button>
    </div>
  );
}
