import { Profile, Role, Permission, Organization, Plant } from "./database";

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthState {
  user: AuthUser | null;
  profile: Profile | null;
  organization: Organization | null;
  plant: Plant | null;
  roles: Role[];
  permissions: Permission[];
  plants: Plant[];
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setSelectedPlant: (plant: Plant | null) => void;
  hasPermission: (module: string, action: string) => boolean;
}
