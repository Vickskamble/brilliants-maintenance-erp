const QA_ROLE_CODES = ["QA_OFFICER", "QA_MANAGER", "DOC_CONTROLLER"];

/**
 * Post-login landing based on the user's effective role codes (SAP-style
 * department home). SYSTEM_ADMIN goes to the platform console, quality
 * users go to the QMS landing, everything else keeps the existing
 * maintenance dashboard.
 */
export function resolveLandingPath(roleCodes: string[]): string {
  if (roleCodes.includes("SYSTEM_ADMIN")) return "/organizations";
  if (roleCodes.some((code) => QA_ROLE_CODES.includes(code))) return "/quality";
  return "/dashboard";
}