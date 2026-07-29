-- =========================================================================
-- STARS Analytics - ksqlDB Stream Definitions
-- =========================================================================
-- These streams and materialized views consume CDC events from Debezium
-- Kafka topics and provide real-time analytics data.
-- =========================================================================

-- Stream: raw CDC events from Debezium (Tasks table)
CREATE OR REPLACE STREAM task_events (
    op VARCHAR,
    before STRUCT<Id VARCHAR, Title VARCHAR, Status INT, PriorityLevel INT, Classification INT, Deadline VARCHAR, AssignedDepartmentId VARCHAR, CreatedAt VARCHAR, UpdatedAt VARCHAR, RevisedDeadline VARCHAR>,
    after STRUCT<Id VARCHAR, Title VARCHAR, Status INT, PriorityLevel INT, Classification INT, Deadline VARCHAR, AssignedDepartmentId VARCHAR, CreatedAt VARCHAR, UpdatedAt VARCHAR, RevisedDeadline VARCHAR>,
    source STRUCT<`table` VARCHAR, `db` VARCHAR>
) WITH (
    KAFKA_TOPIC='stars.public.Tasks',
    VALUE_FORMAT='JSON'
);

-- Stream: filtered to status changes only
CREATE OR REPLACE STREAM task_status_changes AS
    SELECT
        after->Id AS task_id,
        after->Title AS title,
        before->Status AS previous_status,
        after->Status AS new_status,
        after->PriorityLevel AS priority,
        after->Classification AS classification,
        after->AssignedDepartmentId AS department_id,
        PARSE_TIMESTAMP(after->CreatedAt, 'yyyy-MM-dd''T''HH:mm:ss') AS event_time
    FROM task_events
    WHERE op = 'u'
      AND before->Status IS NOT NULL
      AND before->Status <> after->Status;

-- Materialized table: task completion rate per department (last 1 hour)
CREATE OR REPLACE TABLE dept_completion_rate AS
    SELECT
        department_id,
        COUNT(CASE WHEN new_status = 3 THEN 1 END) AS completed_count,
        COUNT(*) AS total_count,
        (COUNT(CASE WHEN new_status = 3 THEN 1 END) * 100.0 / COUNT(*)) AS completion_rate
    FROM task_status_changes
    WINDOW TUMBLING (SIZE 1 HOUR)
    GROUP BY department_id;

-- Materialized table: overdue tasks by department
CREATE OR REPLACE TABLE dept_overdue_alerts AS
    SELECT
        department_id,
        COUNT(*) AS overdue_count,
        COLLECT_LIST(title) AS task_titles
    FROM task_status_changes
    WINDOW TUMBLING (SIZE 15 MINUTES)
    WHERE new_status NOT IN (3, 4)  -- not Completed, not Cancelled
    GROUP BY department_id;

-- Stream: raw CDC events from Debezium (Users table)
CREATE OR REPLACE STREAM user_events (
    op VARCHAR,
    before STRUCT<Id VARCHAR, AvailabilityStatus INT, IsActive BOOLEAN, IsDeactivated BOOLEAN>,
    after STRUCT<Id VARCHAR, AvailabilityStatus INT, IsActive BOOLEAN, IsDeactivated BOOLEAN>
) WITH (
    KAFKA_TOPIC='stars.public.Users',
    VALUE_FORMAT='JSON'
);

-- Stream: employee availability changes
CREATE OR REPLACE STREAM employee_availability_changes AS
    SELECT
        after->Id AS user_id,
        before->AvailabilityStatus AS previous_status,
        after->AvailabilityStatus AS new_status
    FROM user_events
    WHERE op = 'u'
      AND before->AvailabilityStatus IS NOT NULL
      AND before->AvailabilityStatus <> after->AvailabilityStatus;

-- Stream: raw CDC events from Debezium (TaskAssignments table)
CREATE OR REPLACE STREAM task_assignment_events (
    op VARCHAR,
    before STRUCT<TaskId VARCHAR, AssignedUserId VARCHAR>,
    after STRUCT<TaskId VARCHAR, AssignedUserId VARCHAR>
) WITH (
    KAFKA_TOPIC='stars.public.TaskAssignments',
    VALUE_FORMAT='JSON'
);

-- Stream: workload changes per employee
CREATE OR REPLACE STREAM employee_workload_changes AS
    SELECT
        after->AssignedUserId AS user_id,
        after->TaskId AS task_id,
        op AS change_type
    FROM task_assignment_events
    WHERE op = 'c' OR op = 'd';
