import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import {
    ALL_STATUSES,
    STATUS_TRANSITIONS,
    getPageNumbers,
    fmtDate,
    fmtDateTime,
    RecruitmentStatusBadge,
    type RecruitmentStatus,
} from "../Pages/SystemAdmin_Dashboard/RecruitmentTab/RecruitmentTab";

vi.mock("axios");
const mockedAxios = vi.mocked(axios);

function mockDashboardApi() {
    mockedAxios.get.mockImplementation((url: string, config?: any) => {
        if (url === "/api/public/apply/active-positions") {
            return Promise.resolve({ data: { isSuccess: true, data: [] } });
        }
        if (url === "/api/recruitment/dashboard") {
            return Promise.resolve({
                data: {
                    isSuccess: true,
                    data: {
                        isSuccess: true,
                        data: [
                            {
                                applicantRecordId: "app-001",
                                fullName: "Juan Dela Cruz",
                                emailAddress: "juan@test.com",
                                contactNumber: "09171234567",
                                jobPositionName: "Frontend Developer",
                                status: "Pending Review",
                                createdAt: "2025-06-01T08:30:00Z",
                            },
                            {
                                applicantRecordId: "app-002",
                                fullName: "Maria Santos",
                                emailAddress: "maria@test.com",
                                contactNumber: "09179876543",
                                jobPositionName: "Backend Developer",
                                status: "Interview Scheduled",
                                createdAt: "2025-06-02T10:00:00Z",
                            },
                        ],
                        totalRecords: 2,
                        totalPages: 1,
                        pageNumber: 1,
                        pageSize: 20,
                    },
                },
            });
        }
        return Promise.resolve({ data: [] });
    });
}

function mockDashboardApiEmpty() {
    mockedAxios.get.mockImplementation((url: string, config?: any) => {
        if (url === "/api/public/apply/active-positions") {
            return Promise.resolve({ data: { isSuccess: true, data: [] } });
        }
        if (url === "/api/recruitment/dashboard") {
            return Promise.resolve({
                data: {
                    isSuccess: true,
                    data: {
                        isSuccess: true,
                        data: [],
                        totalRecords: 0,
                        totalPages: 0,
                        pageNumber: 1,
                        pageSize: 20,
                    },
                },
            });
        }
        return Promise.resolve({ data: [] });
    });
}

// ─── Constants ───────────────────────────────────────────────────────────────

describe("ALL_STATUSES", () => {
    it("contains exactly four statuses", () => {
        expect(ALL_STATUSES).toEqual([
            "Pending Review",
            "Interview Scheduled",
            "Job Offered",
            "Rejected",
        ]);
    });
});

