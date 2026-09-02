"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Calendar, CheckCircle, XCircle, Clock, Search, Filter, 
  ChevronRight, FileText, Download, UserCheck, LayoutDashboard, Settings,
  LogOut, Phone, CalendarDays, BookOpen, AlertCircle, Shield, Trash2, 
  UserPlus, Mail, Star, Lock, ExternalLink, Send
} from 'lucide-react';
import { auth } from '@/lib/firebase/config';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getApplicants, addApplicant, updateApplicant, removeApplicant, uploadResumeFile, Applicant, ApplicationStatus } from '@/lib/firebase/db';

// Types imported from firebase/db

interface AdminUser {
  id: string;
  email: string;
  role: string;
  addedAt: string;
}

const INITIAL_ADMINS: AdminUser[] = [
  { id: "ADM-01", email: "admin@vektor.com", role: "Super Admin", addedAt: "2026-01-01T00:00:00Z" }
];

const INITIAL_MOCK_DATA: Applicant[] = [
  {
    id: "APP-001",
    name: "Alex Mercer",
    regNo: "21BCE1234",
    year: "3",
    branch: "Computer Science",
    mobile: "+1 234 567 8900",
    email: "alex.mercer@example.com",
    whyJoin: "I want to build real systems and stop doing tutorial projects. I am obsessed with low-level systems and backend architecture.",
    status: "Pending",
    appliedDate: "2026-09-01T10:30:00Z",
    resumeUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    isPriority: true,
    evaluationRequest: "I have built 3 open-source libraries used by 5k+ developers. I shouldn't wait in line."
  },
  {
    id: "APP-002",
    name: "Sarah Connor",
    regNo: "22BME9876",
    year: "2",
    branch: "Mechanical",
    mobile: "+1 987 654 3210",
    email: "sarah.connor@example.com",
    whyJoin: "Looking for an environment that challenges me. I have experience with CAD and robotics, bringing a hardware perspective.",
    status: "Reviewing",
    appliedDate: "2026-09-01T11:15:00Z"
  },
  {
    id: "APP-003",
    name: "David Bowman",
    regNo: "23BEE4567",
    year: "1",
    branch: "Electrical",
    mobile: "+1 555 123 4567",
    email: "david.bowman@example.com",
    whyJoin: "I am ready to commit to the core. Hardware + Software integration is my passion.",
    status: "Interview",
    appliedDate: "2026-08-31T14:20:00Z",
    interviewDate: "2026-09-05T15:00:00Z"
  },
  {
    id: "APP-004",
    name: "Ellen Ripley",
    regNo: "20BDS3456",
    year: "4",
    branch: "Data Science",
    mobile: "+1 444 987 6543",
    email: "ellen.ripley@example.com",
    whyJoin: "I want to deploy AI models in production environments. Tired of Jupiter notebooks, ready for real servers.",
    status: "Accepted",
    appliedDate: "2026-08-28T09:00:00Z"
  },
  {
    id: "APP-005",
    name: "Paul Atreides",
    regNo: "21BCE8888",
    year: "3",
    branch: "Computer Science",
    mobile: "+1 333 222 1111",
    email: "paul.atreides@example.com",
    whyJoin: "I see the paths.",
    status: "Rejected",
    appliedDate: "2026-08-29T16:45:00Z"
  }
];

