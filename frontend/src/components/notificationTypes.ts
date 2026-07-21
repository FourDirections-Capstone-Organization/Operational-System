/**
 * Shared notification data contract — single source of truth so the
 * header preview dropdown (GlobalHeader) and the full Notifications page
 * describe the same shape of record. Any system (DMS/TARS/FinSys) wiring
 * real data into either surface only needs to satisfy one interface.
 */
export type NotificationSeverity = "alert" | "success" | "info" | "system";

export type NotificationCategory =
  | "logistics"
  | "finance"
  | "driver"
  | "system";

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  /** Human-readable relative or absolute time, e.g. "2m ago" or "10:32 AM" */
  timestamp: string;
  /** Group header this item belongs to, e.g. "Today", "Yesterday", "March 3, 2025" */
  date: string;
  read: boolean;
  type: NotificationSeverity;
  category: NotificationCategory;
  /** Convenience flag — derived from `date === "Today"` but kept explicit for fast filtering */
  isToday: boolean;
  waybillNo?: string;
  statusBadge?: string;
  source: string;
  /** Optional inline call-to-action, e.g. "View Route #8" */
  actionLabel?: string;
}
