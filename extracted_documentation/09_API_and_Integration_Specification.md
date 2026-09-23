# API & Integration Specification

## API Principles

-   REST/JSON initially.
-   Version APIs, e.g. /api/v1/.
-   Consistent error format.
-   Pagination.
-   Filtering.
-   Sorting.
-   Organization/plant authorization on every protected endpoint.

## Core API Groups

-   /auth
-   /organizations
-   /plants
-   /equipment
-   /criticality
-   /maintenance-plans
-   /work-requests
-   /work-orders
-   /breakdowns
-   /inspections
-   /calibration
-   /spares
-   /vendors
-   /shutdowns
-   /reports
-   /documents
-   /users
-   /notifications

## Future Integrations

Architecture should leave room for: - Smart HRMS - PowerEMS - IoT
gateway - PLC/SCADA - ERP/accounting - Procurement - Email - WhatsApp -
SSO

## Initial Integration Policy

Do not make these integrations mandatory for V1. Core functionality must
work independently.
