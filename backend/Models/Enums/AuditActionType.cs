namespace Backend.Models.Enums;

public enum AuditActionType
{
    Login,
    Logout,
    Create,
    Read,
    Update,
    Delete,
    StatusChange,
    Upload,
    Export,
    AccessDenied,
    BlockedAction,
    DuplicateOverride
}
