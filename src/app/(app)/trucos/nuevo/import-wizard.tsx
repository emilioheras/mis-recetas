"use client";

import { useState } from "react";
import { Pencil, Youtube } from "lucide-react";
import { YouTubeImportPanel } from "@/components/youtube-import-panel";
import { cn } from "@/lib/utils";
import type { TrickCategory, TrickDraft } from "@/lib/tricks/types";
import { TrickForm } from "../trick-form";
import {
  importTrickFromYouTubeAction,
  importTrickFromYouTubeTextAction,
} from "../import-actions";

type TabId = "manual" | "youtube";

const TABS: Array<{
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "manual", label: "Manual", icon: Pencil },
  { id: "youtube", label: "Desde YouTube", icon: Youtube },
];

export function TrickImportWizard({
  existingCategories,
}: {
  existingCategories: TrickCategory[];
}) {
  const [tab, setTab] = useState<TabId>("manual");
  const [draft, setDraft] = useState<TrickDraft | null>(null);

  function changeTab(newTab: TabId) {
    setTab(newTab);
    setDraft(null);
  }

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 border-b pb-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => changeTab(t.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </nav>

      {tab === "manual" ? (
        <TrickForm
          trickId={null}
          initial={{
            title: "",
            notes: "",
            image_url: null,
            video_url: null,
            source_url: null,
            categories: [],
          }}
          existingCategories={existingCategories}
        />
      ) : null}

      {tab === "youtube" && !draft ? (
        <YouTubeImportPanel<TrickDraft>
          noun="truco"
          extractAuto={importTrickFromYouTubeAction}
          extractManual={importTrickFromYouTubeTextAction}
          onSuccess={setDraft}
        />
      ) : null}

      {tab === "youtube" && draft ? (
        <>
          <p className="rounded-md bg-accent p-3 text-sm">
            {draft.video_url ? (
              <>
                Truco extraído del vídeo{" "}
                <a
                  href={draft.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {draft.video_url}
                </a>
                .
              </>
            ) : (
              <>Truco extraído.</>
            )}{" "}
            Revisa los campos y guarda cuando estés conforme.
          </p>
          <TrickForm
            trickId={null}
            initial={{
              title: draft.title,
              notes: draft.notes,
              image_url: null,
              video_url: draft.video_url,
              source_url: draft.source_url,
              categories: [],
            }}
            existingCategories={existingCategories}
          />
        </>
      ) : null}
    </div>
  );
}
