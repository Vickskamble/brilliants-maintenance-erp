# Seed & Master Data Strategy

## System Seed Data

Safe to seed: - Permission definitions - System roles - Basic status
values - Maintenance type values - Work order types - Priority values -
Generic units

## Customer Data

Never hardcode: - Customer companies - Equipment - Employees - Vendors -
Actual stock - Production data

Customer-specific data must be created through onboarding/import.

## Import Strategy

Provide CSV/Excel templates for: - Equipment - Components -
Instruments - Spares - Vendors - Opening stock - PM plans

Import process: 1. Upload 2. Validate 3. Show errors 4. Preview 5.
Confirm 6. Import 7. Generate import log

## Data Quality

Required master data should be validated before transactions can be
created.
