import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Info,
  Umbrella,
  Activity,
  CheckCircle2,
  Trash2,
  XCircle,
} from "lucide-react";
import { AlertModal, ConfirmModal, PromptModal } from "./Modals";

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
  const [isHalfDay, setIsHalfDay] = useState(draftData.isHalfDay || false);
  const [reason, setReason] = useState(draftData.reason || "");

  const [isLoading, setIsLoading] = useState(false);
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: "",
    message: "",
  });
  const [discardModal, setDiscardModal] = useState({ isOpen: false });
  const [reviewModal, setReviewModal] = useState({ isOpen: false });
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    leaveId: null,
  });
  const [cancelReqModal, setCancelReqModal] = useState({
    isOpen: false,
    leaveId: null,
  });

  const todayString = new Date().toISOString().split("T")[0];

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
    const draft = {
      isFormOpen,
      leaveType,
      startDate,
      endDate,
      isHalfDay,
      reason,
    };
    sessionStorage.setItem("employeeLeaveFormDraft", JSON.stringify(draft));
  }, [isFormOpen, leaveType, startDate, endDate, isHalfDay, reason]);

  const hasUnsavedChanges = () => {
    if (!isFormOpen) return false;
    return (
      leaveType !== "Casual" ||
      startDate !== "" ||
      endDate !== "" ||
      isHalfDay !== false ||
      reason !== ""
    );
  };

  const handleCancelClick = () => {
    if (hasUnsavedChanges()) setDiscardModal({ isOpen: true });
    else resetForm();
  };

  const resetForm = () => {
    setLeaveType("Casual");
    setStartDate("");
    setEndDate("");
    setIsHalfDay(false);
    setReason("");
    setIsFormOpen(false);
    sessionStorage.removeItem("employeeLeaveFormDraft");
  };

  const calculateDays = (start, end, halfDayFlag) => {
    if (halfDayFlag) return 0.5;
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

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const usedDays = leaves
    .filter((l) => l.status === "Approved")
    .reduce(
      (acc, l) => acc + calculateDays(l.startDate, l.endDate, l.isHalfDay),
      0,
    );
  const pendingDays = leaves
    .filter((l) => l.status === "Pending")
    .reduce(
      (acc, l) => acc + calculateDays(l.startDate, l.endDate, l.isHalfDay),
      0,
    );
  const leaveBalances = {
    total: TOTAL_LEAVE_ALLOWANCE,
    used: usedDays,
    pending: pendingDays,
    remaining: TOTAL_LEAVE_ALLOWANCE - usedDays,
  };

  const handleLeaveTypeChange = (e) => {
    const newType = e.target.value;
    setLeaveType(newType);
    if (newType !== "Sick" && startDate && startDate < todayString) {
      setStartDate(todayString);
      if (endDate < todayString) setEndDate(todayString);
    }
  };

  const handleHalfDayChange = (e) => {
    const isChecked = e.target.checked;
    setIsHalfDay(isChecked);
    if (isChecked && startDate) {
      setEndDate(startDate);
    }
  };

  const handleReviewRequest = (e) => {
    e.preventDefault();
    const startObj = new Date(startDate);
    startObj.setHours(0, 0, 0, 0);
    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);

    if (new Date(startDate) > new Date(endDate)) {
      setAlertModal({
        isOpen: true,
        title: "Invalid Dates",
        message: "End date cannot be earlier than start date.",
      });
      return;
    }

    if (leaveType !== "Sick" && startObj < todayObj) {
      setAlertModal({
        isOpen: true,
        title: "Invalid Dates",
        message:
          "Only Sick Leave can be applied retroactively. Casual and Annual leave must start from today onward.",
      });
      return;
    }

    const requestedDays = calculateDays(startDate, endDate, isHalfDay);

    if (requestedDays === 0) {
      setAlertModal({
        isOpen: true,
        title: "Invalid Selection",
        message: "Weekends do not require leave requests.",
      });
      return;
    }

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
        body: JSON.stringify({
          leaveType,
          startDate,
          endDate,
          isHalfDay,
          reason,
        }),
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
      } else
        setAlertModal({
          isOpen: true,
          title: "Submission Failed",
          message: data.message,
        });
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

  const handleDeleteLeave = async () => {
    const id = deleteModal.leaveId;
    setDeleteModal({ isOpen: false, leaveId: null });
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/leaves/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchLeaves();
      else {
        const data = await res.json();
        setAlertModal({
          isOpen: true,
          title: "Delete Failed",
          message: data.message,
        });
      }
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: "Error",
        message: "Server error occurred.",
      });
    }
  };

  const handleRequestCancel = async () => {
    const id = cancelReqModal.leaveId;
    setCancelReqModal({ isOpen: false, leaveId: null });
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/leaves/${id}/request-cancel`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchLeaves();
        setAlertModal({
          isOpen: true,
          title: "Cancellation Requested",
          message:
            "A notification has been sent to administration to approve your cancellation.",
        });
      } else {
        const data = await res.json();
        setAlertModal({
          isOpen: true,
          title: "Action Failed",
          message: data.message,
        });
      }
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: "Error",
        message: "Server error occurred.",
      });
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "Approved":
        return "bg-green-50 text-green-700 border-green-200";
      case "Rejected":
        return "bg-red-50 text-red-700 border-red-200";
      case "Cancelled":
        return "bg-zinc-100 text-zinc-600 border-zinc-200";
      case "Cancel Requested":
        return "bg-orange-50 text-orange-700 border-orange-200";
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
      <PromptModal
        isOpen={deleteModal.isOpen}
        title="Cancel Pending Request"
        message="Canceling this request will remove it from the system."
        matchText="cancel"
        onClose={() => setDeleteModal({ isOpen: false, leaveId: null })}
        onConfirm={handleDeleteLeave}
      />
      <ConfirmModal
        isOpen={cancelReqModal.isOpen}
        title="Request Cancellation?"
        message="This leave has already been approved. You are submitting a formal request to Admin to cancel it and refund your leave days."
        confirmText="Submit Cancel Request"
        isDestructive={false}
        onClose={() => setCancelReqModal({ isOpen: false, leaveId: null })}
        onConfirm={handleRequestCancel}
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
                {leaveType} {isHalfDay && "(Half-Day)"}
              </span>
            </span>
            <span className="grid grid-cols-3 gap-2 mb-2 border-b border-zinc-200 pb-2">
              <span className="text-zinc-500 font-medium text-xs uppercase tracking-wider">
                Dates
              </span>
              <span className="col-span-2 text-sm font-medium text-black">
                {startDate ? formatDate(startDate) : ""} to{" "}
                {endDate ? formatDate(endDate) : ""}{" "}
                <span className="text-zinc-500 ml-1 font-normal">
                  (
                  {startDate && endDate
                    ? calculateDays(startDate, endDate, isHalfDay)
                    : 0}{" "}
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
            <p className="text-sm text-zinc-500 font-medium">Total Allowance</p>
            <Umbrella size={16} className="text-zinc-400" />
          </div>
          <h3 className="text-2xl font-semibold text-black">
            {leaveBalances.total}
          </h3>
        </div>
        <div className="bg-white p-5 rounded-md border border-zinc-200 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-zinc-500 font-medium">Days Used</p>
            <CheckCircle2 size={16} className="text-zinc-400" />
          </div>
          <h3 className="text-2xl font-semibold text-black">
            {leaveBalances.used}
          </h3>
        </div>
        <div className="bg-white p-5 rounded-md border border-zinc-200 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-zinc-500 font-medium">Pending</p>
            <Activity size={16} className="text-yellow-500" />
          </div>
          <h3 className="text-2xl font-semibold text-black">
            {leaveBalances.pending}
          </h3>
        </div>
        <div className="bg-zinc-900 p-5 rounded-md border border-zinc-800 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-zinc-400 font-medium">Remaining</p>
          </div>
          <h3 className="text-2xl font-semibold text-white">
            {leaveBalances.remaining}
          </h3>
        </div>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-md border border-zinc-200 mb-8 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-black uppercase tracking-widest">
              New Leave Application
            </h3>
            <label className="flex items-center gap-2 text-sm text-black font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={isHalfDay}
                onChange={handleHalfDayChange}
                className="w-4 h-4 text-black focus:ring-black border-zinc-300 rounded cursor-pointer"
              />
              Apply for Half-Day
            </label>
          </div>
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
                onChange={handleLeaveTypeChange}
                className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black"
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
                min={leaveType !== "Sick" ? todayString : undefined}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (isHalfDay) setEndDate(e.target.value);
                }}
                className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black"
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
                min={
                  startDate || (leaveType !== "Sick" ? todayString : undefined)
                }
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isHalfDay}
                className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black disabled:bg-zinc-100 disabled:text-zinc-500"
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
                className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black resize-none"
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
              <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">
                Status / Action
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
                  {leave.leaveType}{" "}
                  {leave.isHalfDay && (
                    <span className="text-xs ml-1 font-medium bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded border border-zinc-200">
                      Half
                    </span>
                  )}
                  <div className="text-zinc-400 text-xs mt-1 truncate max-w-xs">
                    {leave.reason}
                  </div>
                </td>
                <td className="px-6 py-4 text-zinc-600">
                  {formatDate(leave.startDate)}{" "}
                  {leave.startDate !== leave.endDate &&
                    `— ${formatDate(leave.endDate)}`}
                </td>
                <td className="px-6 py-4 text-zinc-600">
                  {calculateDays(
                    leave.startDate,
                    leave.endDate,
                    leave.isHalfDay,
                  )}{" "}
                  {calculateDays(
                    leave.startDate,
                    leave.endDate,
                    leave.isHalfDay,
                  ) > 1
                    ? "days"
                    : "day"}
                </td>
                <td className="px-6 py-4 flex items-center justify-end gap-3">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-md border ${getStatusStyle(leave.status)}`}
                  >
                    {leave.status}
                  </span>
                  {leave.status === "Pending" && (
                    <button
                      onClick={() =>
                        setDeleteModal({ isOpen: true, leaveId: leave._id })
                      }
                      title="Cancel Pending Request"
                      className="text-zinc-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  {leave.status === "Approved" &&
                    new Date(leave.endDate) >=
                      new Date(new Date().setHours(0, 0, 0, 0)) && (
                      <button
                        onClick={() =>
                          setCancelReqModal({
                            isOpen: true,
                            leaveId: leave._id,
                          })
                        }
                        title="Request Cancellation"
                        className="text-zinc-400 hover:text-orange-500 transition-colors"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
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