describe("STATUS_TRANSITIONS", () => {
    it("Pending Review allows Interview Scheduled and Rejected", () => {
        expect(STATUS_TRANSITIONS["Pending Review"]).toEqual([
            "Interview Scheduled",
            "Rejected",
        ]);
    });

    it("Interview Scheduled allows Job Offered and Rejected", () => {
        expect(STATUS_TRANSITIONS["Interview Scheduled"]).toEqual([
            "Job Offered",
            "Rejected",
        ]);
    });

    it("Job Offered allows only Rejected", () => {
        expect(STATUS_TRANSITIONS["Job Offered"]).toEqual(["Rejected"]);
    });

    it("Rejected allows no transitions", () => {
        expect(STATUS_TRANSITIONS["Rejected"]).toEqual([]);
    });

    it("every status has a defined transition entry", () => {
        for (const s of ALL_STATUSES) {
            expect(STATUS_TRANSITIONS[s]).toBeDefined();
            expect(Array.isArray(STATUS_TRANSITIONS[s])).toBe(true);
        }
    });

    it("Rejected appears in every other status's transitions", () => {
        for (const s of ALL_STATUSES) {
            if (s !== "Rejected") {
                expect(STATUS_TRANSITIONS[s]).toContain("Rejected");
            }
        }
    });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

describe("getPageNumbers", () => {
    it("returns [1] when total is 1", () => {
        expect(getPageNumbers(1, 1)).toEqual([1]);
    });

    it("returns [1,2,3] when total is 3 and current is 2", () => {
        expect(getPageNumbers(3, 2)).toEqual([1, 2, 3]);
    });

    it("returns [1,2,3,4,5] when total is 5 and current is 3", () => {
        expect(getPageNumbers(5, 3)).toEqual([1, 2, 3, 4, 5]);
    });

    it("shows ellipsis for many pages near the start", () => {
        const result = getPageNumbers(10, 1);
        expect(result[0]).toBe(1);
        expect(result[result.length - 1]).toBe(10);
        expect(result).toContain("...");
    });

    it("shows ellipsis for many pages near the end", () => {
        const result = getPageNumbers(10, 10);
        expect(result[0]).toBe(1);
        expect(result[result.length - 1]).toBe(10);
        expect(result).toContain("...");
    });
});

describe("fmtDate", () => {
    it("formats ISO date to short date string", () => {
        const result = fmtDate("2025-06-01T08:30:00Z");
        expect(result).toBe("Jun 1, 2025");
    });

    it("handles different dates", () => {
        expect(fmtDate("2024-12-25T00:00:00Z")).toBe("Dec 25, 2024");
        expect(fmtDate("2025-01-01T00:00:00Z")).toBe("Jan 1, 2025");
    });
});

describe("fmtDateTime", () => {
    it("formats date and time together", () => {
        const result = fmtDateTime("2025-06-20", "10:00");
        expect(result).toContain("Jun 20, 2025");
        expect(result).toContain("10:00");
    });

    it("includes day of week and AM/PM", () => {
        const result = fmtDateTime("2025-06-20", "14:30");
        expect(result).toContain("Fri");
        expect(result).toContain("PM");
    });
});

// ─── Components ─────────────────────────────────────────────────────────────

describe("RecruitmentStatusBadge", () => {
    it("renders Pending Review badge", () => {
        const { container } = render(<RecruitmentStatusBadge status={"Pending Review"} />);
        expect(container.textContent).toContain("Pending Review");
    });

    it("renders Interview Scheduled badge", () => {
        const { container } = render(<RecruitmentStatusBadge status={"Interview Scheduled"} />);
        expect(container.textContent).toContain("Interview Scheduled");
    });

    it("renders Job Offered badge", () => {
        const { container } = render(<RecruitmentStatusBadge status={"Job Offered"} />);
        expect(container.textContent).toContain("Job Offered");
    });

    it("renders Rejected badge", () => {
        const { container } = render(<RecruitmentStatusBadge status={"Rejected"} />);
        expect(container.textContent).toContain("Rejected");
    });
});

// ─── API Integration ──────────────────────────────────────────────────────

describe("RecruitmentTab API integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders applicants fetched from dashboard API", async () => {
        mockDashboardApi();

        const { default: RecruitmentTab } = await import(
            "../Pages/SystemAdmin_Dashboard/RecruitmentTab/RecruitmentTab"
        );
        render(<RecruitmentTab />);

        await waitFor(() => {
            expect(screen.getByText("Juan Dela Cruz")).toBeTruthy();
        });
        expect(screen.getByText("Maria Santos")).toBeTruthy();
        expect(screen.getByText("Frontend Developer")).toBeTruthy();
        expect(screen.getByText("Backend Developer")).toBeTruthy();
    });

    it("shows empty state when API returns no applicants", async () => {
        mockDashboardApiEmpty();

        const { default: RecruitmentTab } = await import(
            "../Pages/SystemAdmin_Dashboard/RecruitmentTab/RecruitmentTab"
        );
        render(<RecruitmentTab />);

        await waitFor(() => {
            expect(screen.getByText("No applicants match your filters")).toBeTruthy();
        });
    });

    it("shows loading spinner initially", async () => {
        mockedAxios.get.mockImplementation(() => new Promise(() => {}));

        const { default: RecruitmentTab } = await import(
            "../Pages/SystemAdmin_Dashboard/RecruitmentTab/RecruitmentTab"
        );
        render(<RecruitmentTab />);

        expect(screen.getByText("Loading applicants…")).toBeTruthy();
    });

    it("shows status badges for each applicant", async () => {
        mockDashboardApi();

        const { default: RecruitmentTab } = await import(
            "../Pages/SystemAdmin_Dashboard/RecruitmentTab/RecruitmentTab"
        );
        render(<RecruitmentTab />);

        await waitFor(() => {
            expect(screen.getAllByText("Pending Review").length).toBeGreaterThanOrEqual(1);
        });
        expect(screen.getAllByText("Interview Scheduled").length).toBeGreaterThanOrEqual(1);
    });

    it("fetches both positions and dashboard on mount", async () => {
        mockDashboardApi();

        const { default: RecruitmentTab } = await import(
            "../Pages/SystemAdmin_Dashboard/RecruitmentTab/RecruitmentTab"
        );
        render(<RecruitmentTab />);

        await waitFor(() => {
            expect(screen.getByText("Juan Dela Cruz")).toBeTruthy();
        });

        expect(mockedAxios.get).toHaveBeenCalledWith(
            "/api/public/apply/active-positions"
        );
        expect(mockedAxios.get).toHaveBeenCalledWith(
            "/api/recruitment/dashboard",
            expect.objectContaining({ params: expect.objectContaining({ pageNumber: 1, pageSize: 5 }) })
        );
    });

    it("handles API failure gracefully", async () => {
        mockedAxios.get.mockRejectedValue(new Error("Network error"));

        const { default: RecruitmentTab } = await import(
            "../Pages/SystemAdmin_Dashboard/RecruitmentTab/RecruitmentTab"
        );
        render(<RecruitmentTab />);

        await waitFor(() => {
            expect(screen.queryByText("No applicants match your filters")).toBeTruthy();
        });
    });
});
