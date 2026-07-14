using Microsoft.EntityFrameworkCore;
using ClosedXML.Excel;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Backend.Data;
using Backend.Models;
using Backend.Models.DTOs;
using Backend.Models.Enums;

namespace Backend.Modules.TaskManagement;

public class ReportService : IReportService
{
    private readonly AppDbContext _db;

    public ReportService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ApiResponseDTO<KpiTrackingDTO>> GetKpiTrackingAsync(
        Guid requestUserId,
        UserRole requestUserRole,
        Guid? requestUserDepartmentId,
        KpiFilterDTO? filters = null)
    {
        var dateStart = filters?.DateRangeStart ?? DateTime.UtcNow.AddMonths(-1);
        var dateEnd = filters?.DateRangeEnd ?? DateTime.UtcNow;

        var query = _db.Tasks
            .Include(t => t.Assignments)
                .ThenInclude(a => a.AssignedUser)
                    .ThenInclude(u => u!.Department)
            .Where(t => t.Status == Models.Enums.TaskStatus.Completed)
            .Where(t => t.UpdatedAt >= dateStart && t.UpdatedAt <= dateEnd);

        if (requestUserRole == UserRole.Coordinator && requestUserDepartmentId.HasValue)
            query = query.Where(t => t.AssignedDepartmentId == requestUserDepartmentId.Value);

        if (filters?.EmployeeId.HasValue == true)
            query = query.Where(t => t.Assignments.Any(a => a.AssignedUserId == filters.EmployeeId.Value));

        var completedTasks = await query.ToListAsync();

        if (completedTasks.Count == 0)
            return ApiResponseDTO<KpiTrackingDTO>.Failure("No completed tasks found for the selected criteria.");

        var employeeKpis = completedTasks
            .SelectMany(t => t.Assignments.Select(a => new
            {
                a.AssignedUserId,
                a.AssignedUser,
                IsOnTime = t.UpdatedAt <= (t.RevisedDeadline ?? t.Deadline)
            }))
            .GroupBy(x => x.AssignedUserId)
            .Select(g =>
            {
                var first = g.First();
                var total = g.Count();
                var onTime = g.Count(x => x.IsOnTime);
                var late = total - onTime;

                return new EmployeeKpiDTO
                {
                    EmployeeId = g.Key,
                    EmployeeName = first.AssignedUser is not null
                        ? $"{first.AssignedUser.FirstName} {first.AssignedUser.LastName}".Trim()
                        : "Unknown",
                    EmployeeNumber = first.AssignedUser?.EmployeeNumber ?? "",
                    Department = first.AssignedUser?.Department?.Name ?? "",
                    TotalCompleted = total,
                    OnTimeCount = onTime,
                    LateCount = late,
                    OnTimeRate = total > 0 ? Math.Round((double)onTime / total * 100, 1) : 0,
                    LateRate = total > 0 ? Math.Round((double)late / total * 100, 1) : 0
                };
            })
            .OrderByDescending(k => k.OnTimeRate)
            .ToList();

        var totalCompleted = employeeKpis.Sum(k => k.TotalCompleted);
        var totalOnTime = employeeKpis.Sum(k => k.OnTimeCount);
        var totalLate = employeeKpis.Sum(k => k.LateCount);

        var result = new KpiTrackingDTO
        {
            PeriodStart = dateStart,
            PeriodEnd = dateEnd,
            TotalCompletedTasks = totalCompleted,
            TotalOnTimeTasks = totalOnTime,
            TotalLateTasks = totalLate,
            OverallOnTimeRate = totalCompleted > 0 ? Math.Round((double)totalOnTime / totalCompleted * 100, 1) : 0,
            OverallLateRate = totalCompleted > 0 ? Math.Round((double)totalLate / totalCompleted * 100, 1) : 0,
            EmployeeKpis = employeeKpis
        };

        return ApiResponseDTO<KpiTrackingDTO>.Success(result);
    }

