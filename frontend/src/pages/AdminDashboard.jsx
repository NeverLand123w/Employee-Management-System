import React, { useState, useEffect, useRef } from "react";
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
  FileText,
  Camera,
  Trash2,
  User,
} from "lucide-react";
import EmployeeDirectory from "../components/EmployeeDirectory";
import AdminLeaveManagement from "../components/AdminLeaveManagement";
import AdminAttendance from "../components/AdminAttendance";
import NotificationBell from "../components/NotificationBell";
import { ConfirmModal, AlertModal } from "../components/Modals";

const API_URL = import.meta.env.VITE_API_URL;

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
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: "",
    message: "",
  });

  const [adminProfile, setAdminProfile] = useState(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const fileInputRef = useRef(null);

  // Profile edit state
  const [profileEmail, setProfileEmail] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState({ type: "", text: "" });

  const [activeChartLines, setActiveChartLines] = useState({
    Activity: true,
    Hires: true,
    Leaves: true,
  });

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/employees/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAdminProfile(data);
          setProfileEmail(data.email);
          const localUser = JSON.parse(localStorage.getItem("user") || "{}");
          localStorage.setItem(
            "user",
            JSON.stringify({
              ...localUser,
              profileImage: data.profileImage,
              name: data.name,
            }),
          );
        } else {
          executeLogout();
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchProfileData();
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsDashboardLoading(true);
      try {
        const token = localStorage.getItem("token");
        const [empRes, leaveRes, attRes] = await Promise.all([
          fetch(`${API_URL}/employees`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/leaves`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/attendance`, {
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
      } finally {
        setIsDashboardLoading(false);
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

  const toggleChartLine = (key) => {
    setActiveChartLines((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const uploadPhotoToAPI = async (base64String) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/employees/me/avatar`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ image: base64String }),
      });
      if (res.ok) {
        setAdminProfile((prev) => ({ ...prev, profileImage: base64String }));
        const localUser = JSON.parse(localStorage.getItem("user"));
        localStorage.setItem(
          "user",
          JSON.stringify({ ...localUser, profileImage: base64String }),
        );
      } else {
        setAlertModal({
          isOpen: true,
          title: "Upload Failed",
          message: "Failed to update profile photo.",
        });
      }
    } catch (error) {
      console.error(error);
      setAlertModal({
        isOpen: true,
        title: "Error",
        message: "Server connection failed.",
      });
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setAlertModal({
        isOpen: true,
        title: "Invalid File",
        message: "Please upload a valid image file (JPG, PNG, or WEBP).",
      });
      e.target.value = null;
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAlertModal({
        isOpen: true,
        title: "File Too Large",
        message: "Profile photos must be less than 2MB in size.",
      });
      e.target.value = null;
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      uploadPhotoToAPI(reader.result);
    };
    e.target.value = null;
  };

  const handleRemoveImage = () => uploadPhotoToAPI("");
  const triggerFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleSaveEmail = async () => {
    if (!profileEmail || profileEmail === adminProfile?.email) return;
    setProfileSaving(true);
    setProfileMsg({ type: "", text: "" });
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await fetch(`${API_URL}/employees/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: adminProfile.name,
          email: profileEmail,
          role: adminProfile.role,
          department: adminProfile.department,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminProfile((prev) => ({ ...prev, email: profileEmail }));
        const localUser = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem("user", JSON.stringify({ ...localUser, email: profileEmail }));
        setProfileMsg({ type: "ok", text: "Email updated successfully." });
      } else {
        setProfileMsg({ type: "err", text: data.message || data.error || "Update failed." });
      }
    } catch {
      setProfileMsg({ type: "err", text: "Network error. Please try again." });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      setPwMsg({ type: "err", text: "All three fields are required." });
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ type: "err", text: "New password and confirmation don't match." });
      return;
    }
    if (pwForm.next.length < 6) {
      setPwMsg({ type: "err", text: "New password must be at least 6 characters." });
      return;
    }
    setPwSaving(true);
    setPwMsg({ type: "", text: "" });
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/employees/me/change-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwForm({ current: "", next: "", confirm: "" });
        setPwMsg({ type: "ok", text: "Password changed successfully." });
      } else {
        setPwMsg({ type: "err", text: data.message || data.error || "Password change failed." });
      }
    } catch {
      setPwMsg({ type: "err", text: "Network error. Please try again." });
    } finally {
      setPwSaving(false);
    }
  };

  const graphLegendItems = [
    {
      key: "Activity",
      name: "Daily Activity",
      color: "#71717a",
      dashed: false,
    },
    { key: "Hires", name: "New Hires", color: "#000000", dashed: false },
    { key: "Leaves", name: "Leave Requests", color: "#d4d4d8", dashed: true },
  ];

  if (!adminProfile)
    return (
      <div className="h-screen bg-[#fafafa] flex items-center justify-center font-sans text-sm font-medium">
        Loading System...
      </div>
    );

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
      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        onClose={() => setAlertModal({ isOpen: false, title: "", message: "" })}
      />

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-zinc-950/40 z-20 md:hidden backdrop-blur-md transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 bg-white border-r border-zinc-100 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transform transition-transform duration-300 ease-out md:relative md:translate-x-0 flex flex-col justify-between ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="h-20 flex items-center px-6 shrink-0">
            <div className="w-9 h-9 bg-gradient-to-br from-zinc-800 to-zinc-950 text-white flex items-center justify-center rounded-xl font-bold text-xs shadow-md shadow-zinc-900/10 mr-3">
              E/S
            </div>
            <span className="text-[15px] font-bold tracking-tight text-zinc-900 uppercase">
              System Admin
            </span>
            <button
              className="md:hidden text-zinc-400 hover:text-zinc-900 transition-colors ml-auto p-1.5 hover:bg-zinc-100 rounded-lg"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="px-4 py-2 space-y-1.5 overflow-y-auto flex-1 scrollbar-none">
            <div className="px-3 mb-2 mt-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
              Platform
            </div>
            <button
              onClick={() => handleTabChange("overview")}
              className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === "overview"
                  ? "bg-zinc-900 text-white shadow-md shadow-zinc-900/10"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
              }`}
            >
              <LayoutDashboard
                size={18}
                strokeWidth={activeTab === "overview" ? 2 : 1.5}
              />
              Overview
            </button>
            <button
              onClick={() => handleTabChange("directory")}
              className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === "directory"
                  ? "bg-zinc-900 text-white shadow-md shadow-zinc-900/10"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
              }`}
            >
              <Users
                size={18}
                strokeWidth={activeTab === "directory" ? 2 : 1.5}
              />
              Employee Directory
            </button>

            <div className="px-3 mb-2 mt-8 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
              Operations
            </div>
            <button
              onClick={() => handleTabChange("attendance")}
              className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === "attendance"
                  ? "bg-zinc-900 text-white shadow-md shadow-zinc-900/10"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
              }`}
            >
              <Clock
                size={18}
                strokeWidth={activeTab === "attendance" ? 2 : 1.5}
              />
              Time & Attendance
            </button>
            <button
              onClick={() => handleTabChange("leaves")}
              className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === "leaves"
                  ? "bg-zinc-900 text-white shadow-md shadow-zinc-900/10"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
              }`}
            >
              <CalendarDays
                size={18}
                strokeWidth={activeTab === "leaves" ? 2 : 1.5}
              />
              Leave Requests
            </button>

            <div className="px-3 mt-8 mb-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
              Account
            </div>
            <button
              onClick={() => handleTabChange("profile")}
              className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === "profile"
                  ? "bg-zinc-900 text-white shadow-md shadow-zinc-900/10"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
              }`}
            >
              <FileText
                size={18}
                strokeWidth={activeTab === "profile" ? 2 : 1.5}
              />
              Admin Profile
            </button>
          </nav>
        </div>

        {/* Footer Area */}
        <div className="pb-6 pt-4 shrink-0 bg-white">
          <div className="px-4 mb-4">
            <NotificationBell
              onNotificationClick={(notif) => {
                if (notif.message.toLowerCase().includes("leave"))
                  handleTabChange("leaves");
              }}
            />
          </div>

          <div
            onClick={() => handleTabChange("profile")}
            className="flex items-center gap-3 px-3 py-3 mx-4 mb-3 cursor-pointer group rounded-xl bg-zinc-50 border border-zinc-200/60 hover:bg-zinc-100 hover:border-zinc-300/80 transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-white text-sm font-semibold shadow-sm overflow-hidden shrink-0">
              {adminProfile?.profileImage ? (
                <img
                  src={adminProfile.profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : adminProfile?.name ? (
                adminProfile.name.charAt(0)
              ) : (
                "A"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-900 truncate">
                {adminProfile?.name || "Administrator"}
              </p>
              <p className="text-xs text-zinc-500 truncate font-medium mt-0.5">
                System Access
              </p>
            </div>
          </div>

          <div className="px-4 mt-2">
            <button
              onClick={handleLogoutInitiate}
              className="flex items-center justify-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
            >
              <LogOut size={16} strokeWidth={2} /> Sign Out
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-white">
        <header className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6 lg:px-10 border-b border-zinc-200 bg-white">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden text-zinc-600 hover:text-black"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <h1 className="text-base md:text-lg font-semibold text-black tracking-tight capitalize">
              {activeTab === "overview"
                ? "Dashboard"
                : activeTab.replace("-", " ")}
            </h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-[#fafafa]">
          {activeTab === "overview" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8 mx-auto">
                {isDashboardLoading ? (
                  [...Array(3)].map((_, i) => (
                    <div
                      key={`skel-card-${i}`}
                      className="bg-white p-5 rounded-md border border-zinc-200 shadow-sm animate-pulse h-[104px]"
                    >
                      <div className="h-4 bg-zinc-200 rounded w-1/2 mb-4"></div>
                      <div className="h-8 bg-zinc-200 rounded w-1/4"></div>
                    </div>
                  ))
                ) : (
                  <>
                    <div
                      onClick={() => handleTabChange("directory")}
                      className="bg-white p-5 rounded-md border border-zinc-200 cursor-pointer hover:border-black transition-colors group shadow-sm"
                    >
                      <p className="text-sm text-zinc-500 font-medium mb-2 group-hover:text-black transition-colors">
                        Total Headcount
                      </p>
                      <h3 className="text-4xl font-semibold text-black tracking-tight">
                        {stats.headcount}
                      </h3>
                    </div>
                    <div className="bg-white p-5 rounded-md border border-zinc-200 shadow-sm">
                      <p className="text-sm text-zinc-500 font-medium mb-2">
                        Active Departments
                      </p>
                      <h3 className="text-4xl font-semibold text-black tracking-tight">
                        {stats.departments}
                      </h3>
                    </div>
                    <div
                      onClick={() => handleTabChange("leaves")}
                      className="bg-white p-5 rounded-md border border-zinc-200 flex justify-between items-start cursor-pointer hover:border-black transition-colors group shadow-sm"
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
                  </>
                )}
              </div>

              <div className="bg-white p-6 rounded-md border border-zinc-200 mx-auto shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                    <h2 className="text-sm font-semibold text-black uppercase tracking-widest">
                      Platform Analytics
                    </h2>
                    <div className="flex bg-zinc-100 p-1 rounded-md border border-zinc-200">
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

                  <div className="h-[280px] w-full mb-2 relative">
                    {isDashboardLoading && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-md">
                        <div className="w-8 h-8 border-4 border-zinc-200 border-t-black rounded-full animate-spin"></div>
                      </div>
                    )}
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
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
                          dy={10}
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
                          hide={!activeChartLines.Activity}
                          type="monotone"
                          name="Daily Activity"
                          dataKey="Activity"
                          stroke="#71717a"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 5 }}
                        />
                        <Line
                          hide={!activeChartLines.Hires}
                          type="linear"
                          name="New Hires"
                          dataKey="Hires"
                          stroke="#000000"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 5 }}
                        />
                        <Line
                          hide={!activeChartLines.Leaves}
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

                  <div className="flex flex-wrap justify-center gap-4 sm:gap-8 pt-6 border-t border-zinc-100">
                    {graphLegendItems.map((item) => {
                      const isActive = activeChartLines[item.key];
                      return (
                        <button
                          key={item.key}
                          onClick={() => toggleChartLine(item.key)}
                          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md transition-all duration-200 ${isActive ? "bg-zinc-50 shadow-sm ring-1 ring-zinc-200/50" : "opacity-40 grayscale hover:opacity-100"}`}
                        >
                          {item.dashed ? (
                            <svg width="16" height="2" viewBox="0 0 16 2">
                              <line
                                x1="0"
                                y1="1"
                                x2="16"
                                y2="1"
                                stroke={item.color}
                                strokeWidth="2"
                                strokeDasharray="4 3"
                              />
                            </svg>
                          ) : (
                            <div
                              className="w-4 h-0.5 rounded-full"
                              style={{ backgroundColor: item.color }}
                            ></div>
                          )}
                          <span
                            className={`text-xs font-semibold uppercase tracking-wider ${isActive ? "text-zinc-800" : "text-zinc-500"}`}
                          >
                            {item.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
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

          {activeTab === "profile" && (
            <div className="mx-auto">
              <div className="bg-white rounded-md border border-zinc-200 p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start gap-8 mb-8 border-b border-zinc-200 pb-8">
                  <div className="flex flex-col items-center sm:items-start gap-3">
                    <div
                      className="relative group cursor-pointer"
                      onClick={triggerFileInput}
                    >
                      <div className="w-32 h-32 rounded-md bg-zinc-100 flex items-center justify-center text-zinc-400 border border-zinc-200 overflow-hidden shrink-0">
                        {adminProfile?.profileImage ? (
                          <img
                            src={adminProfile.profileImage}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={48} strokeWidth={1} />
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black/60 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white flex-col gap-1">
                        <Camera size={24} />
                        <span className="text-[10px] font-semibold uppercase tracking-wider mt-1">
                          Update Photo
                        </span>
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/jpeg, image/png, image/webp"
                        className="hidden"
                      />
                    </div>
                    {adminProfile?.profileImage && (
                      <button
                        onClick={handleRemoveImage}
                        className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 transition-colors bg-red-50 px-2 py-1 rounded border border-red-100"
                      >
                        <Trash2 size={12} /> Remove Photo
                      </button>
                    )}
                    <div className="text-[10px] text-zinc-400 text-center sm:text-left font-medium uppercase tracking-wider leading-relaxed mt-2 max-w-[120px]">
                      Accepted Formats:
                      <br /> JPG, PNG, WEBP
                      <br /> Max Size: 2MB
                    </div>
                  </div>
                  <div className="flex-1 text-center sm:text-left pt-2">
                    <h2 className="text-3xl font-bold text-black tracking-tight">
                      {adminProfile.name}
                    </h2>
                    <span className="inline-block mt-3 px-3 py-1.5 bg-zinc-100 text-black border border-zinc-200 text-xs font-semibold rounded-md uppercase tracking-widest">
                      {adminProfile.role}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Email */}
                  <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-100">
                    <label className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={(e) => { setProfileEmail(e.target.value); setProfileMsg({ type: "", text: "" }); }}
                      className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                    {profileMsg.text && (
                      <p className={`mt-2 text-xs font-medium ${profileMsg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
                        {profileMsg.text}
                      </p>
                    )}
                    <button
                      onClick={handleSaveEmail}
                      disabled={profileSaving || !profileEmail || profileEmail === adminProfile?.email}
                      className="mt-3 px-4 py-1.5 bg-black text-white text-xs font-medium rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {profileSaving ? "Saving…" : "Save Email"}
                    </button>
                  </div>

                  {/* Department (read-only) */}
                  <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-100">
                    <label className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                      Department
                    </label>
                    <p className="mt-2 text-sm text-black font-semibold">
                      {adminProfile.department}
                    </p>
                  </div>
                </div>

                {/* Change Password */}
                <div className="mt-8 pt-8 border-t border-zinc-200">
                  <h3 className="text-sm font-semibold text-black tracking-tight mb-4">Change Password</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1.5">Current Password</label>
                      <input
                        type="password"
                        value={pwForm.current}
                        onChange={(e) => { setPwForm((p) => ({ ...p, current: e.target.value })); setPwMsg({ type: "", text: "" }); }}
                        placeholder="••••••••"
                        className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1.5">New Password</label>
                      <input
                        type="password"
                        value={pwForm.next}
                        onChange={(e) => { setPwForm((p) => ({ ...p, next: e.target.value })); setPwMsg({ type: "", text: "" }); }}
                        placeholder="••••••••"
                        className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1.5">Confirm New Password</label>
                      <input
                        type="password"
                        value={pwForm.confirm}
                        onChange={(e) => { setPwForm((p) => ({ ...p, confirm: e.target.value })); setPwMsg({ type: "", text: "" }); }}
                        placeholder="••••••••"
                        className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                      />
                    </div>
                  </div>
                  {pwMsg.text && (
                    <p className={`mt-3 text-xs font-medium ${pwMsg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
                      {pwMsg.text}
                    </p>
                  )}
                  <button
                    onClick={handleChangePassword}
                    disabled={pwSaving}
                    className="mt-4 px-4 py-1.5 bg-black text-white text-xs font-medium rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-40"
                  >
                    {pwSaving ? "Updating…" : "Update Password"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
