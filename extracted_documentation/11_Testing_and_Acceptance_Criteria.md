# Testing & Acceptance Criteria

## Functional Testing

Every module must test: - Create - Read - Update - Archive/delete
behavior - Search - Filter - Sort - Pagination - Validation -
Permissions - Export where applicable

## Workflow Testing

Verify: - PM creation → schedule → execution → verification → closure. -
Breakdown → work order → repair → restoration → closure. - Calibration →
result → certificate → next due date. - Inspection → finding →
corrective action → closure. - Spare issue → stock deduction → work
order linkage.

## Security Testing

-   Cross-tenant access must fail.
-   Unauthorized actions must fail.
-   Direct API calls must enforce permissions.
-   Private files must not be publicly accessible.

## Data Integrity

-   Transactional records cannot be silently overwritten.
-   Historical records remain traceable.
-   Stock cannot become negative unless the organization explicitly
    permits it.
-   Closed work orders cannot be modified without controlled reopening.

## Acceptance

A module is production-ready only when: 1. Business workflow works
end-to-end. 2. Permissions are verified. 3. Audit records are created.
4. Error states are handled. 5. Reports reflect transaction data
correctly. 6. Mobile/responsive behavior is acceptable for intended
users.
