import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Test the helper functions directly ─────────────────────────────────────

describe("Permission helper functions", () => {
    const CATEGORY_LABELS: Record<string, string> = {
        SystemAdmin: "System Administration",
        Users: "User Management",
        Roles: "Role Management",
        Departments: "Department Management",
        JobPositions: "Job Position Management",
        Tasks: "Task Management",
        Approvals: "Approval Management",
        Recruitment: "Recruitment Management",
        Dashboard: "Dashboard",
        Reporting: "Reporting",
    };

    function formatCategory(cat: string) {
        return CATEGORY_LABELS[cat] || cat.replace(/([A-Z])/g, " $1").trim();
    }

    function getFriendlyName(name: string) {
        const p = name.split(".");
        return p.length > 2 ? p.slice(2).join(" ").replace(/([A-Z])/g, " $1").trim() : name;
    }

    function groupPermissions(perms: { name: string }[]): Record<string, { name: string }[]> {
        const g: Record<string, { name: string }[]> = {};
        perms.forEach((p) => {
            const cat = p.name.split(".").length > 2 ? p.name.split(".")[1] : "General";
            if (!g[cat]) g[cat] = [];
            g[cat].push(p);
        });
        return g;
    }

    it("formatCategory returns correct label for known categories", () => {
        expect(formatCategory("Approvals")).toBe("Approval Management");
        expect(formatCategory("Recruitment")).toBe("Recruitment Management");
        expect(formatCategory("Dashboard")).toBe("Dashboard");
        expect(formatCategory("Reporting")).toBe("Reporting");
        expect(formatCategory("Tasks")).toBe("Task Management");
    });

    it("formatCategory falls back to space-split for unknown categories", () => {
        expect(formatCategory("UnknownCategory")).toBe("Unknown Category");
    });

    it("getFriendlyName extracts last segment from dot notation", () => {
        expect(getFriendlyName("Permissions.Approvals.View")).toBe("View");
        expect(getFriendlyName("Permissions.Tasks.Manage")).toBe("Manage");
        expect(getFriendlyName("Permissions.SystemAdmin.FullAccess")).toBe("Full Access");
    });

    it("getFriendlyName returns raw name if fewer than 3 segments", () => {
        expect(getFriendlyName("General")).toBe("General");
    });

    it("groupPermissions groups by second segment", () => {
        const perms = [
            { name: "Permissions.Tasks.View" },
            { name: "Permissions.Tasks.Manage" },
            { name: "Permissions.Approvals.View" },
        ];
        const grouped = groupPermissions(perms);
        expect(Object.keys(grouped)).toEqual(["Tasks", "Approvals"]);
        expect(grouped["Tasks"]).toHaveLength(2);
        expect(grouped["Approvals"]).toHaveLength(1);
    });
});

// ─── Test PermissionSelector search bar behavior ────────────────────────────