    public async Task<ApiResponseDTO<PerformanceReportDTO>> GeneratePerformanceReportAsync(
        PerformanceReportFilterDTO filters,
        Guid requestUserId,
        UserRole requestUserRole,
        Guid? requestUserDepartmentId)
    {
        var (dateStart, dateEnd) = CalculateDateRange(filters.Period, filters.DateRangeStart, filters.DateRangeEnd);

        var query = _db.Tasks
            .Include(t => t.Assignments)
                .ThenInclude(a => a.AssignedUser)
                    .ThenInclude(u => u!.Department)
            .Include(t => t.AssignedDepartment)
            .Where(t => t.Status == Models.Enums.TaskStatus.Completed)
            .Where(t => t.UpdatedAt >= dateStart && t.UpdatedAt <= dateEnd);

        if (requestUserRole == UserRole.Coordinator && requestUserDepartmentId.HasValue)
            query = query.Where(t => t.AssignedDepartmentId == requestUserDepartmentId.Value);

        if (filters.DepartmentId.HasValue)
            query = query.Where(t => t.AssignedDepartmentId == filters.DepartmentId.Value);

        if (filters.EmployeeId.HasValue)
            query = query.Where(t => t.Assignments.Any(a => a.AssignedUserId == filters.EmployeeId.Value));

        var completedTasks = await query.ToListAsync();

        if (completedTasks.Count == 0)
            return ApiResponseDTO<PerformanceReportDTO>.Failure("No records found for the selected period.");

        var employeeBreakdown = completedTasks
            .SelectMany(t => t.Assignments.Select(a => new
            {
                a.AssignedUserId,
                a.AssignedUser,
                IsOnTime = t.UpdatedAt <= (t.RevisedDeadline ?? t.Deadline)
            }))
            .GroupBy(x => x.AssignedUserId)
            .Select(g =>
            {
                var first = g.First();
                var total = g.Count();
                var onTime = g.Count(x => x.IsOnTime);
                var late = total - onTime;

                return new EmployeePerformanceDTO
                {
                    EmployeeId = g.Key,
                    EmployeeName = first.AssignedUser is not null
                        ? $"{first.AssignedUser.FirstName} {first.AssignedUser.LastName}".Trim()
                        : "Unknown",
                    EmployeeNumber = first.AssignedUser?.EmployeeNumber ?? "",
                    Department = first.AssignedUser?.Department?.Name ?? "",
                    Role = first.AssignedUser?.Role.ToString() ?? "",
                    TotalCompleted = total,
                    OnTimeCount = onTime,
                    LateCount = late,
                    OnTimeRate = total > 0 ? Math.Round((double)onTime / total * 100, 1) : 0,
                    LateRate = total > 0 ? Math.Round((double)late / total * 100, 1) : 0
                };
            })
            .OrderByDescending(e => e.OnTimeRate)
            .ToList();

        var totalCompleted = employeeBreakdown.Sum(e => e.TotalCompleted);
        var totalOnTime = employeeBreakdown.Sum(e => e.OnTimeCount);
        var totalLate = employeeBreakdown.Sum(e => e.LateCount);

        string? deptName = null;
        if (filters.DepartmentId.HasValue)
        {
            deptName = await _db.Departments
                .Where(d => d.Id == filters.DepartmentId.Value)
                .Select(d => d.Name)
                .FirstOrDefaultAsync();
        }

        string? empName = null;
        if (filters.EmployeeId.HasValue)
        {
            empName = await _db.Users
                .Where(u => u.Id == filters.EmployeeId.Value)
                .Select(u => $"{u.FirstName} {u.LastName}")
                .FirstOrDefaultAsync();
        }

        var report = new PerformanceReportDTO
        {
            Period = filters.Period,
            DateRangeStart = dateStart,
            DateRangeEnd = dateEnd,
            DepartmentName = deptName,
            EmployeeName = empName,
            TotalCompletedTasks = totalCompleted,
            OverallOnTimeRate = totalCompleted > 0 ? Math.Round((double)totalOnTime / totalCompleted * 100, 1) : 0,
            OverallLateRate = totalCompleted > 0 ? Math.Round((double)totalLate / totalCompleted * 100, 1) : 0,
            EmployeeBreakdown = employeeBreakdown
        };

        return ApiResponseDTO<PerformanceReportDTO>.Success(report);
    }

    public async Task<ApiResponseDTO<byte[]>> ExportReportAsync(
        PerformanceReportDTO reportData,
        ExportFormat format)
    {
        byte[] fileBytes;
        string contentType;
        string fileName;

        switch (format)
        {
            case ExportFormat.Excel:
                fileBytes = GenerateExcelReport(reportData);
                contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                fileName = $"Performance_Report_{reportData.DateRangeStart:yyyyMMdd}_{reportData.DateRangeEnd:yyyyMMdd}.xlsx";
                break;

            case ExportFormat.Pdf:
                fileBytes = GeneratePdfReport(reportData);
                contentType = "application/pdf";
                fileName = $"Performance_Report_{reportData.DateRangeStart:yyyyMMdd}_{reportData.DateRangeEnd:yyyyMMdd}.pdf";
                break;

            default:
                return ApiResponseDTO<byte[]>.Failure("Unsupported export format.");
        }

        return ApiResponseDTO<byte[]>.Success(fileBytes, $"Report generated successfully|{fileName}|{contentType}");
    }

