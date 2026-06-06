import React, { useState, useEffect } from "react";
import {
  Clock,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

const AdminAttendance = () => {
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchAttendance = async () => {
    try {
      const token = localStorage.getItem("token");
      const queryParams = new URLSearchParams({ page, limit: 15 });
      if (startDate && endDate) {
        queryParams.append("startDate", startDate);
        queryParams.append("endDate", endDate);
      }

      const res = await fetch(`${API_URL}/attendance?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setRecords(data.records);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [page, startDate, endDate]);

  const formatTime = (timeString) => {
    if (!timeString) return "---";
    return new Date(timeString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const downloadCSV = () => {
    const headers = [
      "Employee Name",
      "Email",
      "Department",
      "Date",
      "Clock In",
      "Clock Out",
      "Status",
    ];
    const rows = filteredRecords.map((r) => [
      r.employeeId?.name || "Unknown",
      r.employeeId?.email || "N/A",
      r.employeeId?.department || "N/A",
      formatDate(r.date).replace(/,/g, ""),
      formatTime(r.checkInTime),
      formatTime(r.checkOutTime),
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
      `attendance_report_${new Date().toLocaleDateString().replace(/\//g, "-")}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRecords = records.filter(
    (record) =>
      (record.employeeId?.name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (record.employeeId?.email || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-black tracking-tight">
            Attendance Reports
          </h2>
          <p className="text-sm text-zinc-500">
            Optimized query log of organizational attendance.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="bg-white border border-zinc-300 rounded-md px-3 py-1.5 text-sm text-black focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
            />
            <span className="text-zinc-400 text-sm">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              min={startDate}
              className="bg-white border border-zinc-300 rounded-md px-3 py-1.5 text-sm text-black focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
            />
          </div>
          <button
            onClick={downloadCSV}
            className="flex items-center justify-center gap-2 bg-black text-white px-4 py-1.5 text-sm font-medium rounded-md hover:bg-zinc-800 transition-colors"
          >
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="relative">
          <Search
            size={14}
            className="text-zinc-400 absolute left-3 top-1/2 transform -translate-y-1/2"
          />
          <input
            type="text"
            placeholder="Search page records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white border border-zinc-300 rounded-md pl-9 pr-3 py-1.5 text-sm text-black placeholder-zinc-400 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all w-64"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 bg-white border border-zinc-200 rounded-md text-zinc-600 disabled:opacity-50 hover:bg-zinc-50 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-medium text-zinc-500">
            Page {page} of {totalPages === 0 ? 1 : totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0}
            className="p-1.5 bg-white border border-zinc-200 rounded-md text-zinc-600 disabled:opacity-50 hover:bg-zinc-50 transition-colors"
          >
            <ChevronRight size={16} />
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
                Date
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Clock In
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Clock Out
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {filteredRecords.map((record) => (
              <tr
                key={record._id}
                className="hover:bg-zinc-50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="font-medium text-black">
                    {record.employeeId?.name || "Unknown"}
                  </div>
                  <div className="text-zinc-500 text-xs">
                    {record.employeeId?.email || "N/A"}
                  </div>
                </td>
                <td className="px-6 py-4 font-medium text-zinc-800">
                  {formatDate(record.date)}
                </td>
                <td className="px-6 py-4 text-zinc-600">
                  {formatTime(record.checkInTime)}
                </td>
                <td className="px-6 py-4 text-zinc-600">
                  {formatTime(record.checkOutTime)}
                </td>
                <td className="px-6 py-4 text-right">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-md ${record.status === "Present" ? "bg-zinc-100 text-black border border-zinc-200" : "bg-zinc-100 text-zinc-600"}`}
                  >
                    {record.status}
                  </span>
                </td>
              </tr>
            ))}
            {filteredRecords.length === 0 && (
              <tr>
                <td
                  colSpan="5"
                  className="px-6 py-12 text-center text-zinc-500"
                >
                  <div className="flex flex-col items-center justify-center">
                    <Clock size={24} className="mb-2 text-zinc-300" />
                    <p>No records matching your search/filters.</p>
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

export default AdminAttendance;
