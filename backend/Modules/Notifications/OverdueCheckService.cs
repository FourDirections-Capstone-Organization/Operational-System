using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Backend.Models.Enums;
using Backend.Modules.Email;
using Backend.Modules.TaskManagement;
using Task = System.Threading.Tasks.Task;
using TaskStatus = Backend.Models.Enums.TaskStatus;

namespace Backend.Modules.Notifications;

public class OverdueCheckService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<OverdueCheckService> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(15);

    public OverdueCheckService(IServiceProvider serviceProvider, ILogger<OverdueCheckService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Overdue Check Service started. Checking every {Interval} minutes",
            _checkInterval.TotalMinutes);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckOverdueTasksAsync(stoppingToken);
                await CheckDeadlineWarningsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during overdue/deadline check");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }
    }

    private async Task CheckOverdueTasksAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
        var auditLogService = scope.ServiceProvider.GetRequiredService<IAuditLogService>();

        var now = DateTime.UtcNow;

        var overdueTasks = await db.Tasks
            .Include(t => t.Assignments)
            .Include(t => t.CreatedBy)
            .Where(t => (t.RevisedDeadline ?? t.Deadline) < now
                && t.Status != TaskStatus.Completed
                && t.Status != TaskStatus.Cancelled)
            .ToListAsync(stoppingToken);

        foreach (var task in overdueTasks)
        {
            var alreadyNotified = await db.Notifications
                .AnyAsync(n => n.RelatedTaskId == task.Id
                    && n.Type == NotificationType.TaskOverdue, stoppingToken);

            if (alreadyNotified)
                continue;

            var recipientIds = new List<Guid>();

            foreach (var assignment in task.Assignments)
            {
                recipientIds.Add(assignment.AssignedUserId);
            }

            if (task.CreatedById != Guid.Empty)
                recipientIds.Add(task.CreatedById);

            var managers = await db.Users
                .Where(u => u.Role == UserRole.Manager && u.IsActive && !u.IsDeactivated)
                .Select(u => u.Id)
                .ToListAsync(stoppingToken);

            recipientIds.AddRange(managers);

            recipientIds = recipientIds.Distinct().ToList();

            var taskTitle = task.Title.Length > 50 ? task.Title[..50] + "..." : task.Title;
            var deadlineStr = task.Deadline.ToString("MMM dd, yyyy h:mm tt");

            // Send in-app notifications
            await notificationService.SendBulkNotificationAsync(
                recipientIds,
                NotificationType.TaskOverdue,
                "Task Overdue",
                $"Task '{taskTitle}' is overdue. Deadline was {deadlineStr}.",
                task.Id);

            // Send email escalation to each recipient (req 4)
            var recipients = await db.Users
                .Where(u => recipientIds.Contains(u.Id))
                .ToListAsync(stoppingToken);

            foreach (var recipient in recipients)
            {
                try
                {
                    var fullName = $"{recipient.FirstName} {recipient.LastName}".Trim();
                    await emailService.SendOverdueEscalationEmailAsync(
                        recipient.Email, fullName, taskTitle, task.Deadline);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to send escalation email to {Email} for task {TaskId}",
                        recipient.Email, task.Id);
                }
            }

            // Record in audit log (req 5)
            await auditLogService.LogAsync(
                null,
                AuditActionType.StatusChange,
                "Task",
                task.Id,
                null,
                $"Overdue escalation sent for task '{taskTitle}'. Deadline was {deadlineStr}. Notified {recipientIds.Count} user(s).",
                "Escalation");

            _logger.LogInformation("Overdue escalation sent for task {TaskId}: {TaskTitle} — notified {Count} user(s)",
                task.Id, task.Title, recipientIds.Count);
        }
    }

    private async Task CheckDeadlineWarningsAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();
        var settingsService = scope.ServiceProvider.GetRequiredService<INotificationSettingsService>();

        var settings = await settingsService.GetSettingsEntityAsync();
        var now = DateTime.UtcNow;

        var warningThreshold = settings.DeadlineWarningUnit == DeadlineWarningUnit.Days
            ? TimeSpan.FromDays(settings.DeadlineWarningValue)
            : TimeSpan.FromHours(settings.DeadlineWarningValue);

        var activeTasks = await db.Tasks
            .Include(t => t.Assignments)
            .Where(t => t.Status != TaskStatus.Completed
                && t.Status != TaskStatus.Cancelled
                && t.Deadline > now)
            .ToListAsync(stoppingToken);

        foreach (var task in activeTasks)
        {
            var remainingTime = task.Deadline - now;

            if (remainingTime > warningThreshold)
                continue;

            var alreadyWarned = await db.Notifications
                .AnyAsync(n => n.RelatedTaskId == task.Id
                    && n.Type == NotificationType.DeadlineWarning, stoppingToken);

            if (alreadyWarned)
                continue;

            var assigneeIds = task.Assignments.Select(a => a.AssignedUserId).ToList();

            if (assigneeIds.Count == 0)
                continue;

            var taskTitle = task.Title.Length > 50 ? task.Title[..50] + "..." : task.Title;
            var remainingFormatted = remainingTime.TotalDays >= 1
                ? $"{remainingTime.TotalDays:F1} days"
                : $"{remainingTime.TotalHours:F1} hours";

            await notificationService.SendBulkNotificationAsync(
                assigneeIds,
                NotificationType.DeadlineWarning,
                "Deadline Approaching",
                $"Task '{taskTitle}' is due in {remainingFormatted} ({task.Deadline:MMM dd, yyyy h:mm tt}).",
                task.Id);

            _logger.LogInformation("Deadline warning sent for task {TaskId}: due in {Remaining}",
                task.Id, remainingFormatted);
        }
    }
}