    public async Task<ApiResponseDTO<EmployeePerformanceSummaryDTO>> GetEmployeePerformanceSummaryAsync(
        Guid employeeId,
        EmployeePerformanceFilterDTO? filters,
        Guid requestUserId,
        UserRole requestUserRole,
        Guid? requestUserDepartmentId)
    {
        var employee = await _db.Users
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Id == employeeId);

        if (employee is null)
            return ApiResponseDTO<EmployeePerformanceSummaryDTO>.Failure("Employee not found.");

        var dateStart = filters?.DateRangeStart ?? DateTime.UtcNow.AddMonths(-1);
        var dateEnd = filters?.DateRangeEnd ?? DateTime.UtcNow;

        var completedTasks = await _db.Tasks
            .Include(t => t.Assignments)
            .Where(t => t.Status == Models.Enums.TaskStatus.Completed)
            .Where(t => t.Assignments.Any(a => a.AssignedUserId == employeeId))
            .Where(t => t.UpdatedAt >= dateStart && t.UpdatedAt <= dateEnd)
            .ToListAsync();

        if (requestUserRole == UserRole.Coordinator && requestUserDepartmentId.HasValue)
            completedTasks = completedTasks
                .Where(t => t.AssignedDepartmentId == requestUserDepartmentId.Value)
                .ToList();

        var onTimeCount = completedTasks
            .Count(t => t.UpdatedAt <= (t.RevisedDeadline ?? t.Deadline));
        var lateCount = completedTasks.Count - onTimeCount;
        var totalCompleted = completedTasks.Count;

        var recommendations = await _db.Recommendations
            .Include(r => r.Coordinator)
            .Where(r => r.AssigneeId == employeeId)
            .Where(r => r.CreatedAt >= dateStart && r.CreatedAt <= dateEnd)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var summary = new EmployeePerformanceSummaryDTO
        {
            EmployeeId = employee.Id,
            EmployeeName = $"{employee.FirstName} {employee.LastName}".Trim(),
            EmployeeNumber = employee.EmployeeNumber,
            Department = employee.Department?.Name ?? "",
            Role = employee.Role.ToString(),
            PeriodStart = dateStart,
            PeriodEnd = dateEnd,
            TotalCompletedTasks = totalCompleted,
            OnTimeCount = onTimeCount,
            LateCount = lateCount,
            SlaComplianceRate = totalCompleted > 0
                ? Math.Round((double)onTimeCount / totalCompleted * 100, 1)
                : 0,
            Recommendations = recommendations.Select(r => new RecommendationSummaryDTO
            {
                RecommendationId = r.Id,
                Category = r.Category.ToString(),
                Notes = r.Notes,
                CoordinatorName = r.Coordinator is not null
                    ? $"{r.Coordinator.FirstName} {r.Coordinator.LastName}".Trim()
                    : "Unknown",
                CreatedAt = r.CreatedAt
            }).ToList()
        };

