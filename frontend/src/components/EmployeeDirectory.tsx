import React, { useEffect, useState } from 'react';
import api from '../services/api.js';
import { useToast } from '../context/ToastContext.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit2, Shield, FolderOpen, Clock, Mail, User, X, Key } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  department: string;
  shift_start_time: string;
  created_at: string;
}

const EmployeeDirectory: React.FC = () => {
  const { showToast } = useToast();
  
  // Data State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Filter States
  const [search, setSearch] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  // Form States
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<'admin' | 'employee'>('employee');
  const [department, setDepartment] = useState<string>('Engineering');
  const [shiftStart, setShiftStart] = useState<string>('09:00:00');

  const [submitting, setSubmitting] = useState<boolean>(false);

  // Fetch employees listing from API
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/employees', {
        params: {
          search: search || undefined,
          department: departmentFilter || undefined,
          role: roleFilter || undefined
        }
      });
      setEmployees(response.data.employees || []);
    } catch (err: any) {
      console.error('⚠️ Employee retrieval failed:', err);
      showToast('Failed to load employee directory.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search, departmentFilter, roleFilter]);

  // Open modal for Creating
  const handleOpenCreateModal = () => {
    setEditingEmployee(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('employee');
    setDepartment('Engineering');
    setShiftStart('09:00:00');
    setIsModalOpen(true);
  };

  // Open modal for Editing
  const handleOpenEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setName(emp.name);
    setEmail(emp.email);
    setPassword(''); // Leave blank during edit unless changing? (Not updating pass on PUT employee)
    setRole(emp.role);
    setDepartment(emp.department || 'Engineering');
    setShiftStart(emp.shift_start_time || '09:00:00');
    setIsModalOpen(true);
  };

  // Submit Modal Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingEmployee) {
        // Edit Employee
        const response = await api.put(`/admin/employees/${editingEmployee.id}`, {
          name,
          email,
          role,
          department,
          shift_start_time: shiftStart
        });
        showToast(response.data.message || 'Employee updated successfully.', 'success');
      } else {
        // Create Employee
        const response = await api.post('/admin/employees', {
          name,
          email,
          password,
          role,
          department,
          shift_start_time: shiftStart
        });
        showToast(response.data.message || 'Employee created successfully.', 'success');
      }
      setIsModalOpen(false);
      fetchEmployees();
    } catch (err: any) {
      console.error('Employee submit failed:', err);
      showToast(err.response?.data?.error || 'Failed to submit employee data.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. TOP ACTION DECK */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <User className="w-5 h-5 text-blue-500" />
            Employee Management Directory
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Create corporate credentials, allocate departments, assign shift timers, and query employee registries.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-xl shadow-lg shadow-blue-600/15 transition-premium cursor-pointer border-0 active-scale"
        >
          <Plus className="w-4 h-4" />
          Add Employee Account
        </button>
      </div>

      {/* 2. FILTER/SEARCH PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#18181b]/50 border border-white/[0.06] rounded-2xl p-4 backdrop-blur-sm">
        
        {/* Search */}
        <div className="md:col-span-6 relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by employee name or email account..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-white/[0.06] focus:border-blue-500/40 rounded-xl text-xs text-zinc-200 outline-none placeholder-zinc-600 transition-all"
          />
        </div>

        {/* Department Filter */}
        <div className="md:col-span-3 relative">
          <FolderOpen className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-white/[0.06] rounded-xl text-xs text-zinc-400 outline-none cursor-pointer appearance-none"
          >
            <option value="">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Product">Product</option>
            <option value="Marketing">Marketing</option>
            <option value="Operations">Operations</option>
            <option value="Sales">Sales</option>
            <option value="HR">HR</option>
          </select>
        </div>

        {/* Role Filter */}
        <div className="md:col-span-3 relative">
          <Shield className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-white/[0.06] rounded-xl text-xs text-zinc-400 outline-none cursor-pointer appearance-none"
          >
            <option value="">All Roles</option>
            <option value="admin">Administrator</option>
            <option value="employee">Standard Employee</option>
          </select>
        </div>
      </div>

      {/* 3. EMPLOYEES DIRECTORY TABLE */}
      <div className="bg-[#18181b]/50 border border-white/[0.06] rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs font-sans text-zinc-300">
            <thead>
              <tr className="border-b border-white/[0.06] bg-zinc-950/40 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                <th className="px-6 py-4">Employee Details</th>
                <th className="px-6 py-4">Role Configuration</th>
                <th className="px-6 py-4">Allocated Department</th>
                <th className="px-6 py-4">Shift Start Time</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-zinc-500 font-semibold uppercase tracking-wider">
                    Loading Employee Registry...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-zinc-500 font-semibold uppercase tracking-wider">
                    No matching employee accounts registered.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-white/[0.01] transition-all">
                    
                    {/* Name / Email */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-white text-sm">{emp.name}</span>
                        <span className="text-[11px] text-zinc-500 mt-0.5">{emp.email}</span>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        emp.role === 'admin'
                          ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                          : 'bg-zinc-500/10 border border-white/[0.06] text-zinc-400'
                      }`}>
                        <Shield className="w-3 h-3" />
                        {emp.role}
                      </span>
                    </td>

                    {/* Department */}
                    <td className="px-6 py-4">
                      <span className="font-semibold text-zinc-300">{emp.department || 'Engineering'}</span>
                    </td>

                    {/* Shift Start */}
                    <td className="px-6 py-4">
                      <span className="font-mono text-zinc-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        {emp.shift_start_time || '09:00:00'}
                      </span>
                    </td>

                    {/* Edit Trigger */}
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenEditModal(emp)}
                        className="p-2 bg-zinc-900 border border-white/[0.06] hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-premium cursor-pointer active-scale"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. DETAILS OVERLAY FORM MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-md bg-[#18181b] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl z-10 p-6 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                <h3 className="text-md font-bold text-white">
                  {editingEmployee ? 'Edit Employee Details' : 'Create Employee Account'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors border-0 cursor-pointer bg-transparent"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-white/[0.06] focus:border-blue-500/40 rounded-xl text-xs text-zinc-200 outline-none placeholder-zinc-700"
                    placeholder="Marcus Wright"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-white/[0.06] focus:border-blue-500/40 rounded-xl text-xs text-zinc-200 outline-none placeholder-zinc-700"
                    placeholder="marcus@geoshield.ai"
                  />
                </div>

                {/* Password (Only during Create) */}
                {!editingEmployee && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5" />
                      Account Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-white/[0.06] focus:border-blue-500/40 rounded-xl text-xs text-zinc-200 outline-none placeholder-zinc-700"
                      placeholder="••••••••"
                    />
                  </div>
                )}

                {/* Role selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    System Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-white/[0.06] rounded-xl text-xs text-zinc-300 outline-none cursor-pointer"
                  >
                    <option value="employee">Standard Employee</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                {/* Department Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5" />
                    Department Allocation
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-white/[0.06] rounded-xl text-xs text-zinc-300 outline-none cursor-pointer"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Product">Product</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Operations">Operations</option>
                    <option value="Sales">Sales</option>
                    <option value="HR">HR</option>
                  </select>
                </div>

                {/* Shift Start Time */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Standard Shift Start
                  </label>
                  <input
                    type="text"
                    required
                    value={shiftStart}
                    onChange={(e) => setShiftStart(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-white/[0.06] focus:border-blue-500/40 rounded-xl text-xs text-zinc-200 outline-none placeholder-zinc-700"
                    placeholder="09:00:00"
                  />
                </div>

                {/* Submit button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold text-white rounded-xl shadow-lg shadow-blue-600/10 transition-premium cursor-pointer border-0 active-scale"
                  >
                    {submitting ? 'Submitting Details...' : editingEmployee ? 'Save Changes' : 'Create Employee'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default EmployeeDirectory;
