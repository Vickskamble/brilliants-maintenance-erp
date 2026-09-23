export const APP_NAME = "Brilliants Industrial Maintenance ERP";
export const APP_SHORT_NAME = "Brilliants ERP";
export const APP_DESCRIPTION =
  "Complete Digital Management System for Industrial Maintenance & Asset Reliability";

export const DEFAULT_TIMEZONE = "Asia/Kolkata";
export const DEFAULT_COUNTRY = "India";

export const EQUIPMENT_STATUSES = [
  { value: "active", label: "Active", color: "text-green-600 bg-green-50" },
  {
    value: "under_maintenance",
    label: "Under Maintenance",
    color: "text-yellow-600 bg-yellow-50",
  },
  {
    value: "standby",
    label: "Standby",
    color: "text-blue-600 bg-blue-50",
  },
  {
    value: "breakdown",
    label: "Breakdown",
    color: "text-red-600 bg-red-50",
  },
  {
    value: "decommissioned",
    label: "Decommissioned",
    color: "text-gray-600 bg-gray-50",
  },
] as const;

export const PRIORITY_LEVELS = [
  { value: "low", label: "Low", color: "text-gray-600 bg-gray-50" },
  {
    value: "medium",
    label: "Medium",
    color: "text-blue-600 bg-blue-50",
  },
  {
    value: "high",
    label: "High",
    color: "text-orange-600 bg-orange-50",
  },
  {
    value: "urgent",
    label: "Urgent",
    color: "text-red-600 bg-red-50",
  },
] as const;

export const CRITICALITY_LEVELS = [
  {
    value: "critical",
    label: "Critical",
    color: "text-red-600 bg-red-50",
  },
  {
    value: "major",
    label: "Major",
    color: "text-orange-600 bg-orange-50",
  },
  {
    value: "normal",
    label: "Normal",
    color: "text-green-600 bg-green-50",
  },
] as const;

export const WORK_ORDER_TYPES = [
  {
    value: "preventive",
    label: "Preventive",
    color: "text-green-600 bg-green-50",
  },
  {
    value: "breakdown",
    label: "Breakdown",
    color: "text-red-600 bg-red-50",
  },
  {
    value: "corrective",
    label: "Corrective",
    color: "text-orange-600 bg-orange-50",
  },
  {
    value: "calibration",
    label: "Calibration",
    color: "text-purple-600 bg-purple-50",
  },
  {
    value: "inspection",
    label: "Inspection",
    color: "text-blue-600 bg-blue-50",
  },
  {
    value: "shutdown",
    label: "Shutdown",
    color: "text-gray-600 bg-gray-50",
  },
  {
    value: "improvement",
    label: "Improvement",
    color: "text-cyan-600 bg-cyan-50",
  },
] as const;

export const WORK_ORDER_STATUSES = [
  { value: "draft", label: "Draft", color: "text-gray-600 bg-gray-50" },
  {
    value: "submitted",
    label: "Submitted",
    color: "text-blue-600 bg-blue-50",
  },
  {
    value: "approved",
    label: "Approved",
    color: "text-indigo-600 bg-indigo-50",
  },
  {
    value: "planned",
    label: "Planned",
    color: "text-purple-600 bg-purple-50",
  },
  {
    value: "assigned",
    label: "Assigned",
    color: "text-cyan-600 bg-cyan-50",
  },
  {
    value: "in_progress",
    label: "In Progress",
    color: "text-yellow-600 bg-yellow-50",
  },
  {
    value: "on_hold",
    label: "On Hold",
    color: "text-orange-600 bg-orange-50",
  },
  {
    value: "completed",
    label: "Completed",
    color: "text-green-600 bg-green-50",
  },
  {
    value: "verified",
    label: "Verified",
    color: "text-teal-600 bg-teal-50",
  },
  { value: "closed", label: "Closed", color: "text-gray-600 bg-gray-50" },
  {
    value: "cancelled",
    label: "Cancelled",
    color: "text-red-600 bg-red-50",
  },
] as const;

export const SPARE_PART_CATEGORIES = [
  { value: "electrical", label: "Electrical", color: "text-yellow-600 bg-yellow-50" },
  { value: "mechanical", label: "Mechanical", color: "text-blue-600 bg-blue-50" },
  { value: "instrumentation", label: "Instrumentation", color: "text-purple-600 bg-purple-50" },
  { value: "pneumatic", label: "Pneumatic", color: "text-cyan-600 bg-cyan-50" },
  { value: "lubricants", label: "Lubricants", color: "text-green-600 bg-green-50" },
  { value: "consumables", label: "Consumables", color: "text-gray-600 bg-gray-50" },
  { value: "hydraulics", label: "Hydraulics", color: "text-red-600 bg-red-50" },
  { value: "bearings", label: "Bearings", color: "text-teal-600 bg-teal-50" },
] as const;

