using System.Security.Claims;
using Backend.Modules.TaskManagement;

namespace Backend.Middleware;

public class AuditLogAccessMiddleware
{
    private readonly RequestDelegate _next;

    public AuditLogAccessMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, IAuditLogService auditLogService)
    {
        await _next(context);

        if (context.Response.StatusCode == 403 &&
            context.Request.Path.StartsWithSegments("/api/audit-logs") &&
            context.Request.Method == "GET")
        {
            var userId = GetUserIdFromClaims(context);
            var ipAddress = GetIpAddress(context);

            await auditLogService.LogAccessDeniedAsync(userId, ipAddress, "AuditLog");
        }
    }

    private static Guid? GetUserIdFromClaims(HttpContext context)
    {
        var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userIdGuid))
            return null;
        return userIdGuid;
    }

    private static string? GetIpAddress(HttpContext context)
    {
        var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedFor))
            return forwardedFor.Split(',').First().Trim();

        return context.Connection.RemoteIpAddress?.ToString();
    }
}

public static class AuditLogAccessMiddlewareExtensions
{
    public static IApplicationBuilder UseAuditLogAccessLogging(
        this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<AuditLogAccessMiddleware>();
    }
}
