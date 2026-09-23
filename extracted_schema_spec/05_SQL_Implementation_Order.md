# SQL Implementation Order

Implement schema in this order to avoid foreign-key dependency problems.

1.  Extensions / UUID support
2.  organizations
3.  plants
4.  departments
5.  sections
6.  areas
7.  locations
8.  cost_centers
9.  profiles
10. roles
11. permissions
12. role_permissions
13. user_roles
14. vendors
15. asset_categories
16. criticality_profiles
17. equipment
18. equipment_components
19. equipment_status_history
20. failure_modes
21. failure_causes
22. spare_categories
23. spare_parts
24. stock_locations
25. spare_stocks
26. spare_equipment_map
27. maintenance_plans
28. maintenance_plan_tasks
29. maintenance_schedules
30. work_requests
31. work_orders
32. work_order_tasks
33. work_order_assignments
34. work_order_labor
35. work_order_costs
36. breakdowns
37. corrective_actions
38. root_cause_analyses
39. inspection_templates
40. inspection_template_items
41. inspections
42. inspection_results
43. instruments
44. calibration_records
45. contracts
46. service_visits
47. shutdown_events
48. shutdown_jobs
49. documents
50. document_links
51. approval_rules
52. approval_requests
53. audit_logs
54. notifications

## Migration Rules

-   Keep each logical module in a separate migration where practical.
-   Never edit an already-applied production migration; create a new
    migration.
-   Seed only non-business system data.
-   Do not hardcode demo customer data into production migrations.
