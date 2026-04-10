"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Label } from "@jobfindeer/ui/label";

type LocationEntry = { label: string; radius: number | null };

interface Suggestion {
  placeId: string;
  text: string;
}

let googleMapsLoaded = false;
let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (googleMapsLoaded) return Promise.resolve();
  if (googleMapsPromise) return googleMapsPromise;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.warn("NEXT_PUBLIC_GOOGLE_PLACES_API_KEY is not set");
    return Promise.resolve();
  }

  googleMapsPromise = (async () => {
    const { setOptions, importLibrary } = await import("@googlemaps/js-api-loader");
    setOptions({ key: apiKey, libraries: ["places"] });
    await importLibrary("places");
    googleMapsLoaded = true;
  })();

  return googleMapsPromise;
}

async function fetchAutocompleteSuggestions(input: string): Promise<Suggestion[]> {
  const { AutocompleteSuggestion } = google.maps.places;
  const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input,
    includedPrimaryTypes: ["(cities)"],
    includedRegionCodes: ["fr"],
  });

  return response.suggestions
    .filter((s) => s.placePrediction)
    .map((s) => ({
      placeId: s.placePrediction!.placeId,
      text: s.placePrediction!.text.text,
    }));
}

export function LocationPicker({
  locations,
  onChange,
}: {
  locations: LocationEntry[];
  onChange: (locations: LocationEntry[]) => void;
}) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapsReady, setMapsReady] = useState(googleMapsLoaded);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadGoogleMaps().then(() => setMapsReady(true));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(
    async (value: string) => {
      if (!googleMapsLoaded || value.length < 3) {
        setSuggestions([]);
        return;
      }

      try {
        const results = await fetchAutocompleteSuggestions(value);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
    },
    [],
  );

  function handleInputChange(value: string) {
    setInput(value);
    setShowSuggestions(true);
    fetchSuggestions(value);
  }

  function addLocation(label: string) {
    if (locations.some((l) => l.label === label)) return;
    onChange([...locations, { label, radius: null }]);
    setInput("");
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function removeLocation(label: string) {
    onChange(locations.filter((l) => l.label !== label));
  }

  function updateRadius(label: string, radius: number | null) {
    onChange(
      locations.map((l) => (l.label === label ? { ...l, radius } : l)),
    );
  }

  return (
    <div className="flex flex-col gap-2" ref={containerRef}>
      <Label>Localisation</Label>

      {/* Location pills with individual radius sliders */}
      {locations.length > 0 && (
        <div className="flex flex-col gap-2">
          {locations.map((loc) => (
            <div
              key={loc.label}
              className="bg-muted/50 rounded-lg border p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{loc.label}</span>
                <button
                  type="button"
                  onClick={() => removeLocation(loc.label)}
                  className="text-muted-foreground hover:text-foreground text-lg leading-none"
                  aria-label={`Supprimer ${loc.label}`}
                >
                  ×
                </button>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={5}
                  value={loc.radius ?? 0}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    updateRadius(loc.label, val === 0 ? null : val);
                  }}
                  className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-blue-600 dark:bg-gray-700"
                />
                <span className="text-muted-foreground w-16 text-right text-xs">
                  {loc.radius ? `${loc.radius} km` : "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Autocomplete input */}
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => input.length >= 3 && setShowSuggestions(true)}
          placeholder={mapsReady ? "Rechercher une ville..." : "Chargement..."}
          disabled={!mapsReady}
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
        />

        {showSuggestions && suggestions.length > 0 && (
          <div className="border-input bg-background absolute z-50 mt-1 w-full rounded-md border shadow-lg">
            <div className="max-h-60 overflow-y-auto p-1">
              {suggestions.map((s) => (
                <button
                  key={s.placeId}
                  type="button"
                  onClick={() => addLocation(s.text)}
                  className="hover:bg-muted w-full rounded px-3 py-2 text-left text-sm transition-colors"
                >
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {showSuggestions && input.length >= 3 && suggestions.length === 0 && mapsReady && (
          <div className="border-input bg-background absolute z-50 mt-1 w-full rounded-md border p-3 shadow-lg">
            <p className="text-muted-foreground text-center text-sm">Aucun résultat</p>
          </div>
        )}
      </div>
    </div>
  );
}
