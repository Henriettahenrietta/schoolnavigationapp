"use client";

import { Button } from "./ui";

// Triggers the browser's print dialog. Combined with the print stylesheet (which hides the
// sidebar/nav via .no-print), this is the app's PDF export — "Save as PDF" in the dialog.
export function PrintButton({ label = "Print / PDF" }: { label?: string }) {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
