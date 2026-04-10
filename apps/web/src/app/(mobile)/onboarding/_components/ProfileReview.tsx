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
  const [hardSkills, setHardSkills] = useState((profile.hardSkills ?? []).join(", "));
  const [softSkills, setSoftSkills] = useState((profile.softSkills ?? []).join(", "));
  const [experienceYears, setExperienceYears] = useState(
    profile.experienceYears?.toString() ?? "",
  );
  const [location, setLocation] = useState(profile.currentLocation ?? "");
  const [title, setTitle] = useState(profile.currentTitle ?? "");
  const [languages, setLanguages] = useState(
    (profile.languages ?? []).map((l) => `${l.name}${l.level ? ` (${l.level})` : ""}`).join(", "),
  );
  const [educationLevel, setEducationLevel] = useState(profile.educationLevel ?? "");
  const [certifications, setCertifications] = useState((profile.certifications ?? []).join(", "));

  function handleConfirm() {
    onConfirm({
      currentTitle: title || null,
      currentLocation: location || null,
      experienceYears: experienceYears ? parseInt(experienceYears, 10) : null,
      hardSkills: hardSkills.split(",").map((s) => s.trim()).filter(Boolean),
      softSkills: softSkills.split(",").map((s) => s.trim()).filter(Boolean),
      languages: languages.split(",").map((s) => {
        const match = s.trim().match(/^(.+?)\s*\((.+)\)$/);
        return match
          ? { name: match[1]!.trim(), level: match[2]!.trim() }
          : { name: s.trim(), level: null };
      }).filter((l) => l.name),
      educationLevel: educationLevel || null,
      workHistory: profile.workHistory ?? [],
      education: profile.education ?? [],
      certifications: certifications.split(",").map((s) => s.trim()).filter(Boolean),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Verifie ton profil</h2>
      <div className="flex flex-col gap-3">
        <div>
          <Label htmlFor="title">Poste actuel</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="hardSkills">Competences techniques</Label>
          <Input id="hardSkills" value={hardSkills} onChange={(e) => setHardSkills(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="softSkills">Soft skills</Label>
          <Input id="softSkills" value={softSkills} onChange={(e) => setSoftSkills(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="experience">Annees d'experience</Label>
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
        <div>
          <Label htmlFor="languages">Langues (ex: Francais (natif), Anglais (B2))</Label>
          <Input id="languages" value={languages} onChange={(e) => setLanguages(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="educationLevel">Niveau d'etudes</Label>
          <Input id="educationLevel" value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="certifications">Certifications</Label>
          <Input id="certifications" value={certifications} onChange={(e) => setCertifications(e.target.value)} placeholder="AWS SAA, Scrum Master" />
        </div>

        {(profile.workHistory ?? []).length > 0 && (
          <div>
            <Label>Historique de postes</Label>
            <div className="bg-muted mt-1 rounded-md p-3 text-xs">
              {(profile.workHistory ?? []).map((w, i) => (
                <div key={i} className="mb-1">
                  <span className="font-medium">{w.title}</span>
                  {w.company && <span className="text-muted-foreground"> — {w.company}</span>}
                  {(w.start || w.end) && (
                    <span className="text-muted-foreground"> ({w.start ?? "?"} - {w.end ?? "present"})</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {(profile.education ?? []).length > 0 && (
          <div>
            <Label>Formations</Label>
            <div className="bg-muted mt-1 rounded-md p-3 text-xs">
              {(profile.education ?? []).map((e, i) => (
                <div key={i} className="mb-1">
                  <span className="font-medium">{e.degree}</span>
                  {e.school && <span className="text-muted-foreground"> — {e.school}</span>}
                  {e.year && <span className="text-muted-foreground"> ({e.year})</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Button onClick={handleConfirm} className="min-h-[44px]">
        Valider mon profil
      </Button>
    </div>
  );
}
