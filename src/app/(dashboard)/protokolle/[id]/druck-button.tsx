"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Oeffnet den Druckdialog - das Druck-CSS der Seite blendet alles bis auf
    das Protokoll-Blatt aus ("Drucken / PDF" ueber den Browser). */
export function DruckButton() {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      <Printer />
      Drucken / PDF
    </Button>
  );
}
