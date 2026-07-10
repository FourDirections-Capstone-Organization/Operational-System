namespace Backend.Models.Enums;

public enum NotificationType
{
    TaskAssigned,
    TaskUpdated,
    TaskOverdue,
    DeadlineWarning,
    PushBack,
    TaskCancelled,
    TaskResumed,
    TaskOnHold,
    TaskCompleted,
    TemplateTaskUnassigned
}