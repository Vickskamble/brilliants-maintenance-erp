# Security, Audit & Backup Specification

## Authentication

-   Secure login.
-   Password hashing through managed authentication.
-   Optional MFA in later phase.
-   Session expiry.
-   Account lock/rate limiting where supported.

## Authorization

Use RBAC with organization and plant scope.

## Tenant Isolation

A user from Organization A must never access Organization B records.

## Audit Trail

Record: - User - Timestamp - Entity - Record ID - Action - Old value -
New value - IP/device metadata where legally and technically appropriate

## File Security

-   Private document storage by default.
-   Signed/temporary download URLs.
-   File type and size validation.
-   Virus/malware scanning can be added later.

## Backup

-   Automated database backups.
-   Point-in-time recovery where supported.
-   Document backup strategy.
-   Recovery testing periodically.

## Data Retention

Transactional maintenance history should be retained according to
customer requirements and applicable legal/contractual requirements.

## Security Principles

-   Least privilege
-   Server-side authorization
-   Input validation
-   SQL injection protection
-   XSS protection
-   CSRF protection where applicable
-   Secure file handling
-   Secrets never committed to source control
