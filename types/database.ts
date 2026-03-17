export type UserRole = "admin" | "finance_supervisor" | "account_manager";
export type AppLanguage = "es" | "en";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  preferred_language: AppLanguage;
  created_at: string;
  updated_at: string;
}

export interface OpportunityListItem {
  id: string;
  title: string;
  status: "open" | "won" | "lost" | "on_hold";
  probability: number;
  annual_value_estimate: number;
  weighted_value: number;
  expected_close_date: string | null;
  next_action_due_date: string | null;
  next_action: string | null;
  accounts: { name: string } | null;
  opportunity_stages: { name: string; sort_order?: number | null } | null;
}

export interface TaskListItem {
  id: string;
  description: string;
  due_date: string;
  status: "open" | "completed" | "overdue" | "cancelled";
  opportunities: { title: string } | null;
}

export interface AccountListItem {
  id: string;
  name: string;
  billing_city: string | null;
  billing_country: string | null;
  account_types?: { name: string } | null;
}

export interface ProductListItem {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  unit_of_measure: string | null;
  base_price: number | null;
}
