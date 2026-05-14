/* eslint-disable @typescript-eslint/no-explicit-any */

export const isAdmin = (user: any): boolean =>
  Boolean(user?.roles?.includes("admin"));

export const isVendor = (user: any): boolean =>
  Boolean(user?.roles?.includes("vendor")) || isAdmin(user);

// alias kept so any remaining isSuperAdmin imports still compile
export const isSuperAdmin = isAdmin;