export const SPARE_PART_UNITS = [
  { value: "pcs", label: "Pieces" },
  { value: "box", label: "Box" },
  { value: "pack", label: "Pack" },
  { value: "set", label: "Set" },
  { value: "roll", label: "Roll" },
  { value: "mtr", label: "Metres" },
  { value: "ltr", label: "Litres" },
  { value: "kg", label: "Kilograms" },
  { value: "pair", label: "Pair" },
  { value: "dozen", label: "Dozen" },
] as const;

export const STOCK_MOVEMENT_TYPES = [
  { value: "purchase_in", label: "Purchase In", color: "text-green-600 bg-green-50" },
  { value: "return_in", label: "Return In", color: "text-teal-600 bg-teal-50" },
  { value: "workorder_issue", label: "Work Order Issue", color: "text-blue-600 bg-blue-50" },
  { value: "breakdown_use", label: "Breakdown Use", color: "text-red-600 bg-red-50" },
  { value: "adjustment", label: "Adjustment", color: "text-yellow-600 bg-yellow-50" },
  { value: "scrap_out", label: "Scrap Out", color: "text-gray-600 bg-gray-50" },
  { value: "transfer", label: "Transfer", color: "text-purple-600 bg-purple-50" },
] as const;

export const BREAKDOWN_CATEGORIES = [
  {
    value: "breakdown",
    label: "Breakdown",
    color: "text-red-600 bg-red-50",
  },
  {
    value: "mechanical",
    label: "Mechanical",
    color: "text-blue-600 bg-blue-50",
  },
  {
    value: "electrical",
    label: "Electrical",
    color: "text-yellow-600 bg-yellow-50",
  },
  {
    value: "instrumentation",
    label: "Instrumentation",
    color: "text-purple-600 bg-purple-50",
  },
  {
    value: "process",
    label: "Process",
    color: "text-cyan-600 bg-cyan-50",
  },
  {
    value: "civil",
    label: "Civil",
    color: "text-gray-600 bg-gray-50",
  },
  {
    value: "utility",
    label: "Utility",
    color: "text-green-600 bg-green-50",
  },
  {
    value: "other",
    label: "Other",
    color: "text-orange-600 bg-orange-50",
  },
] as const;

export const BREAKDOWN_STATUSES = [
  {
    value: "reported",
    label: "Reported",
    color: "text-red-600 bg-red-50",
  },
  {
    value: "diagnosing",
    label: "Diagnosing",
    color: "text-yellow-600 bg-yellow-50",
  },
  {
    value: "repairing",
    label: "Repairing",
    color: "text-orange-600 bg-orange-50",
  },
  {
    value: "restored",
    label: "Restored",
    color: "text-green-600 bg-green-50",
  },
  { value: "closed", label: "Closed", color: "text-gray-600 bg-gray-50" },
  {
    value: "cancelled",
    label: "Cancelled",
    color: "text-gray-600 bg-gray-50",
  },
] as const;

export const FREQUENCY_TYPES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semi_annual", label: "Semi-Annual" },
  { value: "annual", label: "Annual" },
  { value: "custom", label: "Custom" },
] as const;

export const SIDEBAR_ITEMS = [
  { label: "Dashboard", href: "/dashboard", permission: ["dashboard", "view"] },
  {
    label: "Equipment",
    href: "/equipment",
    permission: ["equipment", "view"],
  },
  {
    label: "Maintenance",
    href: "/maintenance",
    permission: ["maintenance", "view"],
  },
  {
    label: "Work Orders",
    href: "/work-orders",
    permission: ["work_order", "view"],
  },
  {
    label: "Breakdowns",
    href: "/breakdowns",
    permission: ["breakdown", "view"],
  },
  {
    label: "Inspections",
    href: "/inspections",
    permission: ["inspection", "view"],
  },
  {
    label: "Calibration",
    href: "/calibration",
    permission: ["calibration", "view"],
  },
  {
    label: "Inventory",
    href: "/inventory",
    permission: ["inventory", "view"],
  },
  {
    label: "Vendors",
    href: "/vendors",
    permission: ["vendor", "view"],
  },
  {
    label: "Shutdown",
    href: "/shutdowns",
    permission: ["shutdown", "view"],
  },
  {
    label: "Reports",
    href: "/reports",
    permission: ["reports", "view"],
  },
  {
    label: "Settings",
    href: "/settings",
    permission: ["organization", "view"],
  },
] as const;

export const SHARED_TOOLS = [
  {
    value: "common_tools",
    label: "Common / Shared Tools",
    color: "text-gray-600 bg-gray-50",
  },
] as const;

export const STOCK_LOCATION_TYPES = [
  { value: "central_store", label: "Central Store", color: "text-blue-600 bg-blue-50" },
  { value: "plant_store", label: "Plant Store", color: "text-green-600 bg-green-50" },
  { value: "floor_stock", label: "Floor Stock", color: "text-orange-600 bg-orange-50" },
] as const;
