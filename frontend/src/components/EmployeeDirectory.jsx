import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ShieldAlert, Search, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { AlertModal, ConfirmModal, PromptModal } from "./Modals";

const API_URL = import.meta.env.VITE_API_URL;
const PAGE_SIZE = 10;

const EmployeeDirectory = () => {
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [resendingId, setResendingId] = useState(null);

  const draftData =
    JSON.parse(sessionStorage.getItem("employeeFormDraft")) || {};
  const userString = localStorage.getItem("user");
  const loggedInUser = userString ? JSON.parse(userString) : null;

  const [isFormOpen, setIsFormOpen] = useState(draftData.isFormOpen || false);
  const [editingId, setEditingId] = useState(draftData.editingId || null);

  const [name, setName] = useState(draftData.name || "");
  const [email, setEmail] = useState(draftData.email || "");
  const [resetPassword, setResetPassword] = useState(false);
  const [role, setRole] = useState(draftData.role || "Employee");
  const [department, setDepartment] = useState(
    draftData.department || "Engineering",
  );
  const [initialFormData, setInitialFormData] = useState(
    draftData.initialFormData || null,
  );

  const [isLoading, setIsLoading] = useState(false);
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: "",
    message: "",
  });
  const [discardModal, setDiscardModal] = useState({
    isOpen: false,
    pendingAction: null,
    targetEmp: null,
  });
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    targetId: null,
  });
  const [reviewModal, setReviewModal] = useState({ isOpen: false });

  const isEditingSelf = editingId === loggedInUser?.id;

  const fetchEmployees = async () => {
    setIsFetching(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    const draft = {
      isFormOpen,
      editingId,
      name,
      email,
      role,
      department,
      initialFormData,
    };
    sessionStorage.setItem("employeeFormDraft", JSON.stringify(draft));
  }, [
    isFormOpen,
    editingId,
    name,
    email,
    role,
    department,
    initialFormData,
  ]);

  const hasUnsavedChanges = () => {
    if (!isFormOpen || !initialFormData) return false;
    return (
      name !== initialFormData.name ||
      email !== initialFormData.email ||
      role !== initialFormData.role ||
      department !== initialFormData.department
    );
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setResetPassword(false);
    setRole("Employee");
    setDepartment("Engineering");
    setEditingId(null);
    setIsFormOpen(false);
    setInitialFormData(null);
    sessionStorage.removeItem("employeeFormDraft");
  };

  const handleActionWithWarning = (actionType, targetEmp = null) => {
    if (actionType === "edit" && editingId === targetEmp?._id) return;
    if (isFormOpen && hasUnsavedChanges()) {
      setDiscardModal({ isOpen: true, pendingAction: actionType, targetEmp });
    } else {
      executePendingAction(actionType, targetEmp);
    }
  };

  const executePendingAction = (actionType, targetEmp) => {
    if (actionType === "cancel") {
      resetForm();
    } else if (actionType === "openNew") {
      resetForm();
      setIsFormOpen(true);
      setInitialFormData({
        name: "",
        email: "",
        role: "Employee",
        department: "Engineering",
      });
    } else if (actionType === "edit") {
      setName(targetEmp.name);
      setEmail(targetEmp.email);
      setResetPassword(false);
      setRole(targetEmp.role);
      setDepartment(targetEmp.department);
      setEditingId(targetEmp._id);
      setIsFormOpen(true);
      setInitialFormData({
        name: targetEmp.name,
        email: targetEmp.email,
        role: targetEmp.role,
        department: targetEmp.department,
      });
    }
    setDiscardModal({ isOpen: false, pendingAction: null, targetEmp: null });
  };

  const executeDelete = async () => {
    const id = deleteModal.targetId;
    setDeleteModal({ isOpen: false, targetId: null });
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/employees/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchEmployees();
        if (editingId === id) resetForm();
      } else {
        const data = await res.json();
        setAlertModal({
          isOpen: true,
          title: "Action Blocked",
          message: data.message,
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteClick = (id) => {
    if (id === loggedInUser?.id) {
      setAlertModal({
        isOpen: true,
        title: "Action Blocked",
        message: "You cannot delete your own account.",
      });
      return;
    }
    setDeleteModal({ isOpen: true, targetId: id });
  };

  const handleResendSetup = async (emp) => {
    setResendingId(emp._id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/employees/${emp._id}/resend-setup`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAlertModal({
        isOpen: true,
        title: res.ok ? "Setup Link Sent" : "Failed to Resend",
        message: res.ok
          ? `A new setup link has been emailed to ${emp.email}. It expires in 24 hours.`
          : data.message || "Something went wrong.",
      });
    } catch {
      setAlertModal({ isOpen: true, title: "Error", message: "Network error. Please try again." });
    } finally {
      setResendingId(null);
    }
  };

  const handleRoleChange = (e) => {
    const selectedRole = e.target.value;
    setRole(selectedRole);
    if (selectedRole === "Admin") setDepartment("Management");
    else if (department === "Management") setDepartment("Engineering");
  };

  const handleReviewRequest = (e) => {
    e.preventDefault();
    setReviewModal({ isOpen: true });
  };

  const executeSave = async () => {
    setReviewModal({ isOpen: false });
    setIsLoading(true);
    const url = editingId
      ? `${API_URL}/employees/${editingId}`
      : `${API_URL}/employees`;
    const method = editingId ? "PUT" : "POST";
    const bodyData = { name, email, role, department };
    if (resetPassword) bodyData.resetPassword = true;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyData),
      });
      if (res.ok) {
        resetForm();
        fetchEmployees();
      } else {
        const data = await res.json();
        setAlertModal({
          isOpen: true,
          title: "Update Failed",
          message: data.message || data.error,
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
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
        title="Discard Unsaved Changes?"
        message="You have unsaved changes in the form. Are you sure you want to discard them and proceed?"
        confirmText="Discard Changes"
        isDestructive={true}
        onClose={() =>
          setDiscardModal({
            isOpen: false,
            pendingAction: null,
            targetEmp: null,
          })
        }
        onConfirm={() =>
          executePendingAction(
            discardModal.pendingAction,
            discardModal.targetEmp,
          )
        }
      />
      <PromptModal
        isOpen={deleteModal.isOpen}
        title="Delete Employee Record"
        message="This action is permanent and cannot be undone. This will permanently delete the employee record from the system."
        matchText="delete"
        onClose={() => setDeleteModal({ isOpen: false, targetId: null })}
        onConfirm={executeDelete}
      />
      <ConfirmModal
        isOpen={reviewModal.isOpen}
        title={editingId ? "Review Profile Updates" : "Review New Employee"}
        message={
          <span className="block mt-4 p-4 bg-zinc-50 rounded border border-zinc-200">
            <span className="grid grid-cols-3 gap-2 mb-2 border-b border-zinc-200 pb-2">
              <span className="text-zinc-500 font-medium text-xs uppercase tracking-wider">
                Full Name
              </span>
              <span className="col-span-2 text-sm font-semibold text-black">
                {name}
              </span>
            </span>
            <span className="grid grid-cols-3 gap-2 mb-2 border-b border-zinc-200 pb-2">
              <span className="text-zinc-500 font-medium text-xs uppercase tracking-wider">
                Email
              </span>
              <span className="col-span-2 text-sm font-medium text-black">
                {email}
              </span>
            </span>
            <span className="grid grid-cols-3 gap-2 mb-2 border-b border-zinc-200 pb-2">
              <span className="text-zinc-500 font-medium text-xs uppercase tracking-wider">
                Role
              </span>
              <span className="col-span-2 text-sm font-medium text-black">
                {role}
              </span>
            </span>
            <span className="grid grid-cols-3 gap-2 mb-2 border-b border-zinc-200 pb-2">
              <span className="text-zinc-500 font-medium text-xs uppercase tracking-wider">
                Department
              </span>
              <span className="col-span-2 text-sm font-medium text-black">
                {department}
              </span>
            </span>
            <span className="grid grid-cols-3 gap-2 pt-1">
              <span className="text-zinc-500 font-medium text-xs uppercase tracking-wider">
                Password
              </span>
              <span className="col-span-2 text-sm text-zinc-500 italic">
                {!editingId
                  ? "Setup link will be emailed to the employee"
                  : resetPassword
                    ? "New setup link will be emailed to the employee"
                    : "No changes to existing password"}
              </span>
            </span>
          </span>
        }
        confirmText={editingId ? "Confirm Updates" : "Confirm & Add Employee"}
        isDestructive={false}
        onClose={() => setReviewModal({ isOpen: false })}
        onConfirm={executeSave}
      />

      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4 border-b border-zinc-200 pb-4">
        <div>
          
          <p className="text-xl text-black">
            Manage your team members and their roles.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative h-[34px] w-full">
          <Search
            size={14}
            className="text-zinc-400 absolute left-3 top-1/2 transform -translate-y-1/2"
          />
          <input
            type="text"
            placeholder="Search directory..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="bg-white border border-zinc-300 rounded-md pl-9 pr-3 py-1.5 text-sm text-black placeholder-zinc-400 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all w-full sm:w-64 h-full"
          />
        </div>
          <button
            onClick={() =>
              handleActionWithWarning(isFormOpen ? "cancel" : "openNew")
            }
            className="flex items-center justify-center whitespace-nowrap gap-2 bg-black text-white px-4 py-2 text-sm font-medium rounded-md hover:bg-zinc-800 transition-colors h-[34px] w-full"
          >
            {isFormOpen ? (
              "Cancel"
            ) : (
              <>
                <Plus size={16} /> Add Employee
              </>
            )}
          </button>
          
        </div>
      </div>


      {isFormOpen && (
        <div className="bg-white p-6 rounded-md border border-zinc-200 mb-8 animate-in fade-in slide-in-from-top-4 duration-200">
          <h3 className="text-sm font-semibold text-black uppercase tracking-widest mb-4">
            {editingId ? "Edit Employee Details" : "New Onboarding"}
          </h3>
          <form
            onSubmit={handleReviewRequest}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <input
              type="text"
              placeholder="Full Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
            <input
              type="email"
              placeholder="Email Address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
            {editingId && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={resetPassword}
                  onChange={(e) => setResetPassword(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-300 accent-black cursor-pointer"
                />
                <span className="text-sm text-zinc-600">Send password reset link to employee</span>
              </label>
            )}
            <div className="flex gap-4">
              <select
                value={role}
                onChange={handleRoleChange}
                disabled={isEditingSelf}
                className="w-1/2 bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black disabled:bg-zinc-100 disabled:text-zinc-500"
              >
                <option value="Employee">Employee</option>
                <option value="Admin">Admin</option>
              </select>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={role === "Admin" || isEditingSelf}
                className="w-1/2 bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black disabled:bg-zinc-100 disabled:text-zinc-500"
              >
                <option value="Engineering">Engineering</option>
                <option value="HR">HR</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
                <option value="Management">Management</option>
              </select>
            </div>
            <div className="md:col-span-2 mt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-black text-white px-4 py-2 text-sm font-medium rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {isLoading ? "Processing..." : "Review Details"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-md border border-zinc-200 overflow-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {isFetching ? (
              [...Array(6)].map((_, i) => (
                <tr key={`skel-${i}`} className="animate-pulse">
                  <td className="px-6 py-4">
                    <div className="h-4 bg-zinc-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-zinc-100 rounded w-1/2"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-5 bg-zinc-200 rounded w-16"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-zinc-200 rounded w-1/2"></div>
                  </td>
                  <td className="px-6 py-4 flex justify-end">
                    <div className="h-6 w-16 bg-zinc-200 rounded"></div>
                  </td>
                </tr>
              ))
            ) : (
              <>
                {employees
                  .filter(
                    (emp) =>
                      emp.name
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                      emp.email
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                      emp.department
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                      emp.role.toLowerCase().includes(searchTerm.toLowerCase()),
                  )
                  .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                  .map((emp) => {
                    const isOtherAdmin =
                      emp.role === "Admin" && emp._id !== loggedInUser?.id;

                    return (
                      <tr
                        key={emp._id}
                        className="hover:bg-zinc-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-black">
                            {emp.name}
                          </div>
                          <div className="text-zinc-500 text-xs">
                            {emp.email}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-md ${emp.role === "Admin" ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-600"}`}
                          >
                            {emp.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-600">
                          {emp.department}
                        </td>
                        <td className="px-6 py-4 flex gap-3 justify-end items-center">
                          {!emp.password && (
                            <button
                              onClick={() => handleResendSetup(emp)}
                              disabled={resendingId === emp._id}
                              title="Resend setup link"
                              className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 transition-colors disabled:opacity-50"
                            >
                              <RefreshCw size={11} className={resendingId === emp._id ? "animate-spin" : ""} />
                              {resendingId === emp._id ? "Sending…" : "Resend Link"}
                            </button>
                          )}
                          {isOtherAdmin ? (
                            <div className="flex items-center gap-2 px-2 py-1 bg-zinc-100 rounded text-zinc-400 text-xs font-medium cursor-not-allowed">
                              <ShieldAlert size={14} /> Protected
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() =>
                                  handleActionWithWarning("edit", emp)
                                }
                                className="text-zinc-400 hover:text-black transition-colors"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(emp._id)}
                                className={`transition-colors ${emp._id === loggedInUser?.id ? "text-zinc-300 cursor-not-allowed" : "text-zinc-400 hover:text-red-600"}`}
                                disabled={emp._id === loggedInUser?.id}
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-800 mb-0.5">No employees yet</p>
                          <p className="text-xs text-zinc-400">Add your first employee using the form above.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : employees.filter(
                  (emp) =>
                    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    emp.email
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase()) ||
                    emp.department
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase()) ||
                    emp.role.toLowerCase().includes(searchTerm.toLowerCase()),
                ).length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        <p className="text-sm text-zinc-400">No employees match <span className="font-medium text-zinc-600">"{searchTerm}"</span></p>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {(() => {
        const filtered = employees.filter(
          (emp) =>
            emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.role.toLowerCase().includes(searchTerm.toLowerCase()),
        );
        const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
        if (totalPages <= 1) return null;
        return (
          <div className="flex items-center justify-between px-2 pt-4 pb-1">
            <p className="text-xs text-zinc-400">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded text-zinc-400 hover:text-black hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "…" ? (
                    <span key={`ellipsis-${idx}`} className="px-1 text-xs text-zinc-400">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setCurrentPage(item)}
                      className={`w-7 h-7 text-xs rounded font-medium transition-colors ${currentPage === item ? "bg-black text-white" : "text-zinc-500 hover:bg-zinc-100"}`}
                    >
                      {item}
                    </button>
                  ),
                )}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded text-zinc-400 hover:text-black hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default EmployeeDirectory;
