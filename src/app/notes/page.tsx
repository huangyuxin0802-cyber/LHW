import { createClient } from "@/lib/supabase/server";
import { DashboardLayout, getDashboardUser } from "@/components/DashboardLayout";
import Notes from "@/components/Notes";

export default async function NotesPage() {
  const { userId, displayName } = await getDashboardUser("/notes");
  const supabase = await createClient();

  const { data: notes, error: selectError } = await supabase
    .from("notes")
    .select("id, content, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (selectError) {
    throw new Error(selectError.message);
  }

  return (
    <DashboardLayout
      activeItem="notes"
      title="笔记"
      description={`${displayName}，记录并保存你的想法。`}
    >
      <Notes notes={notes ?? []} />
    </DashboardLayout>
  );
}
