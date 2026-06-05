import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  LogOut,
  Menu,
  Search,
  X,
  Clock,
} from "lucide-react";
import EmployeeDirectory from "../components/EmployeeDirectory";
import AdminLeaveManagement from "../components/AdminLeaveManagement";
import AdminAttendance from "../components/AdminAttendance";
import NotificationBell from "../components/NotificationBell";
import { ConfirmModal } from "../components/Modals";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    headcount: 0,
    departments: 0,
    pendingLeaves: 0,
  });
  const [rawData, setRawData] = useState({
    employees: [],
    leaves: [],
    attendance: [],
  });
  const [chartData, setChartData] = useState([]);
  const [chartFilter, setChartFilter] = useState("7 Days");
  const [searchTerm, setSearchTerm] = useState("");
  const [logoutModal, setLogoutModal] = useState({
    isOpen: false,
    message: "",
  });

  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("token");

        const [empRes, leaveRes, attRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/employees`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${import.meta.env.VITE_API_URL}/leaves`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${import.meta.env.VITE_API_URL}/attendance`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (empRes.ok && leaveRes.ok && attRes.ok) {
          const empData = await empRes.json();
          const leaveData = await leaveRes.json();
          const attDataRaw = await attRes.json();

          const attData = Array.isArray(attDataRaw)
            ? attDataRaw
            : attDataRaw.records || [];

          const uniqueDepts = new Set(empData.map((emp) => emp.department));

          setStats({
            headcount: empData.length,
            departments: uniqueDepts.size,
            pendingLeaves: leaveData.filter((l) => l.status === "Pending")
              .length,
          });

          setRawData({
            employees: empData,
            leaves: leaveData,
            attendance: attData,
          });
        }
      } catch (error) {
        console.error(error);
      }
    };

    if (activeTab === "overview") fetchDashboardData();
  }, [activeTab]);

  useEffect(() => {
    if (!rawData.employees.length) return;

    let result = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (chartFilter === "7 Days") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        result.push({
          name: d.toLocaleDateString([], { weekday: "short" }),
          dateValue: d,
          Hires: 0,
          Leaves: 0,
          Activity: 0,
        });
      }
    } else if (chartFilter === "30 Days") {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        result.push({
          name: d.toLocaleDateString([], { month: "short", day: "numeric" }),
          dateValue: d,
          Hires: 0,
          Leaves: 0,
          Activity: 0,
        });
      }
    } else if (chartFilter === "6 Months") {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        result.push({
          name: d.toLocaleDateString([], { month: "short" }),
          monthVal: d.getMonth(),
          yearVal: d.getFullYear(),
          Hires: 0,
          Leaves: 0,
          Activity: 0,
        });
      }
    } else if (chartFilter === "All Time") {
      let earliestYear = now.getFullYear();
      rawData.employees.forEach((e) => {
        const y = new Date(e.createdAt).getFullYear();
        if (y < earliestYear) earliestYear = y;
      });
      for (let y = earliestYear; y <= now.getFullYear(); y++) {
        result.push({
          name: y.toString(),
          yearVal: y,
          Hires: 0,
          Leaves: 0,
          Activity: 0,
        });
      }
    }

    const isSameDay = (d1, d2) => d1.toDateString() === d2.toDateString();
    const isSameMonth = (d1, mVal, yVal) =>
      d1.getMonth() === mVal && d1.getFullYear() === yVal;
    const isSameYear = (d1, yVal) => d1.getFullYear() === yVal;

    rawData.employees.forEach((emp) => {
      const d = new Date(emp.createdAt);
      const target = result.find((r) =>
        chartFilter === "6 Months"
          ? isSameMonth(d, r.monthVal, r.yearVal)
          : chartFilter === "All Time"
            ? isSameYear(d, r.yearVal)
            : isSameDay(d, r.dateValue),
      );
      if (target) target.Hires += 1;
    });

    rawData.leaves.forEach((leave) => {
      const d = new Date(leave.createdAt);
      const target = result.find((r) =>
        chartFilter === "6 Months"
          ? isSameMonth(d, r.monthVal, r.yearVal)
          : chartFilter === "All Time"
            ? isSameYear(d, r.yearVal)
            : isSameDay(d, r.dateValue),
      );
      if (target) target.Leaves += 1;
    });

    if (Array.isArray(rawData.attendance)) {
      rawData.attendance.forEach((att) => {
        if (att.status === "Present") {
          const d = new Date(att.date);
          const target = result.find((r) =>
            chartFilter === "6 Months"
              ? isSameMonth(d, r.monthVal, r.yearVal)
              : chartFilter === "All Time"
                ? isSameYear(d, r.yearVal)
                : isSameDay(d, r.dateValue),
          );
          if (target) target.Activity += 1;
        }
      });
    }

    setChartData(result);
  }, [chartFilter, rawData]);

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
    setIsSidebarOpen(false);
    setSearchTerm("");
  };

  const hasAdminUnsavedChanges = () => {
    const draft = JSON.parse(sessionStorage.getItem("employeeFormDraft"));
    if (!draft || !draft.isFormOpen) return false;
    const init = draft.initialFormData || {
      name: "",
      email: "",
      password: "",
      role: "Employee",
      department: "Engineering",
    };
    return (
      draft.name !== init.name ||
      draft.email !== init.email ||
      draft.password !== init.password ||
      draft.role !== init.role ||
      draft.department !== init.department
    );
  };

  const handleLogoutInitiate = () => {
    if (hasAdminUnsavedChanges()) {
      setLogoutModal({
        isOpen: true,
        message:
          "You have unsaved form data in the Employee Directory. Are you sure you want to sign out without completing your work?",
      });
    } else {
      executeLogout();
    }
  };

  const executeLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/");
  };

  return (
    <div className="flex h-screen bg-[#fafafa] font-sans text-zinc-950">
      <ConfirmModal
        isOpen={logoutModal.isOpen}
        title="Unsaved Changes Detected"
        message={logoutModal.message}
        confirmText="Discard & Sign Out"
        isDestructive={true}
        onClose={() => setLogoutModal({ isOpen: false, message: "" })}
        onConfirm={executeLogout}
      />

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-zinc-950/20 z-10 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-20 w-64 bg-zinc-50 border-r border-zinc-200 transform transition-transform duration-200 md:relative md:translate-x-0 flex flex-col justify-between ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div>
          <div className="h-16 flex items-center px-6 border-b border-zinc-200 bg-white">
            <div className="w-8 h-8 bg-black text-white flex items-center justify-center rounded-md font-bold text-sm tracking-tighter mr-3">
              E/S
            </div>
            <span className="text-sm font-semibold tracking-tight text-black uppercase">
              System Admin
            </span>
            <button
              className="md:hidden text-zinc-400 hover:text-black ml-auto"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X size={16} />
            </button>
          </div>

          <nav className="p-4 space-y-1 overflow-y-auto">
            <div className="px-2 mb-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest">
              Platform
            </div>
            <button
              onClick={() => handleTabChange("overview")}
              className={`flex items-center gap-3 w-full px-2 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "overview" ? "bg-white text-black shadow-sm border border-zinc-200/60" : "text-zinc-600 hover:text-black hover:bg-white hover:shadow-sm hover:border-zinc-200/60 border border-transparent"}`}
            >
              <LayoutDashboard size={16} strokeWidth={1.5} /> Overview
            </button>
            <button
              onClick={() => handleTabChange("directory")}
              className={`flex items-center gap-3 w-full px-2 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "directory" ? "bg-white text-black shadow-sm border border-zinc-200/60" : "text-zinc-600 hover:text-black hover:bg-white hover:shadow-sm hover:border-zinc-200/60 border border-transparent"}`}
            >
              <Users size={16} strokeWidth={1.5} /> Directory
            </button>

            <div className="px-2 mt-6 mb-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest">
              Operations
            </div>
            <button
              onClick={() => handleTabChange("attendance")}
              className={`flex items-center gap-3 w-full px-2 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "attendance" ? "bg-white text-black shadow-sm border border-zinc-200/60" : "text-zinc-600 hover:text-black hover:bg-white hover:shadow-sm hover:border-zinc-200/60 border border-transparent"}`}
            >
              <Clock size={16} strokeWidth={1.5} /> Time & Attendance
            </button>
            <button
              onClick={() => handleTabChange("leaves")}
              className={`flex items-center gap-3 w-full px-2 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "leaves" ? "bg-white text-black shadow-sm border border-zinc-200/60" : "text-zinc-600 hover:text-black hover:bg-white hover:shadow-sm hover:border-zinc-200/60 border border-transparent"}`}
            >
              <CalendarDays size={16} strokeWidth={1.5} /> Leave Requests
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-zinc-200">
          <NotificationBell
            onNotificationClick={(notif) => {
              if (notif.message.toLowerCase().includes("leave"))
                handleTabChange("leaves");
            }}
          />
          <div className="h-px bg-zinc-200 my-3"></div>
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white text-xs font-medium border border-zinc-200">
              {user?.name ? user.name.charAt(0) : "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-black truncate">
                {user?.name || "Administrator"}
              </p>
              <p className="text-xs text-zinc-500 truncate">System Access</p>
            </div>
          </div>
          <button
            onClick={handleLogoutInitiate}
            className="flex items-center justify-center gap-2 w-full px-2 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors border border-transparent"
          >
            <LogOut size={14} strokeWidth={2} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-white">
        <header className="h-16 flex items-center justify-between px-6 lg:px-10 border-b border-zinc-200 bg-white">
          <div className="flex items-center">
            <button
              className="md:hidden text-zinc-600 hover:text-black mr-4"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-semibold text-black tracking-tight hidden sm:block capitalize">
              {activeTab === "overview"
                ? "System Dashboard"
                : activeTab.replace("-", " ")}
            </h1>
          </div>

        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-[#fafafa]">
          {activeTab === "overview" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-6xl mx-auto">
                <div
                  onClick={() => handleTabChange("directory")}
                  className="bg-white p-5 rounded-xl border border-zinc-200 cursor-pointer hover:border-black transition-colors group shadow-sm"
                >
                  <p className="text-sm text-zinc-500 font-medium mb-2 group-hover:text-black transition-colors">
                    Total Headcount
                  </p>
                  <h3 className="text-4xl font-semibold text-black tracking-tight">
                    {stats.headcount}
                  </h3>
                </div>
                <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
                  <p className="text-sm text-zinc-500 font-medium mb-2">
                    Active Departments
                  </p>
                  <h3 className="text-4xl font-semibold text-black tracking-tight">
                    {stats.departments}
                  </h3>
                </div>
                <div
                  onClick={() => handleTabChange("leaves")}
                  className="bg-white p-5 rounded-xl border border-zinc-200 flex justify-between items-start cursor-pointer hover:border-black transition-colors group shadow-sm"
                >
                  <div>
                    <p className="text-sm text-zinc-500 font-medium mb-2 group-hover:text-black transition-colors">
                      Pending Leaves
                    </p>
                    <h3 className="text-4xl font-semibold text-black tracking-tight">
                      {stats.pendingLeaves}
                    </h3>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-xs font-semibold rounded-full ${stats.pendingLeaves > 0 ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500"}`}
                  >
                    Review needed
                  </span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-zinc-200 max-w-6xl mx-auto shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                  <h2 className="text-sm font-semibold text-black uppercase tracking-widest">
                    Platform Analytics
                  </h2>
                  <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200">
                    {["7 Days", "30 Days", "6 Months", "All Time"].map(
                      (opt) => (
                        <button
                          key={opt}
                          onClick={() => setChartFilter(opt)}
                          className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${chartFilter === opt ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-black"}`}
                        >
                          {opt}
                        </button>
                      ),
                    )}
                  </div>
                </div>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e4e4e7"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#71717a", fontSize: 12 }}
                        dy={15}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#71717a", fontSize: 12 }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#000",
                          borderRadius: "8px",
                          border: "none",
                          color: "#fff",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                        itemStyle={{ color: "#fff" }}
                        cursor={{ stroke: "#d4d4d8", strokeWidth: 1 }}
                      />
                      <Line
                        type="monotone"
                        name="Daily Activity"
                        dataKey="Activity"
                        stroke="#71717a"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="linear"
                        name="New Hires"
                        dataKey="Hires"
                        stroke="#000000"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="linear"
                        name="Leave Requests"
                        dataKey="Leaves"
                        stroke="#d4d4d8"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {activeTab === "directory" && (
            <EmployeeDirectory searchTerm={searchTerm} />
          )}
          {activeTab === "attendance" && (
            <AdminAttendance searchTerm={searchTerm} />
          )}
          {activeTab === "leaves" && (
            <AdminLeaveManagement searchTerm={searchTerm} />
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
