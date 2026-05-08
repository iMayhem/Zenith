"use client";

import { Button } from "@/components/ui/button";
import type { InstituteId } from "../_lib/types";

const INSTITUTES: { id: InstituteId; label: string }[] = [
  { id: "ALLEN", label: "ALLEN" },
  { id: "AAKASH", label: "AAKASH" },
  { id: "PHYSICS_WALLAH", label: "Physics Wallah" },
  { id: "CAREER_WILL", label: "Career Will" },
];

interface InstituteSelectorProps {
  selected: InstituteId | null;
  onSelect: (institute: InstituteId) => void;
}

export function InstituteSelector({ selected, onSelect }: InstituteSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {INSTITUTES.map(({ id, label }) => (
        <Button
          key={id}
          variant="ghost"
          onClick={() => onSelect(id)}
          className={
            selected === id
              ? "bg-white/10 text-white hover:bg-white/15 hover:text-white"
              : "text-white/70 hover:bg-white/5 hover:text-white"
          }
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
