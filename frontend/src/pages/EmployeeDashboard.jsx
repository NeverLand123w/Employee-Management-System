import React, { useState, useEffect, useRef } from "react";
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
  Camera,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
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
import { ConfirmModal, AlertModal } from "../components/Modals";

const API_URL = import.meta.env.VITE_API_URL;
const TOTAL_LEAVE_ALLOWANCE = 20;

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isCheckingLogout, setIsCheckingLogout] = useState(false);

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwStatus, setPwStatus] = useState({ type: "", message: "" });
  const [showPw, setShowPw] = useState(false);
  const [logoutModal, setLogoutModal] = useState({
    isOpen: false,
    message: "",
  });
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: "",
    message: "",
  });

  const [overviewData, setOverviewData] = useState({
    attendance: [],
    leaves: [],
  });
  const [attChartFilter, setAttChartFilter] = useState("7 Days");
  const [attChartData, setAttChartData] = useState([]);

  const [isDashboardLoading, setIsDashboardLoading] = useState(true);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchProfileAndData = async () => {
      setIsDashboardLoading(true);
      try {
        const token = localStorage.getItem("token");
        const profileRes = await fetch(`${API_URL}/employees/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setUserProfile(profileData);

          const localUser = JSON.parse(localStorage.getItem("user") || "{}");
          localStorage.setItem(
            "user",
            JSON.stringify({
              ...localUser,
              profileImage: profileData.profileImage,
            }),
          );
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
      } finally {
        setIsDashboardLoading(false);
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

  const calculateDays = (start, end, isHalfDay) => {
    if (isHalfDay) return 0.5;
    let count = 0;
    let curDate = new Date(start);
    const endDate = new Date(end);

    while (curDate <= endDate) {
      const dayOfWeek = curDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
      curDate.setDate(curDate.getDate() + 1);
    }
    return count;
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
        setUserProfile({ ...userProfile, profileImage: base64String });
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

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwStatus({ type: "", message: "" });
    if (pwForm.next.length < 6) {
      setPwStatus({
        type: "error",
        message: "New password must be at least 6 characters.",
      });
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwStatus({ type: "error", message: "New passwords do not match." });
      return;
    }
    setPwLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/employees/me/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: pwForm.current,
          newPassword: pwForm.next,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwStatus({ type: "success", message: data.message });
        setPwForm({ current: "", next: "", confirm: "" });
      } else {
        setPwStatus({ type: "error", message: data.message });
      }
    } catch {
      setPwStatus({
        type: "error",
        message: "Server error. Please try again.",
      });
    } finally {
      setPwLoading(false);
    }
  };

  const handleRemoveImage = () => {
    uploadPhotoToAPI("");
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const usedLeaves = overviewData.leaves
    .filter((l) => l.status === "Approved")
    .reduce(
      (acc, l) => acc + calculateDays(l.startDate, l.endDate, l.isHalfDay),
      0,
    );
  const pendingLeaves = overviewData.leaves
    .filter((l) => l.status === "Pending")
    .reduce(
      (acc, l) => acc + calculateDays(l.startDate, l.endDate, l.isHalfDay),
      0,
    );
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
          <div className="h-20 flex items-center px-6 shrink-0">
            <div className="w-9 h-9 bg-gradient-to-br from-zinc-800 to-zinc-950 text-white flex items-center justify-center rounded-xl font-bold text-xs shadow-md shadow-zinc-900/10 mr-3">
              E/S
            </div>
            <span className="text-[15px] font-bold tracking-tight text-zinc-900 uppercase">
              Staff Portal
            </span>
            <button
              className="md:hidden text-zinc-400 hover:text-zinc-900 transition-colors ml-auto p-1.5 hover:bg-zinc-100 rounded-lg"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          <nav className="px-4 py-2 space-y-1.5 overflow-y-auto flex-1 scrollbar-none">
            <div className="px-3 mb-2 mt-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
              Workspace
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
              Personal Info
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
              Profile Details
            </button>
          </nav>
        </div>

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
              {userProfile?.profileImage ? (
                <img
                  src={userProfile.profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : userProfile?.name ? (
                userProfile.name.charAt(0)
              ) : (
                "E"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-900 truncate">
                {userProfile?.name}
              </p>
              <p className="text-xs text-zinc-500 truncate font-medium mt-0.5">
                {userProfile?.department}
              </p>
            </div>
          </div>

          <div className="px-4 mt-2">
            <button
              disabled={isCheckingLogout}
              onClick={handleLogoutInitiate}
              className="flex items-center justify-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut size={16} strokeWidth={2} />
              {isCheckingLogout ? "Checking..." : "Sign Out"}
            </button>
          </div>
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
            <div className="mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {isDashboardLoading ? (
                  [...Array(4)].map((_, i) => (
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
                      onClick={() => handleTabChange("attendance")}
                      className="bg-white p-5 rounded-md border border-zinc-200 cursor-pointer hover:border-black transition-colors group shadow-sm"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm text-zinc-500 font-medium group-hover:text-black transition-colors">
                          Days Present
                        </p>
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
                      </div>
                      <h3 className="text-3xl font-semibold text-black tracking-tight">
                        {pendingLeaves}
                      </h3>
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-md border border-zinc-200 shadow-sm">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                    <h2 className="text-sm font-semibold text-black uppercase tracking-widest">
                      Attendance Records
                    </h2>
                    <div className="flex bg-zinc-100 p-1 rounded-md border border-zinc-200 w-fit">
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
                  <div className="h-64 w-full relative">
                    {isDashboardLoading && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-md">
                        <div className="w-8 h-8 border-4 border-zinc-200 border-t-black rounded-full animate-spin"></div>
                      </div>
                    )}
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
                    {isDashboardLoading && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-md">
                        <div className="w-8 h-8 border-4 border-zinc-200 border-t-black rounded-full animate-spin"></div>
                      </div>
                    )}
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
                        {isDashboardLoading ? "--" : availableLeaves}
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
              <div className="bg-white rounded-md border border-zinc-200 p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start gap-8 mb-8 border-b border-zinc-200 pb-8">
                  <div className="flex flex-col items-center sm:items-start gap-3">
                    <div
                      className="relative group cursor-pointer"
                      onClick={triggerFileInput}
                    >
                      <div className="w-32 h-32 rounded-md bg-zinc-100 flex items-center justify-center text-zinc-400 border border-zinc-200 overflow-hidden shrink-0">
                        {userProfile?.profileImage ? (
                          <img
                            src={userProfile.profileImage}
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
                    {userProfile?.profileImage && (
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
                      {userProfile.name}
                    </h2>
                    <span className="inline-block mt-3 px-3 py-1.5 bg-zinc-100 text-black border border-zinc-200 text-xs font-semibold rounded-md uppercase tracking-widest">
                      {userProfile.role}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-100">
                    <label className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                      Email Address
                    </label>
                    <p
                      className="mt-2 text-sm text-black font-semibold truncate"
                      title={userProfile.email}
                    >
                      {userProfile.email}
                    </p>
                  </div>
                  <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-100">
                    <label className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                      Department
                    </label>
                    <p className="mt-2 text-sm text-black font-semibold">
                      {userProfile.department}
                    </p>
                  </div>
                </div>

                {/* Change Password */}
                <div className="mt-6 bg-white rounded-md border border-zinc-200 p-8 shadow-sm">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-black mb-6">
                    <KeyRound size={16} strokeWidth={2} />
                    Change Password
                  </h2>

                  {pwStatus.message && (
                    <div
                      className={`mb-5 p-3 rounded-md text-sm ${
                        pwStatus.type === "success"
                          ? "bg-green-50 border border-green-200 text-green-700"
                          : "bg-red-50 border border-red-200 text-red-600"
                      }`}
                    >
                      {pwStatus.message}
                    </div>
                  )}

                  <form
                    onSubmit={handleChangePassword}
                    className="grid grid-cols-1 md:grid-cols-3 gap-5"
                  >
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPw ? "text" : "password"}
                          placeholder="••••••••"
                          value={pwForm.current}
                          onChange={(e) =>
                            setPwForm({ ...pwForm, current: e.target.value })
                          }
                          className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 pr-9 text-sm text-black placeholder-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((v) => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black transition-colors"
                        >
                          {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">
                        New Password
                      </label>
                      <input
                        type={showPw ? "text" : "password"}
                        placeholder="Min. 6 characters"
                        value={pwForm.next}
                        onChange={(e) =>
                          setPwForm({ ...pwForm, next: e.target.value })
                        }
                        className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-black placeholder-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">
                        Confirm New Password
                      </label>
                      <input
                        type={showPw ? "text" : "password"}
                        placeholder="Repeat new password"
                        value={pwForm.confirm}
                        onChange={(e) =>
                          setPwForm({ ...pwForm, confirm: e.target.value })
                        }
                        className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-black placeholder-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                        required
                      />
                    </div>
                    <div className="md:col-span-3 flex justify-end">
                      <button
                        type="submit"
                        disabled={pwLoading}
                        className="bg-black text-white px-5 py-2 text-sm font-medium rounded-md hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {pwLoading ? "Updating..." : "Update Password"}
                      </button>
                    </div>
                  </form>
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
