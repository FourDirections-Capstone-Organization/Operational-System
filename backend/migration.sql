CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE TABLE "BiomarkerAlerts" (
        "Id" uuid NOT NULL,
        "ScanDateTime" timestamp with time zone NOT NULL,
        "ScanDate" timestamp with time zone NOT NULL,
        "DepartmentId" uuid,
        "DepartmentName" text NOT NULL,
        "MetricName" text NOT NULL,
        "CurrentValue" double precision NOT NULL,
        "ThresholdValue" double precision NOT NULL,
        "Severity" text NOT NULL,
        "Description" text NOT NULL,
        "IsAcknowledged" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_BiomarkerAlerts" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE TABLE "Departments" (
        "Id" uuid NOT NULL,
        "Name" character varying(100) NOT NULL,
        "Description" character varying(500),
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_Departments" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE TABLE "NotificationSettings" (
        "Id" uuid NOT NULL,
        "DeadlineWarningValue" integer NOT NULL,
        "DeadlineWarningUnit" integer NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_NotificationSettings" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE TABLE "JobPositions" (
        "Id" uuid NOT NULL,
        "Name" character varying(100) NOT NULL,
        "DepartmentId" uuid NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_JobPositions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_JobPositions_Departments_DepartmentId" FOREIGN KEY ("DepartmentId") REFERENCES "Departments" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE TABLE "Users" (
        "Id" uuid NOT NULL,
        "EmployeeNumber" character varying(20) NOT NULL,
        "Username" character varying(50),
        "Email" character varying(100) NOT NULL,
        "PasswordHash" text NOT NULL,
        "FirstName" character varying(50) NOT NULL,
        "MiddleName" text,
        "LastName" character varying(50) NOT NULL,
        "Suffix" character varying(20),
        "ContactNumber" character varying(20),
        "Role" integer NOT NULL,
        "AvailabilityStatus" integer NOT NULL,
        "DepartmentId" uuid,
        "JobPositionId" uuid,
        "IsActive" boolean NOT NULL,
        "IsDeactivated" boolean NOT NULL,
        "IsEmailVerified" boolean NOT NULL,
        "IsPasswordChanged" boolean NOT NULL,
        "EmailVerificationToken" text,
        "EmailVerificationTokenExpiry" timestamp with time zone,
        "PasswordResetToken" text,
        "PasswordResetTokenExpiry" timestamp with time zone,
        "RefreshToken" text,
        "RefreshTokenExpiry" timestamp with time zone,
        "LastActivityAt" timestamp with time zone,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_Users" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Users_Departments_DepartmentId" FOREIGN KEY ("DepartmentId") REFERENCES "Departments" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_Users_JobPositions_JobPositionId" FOREIGN KEY ("JobPositionId") REFERENCES "JobPositions" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE TABLE "Announcements" (
        "Id" uuid NOT NULL,
        "Title" character varying(200) NOT NULL,
        "Content" character varying(5000) NOT NULL,
        "TargetRoles" character varying(500),
        "EffectiveDate" timestamp with time zone NOT NULL,
        "ExpiryDate" timestamp with time zone,
        "CreatedById" uuid NOT NULL,
        "IsPublished" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Announcements" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Announcements_Users_CreatedById" FOREIGN KEY ("CreatedById") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE TABLE "AuditLogs" (
        "Id" uuid NOT NULL,
        "UserId" uuid,
        "ActionType" integer NOT NULL,
        "Timestamp" timestamp with time zone NOT NULL,
        "TargetEntity" character varying(100) NOT NULL,
        "TargetEntityId" uuid,
        "IpAddress" character varying(50),
        "OldValue" text,
        "NewValue" text,
        "Description" character varying(500) NOT NULL,
        "Module" character varying(100) NOT NULL,
        CONSTRAINT "PK_AuditLogs" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_AuditLogs_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE TABLE "Tasks" (
        "Id" uuid NOT NULL,
        "Title" character varying(150) NOT NULL,
        "Description" character varying(2000) NOT NULL,
        "PriorityLevel" integer NOT NULL,
        "Classification" integer NOT NULL,
        "Status" integer NOT NULL,
        "AssignmentScope" integer NOT NULL,
        "Deadline" timestamp with time zone NOT NULL,
        "IsSLALocked" boolean NOT NULL,
        "SlaRiskLevel" integer NOT NULL,
        "IsConfidential" boolean NOT NULL,
        "CreatedById" uuid NOT NULL,
        "AssignedDepartmentId" uuid,
        "HoldReason" text,
        "CancellationReason" text,
        "ProgressNotes" text,
        "ReviewRemarks" text,
        "PushBackComment" text,
        "IsApproved" boolean,
        "PreviousStatus" integer,
        "RevisedDeadline" timestamp with time zone,
        "HeldAt" timestamp with time zone,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_Tasks" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Tasks_Departments_AssignedDepartmentId" FOREIGN KEY ("AssignedDepartmentId") REFERENCES "Departments" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_Tasks_Users_CreatedById" FOREIGN KEY ("CreatedById") REFERENCES "Users" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE TABLE "TaskTemplates" (
        "Id" uuid NOT NULL,
        "TemplateName" character varying(150) NOT NULL,
        "DefaultTitle" character varying(150) NOT NULL,
        "DefaultDescription" character varying(2000) NOT NULL,
        "DefaultPriorityLevel" integer NOT NULL,
        "DefaultClassification" integer NOT NULL,
        "DefaultAssignmentScope" integer NOT NULL,
        "DefaultAssigneeId" uuid,
        "DefaultDepartmentId" uuid,
        "RecurrenceRule" integer NOT NULL,
        "RecurrenceStartDate" timestamp with time zone NOT NULL,
        "NextGenerationDate" timestamp with time zone NOT NULL,
        "LastGeneratedDate" timestamp with time zone,
        "IsActive" boolean NOT NULL,
        "CreatedById" uuid NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_TaskTemplates" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_TaskTemplates_Departments_DefaultDepartmentId" FOREIGN KEY ("DefaultDepartmentId") REFERENCES "Departments" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_TaskTemplates_Users_CreatedById" FOREIGN KEY ("CreatedById") REFERENCES "Users" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_TaskTemplates_Users_DefaultAssigneeId" FOREIGN KEY ("DefaultAssigneeId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE TABLE "AnnouncementAcknowledgments" (
        "Id" uuid NOT NULL,
        "AnnouncementId" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_AnnouncementAcknowledgments" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_AnnouncementAcknowledgments_Announcements_AnnouncementId" FOREIGN KEY ("AnnouncementId") REFERENCES "Announcements" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_AnnouncementAcknowledgments_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE TABLE "AnnouncementComments" (
        "Id" uuid NOT NULL,
        "AnnouncementId" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "Content" character varying(2000) NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_AnnouncementComments" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_AnnouncementComments_Announcements_AnnouncementId" FOREIGN KEY ("AnnouncementId") REFERENCES "Announcements" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_AnnouncementComments_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE TABLE "Notifications" (
        "Id" uuid NOT NULL,
        "RecipientId" uuid NOT NULL,
        "Type" integer NOT NULL,
        "Title" character varying(200) NOT NULL,
        "Message" character varying(1000) NOT NULL,
        "RelatedTaskId" uuid,
        "IsRead" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Notifications" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Notifications_Tasks_RelatedTaskId" FOREIGN KEY ("RelatedTaskId") REFERENCES "Tasks" ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_Notifications_Users_RecipientId" FOREIGN KEY ("RecipientId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE TABLE "Recommendations" (
        "Id" uuid NOT NULL,
        "TaskId" uuid NOT NULL,
        "AssigneeId" uuid NOT NULL,
        "CoordinatorId" uuid NOT NULL,
        "Category" integer NOT NULL,
        "Notes" character varying(1000) NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Recommendations" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Recommendations_Tasks_TaskId" FOREIGN KEY ("TaskId") REFERENCES "Tasks" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_Recommendations_Users_AssigneeId" FOREIGN KEY ("AssigneeId") REFERENCES "Users" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_Recommendations_Users_CoordinatorId" FOREIGN KEY ("CoordinatorId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE TABLE "TaskAssignments" (
        "Id" uuid NOT NULL,
        "TaskId" uuid NOT NULL,
        "AssignedUserId" uuid NOT NULL,
        "AssignedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_TaskAssignments" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_TaskAssignments_Tasks_TaskId" FOREIGN KEY ("TaskId") REFERENCES "Tasks" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_TaskAssignments_Users_AssignedUserId" FOREIGN KEY ("AssignedUserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE TABLE "TaskAttachments" (
        "Id" uuid NOT NULL,
        "TaskId" uuid NOT NULL,
        "FileName" character varying(255) NOT NULL,
        "FilePath" character varying(500) NOT NULL,
        "FileSize" bigint NOT NULL,
        "FileType" character varying(20) NOT NULL,
        "Description" character varying(250),
        "UploadedById" uuid NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_TaskAttachments" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_TaskAttachments_Tasks_TaskId" FOREIGN KEY ("TaskId") REFERENCES "Tasks" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_TaskAttachments_Users_UploadedById" FOREIGN KEY ("UploadedById") REFERENCES "Users" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE TABLE "TaskComments" (
        "Id" uuid NOT NULL,
        "TaskId" uuid NOT NULL,
        "AuthorId" uuid NOT NULL,
        "Content" character varying(1000) NOT NULL,
        "AttachmentFilePath" character varying(500),
        "AttachmentFileName" character varying(255),
        "IsDeleted" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        CONSTRAINT "PK_TaskComments" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_TaskComments_Tasks_TaskId" FOREIGN KEY ("TaskId") REFERENCES "Tasks" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_TaskComments_Users_AuthorId" FOREIGN KEY ("AuthorId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_AnnouncementAcknowledgments_AnnouncementId" ON "AnnouncementAcknowledgments" ("AnnouncementId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_AnnouncementAcknowledgments_UserId" ON "AnnouncementAcknowledgments" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_AnnouncementComments_AnnouncementId" ON "AnnouncementComments" ("AnnouncementId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_AnnouncementComments_UserId" ON "AnnouncementComments" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_Announcements_CreatedById" ON "Announcements" ("CreatedById");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_AuditLogs_ActionType" ON "AuditLogs" ("ActionType");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_AuditLogs_Module" ON "AuditLogs" ("Module");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_AuditLogs_TargetEntity_TargetEntityId" ON "AuditLogs" ("TargetEntity", "TargetEntityId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_AuditLogs_Timestamp" ON "AuditLogs" ("Timestamp");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_AuditLogs_UserId" ON "AuditLogs" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_JobPositions_DepartmentId" ON "JobPositions" ("DepartmentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_Notifications_CreatedAt" ON "Notifications" ("CreatedAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_Notifications_RecipientId_IsRead" ON "Notifications" ("RecipientId", "IsRead");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_Notifications_RelatedTaskId" ON "Notifications" ("RelatedTaskId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_Recommendations_AssigneeId" ON "Recommendations" ("AssigneeId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_Recommendations_CoordinatorId" ON "Recommendations" ("CoordinatorId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_Recommendations_CreatedAt" ON "Recommendations" ("CreatedAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_Recommendations_TaskId" ON "Recommendations" ("TaskId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_TaskAssignments_AssignedUserId" ON "TaskAssignments" ("AssignedUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_TaskAssignments_TaskId_AssignedUserId" ON "TaskAssignments" ("TaskId", "AssignedUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_TaskAttachments_TaskId" ON "TaskAttachments" ("TaskId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_TaskAttachments_UploadedById" ON "TaskAttachments" ("UploadedById");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_TaskComments_AuthorId" ON "TaskComments" ("AuthorId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_TaskComments_CreatedAt" ON "TaskComments" ("CreatedAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_TaskComments_TaskId_IsDeleted" ON "TaskComments" ("TaskId", "IsDeleted");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_Tasks_AssignedDepartmentId" ON "Tasks" ("AssignedDepartmentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_Tasks_CreatedById" ON "Tasks" ("CreatedById");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_TaskTemplates_CreatedById" ON "TaskTemplates" ("CreatedById");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_TaskTemplates_DefaultAssigneeId" ON "TaskTemplates" ("DefaultAssigneeId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_TaskTemplates_DefaultDepartmentId" ON "TaskTemplates" ("DefaultDepartmentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_Users_DepartmentId" ON "Users" ("DepartmentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_Users_Email" ON "Users" ("Email");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_Users_EmployeeNumber" ON "Users" ("EmployeeNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE INDEX "IX_Users_JobPositionId" ON "Users" ("JobPositionId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_Users_Username" ON "Users" ("Username") WHERE "Username" IS NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260728104811_InitialCreate') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260728104811_InitialCreate', '9.0.3');
    END IF;
END $EF$;
COMMIT;

