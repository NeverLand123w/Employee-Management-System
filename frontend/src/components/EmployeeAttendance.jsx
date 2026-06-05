import React, { useState, useEffect } from "react";
import { Clock, Calendar, AlertCircle } from "lucide-react";
import { AlertModal, ConfirmModal } from "./Modals";

const API_URL = import.meta.env.VITE_API_URL;

const EmployeeAttendance = () => {
  const [records, setRecords] = useState([]);
  const [todayStatus, setTodayStatus] = useState("not_checked_in");
  const [isLoading, setIsLoading] = useState(false);
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: "",
    message: "",
  });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    action: "",
  });

  const fetchAttendance = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/attendance/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data);

        const today = new Date().toDateString();
        const todayRecord = data.find(
          (record) => new Date(record.date).toDateString() === today,
        );

        if (todayRecord) {
          if (todayRecord.checkOutTime) {
            setTodayStatus("completed");
          } else {
            setTodayStatus("checked_in");
          }
        } else {
          setTodayStatus("not_checked_in");
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const initiateAttendanceMarking = () => {
    const action = todayStatus === "not_checked_in" ? "Clock In" : "Clock Out";
    setConfirmModal({ isOpen: true, action });
  };

  const handleMarkAttendance = async () => {
    setConfirmModal({ isOpen: false, action: "" });
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/attendance/mark`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        fetchAttendance();
      } else {
        setAlertModal({
          isOpen: true,
          title: "Error",
          message: data.message || "Failed to mark attendance",
        });
      }
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: "Error",
        message: "Server error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return "---";
    return new Date(timeString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="mx-auto">
      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        onClose={() => setAlertModal({ isOpen: false, title: "", message: "" })}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={`Confirm ${confirmModal.action}`}
        message={
          confirmModal.action === "Clock In"
            ? "Are you sure you want to start your shift now? Your time will be recorded."
            : "Are you sure you want to end your shift? You will not be able to clock back in for the rest of the day."
        }
        confirmText={`Yes, ${confirmModal.action}`}
        isDestructive={confirmModal.action === "Clock Out"}
        onClose={() => setConfirmModal({ isOpen: false, action: "" })}
        onConfirm={handleMarkAttendance}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-black tracking-tight">
            Time & Attendance
          </h2>
          <p className="text-sm text-zinc-500">Record your daily work hours.</p>
        </div>

        <div className="flex items-center gap-4 bg-white px-4 py-3 rounded-md border border-zinc-200">
          <div className="flex items-center gap-2 text-sm font-medium text-black">
            <Clock size={16} className="text-zinc-400" />
            {new Date().toLocaleDateString([], {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
          <div className="w-px h-6 bg-zinc-200"></div>
          <button
            onClick={initiateAttendanceMarking}
            disabled={isLoading || todayStatus === "completed"}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              todayStatus === "not_checked_in"
                ? "bg-black text-white hover:bg-zinc-800"
                : todayStatus === "checked_in"
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
            }`}
          >
            {isLoading
              ? "Processing..."
              : todayStatus === "not_checked_in"
                ? "Clock In"
                : todayStatus === "checked_in"
                  ? "Clock Out"
                  : "Day Completed"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-md border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
          <h3 className="text-sm font-semibold text-black uppercase tracking-widest flex items-center gap-2">
            <Calendar size={14} /> My Logbook
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white border-b border-zinc-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Clock In
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Clock Out
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {records.map((record) => (
                <tr
                  key={record._id}
                  className="hover:bg-zinc-50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-black">
                    {formatDate(record.date)}
                  </td>
                  <td className="px-6 py-4 text-zinc-600">
                    {formatTime(record.checkInTime)}
                  </td>
                  <td className="px-6 py-4 text-zinc-600">
                    {formatTime(record.checkOutTime)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-md ${
                        record.status === "Present"
                          ? "bg-zinc-100 text-black border border-zinc-200"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td
                    colSpan="4"
                    className="px-6 py-12 text-center text-zinc-500"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <AlertCircle size={24} className="mb-2 text-zinc-300" />
                      <p>No attendance records found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmployeeAttendance;
