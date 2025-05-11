import { users } from "@/drizzle/sqlite/schema";

export type User = typeof users.$inferInsert & {
  utm?: any;
  credits?: UserCredits;
};

export interface UserCredits {
  one_time_credits?: number;
  monthly_credits?: number;
  total_credits?: number;
  used_credits?: number;
  left_credits: number;
  free_credits?: number;
  is_recharged?: boolean;
  is_pro?: boolean;
}
