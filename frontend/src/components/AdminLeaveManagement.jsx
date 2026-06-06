import React, { useState, useEffect } from "react";
import {
  CalendarDays,
  Check,
  X,
  Search,
  Download,
  Trash2,
  XCircle,
  Edit2,
} from "lucide-react";
import { AlertModal, ConfirmModal, PromptModal } from "./Modals";

const API_URL = import.meta.env.VITE_API_URL;

const AdminLeaveManagement = ({ searchTerm = "" }) => {
  const [leaves, setLeaves] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: "",
    message: "",
  });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    leaveId: null,
    actionStatus: "",
    isCancelFlow: false,
  });
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    leaveId: null,
  });

  const [editData, setEditData] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchLeaves = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/leaves`, {
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

  const handleActionClick = (id, status, isCancelFlow = false) => {
    setConfirmModal({
      isOpen: true,
      leaveId: id,
      actionStatus: status,
      isCancelFlow,
    });
  };

  const updateLeaveStatus = async () => {
    const { leaveId, actionStatus, isCancelFlow } = confirmModal;
    setConfirmModal({
      isOpen: false,
      leaveId: null,
      actionStatus: "",
      isCancelFlow: false,
    });

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/leaves/${leaveId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: actionStatus,
          wasCancelDeny: isCancelFlow && actionStatus === "Approved",
        }),
      });
      if (res.ok) fetchLeaves();
      else {
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

  const handleEditLeave = async (e) => {
    e.preventDefault();
    setIsSavingEdit(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/leaves/${editData._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          startDate: editData.startDate,
          endDate: editData.endDate,
          leaveType: editData.leaveType,
          reason: editData.reason,
          isHalfDay: editData.isHalfDay,
        }),
      });
      if (res.ok) {
        setEditData(null);
        fetchLeaves();
      } else {
        const data = await res.json();
        setAlertModal({
          isOpen: true,
          title: "Update Failed",
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
      setIsSavingEdit(false);
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

  const openEditForm = (leave) => {
    setEditData({
      _id: leave._id,
      employeeName: leave.employeeId?.name || "Unknown",
      startDate: new Date(leave.startDate).toISOString().split("T")[0],
      endDate: new Date(leave.endDate).toISOString().split("T")[0],
      leaveType: leave.leaveType,
      reason: leave.reason,
      isHalfDay: leave.isHalfDay || false,
    });
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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

  const filteredLeaves = leaves.filter(
    (leave) =>
      (filterStatus === "All" || leave.status === filterStatus) &&
      ((leave.employeeId?.name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
        (leave.employeeId?.department || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        leave.leaveType.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const downloadCSV = () => {
    const headers = [
      "Employee Name",
      "Department",
      "Leave Type",
      "Start Date",
      "End Date",
      "Total Days",
      "Reason",
      "Status",
    ];
    const rows = filteredLeaves.map((r) => [
      r.employeeId?.name || "Unknown",
      r.employeeId?.department || "N/A",
      r.leaveType + (r.isHalfDay ? " (Half)" : ""),
      formatDate(r.startDate).replace(/,/g, ""),
      formatDate(r.endDate).replace(/,/g, ""),
      calculateDays(r.startDate, r.endDate, r.isHalfDay),
      `"${r.reason.replace(/"/g, '""')}"`,
      r.status,
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((e) => e.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute(
      "download",
      `leave_report_${new Date().toLocaleDateString().replace(/\//g, "-")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        title={
          confirmModal.isCancelFlow
            ? "Review Cancellation Request"
            : `${confirmModal.actionStatus} Leave Request?`
        }
        message={
          confirmModal.isCancelFlow
            ? confirmModal.actionStatus === "Cancelled"
              ? "Are you sure you want to approve the cancellation? The leave days will be refunded."
              : "Are you sure you want to deny their cancellation? The leave will remain Approved and dates will not change."
            : `Are you sure you want to ${confirmModal.actionStatus.toLowerCase()} this leave request?`
        }
        confirmText={
          confirmModal.isCancelFlow
            ? confirmModal.actionStatus === "Cancelled"
              ? "Approve Cancel"
              : "Deny Cancel"
            : `Yes, ${confirmModal.actionStatus}`
        }
        isDestructive={
          confirmModal.actionStatus === "Rejected" ||
          confirmModal.actionStatus === "Cancelled"
        }
        onClose={() =>
          setConfirmModal({
            isOpen: false,
            leaveId: null,
            actionStatus: "",
            isCancelFlow: false,
          })
        }
        onConfirm={updateLeaveStatus}
      />

      <PromptModal
        isOpen={deleteModal.isOpen}
        title="Delete Record Permanently"
        message="Deleting this record is permanent. Use Edit or Cancellation for active tracking adjustments instead if possible."
        matchText="delete"
        onClose={() => setDeleteModal({ isOpen: false, leaveId: null })}
        onConfirm={handleDeleteLeave}
      />

      <div className="flex flex-col sm:flex-row justify-between sm:items-end mb-6 border-b border-zinc-200 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-black tracking-tight">
            Leave Reports
          </h2>
          <p className="text-sm text-zinc-500">
            Review, modify, and export employee time-off records.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 bg-black text-white px-4 py-1.5 text-sm font-medium rounded-md hover:bg-zinc-800 transition-colors h-[34px]"
          >
            <Download size={14} /> Export Report
          </button>
          <div className="flex bg-zinc-100 p-1 rounded-md border border-zinc-200 h-[34px] items-center">
            {[
              "All",
              "Pending",
              "Approved",
              "Rejected",
              "Cancel Requested",
              "Cancelled",
            ].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-1 text-sm font-medium rounded-sm transition-colors h-full ${filterStatus === status ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-black"}`}
              >
                {status === "Cancel Requested" ? "Cancel Reqs" : status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {editData && (
        <div className="bg-white p-6 rounded-md border border-zinc-200 mb-6 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-black uppercase tracking-widest">
              Admin Edit:{" "}
              <span className="text-blue-600">
                {editData.employeeName}'s Leave
              </span>
            </h3>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-black font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={editData.isHalfDay}
                  onChange={(e) => {
                    setEditData({
                      ...editData,
                      isHalfDay: e.target.checked,
                      endDate: e.target.checked
                        ? editData.startDate
                        : editData.endDate,
                    });
                  }}
                  className="w-4 h-4 text-black border-zinc-300 rounded cursor-pointer"
                />
                Convert to Half-Day
              </label>
              <button
                onClick={() => setEditData(null)}
                className="text-zinc-400 hover:text-black transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <form
            onSubmit={handleEditLeave}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1">
                Leave Type
              </label>
              <select
                value={editData.leaveType}
                onChange={(e) =>
                  setEditData({ ...editData, leaveType: e.target.value })
                }
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
                value={editData.startDate}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    startDate: e.target.value,
                    endDate: editData.isHalfDay
                      ? e.target.value
                      : editData.endDate,
                  })
                }
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
                value={editData.endDate}
                min={editData.startDate}
                disabled={editData.isHalfDay}
                onChange={(e) =>
                  setEditData({ ...editData, endDate: e.target.value })
                }
                className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black disabled:bg-zinc-100 disabled:text-zinc-500"
              />
            </div>
            <div className="md:col-span-2 mt-2 flex gap-3">
              <button
                type="submit"
                disabled={isSavingEdit}
                className="bg-black text-white px-4 py-2 text-sm font-medium rounded-md hover:bg-zinc-800 transition-colors"
              >
                {isSavingEdit ? "Saving..." : "Save & Overwrite Dates"}
              </button>
              <button
                type="button"
                onClick={() => setEditData(null)}
                className="bg-white border border-zinc-300 text-black px-4 py-2 text-sm font-medium rounded-md hover:bg-zinc-50 transition-colors"
              >
                Cancel
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
                Employee
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Leave Details
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">
                Status / Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {filteredLeaves.map((leave) => (
              <tr
                key={leave._id}
                className="hover:bg-zinc-50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="font-medium text-black">
                    {leave.employeeId?.name || "Unknown"}
                  </div>
                  <div className="text-zinc-500 text-xs">
                    {leave.employeeId?.department || "N/A"}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-zinc-800 flex gap-2 items-center">
                    {leave.leaveType}{" "}
                    {leave.isHalfDay && (
                      <span className="text-[10px] ml-1 font-semibold bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded border border-zinc-200 uppercase tracking-widest">
                        Half
                      </span>
                    )}{" "}
                    <button
                      onClick={() => openEditForm(leave)}
                      className="text-zinc-300 hover:text-blue-600 transition-colors"
                      title="Edit details"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                  <div
                    className="text-zinc-500 text-xs mt-0.5 truncate max-w-[250px] whitespace-normal line-clamp-1"
                    title={leave.reason}
                  >
                    {leave.reason}
                  </div>
                </td>
                <td className="px-6 py-4 text-zinc-600">
                  <div>
                    {formatDate(leave.startDate)}{" "}
                    {leave.startDate !== leave.endDate &&
                      `— ${formatDate(leave.endDate)}`}
                  </div>
                  <div className="text-xs mt-0.5 font-medium">
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
                  </div>
                </td>
                <td className="px-6 py-4 flex flex-col items-end gap-2">
                  {leave.status === "Pending" ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleActionClick(leave._id, "Approved")}
                        className="flex items-center gap-1 bg-white border border-zinc-200 text-green-700 hover:bg-green-50 hover:border-green-300 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        onClick={() => handleActionClick(leave._id, "Rejected")}
                        className="flex items-center gap-1 bg-white border border-zinc-200 text-red-700 hover:bg-red-50 hover:border-red-300 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  ) : leave.status === "Cancel Requested" ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleActionClick(leave._id, "Cancelled", true)
                        }
                        className="flex items-center gap-1 bg-white border border-zinc-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                      >
                        <Trash2 size={14} /> Approve Cancel
                      </button>
                      <button
                        onClick={() =>
                          handleActionClick(leave._id, "Approved", true)
                        }
                        className="flex items-center gap-1 bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                      >
                        <XCircle size={14} /> Deny
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-md border ${getStatusStyle(leave.status)}`}
                      >
                        {leave.status}
                      </span>
                      <button
                        onClick={() =>
                          setDeleteModal({ isOpen: true, leaveId: leave._id })
                        }
                        title="Permanently Delete Record"
                        className="text-zinc-300 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filteredLeaves.length === 0 && (
              <tr>
                <td
                  colSpan="4"
                  className="px-6 py-12 text-center text-zinc-500"
                >
                  No {filterStatus !== "All" ? filterStatus.toLowerCase() : ""}{" "}
                  requests found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminLeaveManagement;
