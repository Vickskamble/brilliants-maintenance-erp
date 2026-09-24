"use client";

import { useAuth } from "@/lib/auth/context";
import { cn, getInitials } from "@/lib/utils";
import {
  ChevronDown,
  LogOut,
  MapPin,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GlobalSearch } from "@/components/search/global-search";
import { NotificationBell } from "@/components/notifications/notification-bell";

export function Header() {
  const { profile, organization, plant, plants, setSelectedPlant, signOut } =
    useAuth();
  const [showPlantDropdown, setShowPlantDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const plantRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        plantRef.current &&
        !plantRef.current.contains(event.target as Node)
      ) {
        setShowPlantDropdown(false);
      }
      if (
        userRef.current &&
        !userRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-4">
        {organization && (
          <div className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">
              {organization.display_name}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {plants.length > 1 && (
          <div className="relative" ref={plantRef}>
            <button
              onClick={() => setShowPlantDropdown(!showPlantDropdown)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <MapPin className="h-4 w-4 text-gray-400" />
              <span>{plant?.name || "Select Plant"}</span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {showPlantDropdown && (
              <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                {plants.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPlant(p);
                      setShowPlantDropdown(false);
                    }}
                    className={cn(
                      "flex w-full items-center px-4 py-2 text-sm text-left hover:bg-gray-50",
                      plant?.id === p.id
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700"
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {plants.length === 1 && plant && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span>{plant.name}</span>
          </div>
        )}

        <GlobalSearch />

        <NotificationBell />

        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-gray-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600">
              <span className="text-xs font-medium text-white">
                {profile ? getInitials(profile.name) : "?"}
              </span>
            </div>
            <div className="hidden text-left lg:block">
              <p className="text-sm font-medium text-gray-900">
                {profile?.name || "User"}
              </p>
              <p className="text-xs text-gray-500">{profile?.email || ""}</p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-gray-400 lg:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              <div className="border-b border-gray-100 px-4 py-2">
                <p className="text-sm font-medium text-gray-900">
                  {profile?.name}
                </p>
                <p className="text-xs text-gray-500">{profile?.email}</p>
              </div>
              <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                <User className="h-4 w-4" />
                Profile
              </button>
              <button
                onClick={() => signOut()}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
