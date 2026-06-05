import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  LayoutDashboard,
  User,
  LogOut,
  Menu,
  X,
  Clock,
  CalendarDays,
  CheckCircle2,
  Umbrella,
  Activity,
  FileText,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import EmployeeAttendance from "../components/EmployeeAttendance";
import EmployeeLeave from "../components/EmployeeLeave";
import NotificationBell from "../components/NotificationBell";
import { ConfirmModal } from "../components/Modals";

const API_URL = import.meta.env.VITE_API_URL;
const TOTAL_LEAVE_ALLOWANCE = 20;

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isCheckingLogout, setIsCheckingLogout] = useState(false);
  const [logoutModal, setLogoutModal] = useState({
    isOpen: false,
    message: "",
  });

  const [overviewData, setOverviewData] = useState({
    attendance: [],
    leaves: [],
  });
  const [attChartFilter, setAttChartFilter] = useState("7 Days");
  const [attChartData, setAttChartData] = useState([]);

  useEffect(() => {
    const fetchProfileAndData = async () => {
      try {
        const token = localStorage.getItem("token");
        const profileRes = await fetch(`${API_URL}/employees/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setUserProfile(profileData);
        } else {
          executeLogout();
          return;
        }

        if (activeTab === "overview") {
          const [attRes, leaveRes] = await Promise.all([
            fetch(`${API_URL}/attendance/me`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${API_URL}/leaves/me`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);

          if (attRes.ok && leaveRes.ok) {
            setOverviewData({
              attendance: await attRes.json(),
              leaves: await leaveRes.json(),
            });
          }
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchProfileAndData();
  }, [activeTab]);

  useEffect(() => {
    if (!overviewData.attendance) return;

    let result = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (attChartFilter === "7 Days" || attChartFilter === "30 Days") {
      const days = attChartFilter === "7 Days" ? 7 : 30;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const record = overviewData.attendance.find(
          (a) => new Date(a.date).toDateString() === d.toDateString(),
        );

        result.push({
          name: d.toLocaleDateString([], { month: "short", day: "numeric" }),
          Status: record && record.status === "Present" ? 1 : 0,
          Type:
            record && record.status === "Present"
              ? "Present"
              : isWeekend
                ? "Weekend"
                : "Absent",
        });
      }
    } else if (attChartFilter === "6 Months") {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(1);
        d.setMonth(d.getMonth() - i);

        const monthPresents = overviewData.attendance.filter((a) => {
          const ad = new Date(a.date);
          return (
            a.status === "Present" &&
            ad.getMonth() === d.getMonth() &&
            ad.getFullYear() === d.getFullYear()
          );
        }).length;

        result.push({
          name: d.toLocaleDateString([], { month: "short" }),
          Status: monthPresents,
          Type: `${monthPresents} Days Present`,
        });
      }
    } else if (attChartFilter === "All Time") {
      let earliestYear = now.getFullYear();
      overviewData.attendance.forEach((a) => {
        const y = new Date(a.date).getFullYear();
        if (y < earliestYear) earliestYear = y;
      });
      for (let y = earliestYear; y <= now.getFullYear(); y++) {
        const yearPresents = overviewData.attendance.filter((a) => {
          const ad = new Date(a.date);
          return a.status === "Present" && ad.getFullYear() === y;
        }).length;
        result.push({
          name: y.toString(),
          Status: yearPresents,
          Type: `${yearPresents} Days Present`,
        });
      }
    }
    setAttChartData(result);
  }, [attChartFilter, overviewData.attendance]);

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
    setIsSidebarOpen(false);
  };

  const hasEmployeeUnsavedChanges = () => {
    const draft = JSON.parse(sessionStorage.getItem("employeeLeaveFormDraft"));
    if (!draft || !draft.isFormOpen) return false;
    return (
      draft.leaveType !== "Casual" ||
      draft.startDate !== "" ||
      draft.endDate !== "" ||
      draft.reason !== ""
    );
  };

  const checkIsClockedIn = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/attendance/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const today = new Date().toDateString();
        const todayRecord = data.find(
          (r) => new Date(r.date).toDateString() === today,
        );
        return !!(todayRecord && !todayRecord.checkOutTime);
      }
    } catch {
      return false;
    }
    return false;
  };

  const handleLogoutInitiate = async () => {
    setIsCheckingLogout(true);
    const unsavedLeave = hasEmployeeUnsavedChanges();
    const isClockedIn = await checkIsClockedIn();
    setIsCheckingLogout(false);

    if (unsavedLeave && isClockedIn)
      setLogoutModal({
        isOpen: true,
        message:
          "You are currently clocked in AND have an unsubmitted leave request. Are you sure you want to sign out anyway?",
      });
    else if (isClockedIn)
      setLogoutModal({
        isOpen: true,
        message:
          "You are currently clocked in and have not clocked out for the day. Are you sure you want to sign out?",
      });
    else if (unsavedLeave)
      setLogoutModal({
        isOpen: true,
        message:
          "You have an unsubmitted leave request form open. Are you sure you want to sign out without submitting?",
      });
    else executeLogout();
  };

  const executeLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/");
  };

  const calculateDays = (start, end) =>
    Math.ceil(
      Math.abs(new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24),
    ) + 1;

  const usedLeaves = overviewData.leaves
    .filter((l) => l.status === "Approved")
    .reduce((acc, l) => acc + calculateDays(l.startDate, l.endDate), 0);
  const pendingLeaves = overviewData.leaves
    .filter((l) => l.status === "Pending")
    .reduce((acc, l) => acc + calculateDays(l.startDate, l.endDate), 0);
  const availableLeaves = TOTAL_LEAVE_ALLOWANCE - usedLeaves;

  const pieData = [
    { name: "Used", value: usedLeaves },
    { name: "Pending", value: pendingLeaves },
    { name: "Available", value: availableLeaves },
  ];
  const PIE_COLORS = ["#18181b", "#f59e0b", "#e4e4e7"];

  const currentMonthPresents = overviewData.attendance.filter((a) => {
    const d = new Date(a.date);
    const now = new Date();
    return (
      a.status === "Present" &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  }).length;

  if (!userProfile)
    return (
      <div className="h-screen bg-[#fafafa] flex items-center justify-center font-sans text-sm font-medium">
        Loading interface...
      </div>
    );

  return (
    <div className="flex h-screen bg-[#fafafa] font-sans text-zinc-950">
      <ConfirmModal
        isOpen={logoutModal.isOpen}
        title="Action Required"
        message={logoutModal.message}
        confirmText="Sign Out Anyway"
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
              Staff Portal
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
              Workspace
            </div>
            <button
              onClick={() => handleTabChange("overview")}
              className={`flex items-center gap-3 w-full px-2 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "overview" ? "bg-white text-black shadow-sm border border-zinc-200/60" : "text-zinc-600 hover:text-black hover:bg-white hover:shadow-sm hover:border-zinc-200/60 border border-transparent"}`}
            >
              <LayoutDashboard size={16} strokeWidth={1.5} /> Overview
            </button>
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
          <div
            onClick={() => handleTabChange("profile")}
            className="flex items-center gap-3 px-2 mb-3 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white text-xs font-medium border border-zinc-200">
              {userProfile?.name ? userProfile.name.charAt(0) : "E"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-black truncate group-hover:text-black transition-colors">
                {userProfile?.name}
              </p>
              <p className="text-xs text-zinc-500 truncate">
                {userProfile?.department}
              </p>
            </div>
          </div>
          <button
            disabled={isCheckingLogout}
            onClick={handleLogoutInitiate}
            className="flex items-center justify-center gap-2 w-full px-2 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 border border-transparent"
          >
            <LogOut size={14} strokeWidth={2} />{" "}
            {isCheckingLogout ? "Checking..." : "Sign Out"}
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
                ? "My Dashboard"
                : activeTab.replace("-", " ")}
            </h1>
          </div>
          <div className="flex-1"></div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-[#fafafa]">
          {activeTab === "overview" && (
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div
                  onClick={() => handleTabChange("attendance")}
                  className="bg-white p-5 rounded-md border border-zinc-200 cursor-pointer hover:border-black transition-colors group shadow-sm"
                >
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-zinc-500 font-medium group-hover:text-black transition-colors">
                      Days Present
                    </p>
                    <CheckCircle2 size={16} className="text-zinc-400" />
                  </div>
                  <h3 className="text-3xl font-semibold text-black tracking-tight">
                    {currentMonthPresents}{" "}
                    <span className="text-sm font-normal text-zinc-400 ml-1">
                      this month
                    </span>
                  </h3>
                </div>
                <div
                  onClick={() => handleTabChange("leaves")}
                  className="bg-white p-5 rounded-md border border-zinc-200 cursor-pointer hover:border-black transition-colors group shadow-sm"
                >
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-zinc-500 font-medium group-hover:text-black transition-colors">
                      Available Leaves
                    </p>
                    <Umbrella size={16} className="text-zinc-400" />
                  </div>
                  <h3 className="text-3xl font-semibold text-black tracking-tight">
                    {availableLeaves}{" "}
                    <span className="text-sm font-normal text-zinc-400 ml-1">
                      / {TOTAL_LEAVE_ALLOWANCE}
                    </span>
                  </h3>
                </div>
                <div
                  onClick={() => handleTabChange("leaves")}
                  className="bg-white p-5 rounded-md border border-zinc-200 cursor-pointer hover:border-black transition-colors group shadow-sm"
                >
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-zinc-500 font-medium group-hover:text-black transition-colors">
                      Leaves Used
                    </p>
                    <CalendarDays size={16} className="text-zinc-400" />
                  </div>
                  <h3 className="text-3xl font-semibold text-black tracking-tight">
                    {usedLeaves}
                  </h3>
                </div>
                <div
                  onClick={() => handleTabChange("leaves")}
                  className="bg-white p-5 rounded-md border border-zinc-200 cursor-pointer hover:border-black transition-colors group shadow-sm"
                >
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-zinc-500 font-medium group-hover:text-black transition-colors">
                      Pending Requests
                    </p>
                    <Activity
                      size={16}
                      className={`${pendingLeaves > 0 ? "text-amber-500" : "text-zinc-400"}`}
                    />
                  </div>
                  <h3 className="text-3xl font-semibold text-black tracking-tight">
                    {pendingLeaves}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-md border border-zinc-200 shadow-sm">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                    <h2 className="text-sm font-semibold text-black uppercase tracking-widest">
                      Attendance Records
                    </h2>
                    <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200 w-fit">
                      {["7 Days", "30 Days", "6 Months", "All Time"].map(
                        (opt) => (
                          <button
                            key={opt}
                            onClick={() => setAttChartFilter(opt)}
                            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${attChartFilter === opt ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-black"}`}
                          >
                            {opt}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={attChartData}
                        margin={{ top: 0, right: 0, left: -30, bottom: 0 }}
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
                          tick={false}
                          domain={["auto", "auto"]}
                        />
                        <Tooltip
                          cursor={{ fill: "#f4f4f5" }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-black text-white text-xs px-3 py-2 rounded-md shadow-lg border border-zinc-700">
                                  {data.name} : {data.Type}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          dataKey="Status"
                          fill="#18181b"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-md border border-zinc-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold text-black uppercase tracking-widest">
                      Leave Balance
                    </h2>
                  </div>
                  <div className="h-64 w-full flex flex-col justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#000",
                            borderRadius: "8px",
                            border: "none",
                            color: "#fff",
                            fontSize: "12px",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          }}
                          itemStyle={{ color: "#fff" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
                      <span className="text-4xl font-bold text-black leading-none tracking-tight">
                        {availableLeaves}
                      </span>
                      <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mt-1">
                        Left
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-center gap-4 mt-2">
                    {pieData.map((entry, idx) => (
                      <div
                        key={entry.name}
                        className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500"
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[idx] }}
                        ></div>
                        {entry.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "attendance" && <EmployeeAttendance />}
          {activeTab === "leaves" && <EmployeeLeave />}

          {activeTab === "profile" && (
            <div className="mx-auto">
              <h1 className="text-2xl font-semibold text-black tracking-tight mb-8">
                Profile Details
              </h1>
              <div className="bg-white rounded-md border border-zinc-200 p-8 shadow-sm">
                <div className="flex items-center gap-6 mb-8 border-b border-zinc-200 pb-8">
                  <div className="w-20 h-20 rounded-md bg-zinc-100 flex items-center justify-center text-zinc-400 border border-zinc-200">
                    <User size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-black tracking-tight">
                      {userProfile.name}
                    </h2>
                    <span className="inline-block mt-2 px-2.5 py-1 bg-zinc-100 text-black border border-zinc-200 text-xs font-semibold rounded-md uppercase tracking-widest">
                      {userProfile.role}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                      Email Address
                    </label>
                    <p className="mt-2 text-sm text-black font-medium">
                      {userProfile.email}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                      Department
                    </label>
                    <p className="mt-2 text-sm text-black font-medium">
                      {userProfile.department}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EmployeeDashboard;
