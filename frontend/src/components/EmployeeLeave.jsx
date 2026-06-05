import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Info,
  Umbrella,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { AlertModal, ConfirmModal } from "./Modals";

const API_URL = import.meta.env.VITE_API_URL;
const TOTAL_LEAVE_ALLOWANCE = 20;

const EmployeeLeave = () => {
  const [leaves, setLeaves] = useState([]);

  const draftData =
    JSON.parse(sessionStorage.getItem("employeeLeaveFormDraft")) || {};

  const [isFormOpen, setIsFormOpen] = useState(draftData.isFormOpen || false);
  const [leaveType, setLeaveType] = useState(draftData.leaveType || "Casual");
  const [startDate, setStartDate] = useState(draftData.startDate || "");
  const [endDate, setEndDate] = useState(draftData.endDate || "");
  const [reason, setReason] = useState(draftData.reason || "");

  const [isLoading, setIsLoading] = useState(false);
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: "",
    message: "",
  });
  const [discardModal, setDiscardModal] = useState({ isOpen: false });
  const [reviewModal, setReviewModal] = useState({ isOpen: false });

  const fetchLeaves = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/leaves/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLeaves(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  useEffect(() => {
    const draft = { isFormOpen, leaveType, startDate, endDate, reason };
    sessionStorage.setItem("employeeLeaveFormDraft", JSON.stringify(draft));
  }, [isFormOpen, leaveType, startDate, endDate, reason]);

  const hasUnsavedChanges = () => {
    if (!isFormOpen) return false;
    return (
      leaveType !== "Casual" ||
      startDate !== "" ||
      endDate !== "" ||
      reason !== ""
    );
  };

  const handleCancelClick = () => {
    if (hasUnsavedChanges()) {
      setDiscardModal({ isOpen: true });
    } else {
      resetForm();
    }
  };

  const resetForm = () => {
    setLeaveType("Casual");
    setStartDate("");
    setEndDate("");
    setReason("");
    setIsFormOpen(false);
    sessionStorage.removeItem("employeeLeaveFormDraft");
  };

  const calculateDays = (start, end) => {
    const date1 = new Date(start);
    const date2 = new Date(end);
    const diffTime = Math.abs(date2 - date1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const usedDays = leaves
    .filter((l) => l.status === "Approved")
    .reduce((total, l) => total + calculateDays(l.startDate, l.endDate), 0);
  const pendingDays = leaves
    .filter((l) => l.status === "Pending")
    .reduce((total, l) => total + calculateDays(l.startDate, l.endDate), 0);
  const leaveBalances = {
    total: TOTAL_LEAVE_ALLOWANCE,
    used: usedDays,
    pending: pendingDays,
    remaining: TOTAL_LEAVE_ALLOWANCE - usedDays,
  };

  const handleReviewRequest = (e) => {
    e.preventDefault();

    if (new Date(startDate) > new Date(endDate)) {
      setAlertModal({
        isOpen: true,
        title: "Invalid Dates",
        message: "End date cannot be earlier than start date.",
      });
      return;
    }

    const requestedDays = calculateDays(startDate, endDate);
    if (leaveBalances.remaining < requestedDays) {
      setAlertModal({
        isOpen: true,
        title: "Insufficient Balance",
        message: "You do not have enough leave days remaining.",
      });
      return;
    }

    setReviewModal({ isOpen: true });
  };

  const executeApplyLeave = async () => {
    setReviewModal({ isOpen: false });
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/leaves/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ leaveType, startDate, endDate, reason }),
      });

      const data = await res.json();

      if (res.ok) {
        resetForm();
        fetchLeaves();
        setAlertModal({
          isOpen: true,
          title: "Success",
          message: "Leave request submitted successfully.",
        });
      } else {
        setAlertModal({
          isOpen: true,
          title: "Submission Failed",
          message: data.message,
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

  const getStatusStyle = (status) => {
    switch (status) {
      case "Approved":
        return "bg-green-50 text-green-700 border-green-200";
      case "Rejected":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
    }
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
        isOpen={discardModal.isOpen}
        title="Discard Form?"
        message="You have started filling out a leave request. If you cancel now, your details will be cleared and you will have to fill it again."
        confirmText="Yes, Discard"
        isDestructive={true}
        onClose={() => setDiscardModal({ isOpen: false })}
        onConfirm={() => {
          setDiscardModal({ isOpen: false });
          resetForm();
        }}
      />

      <ConfirmModal
        isOpen={reviewModal.isOpen}
        title="Review Leave Request"
        message={
          <span className="block mt-4 p-4 bg-zinc-50 rounded border border-zinc-200">
            <span className="grid grid-cols-3 gap-2 mb-2 border-b border-zinc-200 pb-2">
              <span className="text-zinc-500 font-medium text-xs uppercase tracking-wider">
                Leave Type
              </span>
              <span className="col-span-2 text-sm font-semibold text-black">
                {leaveType}
              </span>
            </span>
            <span className="grid grid-cols-3 gap-2 mb-2 border-b border-zinc-200 pb-2">
              <span className="text-zinc-500 font-medium text-xs uppercase tracking-wider">
                Dates
              </span>
              <span className="col-span-2 text-sm font-medium text-black">
                {startDate ? formatDate(startDate) : ""} to{" "}
                {endDate ? formatDate(endDate) : ""}
                <span className="text-zinc-500 ml-1 font-normal">
                  (
                  {startDate && endDate ? calculateDays(startDate, endDate) : 0}{" "}
                  days)
                </span>
              </span>
            </span>
            <span className="grid grid-cols-3 gap-2 pt-1">
              <span className="text-zinc-500 font-medium text-xs uppercase tracking-wider">
                Reason
              </span>
              <span className="col-span-2 text-sm text-black italic">
                "{reason}"
              </span>
            </span>
          </span>
        }
        confirmText="Confirm & Submit Request"
        isDestructive={false}
        onClose={() => setReviewModal({ isOpen: false })}
        onConfirm={executeApplyLeave}
      />

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-black tracking-tight">
            Leave Management
          </h2>
          <p className="text-sm text-zinc-500">
            Request time off and track your balances.
          </p>
        </div>
        <button
          onClick={() =>
            isFormOpen ? handleCancelClick() : setIsFormOpen(true)
          }
          className="flex items-center gap-2 bg-black text-white px-4 py-2 text-sm font-medium rounded-md hover:bg-zinc-800 transition-colors"
        >
          {isFormOpen ? (
            "Cancel Request"
          ) : (
            <>
              <Plus size={16} /> Request Leave
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-md border border-zinc-200 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-zinc-500 font-medium">Total Leaves</p>
          </div>
          <h3 className="text-2xl font-semibold text-black">
            {leaveBalances.total}
          </h3>
        </div>
        <div className="bg-white p-5 rounded-md border border-zinc-200 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-zinc-500 font-medium">Leaves Used</p>
          </div>
          <h3 className="text-2xl font-semibold text-black">
            {leaveBalances.used}
          </h3>
        </div>
        <div className="bg-white p-5 rounded-md border border-zinc-200 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-zinc-500 font-medium">Pending</p>
          </div>
          <h3 className="text-2xl font-semibold text-black">
            {leaveBalances.pending}
          </h3>
        </div>
        <div className="bg-zinc-900 p-5 rounded-md border border-zinc-800 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-zinc-400 font-medium">Remaining Leaves</p>
          </div>
          <h3 className="text-2xl font-semibold text-white">
            {leaveBalances.remaining}
          </h3>
        </div>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-md border border-zinc-200 mb-8 animate-in fade-in slide-in-from-top-4 duration-200">
          <h3 className="text-sm font-semibold text-black uppercase tracking-widest mb-4">
            New Leave Application
          </h3>
          <form
            onSubmit={handleReviewRequest}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1">
                Leave Type
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
              >
                <option value="Casual">Casual Leave</option>
                <option value="Sick">Sick Leave</option>
                <option value="Annual">Annual Leave</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1">
                Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1">
                End Date
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1">
                Reason for Leave
              </label>
              <textarea
                required
                rows="3"
                placeholder="Briefly describe the reason for your request..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black resize-none"
              />
            </div>
            <div className="md:col-span-2 mt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-black text-white px-4 py-2 text-sm font-medium rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {isLoading ? "Processing..." : "Review & Submit"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-md border border-zinc-200 overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Leave Type
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Days
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {leaves.map((leave) => (
              <tr
                key={leave._id}
                className="hover:bg-zinc-50 transition-colors"
              >
                <td className="px-6 py-4 font-medium text-black">
                  {leave.leaveType}
                  <div className="text-zinc-400 text-xs mt-1 truncate max-w-xs">
                    {leave.reason}
                  </div>
                </td>
                <td className="px-6 py-4 text-zinc-600">
                  {formatDate(leave.startDate)} — {formatDate(leave.endDate)}
                </td>
                <td className="px-6 py-4 text-zinc-600">
                  {calculateDays(leave.startDate, leave.endDate)}{" "}
                  {calculateDays(leave.startDate, leave.endDate) > 1
                    ? "days"
                    : "day"}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-md border ${getStatusStyle(leave.status)}`}
                  >
                    {leave.status}
                  </span>
                </td>
              </tr>
            ))}
            {leaves.length === 0 && (
              <tr>
                <td
                  colSpan="4"
                  className="px-6 py-12 text-center text-zinc-500"
                >
                  <div className="flex flex-col items-center justify-center">
                    <Info size={24} className="mb-2 text-zinc-300" />
                    <p>No leave requests found.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeeLeave;
