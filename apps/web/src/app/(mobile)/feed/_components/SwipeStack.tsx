"use client";

import { useState, useRef, useCallback } from "react";
import { OfferCard } from "./OfferCard";

interface FeedItem {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  salary: string | null;
  contractType: string | null;
  score: number;
  justification: string | null;
}

export function SwipeStack({
  items,
  onSwipe,
}: {
  items: FeedItem[];
  onSwipe: (itemId: string, action: "saved" | "dismissed") => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);

  const current = items[currentIndex];

  const handleSwipe = useCallback(
    (action: "saved" | "dismissed") => {
      if (!current) return;
      onSwipe(current.id, action);
      setCurrentIndex((i) => i + 1);
      setDragX(0);
    },
    [current, onSwipe],
  );

  function handlePointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging) return;
    setDragX(e.clientX - startX.current);
  }

  function handlePointerUp() {
    setIsDragging(false);
    if (Math.abs(dragX) > 100) {
      handleSwipe(dragX > 0 ? "saved" : "dismissed");
    } else {
      setDragX(0);
    }
  }

  if (!current) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Plus d'offres pour aujourd'hui !</p>
      </div>
    );
  }

  return (
    <div className="relative h-[70vh]">
      <div
        className="absolute inset-0 touch-none"
        style={{
          transform: `translateX(${dragX}px) rotate(${dragX * 0.05}deg)`,
          transition: isDragging ? "none" : "transform 0.3s ease",
          opacity: 1 - Math.abs(dragX) / 500,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <OfferCard {...current} />
      </div>

      {dragX > 50 && (
        <div className="pointer-events-none absolute top-8 left-8 rotate-[-15deg] rounded-lg border-4 border-green-500 px-4 py-2 text-2xl font-bold text-green-500">
          GARDER
        </div>
      )}
      {dragX < -50 && (
        <div className="pointer-events-none absolute top-8 right-8 rotate-[15deg] rounded-lg border-4 border-red-500 px-4 py-2 text-2xl font-bold text-red-500">
          PASSER
        </div>
      )}

      <div className="absolute bottom-4 left-0 flex w-full justify-center gap-8">
        <button
          onClick={() => handleSwipe("dismissed")}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl text-red-500 dark:bg-red-900/30"
          aria-label="Passer cette offre"
        >
          X
        </button>
        <button
          onClick={() => handleSwipe("saved")}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-500 dark:bg-green-900/30"
          aria-label="Garder cette offre"
        >
          V
        </button>
      </div>
    </div>
  );
}