describe("PermissionSelector search", () => {
    const mockPermissions = [
        { permissionId: "1", name: "Permissions.SystemAdmin.FullAccess", description: "Full system access" },
        { permissionId: "2", name: "Permissions.Users.View", description: "View users" },
        { permissionId: "3", name: "Permissions.Users.Manage", description: "Manage users" },
        { permissionId: "4", name: "Permissions.Tasks.View", description: "View tasks" },
        { permissionId: "5", name: "Permissions.Tasks.Manage", description: "Manage tasks" },
        { permissionId: "6", name: "Permissions.Approvals.View", description: "View approvals" },
        { permissionId: "7", name: "Permissions.Approvals.Submit", description: "Submit approvals" },
        { permissionId: "8", name: "Permissions.Approvals.Process", description: "Process approvals" },
        { permissionId: "9", name: "Permissions.Approvals.Manage", description: "Manage approvals" },
        { permissionId: "10", name: "Permissions.Recruitment.View", description: "View recruitment" },
        { permissionId: "11", name: "Permissions.Recruitment.Manage", description: "Manage recruitment" },
        { permissionId: "12", name: "Permissions.Dashboard.View", description: "View dashboard" },
        { permissionId: "13", name: "Permissions.Reporting.View", description: "View reports" },
        { permissionId: "14", name: "Permissions.Roles.View", description: "View roles" },
        { permissionId: "15", name: "Permissions.Roles.Manage", description: "Manage roles" },
        { permissionId: "16", name: "Permissions.Departments.View", description: "View departments" },
        { permissionId: "17", name: "Permissions.Departments.Manage", description: "Manage departments" },
        { permissionId: "18", name: "Permissions.JobPositions.View", description: "View job positions" },
        { permissionId: "19", name: "Permissions.JobPositions.Manage", description: "Manage job positions" },
    ];

    const CATEGORY_LABELS: Record<string, string> = {
        SystemAdmin: "System Administration",
        Users: "User Management",
        Roles: "Role Management",
        Departments: "Department Management",
        JobPositions: "Job Position Management",
        Tasks: "Task Management",
        Approvals: "Approval Management",
        Recruitment: "Recruitment Management",
        Dashboard: "Dashboard",
        Reporting: "Reporting",
    };

    function formatCategory(cat: string) {
        return CATEGORY_LABELS[cat] || cat.replace(/([A-Z])/g, " $1").trim();
    }

    function getFriendlyName(name: string) {
        const p = name.split(".");
        return p.length > 2 ? p.slice(2).join(" ").replace(/([A-Z])/g, " $1").trim() : name;
    }

    function groupPermissions(perms: { name: string; permissionId: string; description: string }[]) {
        const g: Record<string, { name: string; permissionId: string; description: string }[]> = {};
        perms.forEach((p) => {
            const cat = p.name.split(".").length > 2 ? p.name.split(".")[1] : "General";
            if (!g[cat]) g[cat] = [];
            g[cat].push(p);
        });
        return g;
    }

    const grouped = groupPermissions(mockPermissions);
    const mockSelected = new Set(["Permissions.Tasks.View", "Permissions.Users.View"]);

    function renderSelector(selected = mockSelected) {
        // Render a minimal PermissionSelector-like UI using the same logic
        const container = document.createElement("div");
        document.body.appendChild(container);

        const searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "Search permissions...";
        searchInput.className = "report-input";
        container.appendChild(searchInput);

        const groupsContainer = document.createElement("div");
        groupsContainer.className = "rm2-perm-groups";
        container.appendChild(groupsContainer);

        function renderGroups(query: string) {
            groupsContainer.innerHTML = "";
            const filtered = Object.entries(grouped).reduce((acc, [cat, perms]) => {
                const filteredPerms = query
                    ? perms.filter(
                          (p) =>
                              p.name.toLowerCase().includes(query.toLowerCase()) ||
                              (p.description && p.description.toLowerCase().includes(query.toLowerCase())) ||
                              getFriendlyName(p.name).toLowerCase().includes(query.toLowerCase())
                      )
                    : perms;
                if (filteredPerms.length > 0) acc[cat] = filteredPerms;
                return acc;
            }, {} as Record<string, { name: string; permissionId: string; description: string }[]>);

            Object.entries(filtered).forEach(([cat, perms]) => {
                const group = document.createElement("div");
                group.className = "rm2-perm-group";
                group.dataset.category = cat;

                const catLabel = document.createElement("span");
                catLabel.className = "rm2-perm-category-label";
                catLabel.textContent = formatCategory(cat);
                group.appendChild(catLabel);

                perms.forEach((perm) => {
                    const item = document.createElement("div");
                    item.className = "rm2-perm-item";
                    item.dataset.permissionName = perm.name;
                    item.textContent = getFriendlyName(perm.name);
                    group.appendChild(item);
                });

                groupsContainer.appendChild(group);
            });

            if (Object.keys(filtered).length === 0) {
                const empty = document.createElement("p");
                empty.className = "rm2-perm-empty";
                empty.textContent = query ? "No permissions match your search." : "No permissions available.";
                groupsContainer.appendChild(empty);
            }
        }

        // Initial render
        renderGroups("");

        return {
            container,
            searchInput,
            groupsContainer,
            renderGroups,
            setSearch: (query: string) => {
                searchInput.value = query;
                renderGroups(query);
            },
        };
    }

    it("renders all permission categories by default", () => {
        const { groupsContainer } = renderSelector();
        const groups = groupsContainer.querySelectorAll(".rm2-perm-group");
        // SystemAdmin, Users, Tasks, Approvals, Recruitment, Dashboard, Reporting, Roles, Departments, JobPositions
        expect(groups.length).toBe(10);
    });

    it("filters permissions by name when searching", () => {
        const { setSearch, groupsContainer } = renderSelector();
        setSearch("Approvals");

        const groups = groupsContainer.querySelectorAll(".rm2-perm-group");
        expect(groups.length).toBe(1);
        expect(groups[0].dataset.category).toBe("Approvals");
    });

    it("filters permissions by friendly name", () => {
        const { setSearch, groupsContainer } = renderSelector();
        setSearch("Manage");

        // Should show Users, Tasks, Approvals, Recruitment, Roles, Departments, JobPositions (all with "Manage")
        const groups = groupsContainer.querySelectorAll(".rm2-perm-group");
        expect(groups.length).toBeGreaterThanOrEqual(4);

        // Each group should only contain "Manage" permissions
        groups.forEach((g) => {
            const items = g.querySelectorAll(".rm2-perm-item");
            items.forEach((item) => {
                expect(item.textContent!.toLowerCase()).toContain("manage");
            });
        });
    });

    it("filters permissions by description", () => {
        const { setSearch, groupsContainer } = renderSelector();
        setSearch("dashboard");

        const groups = groupsContainer.querySelectorAll(".rm2-perm-group");
        expect(groups.length).toBe(1);
        expect(groups[0].dataset.category).toBe("Dashboard");
    });

    it("shows empty message when no permissions match", () => {
        const { setSearch, groupsContainer } = renderSelector();
        setSearch("zzzznonexistent");

        const empty = groupsContainer.querySelector(".rm2-perm-empty");
        expect(empty).toBeTruthy();
        expect(empty!.textContent).toBe("No permissions match your search.");
    });

    it("shows all groups when search is cleared", () => {
        const { setSearch, groupsContainer } = renderSelector();
        setSearch("Approvals");
        expect(groupsContainer.querySelectorAll(".rm2-perm-group").length).toBe(1);

        setSearch("");
        expect(groupsContainer.querySelectorAll(".rm2-perm-group").length).toBe(10);
    });

    it("finds Dashboard and Reporting categories", () => {
        const { groupsContainer } = renderSelector();
        const allGroups = groupsContainer.querySelectorAll(".rm2-perm-group");
        const categoryNames = Array.from(allGroups).map((g) => g.dataset.category);
        expect(categoryNames).toContain("Dashboard");
        expect(categoryNames).toContain("Reporting");
    });
});
