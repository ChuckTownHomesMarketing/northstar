export type Viewer = { id: string; role: "ADMIN" | "VA" };

export function isAdmin(viewer: Viewer): boolean {
  return viewer.role === "ADMIN";
}

export function canSeeOwned(viewer: Viewer, ownerId: string | null): boolean {
  if (viewer.role === "ADMIN") return true;
  return ownerId !== null && ownerId === viewer.id;
}

export const canMutateOwned = canSeeOwned;

export function visibleOwnerId(viewer: Viewer, requestedOwnerId?: string | null): string | undefined {
  if (viewer.role === "VA") return viewer.id;
  return requestedOwnerId || undefined;
}

export function canUseModule(
  viewer: Viewer,
  module: { enabled: boolean } | null,
  granted: boolean,
): boolean {
  if (!module?.enabled) return false;
  if (viewer.role === "ADMIN") return true;
  return granted;
}

export function canSeeApp(
  viewer: Viewer,
  app: { active: boolean; visibleToAdmins: boolean; visibleToVas: boolean },
  granted: boolean,
): boolean {
  if (!app.active) return false;
  if (viewer.role === "ADMIN") return app.visibleToAdmins || granted;
  return app.visibleToVas || granted;
}

export function auditAppliesTo(
  template: { active: boolean; assignRole: "ADMIN" | "VA" | null; assigneeIds: string[] },
  viewer: Viewer,
): boolean {
  if (!template.active) return false;
  if (template.assigneeIds.includes(viewer.id)) return true;
  return template.assignRole === viewer.role;
}

export function filterOwned<T extends { ownerId: string | null }>(viewer: Viewer, rows: T[]): T[] {
  return rows.filter((row) => canSeeOwned(viewer, row.ownerId));
}
