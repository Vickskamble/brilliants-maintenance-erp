"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AuthContextType,
  AuthUser,
} from "@/types/auth";
import {
  Profile,
  Role,
  Permission,
  Organization,
  Plant,
} from "@/types/database";
import { hasPermission } from "@/lib/permissions";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [plant, setPlant] = useState<Plant | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const loadUserData = useCallback(async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (!profileData) {
        setIsLoading(false);
        return;
      }

      setProfile(profileData);

      if (profileData.organization_id) {
        const { data: orgData } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", profileData.organization_id)
          .single();

        setOrganization(orgData);

        const { data: plantsData } = await supabase
          .from("plants")
          .select("*")
          .eq("organization_id", profileData.organization_id)
          .eq("status", "active");

        setPlants(plantsData || []);

        if (plantsData && plantsData.length > 0) {
          const savedPlantId =
            typeof window !== "undefined" && plantsData.length > 1
              ? window.localStorage.getItem("erp.selectedPlantId")
              : null;
          const selectedPlant =
            (savedPlantId &&
              plantsData.find((p) => p.id === savedPlantId)) ||
            plantsData.find((p) => p.id === profileData.plant_id) ||
            plantsData[0];
          setPlant(selectedPlant);
        }
      }

      const { data: userRolesData } = await supabase
        .from("user_roles")
        .select("*, roles(*)")
        .eq("user_id", userId);

      if (userRolesData) {
        const rolesList = userRolesData
          .map((ur) => ur.roles)
          .filter(Boolean) as unknown as Role[];
        setRoles(rolesList);

        const roleIds = rolesList.map((r) => r.id);
        if (roleIds.length > 0) {
          const { data: rolePermsData } = await supabase
            .from("role_permissions")
            .select("*, permissions(*)")
            .in("role_id", roleIds);

          if (rolePermsData) {
            const permsList = rolePermsData
              .map((rp) => rp.permissions)
              .filter(Boolean) as unknown as Permission[];
            const uniquePerms = permsList.filter(
              (p, i, self) =>
                self.findIndex(
                  (q) => q.module === p.module && q.action === p.action
                ) === i
            );
            setPermissions(uniquePerms);
          }
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        setUser({ id: authUser.id, email: authUser.email || "" });
        await loadUserData(authUser.id);
      } else {
        setIsLoading(false);
      }
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || "",
        });
        await loadUserData(session.user.id);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        setOrganization(null);
        setPlant(null);
        setRoles([]);
        setPermissions([]);
        setPlants([]);
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, loadUserData, router]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      router.push("/dashboard");
      return {};
    } catch {
      return { error: "An unexpected error occurred" };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserData(user.id);
    }
  };

  const setSelectedPlant = (plant: Plant | null) => {
    setPlant(plant);
    if (typeof window !== "undefined") {
      if (plant) window.localStorage.setItem("erp.selectedPlantId", plant.id);
      else window.localStorage.removeItem("erp.selectedPlantId");
    }
  };

  const checkPermission = (module: string, action: string): boolean => {
    return hasPermission(permissions, module, action);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        organization,
        plant,
        roles,
        permissions,
        plants,
        isLoading,
        signIn,
        signOut,
        refreshProfile,
        setSelectedPlant,
        hasPermission: checkPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
