# Roles & Permissions Matrix

  ----------------------------------------------------------------------------------------------------------------
  Module         Admin   Plant     Maintenance   Engineer       Supervisor   Technician       Store       Viewer
                         Manager   Manager                                                                
  -------------- ------- --------- ------------- -------------- ------------ ---------------- ----------- --------
  Organization   Full    View      View          View           View         View             View        View

  Equipment      Full    Full      Full          Create/Edit    Edit         View             View        View

  Criticality    Full    Approve   Full          Propose        View         View             View        View

  PM Plans       Full    Approve   Full          Create/Edit    Execute      Execute          View        View

  Breakdown      Full    View      Full          Create/Edit    Manage       Report/Execute   View        View

  Work Orders    Full    Approve   Full          Create/Edit    Manage       Execute          Parts       View

  Calibration    Full    View      Full          Manage         Execute      Execute          View        View

  Inventory      Full    View      View          Request        Request      Request          Full        View

  Vendors        Full    Approve   Full          View           View         View             Manage      View

  Shutdown       Full    Approve   Full          Plan/Execute   Execute      Execute          Support     View

  Reports        Full    Full      Full          Relevant       Relevant     Own              Inventory   View

  Users/Roles    Full    View      View          View           View         View             View        View

  Audit Logs     Full    View      View          View           View         View             View        View
  ----------------------------------------------------------------------------------------------------------------

Permissions should be granular: - View - Create - Edit -
Delete/Archive - Submit - Approve - Assign - Execute - Verify - Close -
Export

Actual role permissions must be configurable per organization.