        return ApiResponseDTO<EmployeePerformanceSummaryDTO>.Success(summary);
    }

    private (DateTime Start, DateTime End) CalculateDateRange(
        ReportPeriod period, DateTime? explicitStart, DateTime? explicitEnd)
    {
        if (explicitStart.HasValue && explicitEnd.HasValue)
            return (explicitStart.Value, explicitEnd.Value);

        var now = DateTime.UtcNow;

        switch (period)
        {
            case ReportPeriod.Weekly:
                var daysSinceMonday = ((int)now.DayOfWeek + 6) % 7;
                var weekStart = now.Date.AddDays(-daysSinceMonday);
                var weekEnd = weekStart.AddDays(6).AddHours(23).AddMinutes(59).AddSeconds(59);
                return (weekStart, weekEnd);

            case ReportPeriod.Monthly:
                var monthStart = new DateTime(now.Year, now.Month, 1);
                var monthEnd = monthStart.AddMonths(1).AddSeconds(-1);
                return (monthStart, monthEnd);

            default:
                var defaultStart = now.AddMonths(-1);
                return (defaultStart, now);
        }
    }

    private byte[] GenerateExcelReport(PerformanceReportDTO report)
    {
        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Performance Report");

        worksheet.Cell(1, 1).Value = "STARS Performance Report";
        worksheet.Cell(1, 1).Style.Font.Bold = true;
        worksheet.Cell(1, 1).Style.Font.FontSize = 16;
        worksheet.Range(1, 1, 1, 8).Merge();

        worksheet.Cell(2, 1).Value = $"Period: {report.DateRangeStart:MMM dd, yyyy} - {report.DateRangeEnd:MMM dd, yyyy}";
        worksheet.Range(2, 1, 2, 8).Merge();

        worksheet.Cell(4, 1).Value = "Summary";
        worksheet.Cell(4, 1).Style.Font.Bold = true;
        worksheet.Cell(5, 1).Value = "Total Completed Tasks:";
        worksheet.Cell(5, 2).Value = report.TotalCompletedTasks;
        worksheet.Cell(6, 1).Value = "Overall On-Time Rate:";
        worksheet.Cell(6, 2).Value = $"{report.OverallOnTimeRate}%";
        worksheet.Cell(7, 1).Value = "Overall Late Rate:";
        worksheet.Cell(7, 2).Value = $"{report.OverallLateRate}%";

        var headerRow = 9;
        var headers = new[] { "Employee Name", "Employee #", "Department", "Role", "Completed", "On-Time", "Late", "On-Time Rate" };
        for (int i = 0; i < headers.Length; i++)
        {
            var cell = worksheet.Cell(headerRow, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.LightBlue;
        }

        var dataRow = headerRow + 1;
        foreach (var emp in report.EmployeeBreakdown)
        {
            worksheet.Cell(dataRow, 1).Value = emp.EmployeeName;
            worksheet.Cell(dataRow, 2).Value = emp.EmployeeNumber;
            worksheet.Cell(dataRow, 3).Value = emp.Department;
            worksheet.Cell(dataRow, 4).Value = emp.Role;
            worksheet.Cell(dataRow, 5).Value = emp.TotalCompleted;
            worksheet.Cell(dataRow, 6).Value = emp.OnTimeCount;
            worksheet.Cell(dataRow, 7).Value = emp.LateCount;
            worksheet.Cell(dataRow, 8).Value = $"{emp.OnTimeRate}%";
            dataRow++;
        }

        worksheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    private byte[] GeneratePdfReport(PerformanceReportDTO report)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(30);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Header().Column(column =>
                {
                    column.Item().Text("STARS Performance Report")
                        .FontSize(20).Bold();
                    column.Item().Text($"Period: {report.DateRangeStart:MMM dd, yyyy} - {report.DateRangeEnd:MMM dd, yyyy}")
                        .FontSize(12);
                    column.Item().PaddingTop(5).LineHorizontal(1);
                });

                page.Content().PaddingVertical(10).Column(column =>
                {
                    column.Item().PaddingBottom(10).Text("Summary").FontSize(14).Bold();

                    column.Item().Row(row =>
                    {
                        row.RelativeItem().Text($"Total Completed: {report.TotalCompletedTasks}");
                        row.RelativeItem().Text($"On-Time Rate: {report.OverallOnTimeRate}%");
                        row.RelativeItem().Text($"Late Rate: {report.OverallLateRate}%");
                    });

                    column.Item().PaddingTop(15).Text("Employee Breakdown").FontSize(14).Bold();

                    column.Item().PaddingTop(5).Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(3);
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(1);
                            columns.RelativeColumn(1);
                            columns.RelativeColumn(1);
                            columns.RelativeColumn(1);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Employee").Bold();
                            header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Department").Bold();
                            header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Role").Bold();
                            header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Done").Bold();
                            header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("On-Time").Bold();
                            header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Late").Bold();
                            header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Rate").Bold();
                        });

                        foreach (var emp in report.EmployeeBreakdown)
                        {
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5).Text(emp.EmployeeName);
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5).Text(emp.Department);
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5).Text(emp.Role);
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5).Text(emp.TotalCompleted.ToString());
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5).Text(emp.OnTimeCount.ToString());
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5).Text(emp.LateCount.ToString());
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5).Text($"{emp.OnTimeRate}%");
                        }
                    });
                });

                page.Footer().AlignCenter().Text(x =>
                {
                    x.Span("Generated: ");
                    x.Span(DateTime.UtcNow.ToString("MMM dd, yyyy HH:mm UTC"));
                    x.Span(" | Page ");
                    x.CurrentPageNumber();
                    x.Span(" of ");
                    x.TotalPages();
                });
            });
        });

        using var stream = new MemoryStream();
        document.GeneratePdf(stream);
        return stream.ToArray();
    }
}
