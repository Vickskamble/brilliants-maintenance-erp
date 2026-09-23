# Brilliants Maintenance ERP — UI Component Reference

All components merge classes with `cn()` (`clsx` + `tailwind-merge`) unless noted.
`"use client"` markers: primitives that use client hooks or clipboard-free interactivity.

## Layout (`src/components/layout`)

| Component | Props | Purpose |
|---|---|---|
| `ERPLayout` | `{ children }` | App shell: guards session (redirects to `/login`), renders loading spinner while auth loads, then `Sidebar` + `Header` + scrollable `<main>` with `p-6` |
| `Sidebar` | — | Brand block ("B" logo, app name), collapse toggle (`w-64` ⇄ `w-16`), nav from `SIDEBAR_ITEMS` (12 items) filtered by `hasPermission(module, 'view')`; `lucide` icon map; active state = `pathname` match |
| `Header` | — | Organization `display_name`, plant switcher dropdown (only when `plants.length > 1`; single plant shows static label), notifications bell (decorative red dot), user menu (avatar initials via `getInitials`, name/email, Profile — inert, Sign Out) |

## Common (`src/components/common`)

| Component | Props | Purpose |
|---|---|---|
| `PageHeader` | `{ title, description?, action?, className? }` | Section heading + optional right-aligned action node |
| `StatusBadge` | `{ statusMeta?: { value,label,color? } \| null, className? }` | Pill badge (small, rounded-full); falls back to gray when no meta |
| `EmptyState` | `{ title?, description?, icon?, action? }` | Centered empty illustration (FileX default) + optional action |
| `LoadingPage` | — | Centered `LoadingSpinner` (lg) + "Loading..." label, `h-64` |
| `LoadingSpinner` | `{ className?, size?: sm\|md\|lg }` | Spinning blue border circle |
| `MetadataRow` | `{ label, value? }` | Detail-page field: uppercase tiny label + value (`-` when empty) |

## Form primitives (`src/components/ui`)

### `Button` (forwardRef)
Props: `variant?: primary|secondary|ghost|danger|outline`, `size?: sm|md|lg`,
`isLoading?: boolean` (renders spinner, disables), standard button attrs.
Primary = `bg-blue-600`; danger = `bg-red-600`; focus ring style; disabled at 50% opacity.

### `Input` (forwardRef)
Props: `label?`, `error?` (red border + message, shown in place of `helperText`), `helperText?`,
`id?`, HTML input attrs. Label renders above the field.

### `Select` (forwardRef)
Props: `label?`, `error?`, `options?: { value, label }[]`, `placeholder?`, `id?`, children
(`<option>`s) as alternative to `options`. Renders placeholder `value=""` option first.

### `Label` (forwardRef)
Plain label text (`text-sm font-medium`).

### `Textarea` (forwardRef)
Standard textarea, `min-h-[80px]`, focus ring, disabled styles.

### `Checkbox`
Props: `checked?`, `onCheckedChange?`, HTML input attrs (no `onChange`). Blue accent,
`rounded`.

### `FormError`
Props: `{ message?, error?: FieldError, className? }` — red `text-sm` message, resolves from
either error prop or message.

### `Card` family
`Card` (rounded-xl border shadow-sm), `CardHeader` (border-b), `CardTitle` (`text-lg
font-semibold`), `CardDescription`, `CardContent` (`px-6 py-4`), `CardFooter` (border-t).

### `Badge` + `StatusBadge` (badge.tsx)
- `Badge`: `variant?: default|success|warning|danger|info`.
- `StatusBadge`: `{ status: string }` — maps ~30 known statuses to colors and humanizes
  snake_case ("in_progress" → "In Progress"); unknown statuses fall back to gray.

### `DataTable<T>` (data-table.tsx)
Props: `columns: Column<T>[]` (`{ key, header, render?, className?, headerClassName? }`),
`data`, `loading?`, `idKey?`, `onRowClick?`, `emptyTitle?/emptyDescription?/emptyAction?`.
Shows `LoadingSpinner` while loading, `EmptyState` when empty; striped header, hover rows,
nowrap cells (default render is `String(row[key]) ?? "-"`).

### `Pagination` (pagination.tsx)
Props: `{ page, pageSize, totalItems, onPageChange }`.
Renders "Showing X–Y of N", prev/next chevron buttons, numbered pages with ellipsis
(`getPaginationPages` helper exported). ~7-page window.

### `Tabs`
Props: `{ tabs: { key, label, icon? }[], active, onChange, className? }` — underline style
active tab (blue border-b).

### `Table` family (table.tsx)
shadcn-style primitives: `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`,
`TableHead`, `TableCell`, `TableCaption`.

### `Dialog` (dialog.tsx)
Props: `{ open, onClose, title, description?, children, className? }` — fixed overlay,
max-w-lg, close X. **Currently unused by any page.**

### `DropdownMenu` family (dropdown-menu.tsx)
Custom lightweight implementation: `DropdownMenu`, `DropdownMenuTrigger` (`asChild?`),
`DropdownMenuContent` (`align?: start|end`), `DropdownMenuItem`, `DropdownMenuCheckboxItem`,
`DropdownMenuRadioItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`,
`DropdownMenuShortcut`, `DropdownMenuGroup`, `DropdownMenuSub*/Trigger/Content`.

### `Avatar` family (avatar.tsx)
`Avatar`, `AvatarImage` (hides on error), `AvatarFallback` (gray circle with initials).

### `Skeleton` (skeleton.tsx)
`animate-pulse` gray block placeholder.

### `Form` family (form.tsx — react-hook-form shadcn-style bindings)
`Form`, `FormField` (`{ name, render }` wrapping `Controller`), `FormItem`, `FormLabel`,
`FormControl` (Slot cloneElement), `FormDescription`, `FormMessage`, `useFormField`.
**Currently unused by any page** (pages use `useForm`/`Controller` manually or plain state).

## Vocabulary & display helpers

- Statuses/types/options all come from `src/lib/constants` (`EQUIPMENT_STATUSES`,
  `WORK_ORDER_STATUSES`, `PRIORITY_LEVELS`, `CRITICALITY_LEVELS`, `BREAKDOWN_STATUSES`,
  `SPARE_PART_CATEGORIES`, `SPARE_PART_UNITS`, `STOCK_MOVEMENT_TYPES`, `FREQUENCY_TYPES`,
  `BREAKDOWN_CATEGORIES`, `STOCK_LOCATION_TYPES`, `SHARED_TOOLS`, `SIDEBAR_ITEMS`,
  `APP_NAME` etc.). Each entry exposes `{ value, label, color? }` for direct `StatusBadge` use.
- Formatters in `src/lib/utils`: `cn`, `formatDate`, `formatDateTime`, `formatCurrency`,
  `formatNumber`, `generateCode(prefix, year, sequence, pad?)`, `getInitials`, `truncate`,
  `timeAgo`.

## Hooks (`src/hooks`)

- `useUser()` → `{ user, profile, isLoading }`
- `usePermissions()` → `{ permissions, hasPermission, canView, canCreate, canEdit,
  canDelete, canManage, isLoading }`
- `useOrganization()` → `{ organization, plant, plants, setSelectedPlant, isLoading }`
- `useDebouncedValue(value, delay=400)` → debounced value

See [CONVENTIONS](CONVENTIONS.md) for usage rules and [KNOWN-GAPS](KNOWN-GAPS.md) for deviations.