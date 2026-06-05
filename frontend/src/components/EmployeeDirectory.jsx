import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ShieldAlert, Search } from "lucide-react";
import { AlertModal, ConfirmModal, PromptModal } from "./Modals";

const API_URL = import.meta.env.VITE_API_URL;

const EmployeeDirectory = () => {
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const draftData =
    JSON.parse(sessionStorage.getItem("employeeFormDraft")) || {};
  const userString = localStorage.getItem("user");
  const loggedInUser = userString ? JSON.parse(userString) : null;

  const [isFormOpen, setIsFormOpen] = useState(draftData.isFormOpen || false);
  const [editingId, setEditingId] = useState(draftData.editingId || null);

  const [name, setName] = useState(draftData.name || "");
  const [email, setEmail] = useState(draftData.email || "");
  const [password, setPassword] = useState(draftData.password || "");
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
      password,
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
    password,
    role,
    department,
    initialFormData,
  ]);

  const hasUnsavedChanges = () => {
    if (!isFormOpen || !initialFormData) return false;
    return (
      name !== initialFormData.name ||
      email !== initialFormData.email ||
      password !== initialFormData.password ||
      role !== initialFormData.role ||
      department !== initialFormData.department
    );
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
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
        password: "",
        role: "Employee",
        department: "Engineering",
      });
    } else if (actionType === "edit") {
      setName(targetEmp.name);
      setEmail(targetEmp.email);
      setPassword("");
      setRole(targetEmp.role);
      setDepartment(targetEmp.department);
      setEditingId(targetEmp._id);
      setIsFormOpen(true);
      setInitialFormData({
        name: targetEmp.name,
        email: targetEmp.email,
        password: "",
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
    if (password) bodyData.password = password;

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
                  ? "Temporary password set (hidden)"
                  : password
                    ? "New password provided (hidden)"
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

      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-black tracking-tight">
            Employee Directory
          </h2>
          <p className="text-sm text-zinc-500">
            Manage your team members and their roles.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search
              size={14}
              className="text-zinc-400 absolute left-3 top-1/2 transform -translate-y-1/2"
            />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-zinc-300 rounded-md pl-9 pr-3 py-2 text-sm text-black placeholder-zinc-400 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all w-full sm:w-64"
            />
          </div>
          <button
            onClick={() =>
              handleActionWithWarning(isFormOpen ? "cancel" : "openNew")
            }
            className="flex items-center whitespace-nowrap gap-2 bg-black text-white px-4 py-2 text-sm font-medium rounded-md hover:bg-zinc-800 transition-colors"
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
            <input
              type="password"
              placeholder={
                editingId
                  ? "New Password (leave blank to keep current)"
                  : "Temporary Password"
              }
              required={!editingId}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
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

      <div className="bg-white rounded-md border border-zinc-200 overflow-hidden">
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
            {employees
              .filter(
                (emp) =>
                  emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  emp.department
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                  emp.role.toLowerCase().includes(searchTerm.toLowerCase()),
              )
              .map((emp) => {
                const isOtherAdmin =
                  emp.role === "Admin" && emp._id !== loggedInUser?.id;

                return (
                  <tr
                    key={emp._id}
                    className="hover:bg-zinc-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-black">{emp.name}</div>
                      <div className="text-zinc-500 text-xs">{emp.email}</div>
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
                      {isOtherAdmin ? (
                        <div className="flex items-center gap-2 px-2 py-1 bg-zinc-100 rounded text-zinc-400 text-xs font-medium cursor-not-allowed">
                          <ShieldAlert size={14} /> Protected
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleActionWithWarning("edit", emp)}
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
            {employees.filter(
              (emp) =>
                emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.department
                  .toLowerCase()
                  .includes(searchTerm.toLowerCase()) ||
                emp.role.toLowerCase().includes(searchTerm.toLowerCase()),
            ).length === 0 && (
              <tr>
                <td
                  colSpan="4"
                  className="px-6 py-12 text-center text-zinc-500"
                >
                  No records found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeeDirectory;