export default function AdminDashboard() {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Main States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'applicants' | 'admins' | 'settings'>('applicants');
  const [applicants, setApplicants] = useState<Applicant[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAuthenticated(true);
        try {
          const data = await getApplicants();
          setApplicants(data);
        } catch (error) {
          console.error("Error fetching applicants:", error);
          showToast("Error", "Could not connect to Firebase database.");
        }
      } else {
        setIsAuthenticated(false);
        setApplicants([]);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);
  const [admins, setAdmins] = useState<AdminUser[]>(INITIAL_ADMINS);
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | 'All' | 'Priority'>('All');
  
  // Modals & Sub-states
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  
  // Create / Admin modals
  const [showCreateApplicant, setShowCreateApplicant] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  
  // Edit applicant state
  const [isEditingApplicant, setIsEditingApplicant] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Applicant>>({});
  
  // Toast
  const [toastMessage, setToastMessage] = useState<{title: string, desc: string} | null>(null);

  // Auto-Email Toggle
  const [autoEmailEnabled, setAutoEmailEnabled] = useState(true);

  // --- Auth Handlers ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      showToast("Access Granted", "Welcome to VEKTOR Admin Core.");
    } catch (error: any) {
      console.error(error);
      setLoginError('Invalid credentials or unauthorized access.');
    }
  };

  const showToast = (title: string, desc: string) => {
    setToastMessage({ title, desc });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // --- Applicant Handlers ---
  const filteredApplicants = useMemo(() => {
    return applicants.filter(app => {
      const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            app.regNo.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesStatus = true;
      if (filterStatus === 'Priority') {
        matchesStatus = !!app.isPriority;
      } else if (filterStatus !== 'All') {
        matchesStatus = app.status === filterStatus;
      }
      
      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      // Priority items always at top if not explicitly filtering by priority alone
      if (a.isPriority && !b.isPriority) return -1;
      if (!a.isPriority && b.isPriority) return 1;
      return new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime();
    });
  }, [applicants, searchQuery, filterStatus]);

  const stats = {
    total: applicants.length,
    pending: applicants.filter(a => a.status === 'Pending').length,
    interviewing: applicants.filter(a => a.status === 'Interview').length,
    accepted: applicants.filter(a => a.status === 'Accepted').length,
    priority: applicants.filter(a => a.isPriority).length
  };

  const getStatusColor = (status: ApplicationStatus) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'Reviewing': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Interview': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'Accepted': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Rejected': return 'bg-red-500/10 text-red-500 border-red-500/20';
    }
  };

  const triggerEmailNotification = async (recipientEmail: string, name: string, newStatus: ApplicationStatus, interview?: string) => {
    if (!recipientEmail || !autoEmailEnabled) return;
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          applicantName: name,
          status: newStatus,
          interviewDate: interview
        })
      });
      const data = await res.json();
      if (data.simulated) {
        showToast("Email Dispatched", `Notification queued for ${recipientEmail}.`);
      } else {
        showToast("Email Delivered Live", `Notification sent to ${recipientEmail}.`);
      }
    } catch (err) {
      console.error("Email API failed:", err);
      showToast("Email Notice", `Status updated (${recipientEmail}).`);
    }
  };

  const updateStatus = async (id: string, newStatus: ApplicationStatus) => {
    const targetApplicant = applicants.find(a => a.id === id);
    try {
      await updateApplicant(id, { status: newStatus });
      setApplicants(prev => prev.map(app => app.id === id ? { ...app, status: newStatus } : app));
      if (selectedApplicant?.id === id) {
        setSelectedApplicant(prev => prev ? { ...prev, status: newStatus } : null);
      }
      
      if (targetApplicant?.email) {
        await triggerEmailNotification(targetApplicant.email, targetApplicant.name, newStatus);
      } else {
        showToast("Status Updated", `Applicant marked as ${newStatus}.`);
      }
    } catch (error) {
      console.error(error);
      showToast("Error", "Failed to update status.");
    }
  };

  const deleteApplicant = async (id: string, name: string) => {
    if(confirm(`Are you sure you want to permanently delete ${name}?`)) {
      try {
        await removeApplicant(id);
        setApplicants(prev => prev.filter(app => app.id !== id));
        setSelectedApplicant(null);
        showToast("Applicant Deleted", `${name} has been removed from the system.`);
      } catch (error) {
        console.error(error);
        showToast("Error", "Failed to delete applicant.");
      }
    }
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplicant || !interviewDate || !interviewTime) return;
    
    const dateTime = `${interviewDate}T${interviewTime}:00Z`;
    
    try {
      await updateApplicant(selectedApplicant.id, { status: 'Interview', interviewDate: dateTime });
      setApplicants(prev => prev.map(app => 
        app.id === selectedApplicant.id 
          ? { ...app, status: 'Interview', interviewDate: dateTime } 
          : app
      ));
      
      setSelectedApplicant(prev => prev ? { ...prev, status: 'Interview', interviewDate: dateTime } : null);
      setShowInterviewModal(false);
      
      if (selectedApplicant.email) {
        await triggerEmailNotification(selectedApplicant.email, selectedApplicant.name, 'Interview', dateTime);
      } else {
        showToast("Interview Scheduled", `Invite sent to ${selectedApplicant.name}.`);
      }
    } catch (error) {
      console.error(error);
      showToast("Error", "Failed to schedule interview.");
    }
  };

  const handleStartEdit = () => {
    if (selectedApplicant) {
      setEditForm(selectedApplicant);
      setIsEditingApplicant(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedApplicant || !editForm) return;
    try {
      await updateApplicant(selectedApplicant.id, editForm);
      setApplicants(prev => prev.map(app => 
        app.id === selectedApplicant.id ? { ...app, ...editForm } as Applicant : app
      ));
      setSelectedApplicant({ ...selectedApplicant, ...editForm } as Applicant);
      setIsEditingApplicant(false);
      showToast("Record Updated", `Applicant details have been saved.`);
    } catch (error) {
      console.error(error);
      showToast("Error", "Failed to update applicant details.");
    }
  };

  // Render Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  // Render Login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden font-body">
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-green-500/5 blur-[120px]"></div>
          <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[120px]"></div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-[#111] border border-white/10 p-10 rounded-3xl shadow-2xl relative z-10"
        >
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <Shield className="text-white w-8 h-8" />
            </div>
          </div>
          <h1 className="text-center font-hero text-4xl text-white mb-2">VEKTOR</h1>
          <p className="text-center text-xs text-gray-500 font-mono tracking-widest uppercase mb-8">Admin Authentication</p>
          
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div>
              <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 block">Admin Email</label>
              <input 
                type="email" 
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-white/10 py-3 px-4 rounded-xl text-white focus:border-green-500/50 focus:outline-none transition-colors"
                placeholder="admin@vektor.com"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 block">Passphrase</label>
              <input 
                type="password" 
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-white/10 py-3 px-4 rounded-xl text-white focus:border-green-500/50 focus:outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>
            {loginError && <p className="text-red-500 text-xs text-center">{loginError}</p>}
            
            <button 
              type="submit"
              className="mt-4 bg-white text-black font-bold py-3.5 rounded-xl uppercase tracking-widest text-sm hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              Access Core
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-gray-200 font-body overflow-hidden selection:bg-white/20">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-6 left-1/2 z-[100] bg-[#1a1a1a] border border-white/10 shadow-2xl rounded-2xl p-4 min-w-[300px] flex items-start gap-4"
          >
            <div className="mt-1 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
              <CheckCircle size={16} className="text-green-500" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">{toastMessage.title}</h4>
              <p className="text-gray-400 text-xs mt-1">{toastMessage.desc}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-[#0f0f0f] flex flex-col z-20">
        <div className="p-6 border-b border-white/10">
          <h1 className="font-hero text-2xl tracking-wider text-white">VEKTOR</h1>
          <p className="text-[10px] text-gray-500 font-mono tracking-widest mt-1 uppercase">Admin Core</p>
        </div>
        
        <nav className="flex-1 p-4 flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${activeTab === 'dashboard' ? 'bg-white/10 text-white shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('applicants')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${activeTab === 'applicants' ? 'bg-white/10 text-white shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Users size={18} /> Applicants
          </button>
          <button 
            onClick={() => setActiveTab('admins')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${activeTab === 'admins' ? 'bg-white/10 text-white shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Shield size={18} /> Admins
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${activeTab === 'settings' ? 'bg-white/10 text-white shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'} mt-auto`}
          >
            <Settings size={18} /> Settings
          </button>
          <button 
            onClick={() => signOut(auth)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium text-red-400 hover:bg-red-400/10 hover:text-red-300"
          >
            <LogOut size={18} /> Logout
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-20 border-b border-white/10 flex items-center justify-between px-8 bg-[#0a0a0a]/80 backdrop-blur-md z-10">
          <h2 className="text-xl font-bold tracking-wide text-white capitalize">
            {activeTab === 'applicants' ? 'Applicant Tracking System' : activeTab}
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-400 border border-white/10 px-3 py-1.5 rounded-full bg-white/5">
              <Mail size={14} className={autoEmailEnabled ? "text-green-500" : "text-gray-500"} />
              <span className="hidden md:inline text-xs font-bold uppercase tracking-wider">
                Auto-Email: {autoEmailEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400 border border-white/10 px-3 py-1.5 rounded-full bg-white/5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="hidden md:inline text-xs font-bold uppercase tracking-wider">System Online</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-0 pb-32">
          
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-[#111] border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-blue-500/20"></div>
                <p className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Total Applied</p>
                <h3 className="text-4xl font-bold text-white font-hero">{stats.total}</h3>
              </div>
              <div className="bg-[#111] border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-yellow-500/20"></div>
                <p className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Priority Queue</p>
                <h3 className="text-4xl font-bold text-white font-hero">{stats.priority}</h3>
              </div>
              <div className="bg-[#111] border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-purple-500/20"></div>
                <p className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Interviews</p>
                <h3 className="text-4xl font-bold text-white font-hero">{stats.interviewing}</h3>
              </div>
              <div className="bg-[#111] border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-green-500/20"></div>
                <p className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Accepted</p>
                <h3 className="text-4xl font-bold text-white font-hero">{stats.accepted}</h3>
              </div>
            </motion.div>
          )}

          {/* APPLICANTS TAB */}
          {activeTab === 'applicants' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
              {/* Toolbar */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search by name or registration number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#111] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all"
                  />
                </div>
                <div className="flex items-center gap-2 bg-[#111] border border-white/10 rounded-xl px-4 py-2">
                  <Filter size={18} className="text-gray-500" />
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="bg-transparent text-gray-300 focus:outline-none appearance-none cursor-pointer pr-4"
                  >
                    <option value="All">All Applications</option>
                    <option value="Priority">Priority Queue ⭐️</option>
                    <option value="Pending">Pending</option>
                    <option value="Reviewing">Reviewing</option>
                    <option value="Interview">Interview</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <button 
                  onClick={() => setShowCreateApplicant(true)}
                  className="bg-white hover:bg-gray-200 text-black px-6 py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <UserPlus size={18} /> Add Record
                </button>
              </div>

              {/* Table / List */}
              <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden flex-1 flex flex-col">
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/10 bg-white/5 text-xs font-bold uppercase tracking-wider text-gray-400">
                  <div className="col-span-3">Applicant</div>
                  <div className="col-span-2">Reg No</div>
                  <div className="col-span-2">Branch / Year</div>
                  <div className="col-span-3">Status</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                  {filteredApplicants.length > 0 ? (
                    filteredApplicants.map(app => (
                      <motion.div 
                        key={app.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`grid grid-cols-12 gap-4 p-4 border-b border-white/5 hover:bg-white/[0.04] items-center transition-colors cursor-pointer ${app.isPriority ? 'bg-yellow-500/[0.02]' : ''}`}
                        onClick={() => { setSelectedApplicant(app); setIsEditingApplicant(false); }}
                      >
                        <div className="col-span-3 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold text-sm border border-white/10 relative">
                            {app.name.charAt(0)}
                            {app.isPriority && (
                              <div className="absolute -top-1 -right-1 bg-yellow-500 text-black rounded-full p-0.5">
                                <Star size={10} className="fill-black" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm flex items-center gap-2">
                              {app.name}
                            </div>
                            <div className="text-xs text-gray-500">{new Date(app.appliedDate).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="col-span-2 flex flex-col">
                          <span className="text-sm text-gray-300 font-mono">{app.regNo}</span>
                          <span className="text-[10px] text-gray-500 truncate pr-2" title={app.email}>{app.email}</span>
                        </div>
                        <div className="col-span-2 text-sm text-gray-300">
                          {app.branch} <span className="text-gray-600">· Yr {app.year}</span>
                        </div>
                        <div className="col-span-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border flex w-fit items-center gap-1.5 ${getStatusColor(app.status)}`}>
                            {app.status === 'Pending' && <Clock size={12} />}
                            {app.status === 'Reviewing' && <BookOpen size={12} />}
                            {app.status === 'Interview' && <CalendarDays size={12} />}
                            {app.status === 'Accepted' && <CheckCircle size={12} />}
                            {app.status === 'Rejected' && <XCircle size={12} />}
                            {app.status}
                          </span>
                        </div>
                        <div className="col-span-2 flex justify-end gap-2">
                          <button 
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                            onClick={(e) => { e.stopPropagation(); setSelectedApplicant(app); setIsEditingApplicant(false); }}
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                      <Search size={48} className="mb-4 opacity-20" />
                      <p>No applicants found matching your criteria.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ADMINS TAB */}
          {activeTab === 'admins' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-white font-bold text-xl mb-1">Administrator Access</h3>
                  <p className="text-gray-400 text-sm">Manage who has access to the admin core.</p>
                </div>
                <button 
                  onClick={() => setShowCreateAdmin(true)}
                  className="bg-white hover:bg-gray-200 text-black px-6 py-3 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                >
                  <UserPlus size={18} /> Add Admin
                </button>
              </div>

              <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
                <div className="grid grid-cols-4 gap-4 p-4 border-b border-white/10 bg-white/5 text-xs font-bold uppercase tracking-wider text-gray-400">
                  <div className="col-span-2">User / Email</div>
                  <div>Role</div>
                  <div>Added On</div>
                </div>
                
                {admins.map(admin => (
                  <div key={admin.id} className="grid grid-cols-4 gap-4 p-4 border-b border-white/5 items-center">
                    <div className="col-span-2 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-gray-400">
                        <Lock size={16} />
                      </div>
                      <span className="font-bold text-white text-sm">{admin.email}</span>
                    </div>
                    <div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold border border-blue-500/30 bg-blue-500/10 text-blue-400">
                        {admin.role}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 font-mono">
                      {new Date(admin.addedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl">
              <h3 className="text-white font-bold text-xl mb-6">System Settings</h3>
              
              <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-bold mb-1 flex items-center gap-2">
                      <Mail size={18} /> Automated Status Emails
                    </h4>
                    <p className="text-gray-400 text-sm max-w-md">
                      When enabled, applicants will automatically receive email notifications when their application status changes or an interview is scheduled.
                    </p>
                  </div>
                  <button 
                    onClick={() => setAutoEmailEnabled(!autoEmailEnabled)}
                    className={`w-14 h-8 rounded-full flex items-center transition-colors p-1 ${autoEmailEnabled ? 'bg-green-500' : 'bg-gray-700'}`}
                  >
                    <motion.div 
                      layout 
                      className="w-6 h-6 bg-white rounded-full shadow-md"
                      animate={{ x: autoEmailEnabled ? 24 : 0 }}
                    />
                  </button>
                </div>
                
                <hr className="border-white/10 my-6" />
                
                <div>
                   <h4 className="text-red-500 font-bold mb-1 flex items-center gap-2">
                      <AlertCircle size={18} /> Danger Zone
                    </h4>
                    <p className="text-gray-500 text-sm mb-4">Actions here are permanent and cannot be undone.</p>
                    <button className="border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                      Purge All Rejected Applications
                    </button>
                </div>
              </div>
            </motion.div>
          )}

        </div>
      </main>

      {/* Applicant Detail Modal / Slide-over */}
      <AnimatePresence>
        {selectedApplicant && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
            onClick={() => { setSelectedApplicant(null); setIsEditingApplicant(false); }}
          >
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-5xl h-full bg-[#0a0a0a] border-l border-white/10 shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#111]">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold text-xl border border-white/10 relative">
                    {selectedApplicant.name.charAt(0)}
                    {selectedApplicant.isPriority && (
                      <div className="absolute -top-1 -right-1 bg-yellow-500 text-black rounded-full p-1 shadow-[0_0_10px_rgba(234,179,8,0.5)]">
                        <Star size={12} className="fill-black" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white font-hero tracking-wide flex items-center gap-3">
                      {isEditingApplicant ? (
                        <input
                          value={editForm.name || ''}
                          onChange={e => setEditForm({...editForm, name: e.target.value})}
                          className="bg-[#1a1a1a] border border-white/10 rounded px-3 py-1 text-xl font-body text-white focus:outline-none focus:border-blue-500"
                        />
                      ) : (
                        selectedApplicant.name
                      )}
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm font-mono text-gray-400">{selectedApplicant.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(selectedApplicant.status)}`}>
                        {selectedApplicant.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {selectedApplicant.status !== 'Accepted' && (
                    <button 
                      onClick={() => updateStatus(selectedApplicant.id, 'Accepted')}
                      className="bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                    >
                      <CheckCircle size={16} /> Accept
                    </button>
                  )}
                  {selectedApplicant.status !== 'Rejected' && (
                    <button 
                      onClick={() => updateStatus(selectedApplicant.id, 'Rejected')}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  )}
                  
                  <div className="w-px h-8 bg-white/10 mx-2"></div>
                  
                  <button 
                    onClick={() => deleteApplicant(selectedApplicant.id, selectedApplicant.name)}
                    className="p-2 hover:bg-red-500/20 rounded-lg text-gray-500 hover:text-red-500 transition-colors"
                    title="Delete Record"
                  >
                    <Trash2 size={20} />
                  </button>

                  <button 
                    onClick={isEditingApplicant ? handleSaveEdit : handleStartEdit}
                    className={`p-2 rounded-lg transition-colors font-bold text-sm ${isEditingApplicant ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
                  >
                    {isEditingApplicant ? 'Save' : 'Edit'}
                  </button>
                  
                  <button 
                    onClick={() => { setSelectedApplicant(null); setIsEditingApplicant(false); }}
                    className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                  >
                    <XCircle size={24} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Info Pane */}
                <div className="w-full md:w-1/3 border-r border-white/10 p-6 overflow-y-auto bg-[#0a0a0a] custom-scrollbar flex flex-col gap-6">
                  
                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Change Status</h4>
                    <select 
                      value={selectedApplicant.status}
                      onChange={(e) => updateStatus(selectedApplicant.id, e.target.value as ApplicationStatus)}
                      className="w-full bg-[#111] border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-white/30"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Reviewing">Reviewing</option>
                      <option value="Interview">Interview Phase</option>
                      <option value="Accepted">Accepted</option>
                      <option value="Rejected">Rejected</option>
                    </select>

                    <button 
                      onClick={() => setShowInterviewModal(true)}
                      className="w-full mt-2 bg-white hover:bg-gray-200 text-black py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <Calendar size={16} /> Schedule Interview
                    </button>
                  </div>

                  <hr className="border-white/10" />
                  
                  {/* Priority Request Section (If Exists) */}
                  {selectedApplicant.isPriority && selectedApplicant.evaluationRequest && (
                    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
                       <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                         <Star size={14} className="fill-yellow-500" /> Priority Evaluation Case
                       </h4>
                       <p className="text-sm text-gray-300 italic">
                         "{selectedApplicant.evaluationRequest}"
                       </p>
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex flex-col gap-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Candidate Details</h4>
                    
                    <div className="flex items-start gap-3">
                      <BookOpen size={16} className="text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mb-1">Reg No</div>
                        {isEditingApplicant ? (
                          <input 
                            value={editForm.regNo || ''}
                            onChange={e => setEditForm({...editForm, regNo: e.target.value})}
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                          />
                        ) : (
                          <div className="text-sm text-white font-mono">{selectedApplicant.regNo}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <LayoutDashboard size={16} className="text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mb-1">Branch & Year</div>
                        {isEditingApplicant ? (
                          <div className="flex gap-2">
                            <input 
                              value={editForm.branch || ''}
                              onChange={e => setEditForm({...editForm, branch: e.target.value})}
                              className="w-2/3 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                              placeholder="Branch"
                            />
                            <input 
                              value={editForm.year || ''}
                              onChange={e => setEditForm({...editForm, year: e.target.value})}
                              className="w-1/3 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                              placeholder="Year"
                            />
                          </div>
                        ) : (
                          <div className="text-sm text-white">{selectedApplicant.branch} · Year {selectedApplicant.year}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Phone size={16} className="text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mb-1">Mobile</div>
                        {isEditingApplicant ? (
                          <input 
                            value={editForm.mobile || ''}
                            onChange={e => setEditForm({...editForm, mobile: e.target.value})}
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                          />
                        ) : (
                          <div className="text-sm text-white">{selectedApplicant.mobile}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Mail size={16} className="text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-500">Email Address</span>
                          {selectedApplicant.email && (
                            <a 
                              href={`mailto:${selectedApplicant.email}?subject=${encodeURIComponent(`VEKTOR Core: Update for ${selectedApplicant.name}`)}`}
                              className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-bold uppercase tracking-wider transition-colors"
                              title="Direct Email via Client"
                            >
                              <Send size={10} /> Compose Mail
                            </a>
                          )}
                        </div>
                        {isEditingApplicant ? (
                          <input 
                            value={editForm.email || ''}
                            onChange={e => setEditForm({...editForm, email: e.target.value})}
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                          />
                        ) : (
                          <div className="text-sm text-white font-mono">{selectedApplicant.email}</div>
                        )}
                      </div>
                    </div>

                    {selectedApplicant.interviewDate && (
                      <div className="flex items-start gap-3 mt-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                        <CalendarDays size={16} className="text-purple-400 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">Interview Scheduled</div>
                          <div className="text-sm text-white">
                            {new Date(selectedApplicant.interviewDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <hr className="border-white/10" />

                  {/* Why Join */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Core Application</h4>
                    {isEditingApplicant ? (
                      <textarea
                        value={editForm.whyJoin || ''}
                        onChange={e => setEditForm({...editForm, whyJoin: e.target.value})}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[100px] resize-y"
                      />
                    ) : (
                      <p className="text-sm text-gray-300 leading-relaxed bg-[#111] p-4 rounded-xl border border-white/5 italic">
                        "{selectedApplicant.whyJoin}"
                      </p>
                    )}
                  </div>
                </div>

                {/* PDF Viewer Pane */}
                <div className="w-full md:w-2/3 bg-[#111] p-6 flex flex-col relative">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <FileText size={16} /> Attached Resume (PDF)
                    </h4>
                    {selectedApplicant.resumeUrl && (
                      <div className="flex items-center gap-3">
                        <a 
                          href={selectedApplicant.resumeUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          download={`${selectedApplicant.name}_Resume.pdf`}
                          className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg font-bold transition-colors"
                        >
                          <Download size={14} /> Download PDF
                        </a>
                        <a 
                          href={selectedApplicant.resumeUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <ExternalLink size={14} /> Full Screen
                        </a>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 bg-[#1a1a1a] rounded-xl border border-white/10 overflow-hidden flex items-center justify-center relative">
                    {selectedApplicant.resumeUrl ? (
                      <iframe 
                        src={`${selectedApplicant.resumeUrl}#toolbar=1`} 
                        className="w-full h-full bg-white rounded-lg"
                        title="Resume Viewer"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-gray-500 p-8 text-center">
                        <FileText size={48} className="mb-4 opacity-20" />
                        <p className="text-sm font-medium">No resume attached for this candidate.</p>
                        <p className="text-xs text-gray-600 mt-1">Uploaded resumes (PDF) will render automatically here.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Schedule Interview Modal */}
      <AnimatePresence>
        {showInterviewModal && selectedApplicant && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-2 font-hero">Schedule Interview</h3>
              <p className="text-sm text-gray-400 mb-6">Set up an interview time for <strong className="text-white">{selectedApplicant.name}</strong>.</p>
              
              <form onSubmit={handleScheduleInterview} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Date</label>
                  <input 
                    type="date" 
                    required
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Time</label>
                  <input 
                    type="time" 
                    required
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                
                <div className="flex gap-3 mt-4">
                  <button 
                    type="button"
                    onClick={() => setShowInterviewModal(false)}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold text-sm hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-sm transition-colors"
                  >
                    Confirm Schedule
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Admin Modal */}
      <AnimatePresence>
        {showCreateAdmin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-2 font-hero">Add Administrator</h3>
              <p className="text-sm text-gray-400 mb-6">Create a new admin account to access this panel.</p>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const newAdmin: AdminUser = {
                  id: `ADM-0${admins.length + 1}`,
                  email: formData.get('email') as string,
                  role: formData.get('role') as string,
                  addedAt: new Date().toISOString()
                };
                setAdmins([...admins, newAdmin]);
                setShowCreateAdmin(false);
                showToast("Admin Added", `${newAdmin.email} has been granted access.`);
              }} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
                  <input 
                    type="email" 
                    name="email"
                    required
                    placeholder="admin@vektor.com"
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-white/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Password</label>
                  <input 
                    type="password"
                    name="password"
                    required
                    placeholder="Set a password"
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-white/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Role</label>
                  <select 
                    name="role"
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-white/30"
                  >
                    <option value="Admin">Standard Admin</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>
                </div>
                
                <div className="flex gap-3 mt-4">
                  <button 
                    type="button"
                    onClick={() => setShowCreateAdmin(false)}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold text-sm hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-white hover:bg-gray-200 text-black font-bold text-sm transition-colors"
                  >
                    Create Admin
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Applicant Modal */}
      <AnimatePresence>
        {showCreateApplicant && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-white/10 p-8 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <h3 className="text-xl font-bold text-white mb-2 font-hero">Manually Add Applicant</h3>
              <p className="text-sm text-gray-400 mb-6">Bypass the main form and inject a record directly.</p>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const newAppData = {
                  name: formData.get('name') as string,
                  regNo: formData.get('regNo') as string,
                  year: formData.get('year') as string,
                  branch: formData.get('branch') as string,
                  mobile: formData.get('mobile') as string,
                  email: formData.get('email') as string,
                  whyJoin: formData.get('whyJoin') as string || "Manually added by admin.",
                  status: 'Pending' as ApplicationStatus,
                  appliedDate: new Date().toISOString(),
                  isPriority: formData.get('isPriority') === 'on'
                };
                
                const resumeFile = formData.get('resume') as File | null;
                let uploadedResumeUrl = "";
                
                try {
                  if (resumeFile && resumeFile.size > 0) {
                    uploadedResumeUrl = await uploadResumeFile(resumeFile, newAppData.regNo || newAppData.email || "manual");
                  }
                  
                  const finalData = {
                    ...newAppData,
                    resumeUrl: uploadedResumeUrl || undefined
                  };

                  const newId = await addApplicant(finalData);
                  const newApp = { ...finalData, id: newId };
                  setApplicants([newApp, ...applicants]);
                  setShowCreateApplicant(false);
                  showToast("Applicant Added", `${newApp.name} has been added to the system.`);
                } catch (error) {
                  console.error(error);
                  showToast("Error", "Failed to add applicant.");
                }
              }} className="flex flex-col gap-4">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Full Name</label>
                    <input type="text" name="name" required className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-white/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Reg No</label>
                    <input type="text" name="regNo" required className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-white/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Mobile</label>
                    <input type="tel" name="mobile" required className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-white/30" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
                    <input type="email" name="email" required className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-white/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Branch</label>
                    <input type="text" name="branch" required className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-white/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Year</label>
                    <select name="year" required className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-white/30">
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Resume (PDF)</label>
                    <input type="file" name="resume" accept=".pdf,.doc,.docx" className="text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 transition-all cursor-pointer" />
                  </div>
                  <div className="col-span-2">
                     <label className="flex items-center gap-3 cursor-pointer mt-2 bg-yellow-500/5 p-4 border border-yellow-500/20 rounded-xl">
                       <input type="checkbox" name="isPriority" className="w-4 h-4 accent-yellow-500" />
                       <span className="text-sm font-bold text-yellow-500">Mark as Priority Queue ⭐️</span>
                     </label>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-4">
                  <button 
                    type="button"
                    onClick={() => setShowCreateApplicant(false)}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold text-sm hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-white hover:bg-gray-200 text-black font-bold text-sm transition-colors"
                  >
                    Inject Record
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
