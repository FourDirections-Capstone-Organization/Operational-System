using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BiomarkerAlerts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ScanDateTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ScanDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uuid", nullable: true),
                    DepartmentName = table.Column<string>(type: "text", nullable: false),
                    MetricName = table.Column<string>(type: "text", nullable: false),
                    CurrentValue = table.Column<double>(type: "double precision", nullable: false),
                    ThresholdValue = table.Column<double>(type: "double precision", nullable: false),
                    Severity = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    IsAcknowledged = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BiomarkerAlerts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Departments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Departments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NotificationSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DeadlineWarningValue = table.Column<int>(type: "integer", nullable: false),
                    DeadlineWarningUnit = table.Column<int>(type: "integer", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "JobPositions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobPositions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JobPositions_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Username = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Email = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    FirstName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    MiddleName = table.Column<string>(type: "text", nullable: true),
                    LastName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Suffix = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    ContactNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Role = table.Column<int>(type: "integer", nullable: false),
                    AvailabilityStatus = table.Column<int>(type: "integer", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uuid", nullable: true),
                    JobPositionId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsDeactivated = table.Column<bool>(type: "boolean", nullable: false),
                    IsEmailVerified = table.Column<bool>(type: "boolean", nullable: false),
                    IsPasswordChanged = table.Column<bool>(type: "boolean", nullable: false),
                    EmailVerificationToken = table.Column<string>(type: "text", nullable: true),
                    EmailVerificationTokenExpiry = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PasswordResetToken = table.Column<string>(type: "text", nullable: true),
                    PasswordResetTokenExpiry = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RefreshToken = table.Column<string>(type: "text", nullable: true),
                    RefreshTokenExpiry = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastActivityAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Users_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Users_JobPositions_JobPositionId",
                        column: x => x.JobPositionId,
                        principalTable: "JobPositions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Announcements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Content = table.Column<string>(type: "character varying(5000)", maxLength: 5000, nullable: false),
                    TargetRoles = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    EffectiveDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiryDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedById = table.Column<Guid>(type: "uuid", nullable: false),
                    IsPublished = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Announcements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Announcements_Users_CreatedById",
                        column: x => x.CreatedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ActionType = table.Column<int>(type: "integer", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TargetEntity = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TargetEntityId = table.Column<Guid>(type: "uuid", nullable: true),
                    IpAddress = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    OldValue = table.Column<string>(type: "text", nullable: true),
                    NewValue = table.Column<string>(type: "text", nullable: true),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Module = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AuditLogs_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Tasks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    PriorityLevel = table.Column<int>(type: "integer", nullable: false),
                    Classification = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    AssignmentScope = table.Column<int>(type: "integer", nullable: false),
                    Deadline = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsSLALocked = table.Column<bool>(type: "boolean", nullable: false),
                    SlaRiskLevel = table.Column<int>(type: "integer", nullable: false),
                    IsConfidential = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedById = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedDepartmentId = table.Column<Guid>(type: "uuid", nullable: true),
                    HoldReason = table.Column<string>(type: "text", nullable: true),
                    CancellationReason = table.Column<string>(type: "text", nullable: true),
                    ProgressNotes = table.Column<string>(type: "text", nullable: true),
                    ReviewRemarks = table.Column<string>(type: "text", nullable: true),
                    PushBackComment = table.Column<string>(type: "text", nullable: true),
                    IsApproved = table.Column<bool>(type: "boolean", nullable: true),
                    PreviousStatus = table.Column<int>(type: "integer", nullable: true),
                    RevisedDeadline = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    HeldAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tasks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Tasks_Departments_AssignedDepartmentId",
                        column: x => x.AssignedDepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Tasks_Users_CreatedById",
                        column: x => x.CreatedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TaskTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TemplateName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    DefaultTitle = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    DefaultDescription = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    DefaultPriorityLevel = table.Column<int>(type: "integer", nullable: false),
                    DefaultClassification = table.Column<int>(type: "integer", nullable: false),
                    DefaultAssignmentScope = table.Column<int>(type: "integer", nullable: false),
                    DefaultAssigneeId = table.Column<Guid>(type: "uuid", nullable: true),
                    DefaultDepartmentId = table.Column<Guid>(type: "uuid", nullable: true),
                    RecurrenceRule = table.Column<int>(type: "integer", nullable: false),
                    RecurrenceStartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    NextGenerationDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastGeneratedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedById = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskTemplates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TaskTemplates_Departments_DefaultDepartmentId",
                        column: x => x.DefaultDepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TaskTemplates_Users_CreatedById",
                        column: x => x.CreatedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TaskTemplates_Users_DefaultAssigneeId",
                        column: x => x.DefaultAssigneeId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AnnouncementAcknowledgments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AnnouncementId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnnouncementAcknowledgments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AnnouncementAcknowledgments_Announcements_AnnouncementId",
                        column: x => x.AnnouncementId,
                        principalTable: "Announcements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AnnouncementAcknowledgments_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AnnouncementComments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AnnouncementId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Content = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnnouncementComments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AnnouncementComments_Announcements_AnnouncementId",
                        column: x => x.AnnouncementId,
                        principalTable: "Announcements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AnnouncementComments_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RecipientId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Message = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    RelatedTaskId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsRead = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Notifications_Tasks_RelatedTaskId",
                        column: x => x.RelatedTaskId,
                        principalTable: "Tasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Notifications_Users_RecipientId",
                        column: x => x.RecipientId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Recommendations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TaskId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssigneeId = table.Column<Guid>(type: "uuid", nullable: false),
                    CoordinatorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Category = table.Column<int>(type: "integer", nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Recommendations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Recommendations_Tasks_TaskId",
                        column: x => x.TaskId,
                        principalTable: "Tasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Recommendations_Users_AssigneeId",
                        column: x => x.AssigneeId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Recommendations_Users_CoordinatorId",
                        column: x => x.CoordinatorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TaskAssignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TaskId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TaskAssignments_Tasks_TaskId",
                        column: x => x.TaskId,
                        principalTable: "Tasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TaskAssignments_Users_AssignedUserId",
                        column: x => x.AssignedUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TaskAttachments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TaskId = table.Column<Guid>(type: "uuid", nullable: false),
                    FileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    FilePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    FileSize = table.Column<long>(type: "bigint", nullable: false),
                    FileType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Description = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    UploadedById = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskAttachments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TaskAttachments_Tasks_TaskId",
                        column: x => x.TaskId,
                        principalTable: "Tasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TaskAttachments_Users_UploadedById",
                        column: x => x.UploadedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TaskComments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TaskId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Content = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    AttachmentFilePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    AttachmentFileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskComments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TaskComments_Tasks_TaskId",
                        column: x => x.TaskId,
                        principalTable: "Tasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TaskComments_Users_AuthorId",
                        column: x => x.AuthorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AnnouncementAcknowledgments_AnnouncementId",
                table: "AnnouncementAcknowledgments",
                column: "AnnouncementId");

            migrationBuilder.CreateIndex(
                name: "IX_AnnouncementAcknowledgments_UserId",
                table: "AnnouncementAcknowledgments",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AnnouncementComments_AnnouncementId",
                table: "AnnouncementComments",
                column: "AnnouncementId");

            migrationBuilder.CreateIndex(
                name: "IX_AnnouncementComments_UserId",
                table: "AnnouncementComments",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Announcements_CreatedById",
                table: "Announcements",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_ActionType",
                table: "AuditLogs",
                column: "ActionType");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_Module",
                table: "AuditLogs",
                column: "Module");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_TargetEntity_TargetEntityId",
                table: "AuditLogs",
                columns: new[] { "TargetEntity", "TargetEntityId" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_Timestamp",
                table: "AuditLogs",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_UserId",
                table: "AuditLogs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_JobPositions_DepartmentId",
                table: "JobPositions",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_CreatedAt",
                table: "Notifications",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_RecipientId_IsRead",
                table: "Notifications",
                columns: new[] { "RecipientId", "IsRead" });

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_RelatedTaskId",
                table: "Notifications",
                column: "RelatedTaskId");

            migrationBuilder.CreateIndex(
                name: "IX_Recommendations_AssigneeId",
                table: "Recommendations",
                column: "AssigneeId");

            migrationBuilder.CreateIndex(
                name: "IX_Recommendations_CoordinatorId",
                table: "Recommendations",
                column: "CoordinatorId");

            migrationBuilder.CreateIndex(
                name: "IX_Recommendations_CreatedAt",
                table: "Recommendations",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Recommendations_TaskId",
                table: "Recommendations",
                column: "TaskId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskAssignments_AssignedUserId",
                table: "TaskAssignments",
                column: "AssignedUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskAssignments_TaskId_AssignedUserId",
                table: "TaskAssignments",
                columns: new[] { "TaskId", "AssignedUserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TaskAttachments_TaskId",
                table: "TaskAttachments",
                column: "TaskId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskAttachments_UploadedById",
                table: "TaskAttachments",
                column: "UploadedById");

            migrationBuilder.CreateIndex(
                name: "IX_TaskComments_AuthorId",
                table: "TaskComments",
                column: "AuthorId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskComments_CreatedAt",
                table: "TaskComments",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_TaskComments_TaskId_IsDeleted",
                table: "TaskComments",
                columns: new[] { "TaskId", "IsDeleted" });

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_AssignedDepartmentId",
                table: "Tasks",
                column: "AssignedDepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_CreatedById",
                table: "Tasks",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_TaskTemplates_CreatedById",
                table: "TaskTemplates",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_TaskTemplates_DefaultAssigneeId",
                table: "TaskTemplates",
                column: "DefaultAssigneeId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskTemplates_DefaultDepartmentId",
                table: "TaskTemplates",
                column: "DefaultDepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_DepartmentId",
                table: "Users",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_EmployeeNumber",
                table: "Users",
                column: "EmployeeNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_JobPositionId",
                table: "Users",
                column: "JobPositionId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Username",
                table: "Users",
                column: "Username",
                unique: true,
                filter: "\"Username\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AnnouncementAcknowledgments");

            migrationBuilder.DropTable(
                name: "AnnouncementComments");

            migrationBuilder.DropTable(
                name: "AuditLogs");

            migrationBuilder.DropTable(
                name: "BiomarkerAlerts");

            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropTable(
                name: "NotificationSettings");

            migrationBuilder.DropTable(
                name: "Recommendations");

            migrationBuilder.DropTable(
                name: "TaskAssignments");

            migrationBuilder.DropTable(
                name: "TaskAttachments");

            migrationBuilder.DropTable(
                name: "TaskComments");

            migrationBuilder.DropTable(
                name: "TaskTemplates");

            migrationBuilder.DropTable(
                name: "Announcements");

            migrationBuilder.DropTable(
                name: "Tasks");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "JobPositions");

            migrationBuilder.DropTable(
                name: "Departments");
        }
    }
}
