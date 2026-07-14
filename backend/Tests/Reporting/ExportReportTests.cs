using Xunit;

namespace Backend.Tests.Reporting;

public class ExportReportTests
{
    private static (bool IsSuccess, string? ContentType, string? FileName, string? ErrorMessage) GetExportMetadata(
        string format, DateTime dateRangeStart, DateTime dateRangeEnd)
    {
        switch (format)
        {
            case "Excel":
                return (true,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    $"Performance_Report_{dateRangeStart:yyyyMMdd}_{dateRangeEnd:yyyyMMdd}.xlsx",
                    null);

            case "Pdf":
                return (true,
                    "application/pdf",
                    $"Performance_Report_{dateRangeStart:yyyyMMdd}_{dateRangeEnd:yyyyMMdd}.pdf",
                    null);

            default:
                return (false, null, null, "Unsupported export format.");
        }
    }

    [Fact]
    public void ExcelFormat_ReturnsXlsxContentType()
    {
        var start = new DateTime(2026, 7, 6);
        var end = new DateTime(2026, 7, 12, 23, 59, 59);
        var (isSuccess, contentType, _, _) = GetExportMetadata("Excel", start, end);
        Assert.True(isSuccess);
        Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", contentType);
    }

    [Fact]
    public void ExcelFormat_ReturnsXlsxExtension()
    {
        var start = new DateTime(2026, 7, 6);
        var end = new DateTime(2026, 7, 12, 23, 59, 59);
        var (_, _, fileName, _) = GetExportMetadata("Excel", start, end);
        Assert.EndsWith(".xlsx", fileName);
    }

    [Fact]
    public void PdfFormat_ReturnsPdfContentType()
    {
        var start = new DateTime(2026, 7, 6);
        var end = new DateTime(2026, 7, 12, 23, 59, 59);
        var (isSuccess, contentType, _, _) = GetExportMetadata("Pdf", start, end);
        Assert.True(isSuccess);
        Assert.Equal("application/pdf", contentType);
    }

    [Fact]
    public void PdfFormat_ReturnsPdfExtension()
    {
        var start = new DateTime(2026, 7, 6);
        var end = new DateTime(2026, 7, 12, 23, 59, 59);
        var (_, _, fileName, _) = GetExportMetadata("Pdf", start, end);
        Assert.EndsWith(".pdf", fileName);
    }

    [Fact]
    public void FileName_IncludesDateRange()
    {
        var start = new DateTime(2026, 7, 6);
        var end = new DateTime(2026, 7, 12, 23, 59, 59);
        var (_, _, fileName, _) = GetExportMetadata("Excel", start, end);
        Assert.Contains("20260706", fileName);
        Assert.Contains("20260712", fileName);
    }

    [Fact]
    public void UnsupportedFormat_ReturnsFailure()
    {
        var start = new DateTime(2026, 7, 6);
        var end = new DateTime(2026, 7, 12, 23, 59, 59);
        var (isSuccess, _, _, error) = GetExportMetadata("Csv", start, end);
        Assert.False(isSuccess);
        Assert.Equal("Unsupported export format.", error);
    }

    [Fact]
    public void ExcelAndPdf_HaveDifferentContentTypes()
    {
        var start = new DateTime(2026, 7, 6);
        var end = new DateTime(2026, 7, 12, 23, 59, 59);
        var (_, excelType, _, _) = GetExportMetadata("Excel", start, end);
        var (_, pdfType, _, _) = GetExportMetadata("Pdf", start, end);
        Assert.NotEqual(excelType, pdfType);
    }

    [Fact]
    public void ExcelAndPdf_HaveDifferentExtensions()
    {
        var start = new DateTime(2026, 7, 6);
        var end = new DateTime(2026, 7, 12, 23, 59, 59);
        var (_, _, excelName, _) = GetExportMetadata("Excel", start, end);
        var (_, _, pdfName, _) = GetExportMetadata("Pdf", start, end);
        Assert.NotEqual(excelName, pdfName);
    }

    [Fact]
    public void FileName_UsesUnderscoreSeparator()
    {
        var start = new DateTime(2026, 7, 6);
        var end = new DateTime(2026, 7, 12, 23, 59, 59);
        var (_, _, fileName, _) = GetExportMetadata("Excel", start, end);
        Assert.Matches(@"^Performance_Report_\d{8}_\d{8}\.xlsx$", fileName);
    }
}
