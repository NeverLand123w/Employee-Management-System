import React, { useState, useEffect } from "react";
import { CalendarDays, Check, X, Search, Download } from "lucide-react";
import { AlertModal, ConfirmModal } from "./Modals";

const API_URL = import.meta.env.VITE_API_URL;

const AdminLeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: "",
    message: "",
  });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    leaveId: null,
    actionStatus: "",
  });

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

  const handleActionClick = (id, status) => {
    setConfirmModal({ isOpen: true, leaveId: id, actionStatus: status });
  };

  const updateLeaveStatus = async () => {
    const { leaveId, actionStatus } = confirmModal;
    setConfirmModal({ isOpen: false, leaveId: null, actionStatus: "" });

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/leaves/${leaveId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: actionStatus }),
      });
      if (res.ok) fetchLeaves();
      else {
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
    }
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const calculateDays = (start, end) =>
    Math.ceil(
      Math.abs(new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24),
    ) + 1;

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
      r.leaveType,
      formatDate(r.startDate).replace(/,/g, ""),
      formatDate(r.endDate).replace(/,/g, ""),
      calculateDays(r.startDate, r.endDate),
      `"${r.reason.replace(/"/g, '""')}"`,
      r.status,
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((e) => e.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `leave_report_${new Date().toLocaleDateString().replace(/\//g, "-")}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        onClose={() => setAlertModal({ isOpen: false, title: "", message: "" })}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={`${confirmModal.actionStatus} Leave Request?`}
        message={`Are you sure you want to ${confirmModal.actionStatus.toLowerCase()} this leave request?`}
        confirmText={`Yes, ${confirmModal.actionStatus}`}
        isDestructive={confirmModal.actionStatus === "Rejected"}
        onClose={() =>
          setConfirmModal({ isOpen: false, leaveId: null, actionStatus: "" })
        }
        onConfirm={updateLeaveStatus}
      />

      <div className="flex flex-col sm:flex-row justify-between sm:items-end mb-6 border-b border-zinc-200 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-black tracking-tight">
            Leave Reports
          </h2>
          <p className="text-sm text-zinc-500">
            Review, manage, and export employee time-off records.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative h-[34px]">
            <Search
              size={14}
              className="text-zinc-400 absolute left-3 top-1/2 transform -translate-y-1/2"
            />
            <input
              type="text"
              placeholder="Search leaves..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-zinc-300 rounded-md pl-9 pr-3 py-1.5 text-sm text-black placeholder-zinc-400 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all w-full sm:w-64 h-full"
            />
          </div>
          <div className="flex bg-zinc-100 p-1 rounded-md border border-zinc-200 h-[34px] items-center">
            {["All", "Pending", "Approved", "Rejected"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-1 text-sm font-medium rounded-sm transition-colors h-full ${filterStatus === status ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-black"}`}
              >
                {status}
              </button>
            ))}
          </div>
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 bg-black text-white px-4 py-1.5 text-sm font-medium rounded-md hover:bg-zinc-800 transition-colors h-[34px]"
          >
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

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
                  <div className="font-medium text-zinc-800">
                    {leave.leaveType}
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
                    {formatDate(leave.startDate)} — {formatDate(leave.endDate)}
                  </div>
                  <div className="text-xs mt-0.5 font-medium">
                    {calculateDays(leave.startDate, leave.endDate)}{" "}
                    {calculateDays(leave.startDate, leave.endDate) > 1
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
                  ) : (
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-md border ${getStatusStyle(leave.status)}`}
                    >
                      {leave.status}
                    </span>
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
                  <div className="flex flex-col items-center justify-center">
                    <CalendarDays size={24} className="mb-2 text-zinc-300" />
                    <p>
                      No{" "}
                      {filterStatus !== "All" ? filterStatus.toLowerCase() : ""}{" "}
                      requests found matching your criteria.
                    </p>
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

export default AdminLeaveManagement;
