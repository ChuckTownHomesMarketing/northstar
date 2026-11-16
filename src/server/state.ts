import { redirect } from "next/navigation";
import { withQuery } from "@/lib/links";

export type ActionState = { ok: boolean; message: string };

export const initialActionState: ActionState = { ok: true, message: "" };

export function fail(message: string): ActionState {
  return { ok: false, message };
}

export function saved(path: string, message: string): never {
  redirect(withQuery(path, "notice", message));
}
