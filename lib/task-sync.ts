import type { SupabaseClient } from "@supabase/supabase-js";

async function getTaskTypeId(supabase: SupabaseClient, code: string) {
  const { data } = await supabase
    .from("task_types")
    .select("id")
    .eq("code", code)
    .maybeSingle();

  return data?.id ?? null;
}

export async function syncOpportunityFollowUpTask(args: {
  supabase: SupabaseClient;
  opportunityId: string;
  ownerUserId: string;
  description: string;
  dueDate: string;
}) {
  const { supabase, opportunityId, ownerUserId, description, dueDate } = args;
  if (!opportunityId || !ownerUserId || !description || !dueDate) return;

  const taskTypeId = await getTaskTypeId(supabase, "follow_up");

  const { data: existing } = await supabase
    .from("tasks")
    .select("id, status")
    .eq("opportunity_id", opportunityId)
    .eq("owner_user_id", ownerUserId)
    .in("status", ["open", "overdue"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    description,
    due_date: dueDate,
    status: dueDate < new Date().toISOString().slice(0, 10) ? "overdue" : "open",
    task_type_id: taskTypeId,
  };

  if (existing?.id) {
    await supabase.from("tasks").update(payload).eq("id", existing.id);
    return;
  }

  await supabase.from("tasks").insert({
    opportunity_id: opportunityId,
    owner_user_id: ownerUserId,
    created_by_user_id: ownerUserId,
    priority: "medium",
    ...payload,
  });
}

export async function createTaskFromNextStep(args: {
  supabase: SupabaseClient;
  opportunityId: string;
  ownerUserId: string;
  description: string;
  dueDate: string;
}) {
  const { supabase, opportunityId, ownerUserId, description, dueDate } = args;
  if (!description || !dueDate || !opportunityId || !ownerUserId) return;

  const taskTypeId = await getTaskTypeId(supabase, "follow_up");

  await supabase.from("tasks").insert({
    opportunity_id: opportunityId,
    owner_user_id: ownerUserId,
    created_by_user_id: ownerUserId,
    task_type_id: taskTypeId,
    description,
    due_date: dueDate,
    status: dueDate < new Date().toISOString().slice(0, 10) ? "overdue" : "open",
    priority: "medium",
  });
}

export async function closeOpenTasksForOpportunity(args: {
  supabase: SupabaseClient;
  opportunityId: string;
}) {
  const { supabase, opportunityId } = args;
  if (!opportunityId) return;

  await supabase
    .from("tasks")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("opportunity_id", opportunityId)
    .in("status", ["open", "overdue"]);
}
