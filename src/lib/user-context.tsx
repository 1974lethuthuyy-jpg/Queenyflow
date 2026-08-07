"use client";

import { createContext, useContext } from "react";
import type { Organization, Profile } from "@/types/db";

export type CurrentUserContextValue = {
  profile: Profile;
  org: Organization;
  isAdmin: boolean;
  accessibleOrgs: Organization[];
  activeOrgId: string;
  activeOrg: Organization;
  isManager: boolean;
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export function CurrentUserProvider({
  value,
  children,
}: {
  value: CurrentUserContextValue;
  children: React.ReactNode;
}) {
  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error("useCurrentUser phải dùng trong CurrentUserProvider");
  return ctx;
}
