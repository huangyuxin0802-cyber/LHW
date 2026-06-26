"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardLayout, useDashboardUser } from "@/components/DashboardLayout";
import Notes from "@/components/Notes";
import { createClient } from "@/lib/supabase/client";

export default function NotesPageClient() {
  const { userId, displayName, loading } = useDashboardUser("/notes");
  const [notes, setNotes] = useState<
    Array<{ id: string; content: string; created_at: string }>
  >([]);
  const [notesLoading, setNotesLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setNotesLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("notes")
        .select("id, content, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      setNotes(data ?? []);
    } finally {
      setNotesLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void refresh();
  }, [userId, refresh]);

  if (loading || notesLoading || !userId || !displayName) {
    return null;
  }

  return (
    <DashboardLayout
      activeItem="notes"
      title="笔记"
      description={`${displayName}，记录并保存你的想法。`}
    >
      <Notes notes={notes} onNotesChange={refresh} />
    </DashboardLayout>
  );
}
