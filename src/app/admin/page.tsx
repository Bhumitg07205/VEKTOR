"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Calendar, CheckCircle, XCircle, Clock, Search, Filter, 
  ChevronRight, FileText, Download, UserCheck, LayoutDashboard, Settings,
  LogOut, Phone, CalendarDays, BookOpen, AlertCircle, Shield, Trash2, 
  UserPlus, Mail, Star, Lock, ExternalLink, Send, RefreshCw,
  Sparkles, Paperclip, Upload, X, Wand2, File, Check, Plus, Copy,
  Video, MapPin, Tag, Bell, BellRing, ClipboardCheck, ClipboardList,
  ChevronDown, ChevronUp, AlertTriangle, Repeat, Eye, EyeOff,
  GraduationCap, Zap, BarChart3, Users2, Link, CheckSquare, Square,
  Edit3, Pencil, FileUp
} from 'lucide-react';
import { auth } from '@/lib/firebase/config';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword as secondaryCreateUser } from 'firebase/auth';
import { 
  getApplicants, addApplicant, updateApplicant, removeApplicant, uploadResumeFile, Applicant, ApplicationStatus,
  getAdmins, addAdminToDB, removeAdminFromDB, AdminUser, updateAdminRole,
  getAuditLogs, addAuditLog, AuditLog, clearAllAuditLogs, deleteAuditLog,
  getAssignments, addAssignment, updateAssignment, removeAssignment, Assignment,
  getSubmissionsForAssignment, addSubmission, removeSubmission, AssignmentSubmission,
  getClassSessions, addClassSession, updateClassSession, removeClassSession, ClassSession,
} from '@/lib/firebase/db';

const INITIAL_ADMINS: AdminUser[] = [];

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

export const EMAIL_TEMPLATES: Record<string, { label: string, color: string, content: string }> = {
  custom: { label: "Custom (Write from scratch)", color: "gray-500", content: "" },
  general: { label: "General Update", color: "blue-500", content: `This is a general transmission from the VEKTOR collective.\n\nPlease ensure your profile is up to date and monitor your inbox for further instructions.` },
  warning: { label: "Action Required / Missing Info", color: "amber-500", content: `Our automated systems detected anomalies or missing data in your application payload.\n\nPlease reply to this thread with the requested documents or update your profile immediately. Failure to comply may result in application termination.` },
  reminder: { label: "Interview / Action Reminder", color: "purple-500", content: `This is an automated reminder regarding your upcoming evaluation phase.\n\nEnsure all systems are calibrated. We expect optimal performance.` },
  success: { label: "Congratulations / Offer", color: "green-500", content: `We are pleased to inform you that you have passed the evaluation phase.\n\nWelcome to the VEKTOR collective. Please check your attachments for onboarding procedures.` },
  rejected: { label: "Application Rejected", color: "red-500", content: `We have finalized the analysis of your application payload.\n\nDue to current bandwidth limitations, we are unable to process your inclusion into the current cohort.` },
};

export default function AdminDashboard() {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  // Main States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'applicants' | 'admins' | 'settings' | 'emails' | 'audit' | 'assignments' | 'schedule'>('applicants');
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [admins, setAdmins] = useState<AdminUser[]>(INITIAL_ADMINS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const isSuperAdmin = useMemo(() => {
    if (currentUserEmail === 'bgupta1_be23@thapar.edu') return true;
    const role = admins.find(a => a.email === currentUserEmail)?.role;
    return role === 'super_admin' || role === 'Super Admin';
  }, [admins, currentUserEmail]);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const [appsData, adminsData, logsData, assignmentsData, sessionsData] = await Promise.all([
        getApplicants(), getAdmins(), getAuditLogs(), getAssignments(), getClassSessions()
      ]);
      setApplicants(appsData);
      setAdmins(adminsData);
      setAuditLogs(logsData);
      setAssignments(assignmentsData);
      setClassSessions(sessionsData);
    } catch (error) {
      console.error("Error fetching data:", error);
      showToast("Error", "Could not connect to Firebase database.");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUserEmail(user.email || '');
        setIsAuthenticated(true);
        await fetchData();
      } else {
        setCurrentUserEmail('');
        setIsAuthenticated(false);
        setApplicants([]);
        setAdmins([]);
        setAuditLogs([]);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | 'All' | 'Priority'>('All');
  const [filterYear, setFilterYear] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');

  const uniqueBranches = useMemo(() => {
    const branches = new Set(applicants.map(a => a.branch).filter(Boolean));
    return Array.from(branches).sort();
  }, [applicants]);

  const uniqueYears = useMemo(() => {
    const years = new Set(applicants.map(a => String(a.year)).filter(Boolean));
    return Array.from(years).sort();
  }, [applicants]);
  
  // Modals & Sub-states
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReasonToggle, setRejectReasonToggle] = useState(false);
  const [rejectReasonText, setRejectReasonText] = useState('');
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewLocationType, setInterviewLocationType] = useState<'offline' | 'virtual'>('virtual');
  const [interviewLocation, setInterviewLocation] = useState('');
  
  // Custom Email States
  const [emailAudience, setEmailAudience] = useState<ApplicationStatus | 'All' | 'Priority' | 'Selected' | 'Specific'>('All');
  const [specificRecipients, setSpecificRecipients] = useState<Applicant[]>([]);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailTemplate, setEmailTemplate] = useState('custom');
  const [isSendingBulkEmail, setIsSendingBulkEmail] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  // Gemini AI Email States
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState('VEKTOR Elite & Authoritative');
  const [isGeneratingWithAi, setIsGeneratingWithAi] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');

  // File Attachments State
  const [emailAttachments, setEmailAttachments] = useState<Array<{
    id: string;
    file: File;
    name: string;
    size: number;
    type: string;
    base64?: string;
  }>>([]);
  const [isAttachmentDragging, setIsAttachmentDragging] = useState(false);
  
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

  // ─── CC Admin State (Comms Studio) ───────────────────────────────────────
  const [commsCcAdmins, setCommsCcAdmins] = useState<string[]>([]);
  const [showCcDropdown, setShowCcDropdown] = useState(false);

  // ─── Assignments State ───────────────────────────────────────────────────
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<AssignmentSubmission[]>([]);
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [isSendingAssignmentEmail, setIsSendingAssignmentEmail] = useState(false);
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    submissionLink: '',
    recipientType: 'all_members' as 'all_members' | 'specific',
    specificRecipients: [] as string[],
    ccAdmins: [] as string[],
    tags: [] as string[],
    isPriority: false,
    attachmentUrls: [] as { name: string; url: string; base64?: string; type?: string; size?: number }[],
  });
  const [assignmentTagInput, setAssignmentTagInput] = useState('');
  const [assignmentSpecificInput, setAssignmentSpecificInput] = useState('');
  const [assignmentRecipientFilter, setAssignmentRecipientFilter] = useState('');
  const [assignmentCcInput, setAssignmentCcInput] = useState('');
  const [showAssignmentCcDropdown, setShowAssignmentCcDropdown] = useState(false);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [isUploadingAssignmentFile, setIsUploadingAssignmentFile] = useState(false);

  // Assignment Edit State
  const [showEditAssignment, setShowEditAssignment] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editAssignmentForm, setEditAssignmentForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    submissionLink: '',
    recipientType: 'all_members' as 'all_members' | 'specific',
    specificRecipients: [] as string[],
    ccAdmins: [] as string[],
    tags: [] as string[],
    isPriority: false,
    attachmentUrls: [] as { name: string; url: string; base64?: string; type?: string; size?: number }[],
  });
  const [editAssignmentTagInput, setEditAssignmentTagInput] = useState('');
  const [editAssignmentSpecificInput, setEditAssignmentSpecificInput] = useState('');
  const [showEditAssignmentCcDropdown, setShowEditAssignmentCcDropdown] = useState(false);
  const [editAssignmentNotify, setEditAssignmentNotify] = useState(true);
  const [isSavingAssignmentEdit, setIsSavingAssignmentEdit] = useState(false);

  // ─── Class Sessions State ────────────────────────────────────────────────
  const [classSessions, setClassSessions] = useState<ClassSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [isSendingClassEmail, setIsSendingClassEmail] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    duration: 60,
    type: 'online' as 'online' | 'offline',
    meetLink: '',
    location: '',
    recipientType: 'all_members' as 'all_members' | 'specific',
    specificRecipients: [] as string[],
    ccAdmins: [] as string[],
    isRecurring: false,
    recurringPattern: 'weekly' as 'weekly' | 'biweekly' | 'monthly',
    tags: [] as string[],
  });
  const [sessionTagInput, setSessionTagInput] = useState('');
  const [sessionSpecificInput, setSessionSpecificInput] = useState('');
  const [sessionRecipientFilter, setSessionRecipientFilter] = useState('');
  const [sessionCcInput, setSessionCcInput] = useState('');
  const [showSessionCcDropdown, setShowSessionCcDropdown] = useState(false);
  const [scheduleView, setScheduleView] = useState<'upcoming' | 'all'>('upcoming');

  // Session Edit & Cancellation State
  const [showEditSession, setShowEditSession] = useState(false);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);
  const [editSessionForm, setEditSessionForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    duration: 60,
    type: 'online' as 'online' | 'offline',
    meetLink: '',
    location: '',
    recipientType: 'all_members' as 'all_members' | 'specific',
    specificRecipients: [] as string[],
    ccAdmins: [] as string[],
    isRecurring: false,
    recurringPattern: 'weekly' as 'weekly' | 'biweekly' | 'monthly',
    tags: [] as string[],
  });
  const [editSessionTagInput, setEditSessionTagInput] = useState('');
  const [editSessionSpecificInput, setEditSessionSpecificInput] = useState('');
  const [showEditSessionCcDropdown, setShowEditSessionCcDropdown] = useState(false);
  const [editSessionNotify, setEditSessionNotify] = useState(true);
  const [isSavingSessionEdit, setIsSavingSessionEdit] = useState(false);

  // Cancellation Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [sessionToCancel, setSessionToCancel] = useState<ClassSession | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [isCancellingSession, setIsCancellingSession] = useState(false);

  // --- Auth Handlers ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      addAuditLog({
        adminEmail: loginEmail,
        actionType: 'LOGIN',
        details: 'Admin authenticated successfully.'
      });
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
      
      const matchesYear = filterYear === 'All' || String(app.year) === filterYear;
      const matchesBranch = filterBranch === 'All' || app.branch === filterBranch;
      
      return matchesSearch && matchesStatus && matchesYear && matchesBranch;
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

  const triggerEmailNotification = async (recipientEmail: string, name: string, newStatus: string, interview?: string, interviewLocType?: string, interviewLoc?: string, customNote?: string) => {
    if (!recipientEmail || !autoEmailEnabled) return;
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          applicantName: name,
          status: newStatus,
          interviewDate: interview,
          interviewLocationType: interviewLocType,
          interviewLocation: interviewLoc,
          customNote: customNote
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

  const handleStatusChange = (id: string, newStatus: ApplicationStatus) => {
    if (newStatus === 'Rejected') {
      const app = applicants.find(a => a.id === id);
      if (app) setSelectedApplicant(app);
      setRejectReasonToggle(false);
      setRejectReasonText('');
      setShowRejectModal(true);
    } else {
      updateStatus(id, newStatus);
    }
  };

  const confirmReject = () => {
    if (selectedApplicant) {
      updateStatus(selectedApplicant.id, 'Rejected', rejectReasonToggle ? rejectReasonText : undefined);
      setShowRejectModal(false);
    }
  };

  const updateStatus = async (id: string, newStatus: ApplicationStatus, customNote?: string) => {
    const targetApplicant = applicants.find(a => a.id === id);
    try {
      await updateApplicant(id, { status: newStatus });
      setApplicants(prev => prev.map(app => app.id === id ? { ...app, status: newStatus } : app));
      if (selectedApplicant?.id === id) {
        setSelectedApplicant(prev => prev ? { ...prev, status: newStatus } : null);
      }
      
      addAuditLog({
        adminEmail: currentUserEmail,
        actionType: 'APPLICANT_UPDATE',
        details: `Changed status for applicant ${targetApplicant?.name || id} to ${newStatus}. ${customNote ? 'Included custom note.' : ''}`
      });

      if (targetApplicant?.email) {
        await triggerEmailNotification(targetApplicant.email, targetApplicant.name, newStatus, undefined, undefined, undefined, customNote);
      } else {
        showToast("Status Updated", `Applicant marked as ${newStatus}.`);
      }
    } catch (error) {
      console.error(error);
      showToast("Error", "Failed to update status.");
    }
  };
  const AI_PROMPT_PRESETS = [
    { label: "🚀 Acceptance & Next Steps", prompt: "Write an acceptance transmission congratulating the applicant for making the cut into VEKTOR. Inform them to prepare their systems for the core induction briefing.", tone: "VEKTOR Elite & Authoritative" },
    { label: "⚡ Interview Coordinates", prompt: "Inform the applicant that their profile has cleared Phase 1 triage and they have unlocked the technical evaluation interview. Emphasize that live capability verification will take place.", tone: "VEKTOR Elite & Authoritative" },
    { label: "⚠️ Missing Info / Urgent Repo", prompt: "Urgent action required: The applicant forgot to submit their project repository or demo URL. Give them a strict 24-hour window to reply or their queue slot will be voided.", tone: "Urgent & Direct" },
    { label: "📢 Cohort Orientation", prompt: "Announce the upcoming VEKTOR cohort kickoff session at TAN Auditorium. State that attendance is strictly mandatory for all newly selected members.", tone: "Formal & Precise" },
    { label: "💡 Constructive Iteration", prompt: "Inform the applicant that while their current submission was not selected due to extreme cohort constraints, their effort was recognized. Urge them to iterate and reapply in the next cycle.", tone: "Encouraging & Inspiring" },
    { label: "⏱️ Task Submission Deadline", prompt: "Reminder that the 48-hour prototype challenge submission deadline expires tonight at 23:59 IST. Late commits will not be graded.", tone: "Urgent & Direct" },
  ];

  const handleAddAttachments = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const totalCurrentSize = emailAttachments.reduce((acc, curr) => acc + curr.size, 0);
    const newFilesTotalSize = fileArray.reduce((acc, curr) => acc + curr.size, 0);

    if (totalCurrentSize + newFilesTotalSize > 15 * 1024 * 1024) {
      showToast("Size Limit Exceeded", "Total attachment payload cannot exceed 15MB.");
      return;
    }

    try {
      const processedFiles = await Promise.all(
        fileArray.map(async (f) => {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(f);
          });
          return {
            id: Math.random().toString(36).substring(2, 9),
            file: f,
            name: f.name,
            size: f.size,
            type: f.type || 'application/octet-stream',
            base64,
          };
        })
      );

      setEmailAttachments(prev => [...prev, ...processedFiles]);
      showToast("Files Attached", `Attached ${processedFiles.length} file(s).`);
    } catch (err) {
      console.error(err);
      showToast("Attachment Error", "Failed to process attached file.");
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setEmailAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleGenerateAiEmail = async (mode: 'new' | 'polish' = 'new', customTextPrompt?: string) => {
    const promptToUse = customTextPrompt !== undefined ? customTextPrompt : aiPrompt;
    if (mode === 'new' && !promptToUse.trim()) {
      showToast("Prompt Required", "Please describe what email you want Gemini to write.");
      return;
    }
    if (mode === 'polish' && !emailBody.trim()) {
      showToast("Nothing to Polish", "Please write or enter some transmission content first.");
      return;
    }

    setIsGeneratingWithAi(true);
    try {
      const res = await fetch('/api/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToUse,
          tone: aiTone,
          targetAudience: emailAudience,
          currentSubject: emailSubject,
          currentBody: emailBody,
          mode
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate transmission with Gemini");
      }

      setEmailSubject(data.subject);
      setEmailBody(data.body);
      if (data.templateType) {
        setEmailTemplate(data.templateType);
      }
      setAiExplanation(data.explanation || '');
      showToast(
        mode === 'polish' ? "Draft Polished" : "Transmission Synthesized",
        "Generated with Gemini following the VEKTOR design system."
      );
    } catch (err: any) {
      console.error(err);
      showToast("AI Generation Failed", err.message || "Failed to communicate with Gemini API.");
    } finally {
      setIsGeneratingWithAi(false);
    }
  };

  const handleSendBulkEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject || !emailBody) {
      showToast("Error", "Subject and Body are required.");
      return;
    }

    let targetRecipients = [];
    if (emailAudience === 'All') {
      targetRecipients = applicants;
    } else if (emailAudience === 'Priority') {
      targetRecipients = applicants.filter(a => a.isPriority);
    } else if (emailAudience === 'Selected') {
      if (!selectedApplicant) {
        showToast("Error", "No applicant selected.");
        return;
      }
      targetRecipients = [selectedApplicant];
    } else if (emailAudience === 'Specific') {
      if (specificRecipients.length === 0) {
        showToast("Error", "No specific recipients selected.");
        return;
      }
      targetRecipients = specificRecipients;
    } else {
      targetRecipients = applicants.filter(a => a.status === emailAudience);
    }

    targetRecipients = targetRecipients.filter(a => a.email);

    if (targetRecipients.length === 0) {
      showToast("Notice", "No recipients found for this selection.");
      return;
    }

    if (!confirm(`Are you sure you want to send this email to ${targetRecipients.length} recipient(s)${emailAttachments.length > 0 ? ` with ${emailAttachments.length} attachment(s)` : ''}?`)) return;

    setIsSendingBulkEmail(true);
    try {
      const payloadAttachments = emailAttachments.map(att => ({
        filename: att.name,
        contentType: att.type,
        content: att.base64 || ''
      }));

      const res = await fetch('/api/send-bulk-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: targetRecipients.map(a => ({ email: a.email, name: a.name })),
          subject: emailSubject,
          messageText: emailBody,
          templateType: emailTemplate,
          attachments: payloadAttachments.length > 0 ? payloadAttachments : undefined,
          ccEmails: commsCcAdmins.length > 0 ? commsCcAdmins : undefined,
        })
      });

      const data = await res.json();
      if (res.ok) {
        addAuditLog({
          adminEmail: currentUserEmail || 'unknown',
          actionType: 'EMAIL_SENT',
          details: `Sent bulk email (Template: ${emailTemplate}) with subject "${emailSubject}" to ${targetRecipients.length} recipients. Attachments: ${emailAttachments.length > 0 ? emailAttachments.map(a => a.name).join(', ') : 'None'}. Message: ${emailBody}`
        });
        showToast("Success", data.message || `Emails sent to ${targetRecipients.length} recipients.`);
        setEmailSubject('');
        setEmailBody('');
        setEmailAttachments([]);
      } else {
        throw new Error(data.error || 'Failed to send emails');
      }
    } catch (err: any) {
      console.error(err);
      showToast("Error", err.message || "Failed to send bulk emails.");
    } finally {
      setIsSendingBulkEmail(false);
    }
  };


  const deleteApplicant = async (id: string, name: string) => {
    if(confirm(`Are you sure you want to permanently delete ${name}?`)) {
      try {
        await removeApplicant(id);
        setApplicants(prev => prev.filter(app => app.id !== id));
        setSelectedApplicant(null);
        addAuditLog({
          adminEmail: currentUserEmail || 'unknown',
          actionType: 'APPLICANT_DELETE',
          details: `Deleted applicant ${name} (ID: ${id}).`
        });
        showToast("Applicant Deleted", `${name} has been removed from the system.`);
      } catch (error) {
        console.error(error);
        showToast("Error", "Failed to delete applicant.");
      }
    }
  };

  const formatInterviewDateTime = (str?: string) => {
    if (!str) return 'To be assigned';
    const utcStr = str.endsWith('Z') ? str : (str.includes('T') ? str + 'Z' : str);
    try {
      return new Date(utcStr).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC'
      });
    } catch {
      return str;
    }
  };

  const openInterviewModal = () => {
    if (selectedApplicant?.interviewDate) {
      const raw = selectedApplicant.interviewDate;
      const parts = raw.split('T');
      if (parts.length === 2) {
        setInterviewDate(parts[0]);
        setInterviewTime(parts[1].substring(0, 5));
      } else {
        const dateObj = new Date(raw);
        setInterviewDate(dateObj.toISOString().split('T')[0]);
        setInterviewTime(dateObj.toISOString().split('T')[1].substring(0, 5));
      }
      setInterviewLocationType((selectedApplicant.interviewLocationType as any) || 'virtual');
      setInterviewLocation(selectedApplicant.interviewLocation || '');
    } else {
      setInterviewDate('');
      setInterviewTime('');
      setInterviewLocationType('virtual');
      setInterviewLocation('');
    }
    setShowInterviewModal(true);
  };

  const handleCancelInterview = async () => {
    if (!selectedApplicant || !selectedApplicant.interviewDate) return;
    try {
      await updateApplicant(selectedApplicant.id, { status: 'Reviewing', interviewDate: '', interviewLocationType: null as any, interviewLocation: '' });
      setApplicants(prev => prev.map(app => 
        app.id === selectedApplicant.id 
          ? { ...app, status: 'Reviewing', interviewDate: undefined, interviewLocationType: undefined, interviewLocation: undefined } 
          : app
      ));
      setSelectedApplicant(prev => prev ? { ...prev, status: 'Reviewing', interviewDate: undefined, interviewLocationType: undefined, interviewLocation: undefined } : null);
      setShowInterviewModal(false);
      
      addAuditLog({
        adminEmail: currentUserEmail || 'unknown',
        actionType: 'APPLICANT_UPDATE',
        details: `Cancelled interview for applicant ${selectedApplicant.name} (ID: ${selectedApplicant.id}).`
      });
      
      if (selectedApplicant.email) {
        await triggerEmailNotification(selectedApplicant.email, selectedApplicant.name, 'Interview Cancelled');
      } else {
        showToast("Interview Cancelled", `Interview for ${selectedApplicant.name} has been cancelled.`);
      }
    } catch (error) {
      console.error(error);
      showToast("Error", "Failed to cancel interview.");
    }
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplicant || !interviewDate || !interviewTime) return;
    
    const dateTime = `${interviewDate}T${interviewTime}:00Z`;
    const isUpdate = !!selectedApplicant.interviewDate;
    
    try {
      await updateApplicant(selectedApplicant.id, { status: 'Interview', interviewDate: dateTime, interviewLocationType, interviewLocation });
      setApplicants(prev => prev.map(app => 
        app.id === selectedApplicant.id 
          ? { ...app, status: 'Interview', interviewDate: dateTime, interviewLocationType, interviewLocation } 
          : app
      ));
      
      setSelectedApplicant(prev => prev ? { ...prev, status: 'Interview', interviewDate: dateTime, interviewLocationType, interviewLocation } : null);
      setShowInterviewModal(false);
      
      addAuditLog({
        adminEmail: currentUserEmail || 'unknown',
        actionType: 'APPLICANT_UPDATE',
        details: `${isUpdate ? 'Updated' : 'Scheduled'} interview for ${selectedApplicant.name} on ${dateTime}.`
      });
      
      if (selectedApplicant.email) {
        await triggerEmailNotification(selectedApplicant.email, selectedApplicant.name, isUpdate ? 'Interview Edited' : 'Interview', dateTime, interviewLocationType, interviewLocation);
      } else {
        showToast(isUpdate ? "Interview Updated" : "Interview Scheduled", `Invite sent to ${selectedApplicant.name}.`);
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
      addAuditLog({
        adminEmail: currentUserEmail || 'unknown',
        actionType: 'APPLICANT_UPDATE',
        details: `Edited details for applicant ${selectedApplicant.name} (ID: ${selectedApplicant.id}). Fields: ${Object.keys(editForm).join(', ')}`
      });
      showToast("Record Updated", `Applicant details have been saved.`);
    } catch (error) {
      console.error(error);
      showToast("Error", "Failed to update applicant details.");
    }
  };

  const handleDeleteAdmin = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to revoke access for ${email}?`)) return;
    try {
      await removeAdminFromDB(id);
      setAdmins(prev => prev.filter(a => a.id !== id));
      addAuditLog({
        adminEmail: currentUserEmail || 'unknown',
        actionType: 'ADMIN_DELETE',
        details: `Revoked access for admin ${email}.`
      });
      showToast("Admin Removed", `${email} access revoked.`);
    } catch (err) {
      console.error(err);
      showToast("Error", "Failed to remove admin.");
    }
  };

  const handleToggleAdminRole = async (id: string, currentRole: string, email: string) => {
    const newRole = currentRole === 'Super Admin' || currentRole === 'super_admin' ? 'Admin' : 'Super Admin';
    try {
      await updateAdminRole(id, newRole);
      setAdmins(prev => prev.map(a => a.id === id ? { ...a, role: newRole } : a));
      addAuditLog({
        adminEmail: currentUserEmail || 'unknown',
        actionType: 'ADMIN_UPDATE',
        details: `Changed role for ${email} to ${newRole}.`
      });
      showToast("Role Updated", `${email} is now ${newRole}.`);
    } catch (err) {
      console.error(err);
      showToast("Error", "Failed to change role.");
    }
  };

  const handleClearAuditLogs = async () => {
    if (!confirm("Are you sure you want to permanently delete all audit logs?")) return;
    try {
      await clearAllAuditLogs();
      setAuditLogs([]);
      addAuditLog({
        adminEmail: currentUserEmail || 'unknown',
        actionType: 'AUDIT_CLEAR',
        details: 'Cleared all system audit logs.'
      });
      showToast("Logs Cleared", "All audit logs have been deleted.");
    } catch (err) {
      console.error(err);
      showToast("Error", "Failed to clear audit logs.");
    }
  };

  const handleDeleteSingleLog = async (id: string) => {
    if (!confirm("Delete this specific log?")) return;
    try {
      await deleteAuditLog(id);
      setAuditLogs(prev => prev.filter(log => log.id !== id));
      showToast("Log Deleted", "The audit log was successfully removed.");
    } catch (err) {
      console.error(err);
      showToast("Error", "Failed to delete audit log.");
    }
  };

  // ─── ASSIGNMENT HANDLERS ─────────────────────────────────────────────────

  const members = useMemo(() => applicants.filter(a => a.status === 'Accepted' && a.email), [applicants]);

  const handleSelectAssignment = async (asgn: Assignment) => {
    setSelectedAssignment(asgn);
    setIsLoadingSubmissions(true);
    try {
      const subs = await getSubmissionsForAssignment(asgn.id);
      setAssignmentSubmissions(subs);
    } catch { setAssignmentSubmissions([]); }
    finally { setIsLoadingSubmissions(false); }
  };

  const getNonSubmitters = (asgn: Assignment, subs: AssignmentSubmission[]) => {
    const submittedEmails = new Set(subs.map(s => s.memberEmail.toLowerCase()));
    let pool = asgn.recipientType === 'specific'
      ? asgn.specificRecipients.map(email => {
          const found = applicants.find(a => a.email?.toLowerCase() === email.toLowerCase());
          return { email, name: found ? found.name : email.split('@')[0], id: found?.id || email };
        })
      : (members.length > 0 ? members : applicants.filter(a => a.email));
    return pool.filter(m => !submittedEmails.has(m.email.toLowerCase()));
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentForm.title || !assignmentForm.dueDate) {
      showToast('Missing Fields', 'Title and due date are required.'); return;
    }

    if (assignmentForm.recipientType === 'specific' && assignmentForm.specificRecipients.length === 0) {
      showToast('Recipients Required', 'Please select at least one recipient for this specific assignment.');
      return;
    }

    setIsSendingAssignmentEmail(true);
    try {
      const dbAttachmentUrls = assignmentForm.attachmentUrls.map(a => ({ name: a.name, url: a.url || '' }));

      const newId = await addAssignment({
        ...assignmentForm,
        attachmentUrls: dbAttachmentUrls,
        createdAt: new Date().toISOString(),
        createdBy: currentUserEmail,
        remindersSent: 0,
        isActive: true,
      });

      const newAsgn: Assignment = {
        id: newId,
        ...assignmentForm,
        attachmentUrls: dbAttachmentUrls,
        createdAt: new Date().toISOString(),
        createdBy: currentUserEmail,
        remindersSent: 0,
        isActive: true
      };
      setAssignments(prev => [newAsgn, ...prev]);
      addAuditLog({ adminEmail: currentUserEmail, actionType: 'ASSIGNMENT_CREATE', details: `Created assignment "${assignmentForm.title}"` });

      // Build recipient pool
      let recipientPool: { email: string; name: string }[] = [];
      if (assignmentForm.recipientType === 'all_members') {
        recipientPool = members.length > 0
          ? members.map(m => ({ email: m.email, name: m.name }))
          : applicants.filter(a => a.email).map(a => ({ email: a.email, name: a.name }));
      } else {
        recipientPool = assignmentForm.specificRecipients.map(email => {
          const found = applicants.find(a => a.email?.toLowerCase() === email.toLowerCase());
          return { email, name: found ? found.name : email.split('@')[0] };
        });
      }

      if (recipientPool.length > 0) {
        try {
          const payloadAttachments = assignmentForm.attachmentUrls.map(att => ({
            filename: att.name,
            contentType: att.type || 'application/octet-stream',
            content: att.base64 || '',
            url: att.url || '',
          }));

          const res = await fetch('/api/send-assignment-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'announce',
              recipients: recipientPool,
              ccEmails: assignmentForm.ccAdmins,
              attachments: payloadAttachments.length > 0 ? payloadAttachments : undefined,
              assignment: {
                title: assignmentForm.title,
                description: assignmentForm.description,
                dueDate: assignmentForm.dueDate,
                submissionLink: assignmentForm.submissionLink,
                tags: assignmentForm.tags,
                attachmentUrls: dbAttachmentUrls,
              },
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            showToast('Email Warning', data.error || 'Assignment saved, but notification emails failed.');
          } else {
            showToast('Assignment Created', `Notification dispatched to ${recipientPool.length} recipient(s).`);
          }
        } catch (fetchErr: any) {
          showToast('Email Error', fetchErr?.message || 'Assignment saved, but email API call failed.');
        }
      } else {
        showToast('Assignment Created', 'Assignment saved (no members in cohort to email).');
      }

      setAssignmentForm({
        title: '',
        description: '',
        dueDate: '',
        submissionLink: '',
        recipientType: 'all_members',
        specificRecipients: [],
        ccAdmins: [],
        tags: [],
        isPriority: false,
        attachmentUrls: [],
      });
      setShowCreateAssignment(false);
    } catch (err) { console.error(err); showToast('Error', 'Failed to create assignment.'); }
    finally { setIsSendingAssignmentEmail(false); }
  };

  const handleUploadAssignmentFiles = async (files: FileList | null, isEdit = false) => {
    if (!files || files.length === 0) return;
    setIsUploadingAssignmentFile(true);
    try {
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        // Read file as base64 data URL (same way as Comms Studio)
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Also upload to Vercel Blob for persistent storage
        let blobUrl = '';
        try {
          const res = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
            method: 'POST',
            body: file,
          });
          const data = await res.json();
          if (res.ok && data.url) {
            blobUrl = data.url;
          }
        } catch (uploadErr) {
          console.warn('Blob upload fallback:', uploadErr);
        }

        const newAtt = {
          name: file.name,
          url: blobUrl,
          base64,
          type: file.type || 'application/octet-stream',
          size: file.size,
        };

        if (isEdit) {
          setEditAssignmentForm(f => ({
            ...f,
            attachmentUrls: [...(f.attachmentUrls || []), newAtt]
          }));
        } else {
          setAssignmentForm(f => ({
            ...f,
            attachmentUrls: [...(f.attachmentUrls || []), newAtt]
          }));
        }
      }
      showToast("Files Attached", `Attached ${fileArray.length} file(s) successfully.`);
    } catch (err: any) {
      console.error(err);
      showToast("Upload Error", err.message || "Failed to process file.");
    } finally {
      setIsUploadingAssignmentFile(false);
    }
  };

  const handleOpenEditAssignment = (asgn: Assignment) => {
    setEditingAssignment(asgn);
    setEditAssignmentForm({
      title: asgn.title,
      description: asgn.description,
      dueDate: asgn.dueDate,
      submissionLink: asgn.submissionLink || '',
      recipientType: asgn.recipientType,
      specificRecipients: asgn.specificRecipients || [],
      ccAdmins: asgn.ccAdmins || [],
      tags: asgn.tags || [],
      isPriority: !!asgn.isPriority,
      attachmentUrls: asgn.attachmentUrls || [],
    });
    setEditAssignmentNotify(true);
    setShowEditAssignment(true);
  };

  const handleSaveAssignmentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment) return;
    if (!editAssignmentForm.title || !editAssignmentForm.dueDate) {
      showToast('Missing Fields', 'Title and due date are required.'); return;
    }
    if (editAssignmentForm.recipientType === 'specific' && editAssignmentForm.specificRecipients.length === 0) {
      showToast('Recipients Required', 'Please select at least one recipient for this specific assignment.');
      return;
    }
    setIsSavingAssignmentEdit(true);
    try {
      const dbAttachmentUrls = editAssignmentForm.attachmentUrls.map(a => ({ name: a.name, url: a.url || '' }));
      const updatedData: Partial<Assignment> = {
        title: editAssignmentForm.title,
        description: editAssignmentForm.description,
        dueDate: editAssignmentForm.dueDate,
        submissionLink: editAssignmentForm.submissionLink || undefined,
        recipientType: editAssignmentForm.recipientType,
        specificRecipients: editAssignmentForm.specificRecipients,
        ccAdmins: editAssignmentForm.ccAdmins,
        tags: editAssignmentForm.tags,
        isPriority: editAssignmentForm.isPriority,
        attachmentUrls: dbAttachmentUrls,
      };

      await updateAssignment(editingAssignment.id, updatedData);
      setAssignments(prev => prev.map(a => a.id === editingAssignment.id ? { ...a, ...updatedData } : a));
      if (selectedAssignment?.id === editingAssignment.id) {
        setSelectedAssignment(prev => prev ? { ...prev, ...updatedData } : null);
      }
      addAuditLog({ adminEmail: currentUserEmail, actionType: 'ASSIGNMENT_UPDATE', details: `Updated assignment "${editAssignmentForm.title}"` });

      if (editAssignmentNotify) {
        let recipientPool: { email: string; name: string }[] = [];
        if (editAssignmentForm.recipientType === 'all_members') {
          recipientPool = members.length > 0
            ? members.map(m => ({ email: m.email, name: m.name }))
            : applicants.filter(a => a.email).map(a => ({ email: a.email, name: a.name }));
        } else {
          recipientPool = editAssignmentForm.specificRecipients.map(email => {
            const found = applicants.find(a => a.email?.toLowerCase() === email.toLowerCase());
            return { email, name: found ? found.name : email.split('@')[0] };
          });
        }

        if (recipientPool.length > 0) {
          try {
            const payloadAttachments = editAssignmentForm.attachmentUrls.map(att => ({
              filename: att.name,
              contentType: att.type || 'application/octet-stream',
              content: att.base64 || '',
              url: att.url || '',
            }));

            await fetch('/api/send-assignment-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'update',
                recipients: recipientPool,
                ccEmails: editAssignmentForm.ccAdmins,
                attachments: payloadAttachments.length > 0 ? payloadAttachments : undefined,
                assignment: {
                  title: editAssignmentForm.title,
                  description: editAssignmentForm.description,
                  dueDate: editAssignmentForm.dueDate,
                  submissionLink: editAssignmentForm.submissionLink,
                  tags: editAssignmentForm.tags,
                  attachmentUrls: dbAttachmentUrls,
                },
              }),
            });
            showToast('Assignment Updated', `Update saved & notification emails sent to ${recipientPool.length} recipient(s).`);
          } catch {
            showToast('Assignment Updated', 'Saved in database (notification email failed).');
          }
        } else {
          showToast('Assignment Updated', 'Changes saved successfully.');
        }
      } else {
        showToast('Assignment Updated', 'Changes saved successfully.');
      }
      setShowEditAssignment(false);
    } catch (err: any) {
      console.error(err);
      showToast('Error', err.message || 'Failed to update assignment.');
    } finally {
      setIsSavingAssignmentEdit(false);
    }
  };

  const handleSendReminders = async (asgn: Assignment) => {
    const nonSubmitters = getNonSubmitters(asgn, assignmentSubmissions);
    if (nonSubmitters.length === 0) { showToast('All Submitted', 'Everyone has submitted this assignment!'); return; }
    if (!confirm(`Send reminder to ${nonSubmitters.length} non-submitter(s)?`)) return;
    setIsSendingReminders(true);
    try {
      const payloadAttachments = asgn.attachmentUrls?.map(att => ({
        filename: att.name,
        url: att.url,
      }));

      await fetch('/api/send-assignment-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'reminder',
          recipients: nonSubmitters.map(m => ({ email: m.email, name: m.name })),
          ccEmails: asgn.ccAdmins || [],
          attachments: payloadAttachments && payloadAttachments.length > 0 ? payloadAttachments : undefined,
          assignment: {
            title: asgn.title,
            description: asgn.description,
            dueDate: asgn.dueDate,
            submissionLink: asgn.submissionLink,
            attachmentUrls: asgn.attachmentUrls,
          },
        }),
      });
      await updateAssignment(asgn.id, { remindersSent: (asgn.remindersSent || 0) + 1, lastReminderAt: new Date().toISOString() });
      setAssignments(prev => prev.map(a => a.id === asgn.id ? { ...a, remindersSent: (a.remindersSent || 0) + 1, lastReminderAt: new Date().toISOString() } : a));
      if (selectedAssignment?.id === asgn.id) setSelectedAssignment(prev => prev ? { ...prev, remindersSent: (prev.remindersSent || 0) + 1 } : null);
      addAuditLog({ adminEmail: currentUserEmail, actionType: 'ASSIGNMENT_REMINDER', details: `Sent reminders for "${asgn.title}" to ${nonSubmitters.length} non-submitters.` });
      showToast('Reminders Sent', `Fired ${nonSubmitters.length} reminder emails.`);
    } catch (err) { console.error(err); showToast('Error', 'Failed to send reminders.'); }
    finally { setIsSendingReminders(false); }
  };

  const handleMarkSubmitted = async (member: Applicant, asgn: Assignment) => {
    const already = assignmentSubmissions.some(s => s.memberEmail.toLowerCase() === member.email.toLowerCase());
    if (already) { showToast('Already Submitted', `${member.name} is already marked as submitted.`); return; }
    try {
      const subId = await addSubmission({ assignmentId: asgn.id, memberEmail: member.email, memberName: member.name, submittedAt: new Date().toISOString() });
      setAssignmentSubmissions(prev => [...prev, { id: subId, assignmentId: asgn.id, memberEmail: member.email, memberName: member.name, submittedAt: new Date().toISOString() }]);
      addAuditLog({ adminEmail: currentUserEmail, actionType: 'SUBMISSION_MARKED', details: `Marked ${member.name} as submitted for "${asgn.title}"` });
      showToast('Marked Submitted', `${member.name} marked as submitted.`);
    } catch (err) { console.error(err); showToast('Error', 'Failed to mark submission.'); }
  };

  const handleUnmarkSubmitted = async (sub: AssignmentSubmission) => {
    try {
      await removeSubmission(sub.id);
      setAssignmentSubmissions(prev => prev.filter(s => s.id !== sub.id));
      showToast('Submission Removed', `${sub.memberName} unmarked.`);
    } catch (err) { console.error(err); showToast('Error', 'Failed to remove submission.'); }
  };

  const handleDeleteAssignment = async (asgn: Assignment) => {
    if (!confirm(`Delete assignment "${asgn.title}"?`)) return;
    try {
      await removeAssignment(asgn.id);
      setAssignments(prev => prev.filter(a => a.id !== asgn.id));
      if (selectedAssignment?.id === asgn.id) setSelectedAssignment(null);
      addAuditLog({ adminEmail: currentUserEmail, actionType: 'ASSIGNMENT_DELETE', details: `Deleted assignment "${asgn.title}"` });
      showToast('Deleted', `Assignment removed.`);
    } catch (err) { console.error(err); showToast('Error', 'Failed to delete assignment.'); }
  };

  const handleToggleAssignmentActive = async (asgn: Assignment) => {
    try {
      await updateAssignment(asgn.id, { isActive: !asgn.isActive });
      setAssignments(prev => prev.map(a => a.id === asgn.id ? { ...a, isActive: !a.isActive } : a));
      if (selectedAssignment?.id === asgn.id) setSelectedAssignment(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
      showToast('Updated', `Assignment ${!asgn.isActive ? 'activated' : 'deactivated'}.`);
    } catch { showToast('Error', 'Failed to toggle.'); }
  };

  const exportSubmissionsCSV = (asgn: Assignment, subs: AssignmentSubmission[]) => {
    const rows = [['Name', 'Email', 'Submitted At', 'URL', 'Notes']];
    subs.forEach(s => rows.push([s.memberName, s.memberEmail, s.submittedAt, s.submissionUrl || '', s.notes || '']));
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${asgn.title}_submissions.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── CLASS SESSION HANDLERS ──────────────────────────────────────────────

  const upcomingSessions = useMemo(() => {
    const now = new Date();
    return classSessions.filter(s => {
      if (s.isCancelled) return false;
      const sessionDate = new Date(`${s.date}T${s.time || '00:00'}`);
      return sessionDate >= now;
    }).sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
  }, [classSessions]);

  const nextSession = upcomingSessions[0];

  const getCountdown = (session: ClassSession) => {
    const now = new Date();
    const sessionDate = new Date(`${session.date}T${session.time || '00:00'}`);
    const diff = sessionDate.getTime() - now.getTime();
    if (diff <= 0) return 'Now / Past';
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionForm.title || !sessionForm.date || !sessionForm.time) {
      showToast('Missing Fields', 'Title, date, and time are required.'); return;
    }

    if (sessionForm.recipientType === 'specific' && sessionForm.specificRecipients.length === 0) {
      showToast('Recipients Required', 'Please select at least one recipient for this specific session.');
      return;
    }

    setIsSendingClassEmail(true);
    try {
      const newId = await addClassSession({
        ...sessionForm,
        createdAt: new Date().toISOString(),
        createdBy: currentUserEmail,
        reminderSent: false,
        isCancelled: false,
      });

      const newSession: ClassSession = { id: newId, ...sessionForm, createdAt: new Date().toISOString(), createdBy: currentUserEmail, reminderSent: false, isCancelled: false };
      setClassSessions(prev => [...prev, newSession].sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()));
      addAuditLog({ adminEmail: currentUserEmail, actionType: 'SESSION_CREATE', details: `Scheduled class "${sessionForm.title}" on ${sessionForm.date}` });

      // Build recipient pool
      let recipientPool: { email: string; name: string }[] = [];
      if (sessionForm.recipientType === 'all_members') {
        recipientPool = members.length > 0
          ? members.map(m => ({ email: m.email, name: m.name }))
          : applicants.filter(a => a.email).map(a => ({ email: a.email, name: a.name }));
      } else {
        recipientPool = sessionForm.specificRecipients.map(email => {
          const found = applicants.find(a => a.email?.toLowerCase() === email.toLowerCase());
          return { email, name: found ? found.name : email.split('@')[0] };
        });
      }

      if (recipientPool.length > 0) {
        try {
          const res = await fetch('/api/send-class-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'invite',
              recipients: recipientPool,
              ccEmails: sessionForm.ccAdmins,
              session: {
                title: sessionForm.title,
                description: sessionForm.description,
                date: sessionForm.date,
                time: sessionForm.time,
                duration: sessionForm.duration,
                type: sessionForm.type,
                meetLink: sessionForm.meetLink,
                location: sessionForm.location,
                tags: sessionForm.tags
              },
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            showToast('Email Warning', data.error || 'Class scheduled, but invite emails failed.');
          } else {
            showToast('Class Scheduled', `Invites dispatched to ${recipientPool.length} recipient(s).`);
          }
        } catch (fetchErr: any) {
          showToast('Email Error', fetchErr?.message || 'Class scheduled, but email API call failed.');
        }
      } else {
        showToast('Class Scheduled', 'Class saved (no members in cohort to email).');
      }

      setSessionForm({ title: '', description: '', date: '', time: '', duration: 60, type: 'online', meetLink: '', location: '', recipientType: 'all_members', specificRecipients: [], ccAdmins: [], isRecurring: false, recurringPattern: 'weekly', tags: [] });
      setShowCreateSession(false);
    } catch (err) { console.error(err); showToast('Error', 'Failed to create session.'); }
    finally { setIsSendingClassEmail(false); }
  };

  const handleOpenEditSession = (session: ClassSession) => {
    setEditingSession(session);
    setEditSessionForm({
      title: session.title,
      description: session.description || '',
      date: session.date,
      time: session.time,
      duration: session.duration || 60,
      type: session.type,
      meetLink: session.meetLink || '',
      location: session.location || '',
      recipientType: session.recipientType,
      specificRecipients: session.specificRecipients || [],
      ccAdmins: session.ccAdmins || [],
      isRecurring: !!session.isRecurring,
      recurringPattern: session.recurringPattern || 'weekly',
      tags: session.tags || [],
    });
    setEditSessionNotify(true);
    setShowEditSession(true);
  };

  const handleSaveSessionEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;
    if (!editSessionForm.title || !editSessionForm.date || !editSessionForm.time) {
      showToast('Missing Fields', 'Title, date, and time are required.'); return;
    }
    if (editSessionForm.recipientType === 'specific' && editSessionForm.specificRecipients.length === 0) {
      showToast('Recipients Required', 'Please select at least one recipient for this specific session.');
      return;
    }
    setIsSavingSessionEdit(true);
    try {
      const updatedData: Partial<ClassSession> = {
        title: editSessionForm.title,
        description: editSessionForm.description,
        date: editSessionForm.date,
        time: editSessionForm.time,
        duration: editSessionForm.duration,
        type: editSessionForm.type,
        meetLink: editSessionForm.meetLink || undefined,
        location: editSessionForm.location || undefined,
        recipientType: editSessionForm.recipientType,
        specificRecipients: editSessionForm.specificRecipients,
        ccAdmins: editSessionForm.ccAdmins,
        isRecurring: editSessionForm.isRecurring,
        recurringPattern: editSessionForm.recurringPattern,
        tags: editSessionForm.tags,
      };

      await updateClassSession(editingSession.id, updatedData);
      setClassSessions(prev => prev.map(s => s.id === editingSession.id ? { ...s, ...updatedData } : s).sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()));
      if (selectedSession?.id === editingSession.id) {
        setSelectedSession(prev => prev ? { ...prev, ...updatedData } : null);
      }
      addAuditLog({ adminEmail: currentUserEmail, actionType: 'SESSION_UPDATE', details: `Updated class "${editSessionForm.title}"` });

      if (editSessionNotify) {
        let recipientPool: { email: string; name: string }[] = [];
        if (editSessionForm.recipientType === 'all_members') {
          recipientPool = members.length > 0
            ? members.map(m => ({ email: m.email, name: m.name }))
            : applicants.filter(a => a.email).map(a => ({ email: a.email, name: a.name }));
        } else {
          recipientPool = editSessionForm.specificRecipients.map(email => {
            const found = applicants.find(a => a.email?.toLowerCase() === email.toLowerCase());
            return { email, name: found ? found.name : email.split('@')[0] };
          });
        }

        if (recipientPool.length > 0) {
          try {
            await fetch('/api/send-class-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'update',
                recipients: recipientPool,
                ccEmails: editSessionForm.ccAdmins,
                session: {
                  title: editSessionForm.title,
                  description: editSessionForm.description,
                  date: editSessionForm.date,
                  time: editSessionForm.time,
                  duration: editSessionForm.duration,
                  type: editSessionForm.type,
                  meetLink: editSessionForm.meetLink,
                  location: editSessionForm.location,
                  tags: editSessionForm.tags,
                },
              }),
            });
            showToast('Class Updated', `Session updated & reschedule emails dispatched to ${recipientPool.length} recipient(s).`);
          } catch {
            showToast('Class Updated', 'Saved in database (notification email failed).');
          }
        } else {
          showToast('Class Updated', 'Changes saved successfully.');
        }
      } else {
        showToast('Class Updated', 'Changes saved successfully.');
      }
      setShowEditSession(false);
    } catch (err: any) {
      console.error(err);
      showToast('Error', err.message || 'Failed to update class.');
    } finally {
      setIsSavingSessionEdit(false);
    }
  };

  const handleOpenCancelModal = (session: ClassSession) => {
    setSessionToCancel(session);
    setCancelReasonInput('');
    setShowCancelModal(true);
  };

  const handleConfirmCancelSession = async () => {
    if (!sessionToCancel) return;
    setIsCancellingSession(true);
    try {
      await updateClassSession(sessionToCancel.id, {
        isCancelled: true,
        cancelReason: cancelReasonInput.trim() || undefined,
      });

      setClassSessions(prev => prev.map(s => s.id === sessionToCancel.id ? { ...s, isCancelled: true, cancelReason: cancelReasonInput.trim() || undefined } : s));
      if (selectedSession?.id === sessionToCancel.id) {
        setSelectedSession(prev => prev ? { ...prev, isCancelled: true, cancelReason: cancelReasonInput.trim() || undefined } : null);
      }
      addAuditLog({ adminEmail: currentUserEmail, actionType: 'SESSION_CANCEL', details: `Cancelled class "${sessionToCancel.title}". Reason: ${cancelReasonInput.trim() || 'None'}` });

      const recipientPool = sessionToCancel.recipientType === 'all_members'
        ? (members.length > 0 ? members.map(m => ({ email: m.email, name: m.name })) : applicants.filter(a => a.email).map(a => ({ email: a.email, name: a.name })))
        : sessionToCancel.specificRecipients.map(email => {
            const found = applicants.find(a => a.email?.toLowerCase() === email.toLowerCase());
            return { email, name: found ? found.name : email.split('@')[0] };
          });

      if (recipientPool.length > 0) {
        const res = await fetch('/api/send-class-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'cancelled',
            recipients: recipientPool,
            ccEmails: sessionToCancel.ccAdmins,
            session: {
              title: sessionToCancel.title,
              date: sessionToCancel.date,
              time: sessionToCancel.time,
              type: sessionToCancel.type,
              cancelReason: cancelReasonInput.trim() || undefined,
            },
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast('Email Warning', data.error || 'Class marked cancelled, but email delivery encountered an issue.');
        } else {
          showToast('Session Terminated', `Cancellation emails delivered to ${recipientPool.length} recipient(s).`);
        }
      } else {
        showToast('Cancelled', 'Class session marked cancelled.');
      }
      setShowCancelModal(false);
      setSessionToCancel(null);
    } catch (err: any) {
      console.error(err);
      showToast('Error', err.message || 'Failed to cancel session.');
    } finally {
      setIsCancellingSession(false);
    }
  };

  const handleDeleteSession = async (session: ClassSession) => {
    if (!confirm(`Permanently delete "${session.title}"?`)) return;
    try {
      await removeClassSession(session.id);
      setClassSessions(prev => prev.filter(s => s.id !== session.id));
      if (selectedSession?.id === session.id) setSelectedSession(null);
      addAuditLog({ adminEmail: currentUserEmail, actionType: 'SESSION_DELETE', details: `Deleted class "${session.title}"` });
      showToast('Deleted', 'Session removed.');
    } catch { showToast('Error', 'Failed to delete session.'); }
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logo.png" alt="VEKTOR" className="h-10 w-auto object-contain mx-auto mb-4" />
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
    <div className="flex h-[100dvh] bg-[#0a0a0a] text-gray-200 font-body overflow-hidden selection:bg-white/20">
      
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

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 border-r border-white/10 bg-[#0f0f0f] flex-col z-20">
        <div className="p-6 border-b border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logo.png" alt="VEKTOR" className="h-6 w-auto object-contain mb-2" />
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
            onClick={() => setActiveTab('emails')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${activeTab === 'emails' ? 'bg-white/10 text-white shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Mail size={18} /> Comms Studio
          </button>
          {isSuperAdmin && (
            <button 
              onClick={() => setActiveTab('assignments')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${activeTab === 'assignments' ? 'bg-orange-500/20 text-orange-400 shadow-inner border border-orange-500/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <ClipboardList size={18} /> Assignments
            </button>
          )}
          {isSuperAdmin && (
            <button 
              onClick={() => setActiveTab('schedule')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${activeTab === 'schedule' ? 'bg-blue-500/20 text-blue-400 shadow-inner border border-blue-500/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <CalendarDays size={18} /> Class Schedule
            </button>
          )}
          {isSuperAdmin && (
            <button 
              onClick={() => setActiveTab('admins')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${activeTab === 'admins' ? 'bg-white/10 text-white shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Shield size={18} /> Admins
            </button>
          )}
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${activeTab === 'settings' ? 'bg-white/10 text-white shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Settings size={18} /> Settings
          </button>
          {isSuperAdmin && (
            <button 
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${activeTab === 'audit' ? 'bg-white/10 text-white shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <FileText size={18} /> Audit Logs
            </button>
          )}

          <div className="mt-auto mb-1 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
            <div className="w-8 h-8 shrink-0 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">
              {currentUserEmail.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{currentUserEmail}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">{isSuperAdmin ? 'Super Admin' : 'Admin'}</p>
            </div>
          </div>

          <button 
            onClick={() => signOut(auth)}
            className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium text-red-400 hover:bg-red-400/10 border border-transparent hover:border-red-400/20"
          >
            <LogOut size={18} /> Logout
          </button>
        </nav>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0f0f0f] border-t border-white/10 z-50 flex justify-around p-2 pb-safe">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <LayoutDashboard size={20} />
          <span className="text-[10px]">Dashboard</span>
        </button>
        <button 
          onClick={() => setActiveTab('applicants')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === 'applicants' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Users size={20} />
          <span className="text-[10px]">Applicants</span>
        </button>
        <button 
          onClick={() => setActiveTab('emails')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === 'emails' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Mail size={20} />
          <span className="text-[10px]">Comms</span>
        </button>
        {isSuperAdmin && (
          <button 
            onClick={() => setActiveTab('assignments')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === 'assignments' ? 'text-orange-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <ClipboardList size={20} />
            <span className="text-[10px]">Tasks</span>
          </button>
        )}
        {isSuperAdmin && (
          <button 
            onClick={() => setActiveTab('schedule')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === 'schedule' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <CalendarDays size={20} />
            <span className="text-[10px]">Classes</span>
          </button>
        )}
        {isSuperAdmin && (
          <button 
            onClick={() => setActiveTab('admins')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === 'admins' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Shield size={20} />
            <span className="text-[10px]">Admins</span>
          </button>
        )}
        {isSuperAdmin && (
          <button 
            onClick={() => setActiveTab('audit')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === 'audit' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <FileText size={20} />
            <span className="text-[10px]">Audit</span>
          </button>
        )}
        {!isSuperAdmin && (
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === 'settings' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Settings size={20} />
            <span className="text-[10px]">Settings</span>
          </button>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative">
        <header className="h-16 md:h-20 border-b border-white/10 flex items-center justify-between px-4 md:px-8 bg-[#0a0a0a]/80 backdrop-blur-md z-10">
          <h2 className="text-lg md:text-xl font-bold tracking-wide text-white capitalize truncate pr-2">
            {activeTab === 'applicants' ? <span className="hidden md:inline">Applicant Tracking System</span> : null}
            {activeTab === 'applicants' ? <span className="md:hidden">Applicants</span> : activeTab}
          </h2>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-400 border border-white/10 px-3 py-1.5 rounded-full bg-white/5">
              <Mail size={14} className={autoEmailEnabled ? "text-green-500" : "text-gray-500"} />
              <span className="hidden md:inline text-xs font-bold uppercase tracking-wider">
                Auto-Email: {autoEmailEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400 border border-white/10 px-3 py-1.5 rounded-full bg-white/5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="hidden md:inline text-xs font-bold uppercase tracking-wider">System Online</span>
            </div>
            <button 
              onClick={() => signOut(auth)}
              className="md:hidden p-2 text-red-400 bg-red-400/10 rounded-lg hover:bg-red-400/20"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative z-0 pb-32 md:pb-8 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-[#111] border border-white/10 rounded-2xl p-6">
                  <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2"><Clock size={18} className="text-blue-500" /> Recent Applications</h3>
                  <div className="divide-y divide-white/5">
                    {applicants.slice(0, 5).map(app => (
                      <div key={app.id} className="py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-white">{app.name}</p>
                          <p className="text-xs text-gray-500">{app.email}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${app.status === 'Accepted' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : app.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : app.status === 'Interview' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
                          {app.status}
                        </span>
                      </div>
                    ))}
                    {applicants.length === 0 && <p className="text-sm text-gray-500 py-4">No recent applications.</p>}
                  </div>
                </div>

                <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
                  <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2"><Star size={18} className="text-yellow-500" /> Quick Actions</h3>
                  <div className="flex flex-col gap-3">
                    <button onClick={() => { setShowCreateApplicant(true); setActiveTab('applicants'); }} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm text-left text-white font-medium">
                      <UserPlus size={18} className="text-blue-400" /> Add Applicant
                    </button>
                    <button onClick={() => setActiveTab('emails')} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm text-left text-white font-medium">
                      <Send size={18} className="text-green-400" /> Dispatch Email
                    </button>
                    {isSuperAdmin && (
                      <button onClick={() => setActiveTab('audit')} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm text-left text-white font-medium">
                        <FileText size={18} className="text-purple-400" /> System Logs
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* APPLICANTS TAB */}
          {activeTab === 'applicants' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
              {/* Toolbar */}
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
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
                  <div className="flex gap-2">
                    <button
                      onClick={fetchData}
                      disabled={isRefreshing}
                      className="flex-1 md:flex-none items-center justify-center flex gap-2 bg-[#111] hover:bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white transition-all disabled:opacity-50"
                      title="Refresh Data"
                    >
                      <RefreshCw size={18} className={isRefreshing ? "animate-spin text-white" : "text-gray-400"} />
                    </button>
                    <button 
                      onClick={() => setShowCreateApplicant(true)}
                      className="flex-[2] md:flex-none bg-white hover:bg-gray-200 text-black px-6 py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <UserPlus size={18} /> Add Record
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 md:gap-4 items-center">
                  <div className="flex items-center gap-2 bg-[#111] border border-white/10 rounded-xl px-3 md:px-4 py-2 flex-1 md:flex-none min-w-[120px]">
                    <Filter size={16} className="text-gray-500 hidden md:block" />
                    <select 
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as any)}
                      className="w-full bg-transparent text-gray-300 text-sm focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="All">All Status</option>
                      <option value="Priority">Priority ⭐️</option>
                      <option value="Pending">Pending</option>
                      <option value="Reviewing">Reviewing</option>
                      <option value="Interview">Interview</option>
                      <option value="Accepted">Accepted</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 bg-[#111] border border-white/10 rounded-xl px-3 md:px-4 py-2 flex-1 md:flex-none min-w-[120px]">
                    <span className="text-gray-500 text-xs font-bold uppercase hidden md:block">Year</span>
                    <select 
                      value={filterYear}
                      onChange={(e) => setFilterYear(e.target.value)}
                      className="w-full bg-transparent text-gray-300 text-sm focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="All">All Years</option>
                      {uniqueYears.map(year => (
                        <option key={year} value={year}>Year {year}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 bg-[#111] border border-white/10 rounded-xl px-3 md:px-4 py-2 flex-1 md:flex-none min-w-[140px]">
                    <span className="text-gray-500 text-xs font-bold uppercase hidden md:block">Branch</span>
                    <select 
                      value={filterBranch}
                      onChange={(e) => setFilterBranch(e.target.value)}
                      className="w-full bg-transparent text-gray-300 text-sm focus:outline-none appearance-none cursor-pointer truncate"
                    >
                      <option value="All">All Branches</option>
                      {uniqueBranches.map(branch => (
                        <option key={branch} value={branch}>{branch}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Table / List */}
              <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
                <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-white/10 bg-white/5 text-xs font-bold uppercase tracking-wider text-gray-400">
                  <div className="col-span-3">Applicant</div>
                  <div className="col-span-2">Reg No</div>
                  <div className="col-span-3">Branch / Year</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                
                <div className="flex flex-col">
                  {filteredApplicants.length > 0 ? (
                    filteredApplicants.map(app => (
                      <motion.div 
                        key={app.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 p-4 border-b border-white/5 hover:bg-white/[0.04] md:items-center transition-colors cursor-pointer ${app.isPriority ? 'bg-yellow-500/[0.02]' : ''}`}
                        onClick={() => { setSelectedApplicant(app); setIsEditingApplicant(false); }}
                      >
                        <div className="md:col-span-3 flex items-center justify-between md:justify-start gap-3">
                          <div className="flex items-center gap-3">
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
                          
                          <span className={`md:hidden px-3 py-1 rounded-full text-[10px] font-bold border flex w-fit items-center gap-1.5 ${getStatusColor(app.status)}`}>
                            {app.status === 'Pending' && <Clock size={10} />}
                            {app.status === 'Reviewing' && <BookOpen size={10} />}
                            {app.status === 'Interview' && <CalendarDays size={10} />}
                            {app.status === 'Accepted' && <CheckCircle size={10} />}
                            {app.status === 'Rejected' && <XCircle size={10} />}
                            {app.status}
                          </span>
                        </div>
                        <div className="md:col-span-2 flex md:flex-col items-center md:items-start justify-between text-sm md:text-left">
                          <span className="text-gray-500 md:hidden text-xs">Reg No:</span>
                          <div className="text-right md:text-left">
                            <span className="text-sm text-gray-300 font-mono block">{app.regNo}</span>
                            <span className="hidden md:block text-[10px] text-gray-500 truncate pr-2" title={app.email}>{app.email}</span>
                          </div>
                        </div>
                        <div className="md:col-span-3 flex md:block items-center justify-between text-sm text-gray-300">
                          <span className="text-gray-500 md:hidden text-xs">Branch:</span>
                          <span className="text-right md:text-left">{app.branch} <span className="text-gray-600">· Yr {app.year}</span></span>
                        </div>
                        <div className="hidden md:flex md:col-span-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border flex w-fit items-center gap-1.5 ${getStatusColor(app.status)}`}>
                            {app.status === 'Pending' && <Clock size={12} />}
                            {app.status === 'Reviewing' && <BookOpen size={12} />}
                            {app.status === 'Interview' && <CalendarDays size={12} />}
                            {app.status === 'Accepted' && <CheckCircle size={12} />}
                            {app.status === 'Rejected' && <XCircle size={12} />}
                            {app.status}
                          </span>
                        </div>
                        <div className="hidden md:flex md:col-span-2 justify-end gap-2">
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

          {/* EMAILS TAB */}
          {activeTab === 'emails' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col gap-6">
              <div className="flex justify-between items-center mb-2 shrink-0">
                <div>
                  <h3 className="text-white font-bold text-xl mb-1 flex items-center gap-2">
                    <Mail className="text-purple-500" size={24} /> 
                    Communications Studio
                  </h3>
                  <p className="text-gray-400 text-sm">Design, synthesize with Gemini AI, and dispatch transmissions to the cohort.</p>
                </div>
              </div>

              {/* GEMINI AI ASSISTANT PANEL */}
              <div className="bg-gradient-to-r from-purple-950/40 via-black to-[#111] border border-purple-500/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden backdrop-blur-md">
                <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 relative z-10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        Gemini AI Transmission Synthesis
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          VEKTOR Design Engine
                        </span>
                      </h4>
                      <p className="text-xs text-gray-400">Instruct Gemini to compose or elevate any email adhering to VEKTOR's brand voice.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <select 
                      value={aiTone}
                      onChange={(e) => setAiTone(e.target.value)}
                      className="bg-black/60 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-purple-200 focus:outline-none focus:border-purple-500"
                    >
                      <option value="VEKTOR Elite & Authoritative">Tone: VEKTOR Elite & Authoritative</option>
                      <option value="Urgent & Direct">Tone: Urgent & Direct</option>
                      <option value="Formal & Precise">Tone: Formal & Precise</option>
                      <option value="Encouraging & Inspiring">Tone: Encouraging & Inspiring</option>
                    </select>
                    
                    {emailBody.trim() && (
                      <button
                        type="button"
                        disabled={isGeneratingWithAi}
                        onClick={() => handleGenerateAiEmail('polish')}
                        className="bg-white/10 hover:bg-white/15 text-purple-200 border border-purple-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
                        title="Polish and upgrade your current draft into VEKTOR style"
                      >
                        <Wand2 size={13} />
                        Polish Draft
                      </button>
                    )}
                  </div>
                </div>

                {/* Prompt Input & Generate Button */}
                <div className="flex flex-col sm:flex-row gap-2 relative z-10">
                  <div className="relative flex-1">
                    <input 
                      type="text"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleGenerateAiEmail('new');
                        }
                      }}
                      placeholder="e.g., Shortlist candidates for technical round 2 and instruct them to bring their laptops..."
                      className="w-full bg-black/70 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isGeneratingWithAi || !aiPrompt.trim()}
                    onClick={() => handleGenerateAiEmail('new')}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(147,51,234,0.3)] shrink-0"
                  >
                    {isGeneratingWithAi ? (
                      <><RefreshCw size={14} className="animate-spin" /> Synthesizing...</>
                    ) : (
                      <><Sparkles size={14} /> Generate with Gemini</>
                    )}
                  </button>
                </div>

                {/* Quick Preset Chips */}
                <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 relative z-10 scrollbar-none text-[11px]">
                  <span className="text-gray-500 font-mono text-[10px] uppercase tracking-wider shrink-0 mr-1">Presets:</span>
                  {AI_PROMPT_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      disabled={isGeneratingWithAi}
                      onClick={() => {
                        setAiPrompt(preset.prompt);
                        setAiTone(preset.tone);
                        handleGenerateAiEmail('new', preset.prompt);
                      }}
                      className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/40 text-gray-300 hover:text-white transition-all whitespace-nowrap shrink-0 flex items-center gap-1"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {aiExplanation && (
                  <div className="mt-2.5 text-[11px] text-purple-300/80 italic flex items-center gap-1.5">
                    <Check size={12} className="text-purple-400" />
                    <span>{aiExplanation}</span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form Side */}
                <div className="bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col">
                  <form onSubmit={handleSendBulkEmail} className="flex flex-col gap-6 flex-1">
                    
                    {/* Audience Selection */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Target Audience</label>
                      <select 
                        value={emailAudience}
                        onChange={(e) => setEmailAudience(e.target.value as any)}
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-purple-500/50"
                      >
                        <option value="All">All Applicants ({applicants.length})</option>
                        <option value="Priority">Priority Queue ({applicants.filter(a => a.isPriority).length})</option>
                        <option value="Pending">Pending ({applicants.filter(a => a.status === 'Pending').length})</option>
                        <option value="Reviewing">Reviewing ({applicants.filter(a => a.status === 'Reviewing').length})</option>
                        <option value="Interview">Interview Phase ({applicants.filter(a => a.status === 'Interview').length})</option>
                        <option value="Accepted">Accepted ({applicants.filter(a => a.status === 'Accepted').length})</option>
                        <option value="Rejected">Rejected ({applicants.filter(a => a.status === 'Rejected').length})</option>
                        <option value="Selected">Currently Selected Applicant {selectedApplicant ? `(${selectedApplicant.name})` : '(None)'}</option>
                        <option value="Specific">Specific Individuals</option>
                      </select>

                      {emailAudience === 'Specific' && (
                        <div className="mt-4 p-4 bg-black/50 border border-white/10 rounded-xl">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Add Recipients</label>
                          <select 
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 mb-3"
                            onChange={(e) => {
                              if (!e.target.value) return;
                              const applicant = applicants.find(a => a.id === e.target.value);
                              if (applicant && !specificRecipients.find(r => r.id === applicant.id)) {
                                setSpecificRecipients([...specificRecipients, applicant]);
                              }
                              e.target.value = "";
                            }}
                          >
                            <option value="">Select an applicant to add...</option>
                            {applicants.filter(a => a.email).map(a => (
                              <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
                            ))}
                          </select>
                          
                          <div className="flex flex-wrap gap-2">
                            {specificRecipients.length === 0 && <span className="text-sm text-gray-500 italic">No recipients added yet.</span>}
                            {specificRecipients.map(recipient => (
                              <div key={recipient.id} className="flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 text-purple-200 px-3 py-1.5 rounded-full text-sm">
                                {recipient.name}
                                <button 
                                  type="button" 
                                  onClick={() => setSpecificRecipients(specificRecipients.filter(r => r.id !== recipient.id))}
                                  className="text-purple-400 hover:text-white transition-colors"
                                >
                                  &times;
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* CC Admins Picker */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        CC Admins <span className="text-gray-600 normal-case">(optional — select admins to receive a copy)</span>
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowCcDropdown(!showCcDropdown)}
                          className="w-full flex items-center justify-between bg-[#1a1a1a] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none hover:border-purple-500/50 transition-colors"
                        >
                          <span className="flex items-center gap-2 text-gray-400">
                            <Users2 size={14} />
                            {commsCcAdmins.length === 0
                              ? 'No admins in CC'
                              : `${commsCcAdmins.length} admin(s) in CC`}
                          </span>
                          <ChevronDown size={14} className={`transition-transform ${showCcDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {showCcDropdown && (
                            <motion.div
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden z-30 shadow-2xl"
                            >
                              {admins.length === 0 && (
                                <p className="text-gray-500 text-xs p-3 text-center">No admins in system</p>
                              )}
                              {admins.map(admin => (
                                <button
                                  key={admin.id}
                                  type="button"
                                  onClick={() => {
                                    setCommsCcAdmins(prev =>
                                      prev.includes(admin.email)
                                        ? prev.filter(e => e !== admin.email)
                                        : [...prev, admin.email]
                                    );
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                                >
                                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${commsCcAdmins.includes(admin.email) ? 'bg-purple-500 border-purple-500' : 'border-white/20'}`}>
                                    {commsCcAdmins.includes(admin.email) && <Check size={12} className="text-white" />}
                                  </div>
                                  <div>
                                    <p className="text-sm text-white font-medium">{admin.email}</p>
                                    <p className="text-xs text-gray-500">{admin.role}</p>
                                  </div>
                                </button>
                              ))}
                              {commsCcAdmins.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setCommsCcAdmins([])}
                                  className="w-full px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors text-center border-t border-white/5"
                                >
                                  Clear all CC
                                </button>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      {commsCcAdmins.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {commsCcAdmins.map(email => (
                            <span key={email} className="flex items-center gap-1 bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs px-2 py-1 rounded-full">
                              {email}
                              <button type="button" onClick={() => setCommsCcAdmins(prev => prev.filter(e => e !== email))} className="hover:text-white ml-1">×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Subject Line */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Subject Line</label>
                      <input 
                        type="text" 
                        required
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder="e.g., URGENT: Phase 2 Evaluation Required"
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                    
                    {/* Message Body */}
                    <div className="flex-1 flex flex-col min-h-[300px]">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-3 gap-2">
                        <div className="w-full sm:w-auto">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Prebuilt Template</label>
                          <select 
                            value={emailTemplate}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEmailTemplate(val);
                              if (val !== 'custom') {
                                setEmailBody(EMAIL_TEMPLATES[val].content);
                              }
                            }}
                            className="w-full sm:w-auto bg-[#1a1a1a] border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-purple-500/50 font-medium"
                            style={{ 
                              color: emailTemplate === 'custom' ? '#9ca3af' : 
                                     emailTemplate === 'general' ? '#3b82f6' : 
                                     emailTemplate === 'warning' ? '#f59e0b' : 
                                     emailTemplate === 'reminder' ? '#a855f7' : 
                                     emailTemplate === 'success' ? '#22c55e' : 
                                     emailTemplate === 'rejected' ? '#ef4444' : '#fff'
                            }}
                          >
                            {Object.entries(EMAIL_TEMPLATES).map(([key, temp]) => {
                              const hexColor = key === 'custom' ? '#9ca3af' : 
                                               key === 'general' ? '#3b82f6' : 
                                               key === 'warning' ? '#f59e0b' : 
                                               key === 'reminder' ? '#a855f7' : 
                                               key === 'success' ? '#22c55e' : 
                                               key === 'rejected' ? '#ef4444' : '#fff';
                              return (
                                <option key={key} value={key} style={{ color: hexColor }}>{temp.label}</option>
                              );
                            })}
                          </select>
                        </div>
                        <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-1 rounded hidden sm:block shrink-0">Use {'{{name}}'} for dynamic names</span>
                      </div>
                      
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Transmission Content</label>
                      <textarea 
                        required
                        value={emailBody}
                        onChange={(e) => {
                          setEmailBody(e.target.value);
                        }}
                        placeholder="Type your message here..."
                        className="w-full flex-1 bg-[#1a1a1a] border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-purple-500/50 font-mono resize-none min-h-[200px]"
                      />
                    </div>

                    {/* File Attachments Zone */}
                    <div className="bg-[#161616] border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Paperclip size={15} className="text-purple-400" />
                          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">File Attachments</span>
                          <span className="text-[10px] text-gray-500">
                            ({emailAttachments.length} attached &bull; max 15MB)
                          </span>
                        </div>

                        <label className="cursor-pointer bg-white/10 hover:bg-white/15 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-white/10 transition-colors flex items-center gap-1.5">
                          <Upload size={12} />
                          <span>Attach Files</span>
                          <input
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                handleAddAttachments(e.target.files);
                                e.target.value = '';
                              }
                            }}
                          />
                        </label>
                      </div>

                      {/* Drag & Drop or Empty State */}
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsAttachmentDragging(true); }}
                        onDragLeave={() => setIsAttachmentDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsAttachmentDragging(false);
                          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            handleAddAttachments(e.dataTransfer.files);
                          }
                        }}
                        className={`border border-dashed rounded-lg p-3 transition-colors ${
                          isAttachmentDragging 
                            ? 'border-purple-500 bg-purple-500/10' 
                            : 'border-white/10 bg-black/30'
                        }`}
                      >
                        {emailAttachments.length === 0 ? (
                          <p className="text-xs text-gray-500 text-center py-2">
                            Drag &amp; drop files here, or click <span className="text-purple-400 font-semibold">Attach Files</span> above (PDF, DOCX, ZIP, images, etc.)
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {emailAttachments.map((att) => (
                              <div
                                key={att.id}
                                className="flex items-center gap-2 bg-[#222] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white group"
                              >
                                <File size={13} className="text-purple-400 shrink-0" />
                                <span className="truncate max-w-[160px] font-medium" title={att.name}>{att.name}</span>
                                <span className="text-[10px] text-gray-400 font-mono">
                                  ({(att.size / 1024).toFixed(0)} KB)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAttachment(att.id)}
                                  className="text-gray-500 hover:text-red-400 p-0.5 rounded transition-colors"
                                  title="Remove attachment"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-white/10 flex justify-end">
                      <button 
                        type="submit"
                        disabled={isSendingBulkEmail}
                        className="w-full sm:w-auto bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/50 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        {isSendingBulkEmail ? (
                          <><RefreshCw size={18} className="animate-spin" /> Transmitting...</>
                        ) : (
                          <><Send size={18} /> Dispatch Transmission</>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Live Preview Side */}
                <div className="flex flex-col bg-black border border-white/10 rounded-2xl overflow-hidden relative h-[500px] lg:h-full mt-6 lg:mt-0">
                  <div className="bg-[#111] border-b border-white/10 p-4 flex items-center gap-2 shrink-0">
                    <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                    <span className="ml-2 text-xs font-bold text-gray-500 uppercase tracking-widest">Live HTML Preview</span>
                  </div>
                  
                  <div className="flex-1 p-8 overflow-y-auto" style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
                    <div style={{ maxWidth: '600px', margin: '0 auto', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', overflow: 'hidden' }}>
                      <div style={{ padding: '32px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '4px', color: '#ffffff' }}>VEKTOR</div>
                        <div style={{ fontSize: '10px', color: '#888888', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600, marginTop: '4px' }}>Direct Communication</div>
                      </div>
                      
                      <div style={{ padding: '32px', color: '#d4d4d4', fontSize: '15px' }}>
                        {emailTemplate === 'warning' ? (
                          <>
                            <h2 style={{ fontSize: '20px', marginBottom: '20px', color: '#ffffff', fontWeight: 500 }}>Action Required, [Applicant Name].</h2>
                            <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderLeft: '4px solid #f59e0b', padding: '20px', borderRadius: '8px', margin: '24px 0' }}>
                              <div style={{ fontSize: '14px', color: '#ffffff', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: emailBody.replace(/\n/g, '<br>') }} />
                            </div>
                          </>
                        ) : emailTemplate === 'reminder' ? (
                          <>
                            <h2 style={{ fontSize: '20px', marginBottom: '20px', color: '#ffffff', fontWeight: 500 }}>Reminder for [Applicant Name].</h2>
                            <div style={{ fontSize: '14px', color: '#d4d4d4', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: emailBody.replace(/\n/g, '<br>') }} />
                          </>
                        ) : emailTemplate === 'general' ? (
                          <>
                            <h2 style={{ fontSize: '20px', marginBottom: '20px', color: '#ffffff', fontWeight: 500 }}>Update for [Applicant Name].</h2>
                            <div style={{ fontSize: '14px', color: '#d4d4d4', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: emailBody.replace(/\n/g, '<br>') }} />
                          </>
                        ) : emailTemplate === 'success' ? (
                          <>
                            <h2 style={{ fontSize: '20px', marginBottom: '20px', color: '#ffffff', fontWeight: 500 }}>Offer for [Applicant Name].</h2>
                            <div style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)', borderLeft: '4px solid #22c55e', padding: '20px', borderRadius: '8px', margin: '24px 0' }}>
                              <div style={{ fontSize: '14px', color: '#ffffff', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: emailBody.replace(/\n/g, '<br>') }} />
                            </div>
                          </>
                        ) : emailTemplate === 'rejected' ? (
                          <>
                            <h2 style={{ fontSize: '20px', marginBottom: '20px', color: '#ffffff', fontWeight: 500 }}>Status Update, [Applicant Name].</h2>
                            <div style={{ fontSize: '14px', color: '#d4d4d4', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: emailBody.replace(/\n/g, '<br>') }} />
                            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '20px', borderRadius: '8px', margin: '24px 0' }}>
                              <p style={{ margin: 0, color: '#a3a3a3', lineHeight: 1.6, fontSize: '14px' }}>We recommend continuous iteration of your skills. Keep building.</p>
                            </div>
                          </>
                        ) : (
                          <div dangerouslySetInnerHTML={{ __html: emailBody.replace(/{{name}}/gi, '[Applicant Name]').replace(/\n/g, '<br>') }} />
                        )}

                        {/* Attached Files Preview */}
                        {emailAttachments.length > 0 && (
                          <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px' }}>
                            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: '#888888', fontWeight: 700, marginBottom: '8px' }}>
                              Attached Transmissions ({emailAttachments.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {emailAttachments.map((att) => (
                                <div key={att.id} style={{ fontSize: '12px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>📎</span>
                                  <span style={{ fontWeight: 500 }}>{att.name}</span>
                                  <span style={{ fontSize: '10px', color: '#888888' }}>({(att.size / 1024).toFixed(0)} KB)</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div style={{ padding: '24px 32px', backgroundColor: '#050505', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ fontSize: '10px', color: '#333333', lineHeight: 1.5 }}>
                          This transmission is secured and uniquely generated.
                        </div>
                      </div>
                    </div>
                  </div>
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
                <div className="hidden md:grid grid-cols-5 gap-4 p-4 border-b border-white/10 bg-white/5 text-xs font-bold uppercase tracking-wider text-gray-400">
                  <div className="col-span-2">User / Email</div>
                  <div>Role</div>
                  <div>Added On</div>
                  <div className="text-right">Actions</div>
                </div>
                
                {admins.map(admin => (
                  <div key={admin.id} className="flex flex-col md:grid md:grid-cols-5 gap-3 md:gap-4 p-4 border-b border-white/5 md:items-center group hover:bg-white/5 transition-colors">
                    <div className="md:col-span-2 flex items-center justify-between md:justify-start gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-gray-400">
                          <Lock size={16} />
                        </div>
                        <span className="font-bold text-white text-sm">{admin.email}</span>
                      </div>
                      <span className="md:hidden px-3 py-1 rounded-full text-[10px] font-bold border border-blue-500/30 bg-blue-500/10 text-blue-400">
                        {admin.role}
                      </span>
                    </div>
                    <div className="hidden md:block">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${admin.role.toLowerCase() === 'super admin' || admin.role === 'super_admin' ? 'border-purple-500/30 bg-purple-500/10 text-purple-400' : 'border-blue-500/30 bg-blue-500/10 text-blue-400'}`}>
                        {admin.role}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 font-mono flex items-center justify-between md:block">
                      <span className="text-xs md:hidden">Added:</span>
                      <span>{new Date(admin.addedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-end mt-2 md:mt-0">
                      <button 
                        onClick={() => handleToggleAdminRole(admin.id!, admin.role, admin.email)}
                        className="px-3 py-1.5 rounded-lg border border-white/10 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        Toggle Role
                      </button>
                      <button 
                        onClick={() => handleDeleteAdmin(admin.id!, admin.email)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ASSIGNMENTS TAB */}
          {activeTab === 'assignments' && isSuperAdmin && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-white font-bold text-xl flex items-center gap-2">
                    <ClipboardList className="text-orange-500" size={24} /> Assignments
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">Deploy directives to members. Track submissions. Fire auto-reminders.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 bg-white/5 border border-white/10 px-3 py-1 rounded-full">{members.length} active members</span>
                  <button
                    onClick={() => setShowCreateAssignment(true)}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-black font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)]"
                  >
                    <Plus size={16} /> New Assignment
                  </button>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total', value: assignments.length, color: 'white', icon: ClipboardList },
                  { label: 'Active', value: assignments.filter(a => a.isActive).length, color: 'orange', icon: Zap },
                  { label: 'Overdue', value: assignments.filter(a => a.isActive && new Date(a.dueDate) < new Date()).length, color: 'red', icon: AlertTriangle },
                  { label: 'Members', value: members.length, color: 'green', icon: Users2 },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div key={label} className="bg-[#111] border border-white/10 rounded-2xl p-4 flex flex-col gap-1">
                    <Icon size={16} className={`text-${color}-400`} />
                    <p className={`text-2xl font-bold text-${color}-400`}>{value}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
                  </div>
                ))}
              </div>

              {/* Assignment List + Detail */}
              <div className="flex flex-col lg:flex-row gap-4">
                {/* List */}
                <div className="w-full lg:w-80 shrink-0 flex flex-col gap-2">
                  {assignments.length === 0 && (
                    <div className="bg-[#111] border border-white/10 rounded-2xl p-8 text-center">
                      <ClipboardList size={32} className="text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">No assignments yet.</p>
                      <p className="text-gray-600 text-xs mt-1">Create one to get started.</p>
                    </div>
                  )}
                  {assignments.map(asgn => {
                    const isOverdue = asgn.isActive && new Date(asgn.dueDate) < new Date();
                    const isSelected = selectedAssignment?.id === asgn.id;
                    return (
                      <button
                        key={asgn.id}
                        onClick={() => handleSelectAssignment(asgn)}
                        className={`text-left w-full p-4 rounded-2xl border transition-all ${isSelected ? 'bg-orange-500/10 border-orange-500/40' : 'bg-[#111] border-white/10 hover:border-white/20'}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-bold text-white leading-tight">{asgn.title}</p>
                          <div className="flex gap-1 shrink-0">
                            {asgn.isPriority && <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full">PRIORITY</span>}
                            {isOverdue && <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full">OVERDUE</span>}
                            {!asgn.isActive && <span className="text-[10px] bg-gray-500/20 text-gray-400 border border-gray-500/30 px-1.5 py-0.5 rounded-full">CLOSED</span>}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">Due: {new Date(asgn.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-600">Reminders: {asgn.remindersSent || 0}</span>
                          {asgn.tags && asgn.tags.length > 0 && (
                            <span className="text-[10px] text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">{asgn.tags[0]}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Detail Panel */}
                <div className="flex-1">
                  {!selectedAssignment ? (
                    <div className="bg-[#111] border border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
                      <ClipboardCheck size={40} className="text-gray-600 mb-4" />
                      <p className="text-gray-400">Select an assignment to view details</p>
                    </div>
                  ) : (
                    <div className="bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col gap-5">
                      {/* Assignment Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="text-white font-bold text-lg">{selectedAssignment.title}</h4>
                          <p className="text-gray-400 text-sm mt-1 leading-relaxed">{selectedAssignment.description}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleOpenEditAssignment(selectedAssignment)}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 font-bold transition-colors"
                            title="Edit Assignment"
                          >
                            <Pencil size={13} /> Edit
                          </button>
                          <button onClick={() => handleToggleAssignmentActive(selectedAssignment)} className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition-colors ${selectedAssignment.isActive ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30' : 'bg-gray-500/10 text-gray-400 border-gray-500/30 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/30'}`}>
                            {selectedAssignment.isActive ? 'Active' : 'Closed'}
                          </button>
                          <button onClick={() => handleDeleteAssignment(selectedAssignment)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Meta info */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-black/40 border border-white/5 rounded-xl p-3">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Due Date</p>
                          <p className="text-sm text-white font-medium">{new Date(selectedAssignment.dueDate).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                        </div>
                        <div className="bg-black/40 border border-white/5 rounded-xl p-3">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Reminders Sent</p>
                          <p className="text-sm text-orange-400 font-bold">{selectedAssignment.remindersSent || 0}</p>
                        </div>
                        {selectedAssignment.submissionLink && (
                          <div className="col-span-2 bg-black/40 border border-white/5 rounded-xl p-3">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Submission Link</p>
                            <a href={selectedAssignment.submissionLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors">
                              <Link size={12} />{selectedAssignment.submissionLink}
                            </a>
                          </div>
                        )}
                        {selectedAssignment.attachmentUrls && selectedAssignment.attachmentUrls.length > 0 && (
                          <div className="col-span-2 bg-black/40 border border-white/5 rounded-xl p-3">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Attached Materials ({selectedAssignment.attachmentUrls.length})</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedAssignment.attachmentUrls.map((att, i) => (
                                <a
                                  key={i}
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-orange-500/40 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  <Paperclip size={12} className="text-gray-400" />
                                  <span className="font-medium truncate max-w-xs">{att.name}</span>
                                  <ExternalLink size={11} className="text-gray-500" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleSendReminders(selectedAssignment)}
                          disabled={isSendingReminders}
                          className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                        >
                          {isSendingReminders ? <RefreshCw size={14} className="animate-spin" /> : <BellRing size={14} />}
                          Send Reminders to Non-Submitters
                        </button>
                        <button
                          onClick={() => exportSubmissionsCSV(selectedAssignment, assignmentSubmissions)}
                          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                        >
                          <Download size={14} /> Export CSV
                        </button>
                      </div>

                      {/* Submissions Tracker */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-white font-bold text-sm flex items-center gap-2">
                            <ClipboardCheck size={16} className="text-green-400" /> Submission Tracker
                          </h5>
                          <span className="text-xs text-gray-500">{assignmentSubmissions.length}/{(() => { const pool = selectedAssignment.recipientType === 'specific' ? members.filter(m => selectedAssignment.specificRecipients.includes(m.email)) : members; return pool.length; })()} submitted</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-white/5 rounded-full mb-4 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
                            style={{
                              width: `${Math.round(assignmentSubmissions.length / Math.max(1, (selectedAssignment.recipientType === 'specific' ? members.filter(m => selectedAssignment.specificRecipients.includes(m.email)) : members).length) * 100)}%`
                            }}
                          />
                        </div>
                        {isLoadingSubmissions ? (
                          <div className="flex items-center justify-center py-8">
                            <RefreshCw size={20} className="text-gray-500 animate-spin" />
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto custom-scrollbar">
                            {(selectedAssignment.recipientType === 'specific'
                              ? members.filter(m => selectedAssignment.specificRecipients.includes(m.email))
                              : members
                            ).map(member => {
                              const sub = assignmentSubmissions.find(s => s.memberEmail.toLowerCase() === member.email.toLowerCase());
                              return (
                                <div key={member.id} className={`flex items-center justify-between p-3 rounded-xl border ${sub ? 'bg-green-500/5 border-green-500/20' : 'bg-black/20 border-white/5'}`}>
                                  <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${sub ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-500'}`}>
                                      {sub ? <Check size={12} /> : <Clock size={12} />}
                                    </div>
                                    <div>
                                      <p className="text-sm text-white font-medium">{member.name}</p>
                                      <p className="text-xs text-gray-500">{member.email}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {sub ? (
                                      <>
                                        <span className="text-xs text-green-400">{new Date(sub.submittedAt).toLocaleDateString()}</span>
                                        <button onClick={() => handleUnmarkSubmitted(sub)} className="text-xs text-red-400 hover:text-red-300 p-1 rounded transition-colors" title="Unmark">
                                          <XCircle size={14} />
                                        </button>
                                      </>
                                    ) : (
                                      <button onClick={() => handleMarkSubmitted(member, selectedAssignment)} className="text-xs bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded-lg transition-colors font-bold">
                                        Mark Done
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Create Assignment Modal */}
              <AnimatePresence>
                {showCreateAssignment && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl">
                      <div className="p-6 border-b border-white/10 flex items-center justify-between">
                        <h4 className="text-white font-bold text-lg flex items-center gap-2">
                          <ClipboardList size={20} className="text-orange-400" /> New Assignment
                        </h4>
                        <button onClick={() => setShowCreateAssignment(false)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                          <X size={18} />
                        </button>
                      </div>
                      <form onSubmit={handleCreateAssignment} className="p-6 flex flex-col gap-5">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Title *</label>
                          <input type="text" required value={assignmentForm.title} onChange={e => setAssignmentForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Build a REST API in 48 hours" className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description *</label>
                          <textarea rows={3} required value={assignmentForm.description} onChange={e => setAssignmentForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the task, requirements, and deliverables..." className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors resize-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Due Date & Time *</label>
                            <input type="datetime-local" required value={assignmentForm.dueDate} onChange={e => setAssignmentForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Submission Link</label>
                            <input type="url" value={assignmentForm.submissionLink} onChange={e => setAssignmentForm(f => ({ ...f, submissionLink: e.target.value }))} placeholder="https://forms.google.com/..." className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors" />
                          </div>
                        </div>
                        {/* Recipients */}
                        {/* Recipients */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Target Recipients</label>
                            {assignmentForm.recipientType === 'all_members' ? (
                              <span className="text-[11px] text-orange-400 font-mono">
                                {members.length > 0 ? `${members.length} accepted members` : `${applicants.filter(a => a.email).length} total applicants`}
                              </span>
                            ) : (
                              <span className="text-[11px] text-orange-400 font-mono">
                                {assignmentForm.specificRecipients.length} selected
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setAssignmentForm(f => ({ ...f, recipientType: 'all_members' }))}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${assignmentForm.recipientType === 'all_members' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' : 'bg-black/40 text-gray-400 border-white/10 hover:border-white/20'}`}
                            >
                              All Cohort Members ({members.length > 0 ? members.length : applicants.filter(a => a.email).length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setAssignmentForm(f => ({ ...f, recipientType: 'specific' }))}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${assignmentForm.recipientType === 'specific' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' : 'bg-black/40 text-gray-400 border-white/10 hover:border-white/20'}`}
                            >
                              Specific Members / Individuals
                            </button>
                          </div>
                          {assignmentForm.recipientType === 'specific' && (
                            <div className="mt-3 p-4 bg-black/50 rounded-2xl border border-white/10 flex flex-col gap-3">
                              {/* Dropdown to pick from existing applicants */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                    Select from Cohort
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const acceptedEmails = members.map(m => m.email);
                                        setAssignmentForm(f => ({
                                          ...f,
                                          specificRecipients: Array.from(new Set([...f.specificRecipients, ...acceptedEmails]))
                                        }));
                                      }}
                                      className="text-[10px] text-orange-400 hover:text-orange-300 transition-colors font-medium"
                                    >
                                      + Add All Accepted
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setAssignmentForm(f => ({ ...f, specificRecipients: [] }))}
                                      className="text-[10px] text-red-400 hover:text-red-300 transition-colors font-medium"
                                    >
                                      Clear
                                    </button>
                                  </div>
                                </div>
                                <select
                                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500/50"
                                  onChange={(e) => {
                                    const email = e.target.value;
                                    if (!email) return;
                                    if (!assignmentForm.specificRecipients.includes(email)) {
                                      setAssignmentForm(f => ({
                                        ...f,
                                        specificRecipients: [...f.specificRecipients, email]
                                      }));
                                    }
                                    e.target.value = '';
                                  }}
                                >
                                  <option value="">-- Choose an applicant/member to add --</option>
                                  {applicants.filter(a => a.email).map(a => (
                                    <option key={a.id} value={a.email}>
                                      {a.name} — {a.email} [{a.status}]
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Manual email entry */}
                              <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                                  Or Type Custom Email
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="email"
                                    value={assignmentSpecificInput}
                                    onChange={e => setAssignmentSpecificInput(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const trimmed = assignmentSpecificInput.trim();
                                        if (trimmed && trimmed.includes('@')) {
                                          if (!assignmentForm.specificRecipients.includes(trimmed)) {
                                            setAssignmentForm(f => ({ ...f, specificRecipients: [...f.specificRecipients, trimmed] }));
                                          }
                                          setAssignmentSpecificInput('');
                                        }
                                      }
                                    }}
                                    placeholder="e.g. student@thapar.edu"
                                    className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const trimmed = assignmentSpecificInput.trim();
                                      if (trimmed && trimmed.includes('@')) {
                                        if (!assignmentForm.specificRecipients.includes(trimmed)) {
                                          setAssignmentForm(f => ({ ...f, specificRecipients: [...f.specificRecipients, trimmed] }));
                                        }
                                        setAssignmentSpecificInput('');
                                      }
                                    }}
                                    className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/40 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors"
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>

                              {/* Selected Chips */}
                              <div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
                                  Selected Recipients ({assignmentForm.specificRecipients.length}):
                                </div>
                                {assignmentForm.specificRecipients.length === 0 ? (
                                  <p className="text-xs text-gray-500 italic py-1">No recipients selected yet. Pick from above or type an email.</p>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar p-1">
                                    {assignmentForm.specificRecipients.map(email => {
                                      const app = applicants.find(a => a.email?.toLowerCase() === email.toLowerCase());
                                      return (
                                        <span key={email} className="inline-flex items-center gap-1.5 bg-orange-500/15 border border-orange-500/30 text-orange-200 text-xs px-2.5 py-1 rounded-full">
                                          <span className="font-medium">{app ? app.name : email.split('@')[0]}</span>
                                          <span className="text-[10px] text-orange-400/70">&lt;{email}&gt;</span>
                                          <button
                                            type="button"
                                            onClick={() => setAssignmentForm(f => ({ ...f, specificRecipients: f.specificRecipients.filter(e => e !== email) }))}
                                            className="ml-1 text-orange-400 hover:text-white transition-colors text-sm"
                                          >
                                            ×
                                          </button>
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        {/* CC Admins */}
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">CC Admins on Emails</label>
                          <div className="relative">
                            <button type="button" onClick={() => setShowAssignmentCcDropdown(!showAssignmentCcDropdown)} className="w-full flex items-center justify-between bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-gray-400 hover:border-orange-500/40 transition-colors">
                              <span>{assignmentForm.ccAdmins.length === 0 ? 'No admins in CC' : `${assignmentForm.ccAdmins.length} admin(s) in CC`}</span>
                              <ChevronDown size={14} className={`transition-transform ${showAssignmentCcDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                              {showAssignmentCcDropdown && (
                                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl">
                                  {admins.map(admin => (
                                    <button key={admin.id} type="button" onClick={() => setAssignmentForm(f => ({ ...f, ccAdmins: f.ccAdmins.includes(admin.email) ? f.ccAdmins.filter(e => e !== admin.email) : [...f.ccAdmins, admin.email] }))} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
                                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${assignmentForm.ccAdmins.includes(admin.email) ? 'bg-orange-500 border-orange-500' : 'border-white/20'}`}>
                                        {assignmentForm.ccAdmins.includes(admin.email) && <Check size={12} className="text-white" />}
                                      </div>
                                      <p className="text-sm text-white">{admin.email} <span className="text-gray-500 text-xs">({admin.role})</span></p>
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                        {/* Tags */}
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tags</label>
                          <div className="flex gap-2">
                            <input value={assignmentTagInput} onChange={e => setAssignmentTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (assignmentTagInput.trim()) { setAssignmentForm(f => ({ ...f, tags: [...f.tags, assignmentTagInput.trim()] })); setAssignmentTagInput(''); } } }} placeholder="e.g. Task, Project, Challenge..." className="flex-1 bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-orange-500/50" />
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {assignmentForm.tags.map(tag => (
                              <span key={tag} className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs px-2 py-1 rounded-full">
                                {tag}<button type="button" onClick={() => setAssignmentForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))} className="ml-1 hover:text-white">×</button>
                              </span>
                            ))}
                          </div>
                        </div>
                        {/* File Attachments */}
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                            <span>Attach Materials / Resources (Optional)</span>
                            {isUploadingAssignmentFile && <span className="text-orange-400 text-xs flex items-center gap-1"><RefreshCw size={11} className="animate-spin" /> Uploading...</span>}
                          </label>
                          <label className="border border-dashed border-white/20 hover:border-orange-500/50 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-black/40">
                            <input
                              type="file"
                              multiple
                              className="hidden"
                              disabled={isUploadingAssignmentFile}
                              onChange={(e) => handleUploadAssignmentFiles(e.target.files, false)}
                            />
                            <FileUp size={22} className="text-gray-400 mb-1" />
                            <p className="text-xs text-gray-300 font-medium">Click to upload files (PDFs, Docs, Starter code, etc.)</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">Files are uploaded to Vercel CDN & linked in email</p>
                          </label>

                          {assignmentForm.attachmentUrls && assignmentForm.attachmentUrls.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {assignmentForm.attachmentUrls.map((att, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 text-xs text-gray-200 px-3 py-1.5 rounded-lg">
                                  <Paperclip size={12} className="text-orange-400" />
                                  <span className="truncate max-w-[200px]">{att.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => setAssignmentForm(f => ({ ...f, attachmentUrls: f.attachmentUrls.filter((_, i) => i !== idx) }))}
                                    className="text-gray-400 hover:text-red-400 ml-1"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Priority */}
                        <label className="flex items-center gap-3 cursor-pointer">
                          <div onClick={() => setAssignmentForm(f => ({ ...f, isPriority: !f.isPriority }))} className={`w-10 h-6 rounded-full border transition-colors relative ${assignmentForm.isPriority ? 'bg-red-500 border-red-500' : 'bg-white/10 border-white/20'}`}>
                            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${assignmentForm.isPriority ? 'left-4.5' : 'left-0.5'}`} />
                          </div>
                          <span className="text-sm text-gray-300">Mark as Priority</span>
                        </label>
                        <button type="submit" disabled={isSendingAssignmentEmail || isUploadingAssignmentFile} className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                          {isSendingAssignmentEmail ? <><RefreshCw size={16} className="animate-spin" /> Creating & Sending...</> : <><Send size={16} /> Create & Send Announcement</>}
                        </button>
                      </form>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Edit Assignment Modal */}
              <AnimatePresence>
                {showEditAssignment && editingAssignment && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl">
                      <div className="p-6 border-b border-white/10 flex items-center justify-between">
                        <h4 className="text-white font-bold text-lg flex items-center gap-2">
                          <Pencil size={20} className="text-orange-400" /> Edit Assignment
                        </h4>
                        <button onClick={() => setShowEditAssignment(false)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                          <X size={18} />
                        </button>
                      </div>
                      <form onSubmit={handleSaveAssignmentEdit} className="p-6 flex flex-col gap-5">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Title *</label>
                          <input type="text" required value={editAssignmentForm.title} onChange={e => setEditAssignmentForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description *</label>
                          <textarea rows={3} required value={editAssignmentForm.description} onChange={e => setEditAssignmentForm(f => ({ ...f, description: e.target.value }))} className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors resize-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Due Date & Time *</label>
                            <input type="datetime-local" required value={editAssignmentForm.dueDate} onChange={e => setEditAssignmentForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Submission Link</label>
                            <input type="url" value={editAssignmentForm.submissionLink} onChange={e => setEditAssignmentForm(f => ({ ...f, submissionLink: e.target.value }))} placeholder="https://forms.google.com/..." className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors" />
                          </div>
                        </div>

                        {/* Recipients */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Target Recipients</label>
                            <span className="text-[11px] text-orange-400 font-mono">
                              {editAssignmentForm.recipientType === 'all_members' ? 'All Cohort' : `${editAssignmentForm.specificRecipients.length} selected`}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setEditAssignmentForm(f => ({ ...f, recipientType: 'all_members' }))}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${editAssignmentForm.recipientType === 'all_members' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' : 'bg-black/40 text-gray-400 border-white/10'}`}
                            >
                              All Cohort Members ({members.length > 0 ? members.length : applicants.filter(a => a.email).length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditAssignmentForm(f => ({ ...f, recipientType: 'specific' }))}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${editAssignmentForm.recipientType === 'specific' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' : 'bg-black/40 text-gray-400 border-white/10'}`}
                            >
                              Specific Members
                            </button>
                          </div>
                          {editAssignmentForm.recipientType === 'specific' && (
                            <div className="mt-3 p-4 bg-black/50 rounded-2xl border border-white/10 flex flex-col gap-3">
                              <select
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500/50"
                                onChange={(e) => {
                                  const email = e.target.value;
                                  if (!email) return;
                                  if (!editAssignmentForm.specificRecipients.includes(email)) {
                                    setEditAssignmentForm(f => ({ ...f, specificRecipients: [...f.specificRecipients, email] }));
                                  }
                                  e.target.value = '';
                                }}
                              >
                                <option value="">-- Add applicant to recipients --</option>
                                {applicants.filter(a => a.email).map(a => (
                                  <option key={a.id} value={a.email}>{a.name} — {a.email} [{a.status}]</option>
                                ))}
                              </select>
                              <div className="flex gap-2">
                                <input
                                  type="email"
                                  value={editAssignmentSpecificInput}
                                  onChange={e => setEditAssignmentSpecificInput(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const trimmed = editAssignmentSpecificInput.trim();
                                      if (trimmed && trimmed.includes('@')) {
                                        if (!editAssignmentForm.specificRecipients.includes(trimmed)) {
                                          setEditAssignmentForm(f => ({ ...f, specificRecipients: [...f.specificRecipients, trimmed] }));
                                        }
                                        setEditAssignmentSpecificInput('');
                                      }
                                    }
                                  }}
                                  placeholder="or type custom email..."
                                  className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const trimmed = editAssignmentSpecificInput.trim();
                                    if (trimmed && trimmed.includes('@')) {
                                      if (!editAssignmentForm.specificRecipients.includes(trimmed)) {
                                        setEditAssignmentForm(f => ({ ...f, specificRecipients: [...f.specificRecipients, trimmed] }));
                                      }
                                      setEditAssignmentSpecificInput('');
                                    }
                                  }}
                                  className="bg-orange-500/20 text-orange-400 border border-orange-500/40 px-3.5 py-2 rounded-xl text-xs font-bold"
                                >
                                  Add
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                                {editAssignmentForm.specificRecipients.map(email => (
                                  <span key={email} className="inline-flex items-center gap-1.5 bg-orange-500/15 border border-orange-500/30 text-orange-200 text-xs px-2.5 py-1 rounded-full">
                                    {email}
                                    <button type="button" onClick={() => setEditAssignmentForm(f => ({ ...f, specificRecipients: f.specificRecipients.filter(e => e !== email) }))} className="ml-1 hover:text-white">×</button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* File Attachments */}
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                            <span>Attached Materials</span>
                            {isUploadingAssignmentFile && <span className="text-orange-400 text-xs flex items-center gap-1"><RefreshCw size={11} className="animate-spin" /> Uploading...</span>}
                          </label>
                          <label className="border border-dashed border-white/20 hover:border-orange-500/50 rounded-xl p-3.5 flex flex-col items-center justify-center cursor-pointer transition-colors bg-black/40">
                            <input
                              type="file"
                              multiple
                              className="hidden"
                              disabled={isUploadingAssignmentFile}
                              onChange={(e) => handleUploadAssignmentFiles(e.target.files, true)}
                            />
                            <FileUp size={22} className="text-gray-400 mb-1" />
                            <p className="text-xs text-gray-300 font-medium">Click to attach files</p>
                          </label>
                          {editAssignmentForm.attachmentUrls && editAssignmentForm.attachmentUrls.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {editAssignmentForm.attachmentUrls.map((att, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 text-xs text-gray-200 px-3 py-1.5 rounded-lg">
                                  <Paperclip size={12} className="text-orange-400" />
                                  <span className="truncate max-w-[200px]">{att.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => setEditAssignmentForm(f => ({ ...f, attachmentUrls: f.attachmentUrls.filter((_, i) => i !== idx) }))}
                                    className="text-gray-400 hover:text-red-400 ml-1"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Priority & Notification Toggles */}
                        <div className="flex flex-col gap-3">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <div onClick={() => setEditAssignmentForm(f => ({ ...f, isPriority: !f.isPriority }))} className={`w-10 h-6 rounded-full border transition-colors relative ${editAssignmentForm.isPriority ? 'bg-red-500 border-red-500' : 'bg-white/10 border-white/20'}`}>
                              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${editAssignmentForm.isPriority ? 'left-4.5' : 'left-0.5'}`} />
                            </div>
                            <span className="text-sm text-gray-300">Priority Assignment</span>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer">
                            <div onClick={() => setEditAssignmentNotify(!editAssignmentNotify)} className={`w-10 h-6 rounded-full border transition-colors relative ${editAssignmentNotify ? 'bg-blue-500 border-blue-500' : 'bg-white/10 border-white/20'}`}>
                              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${editAssignmentNotify ? 'left-4.5' : 'left-0.5'}`} />
                            </div>
                            <span className="text-sm text-gray-300">Send Directive Update email to participants</span>
                          </label>
                        </div>

                        <button type="submit" disabled={isSavingAssignmentEdit || isUploadingAssignmentFile} className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                          {isSavingAssignmentEdit ? <><RefreshCw size={16} className="animate-spin" /> Saving Changes...</> : <><Check size={16} /> Save Changes</>}
                        </button>
                      </form>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* SCHEDULE TAB */}
          {activeTab === 'schedule' && isSuperAdmin && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-white font-bold text-xl flex items-center gap-2">
                    <CalendarDays className="text-blue-400" size={24} /> Class Schedule
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">Schedule sessions, send invites to members, track attendance.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
                    <button onClick={() => setScheduleView('upcoming')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${scheduleView === 'upcoming' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white'}`}>Upcoming</button>
                    <button onClick={() => setScheduleView('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${scheduleView === 'all' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white'}`}>All</button>
                  </div>
                  <button onClick={() => setShowCreateSession(true)} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                    <Plus size={16} /> Schedule Class
                  </button>
                </div>
              </div>

              {/* Next Class Banner */}
              {nextSession && (
                <div className="bg-gradient-to-r from-blue-950/60 via-[#111] to-[#111] border border-blue-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                      {nextSession.type === 'online' ? <Video size={22} /> : <MapPin size={22} />}
                    </div>
                    <div>
                      <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1">Next Session</p>
                      <p className="text-white font-bold text-base">{nextSession.title}</p>
                      <p className="text-gray-400 text-sm">{new Date(`${nextSession.date}T${nextSession.time}`).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-400 tabular-nums">{getCountdown(nextSession)}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">remaining</p>
                  </div>
                </div>
              )}

              {/* Sessions Grid */}
              {(scheduleView === 'upcoming' ? upcomingSessions : classSessions).length === 0 ? (
                <div className="bg-[#111] border border-white/10 rounded-2xl p-12 text-center">
                  <CalendarDays size={40} className="text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">{scheduleView === 'upcoming' ? 'No upcoming sessions.' : 'No sessions scheduled.'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {(scheduleView === 'upcoming' ? upcomingSessions : classSessions).map(session => (
                    <div
                      key={session.id}
                      className={`bg-[#111] border rounded-2xl p-5 flex flex-col gap-3 cursor-pointer transition-all hover:border-white/20 ${session.isCancelled ? 'border-red-500/20 opacity-60' : session.type === 'online' ? 'border-blue-500/20' : 'border-green-500/20'}`}
                      onClick={() => setSelectedSession(session)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${session.type === 'online' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                          {session.type === 'online' ? <Video size={18} /> : <MapPin size={18} />}
                        </div>
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          {session.isCancelled && <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full">CANCELLED</span>}
                          {session.isRecurring && <span className="text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded-full">RECURRING</span>}
                          {session.tags.slice(0, 2).map(t => <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded-full border ${session.type === 'online' ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' : 'bg-green-500/10 text-green-300 border-green-500/20'}`}>{t}</span>)}
                        </div>
                      </div>
                      <div>
                        <p className="text-white font-bold leading-tight">{session.title}</p>
                        {session.description && <p className="text-gray-500 text-xs mt-1 line-clamp-2">{session.description}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Calendar size={12} />
                          {new Date(`${session.date}T${session.time}`).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Clock size={12} /> {session.duration} min
                        </div>
                        {session.type === 'online' && session.meetLink && (
                          <div className="flex items-center gap-2 text-xs text-blue-400">
                            <Link size={12} />
                            <span className="truncate">{session.meetLink}</span>
                            <button type="button" onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(session.meetLink || ''); showToast('Copied', 'Meet link copied to clipboard.'); }} className="text-gray-500 hover:text-white ml-auto shrink-0 p-1 hover:bg-white/10 rounded">
                              <Copy size={12} />
                            </button>
                          </div>
                        )}
                        {session.type === 'offline' && session.location && (
                          <div className="flex items-center gap-2 text-xs text-green-400">
                            <MapPin size={12} />{session.location}
                          </div>
                        )}
                      </div>
                      {session.isCancelled && session.cancelReason && (
                        <div className="text-[11px] text-red-400/90 bg-red-500/10 border border-red-500/20 rounded-lg p-2 mt-2">
                          <span className="font-bold uppercase tracking-wider text-[9px] text-red-400 block mb-0.5">Cancellation Reason</span>
                          {session.cancelReason}
                        </div>
                      )}
                      {/* Action buttons */}
                      <div className="flex gap-2 mt-1 pt-3 border-t border-white/5">
                        {!session.isCancelled ? (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); handleOpenEditSession(session); }}
                              className="flex-1 py-1.5 text-xs text-blue-400 hover:bg-blue-500/10 border border-blue-500/20 rounded-lg transition-colors font-bold flex items-center justify-center gap-1"
                            >
                              <Pencil size={11} /> Edit
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); handleOpenCancelModal(session); }}
                              className="flex-1 py-1.5 text-xs text-red-400 hover:bg-red-500/10 border border-red-500/20 rounded-lg transition-colors font-bold"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <div className="flex-1 text-[11px] text-gray-500 flex items-center">
                            Session Cancelled
                          </div>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteSession(session); }}
                          className="py-1.5 px-3 text-xs text-gray-400 hover:text-red-400 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                          title="Delete Session"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Create Session Modal */}
              <AnimatePresence>
                {showCreateSession && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl">
                      <div className="p-6 border-b border-white/10 flex items-center justify-between">
                        <h4 className="text-white font-bold text-lg flex items-center gap-2">
                          <CalendarDays size={20} className="text-blue-400" /> Schedule New Class
                        </h4>
                        <button onClick={() => setShowCreateSession(false)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                          <X size={18} />
                        </button>
                      </div>
                      <form onSubmit={handleCreateSession} className="p-6 flex flex-col gap-5">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Session Title *</label>
                          <input type="text" required value={sessionForm.title} onChange={e => setSessionForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., React Advanced Patterns Workshop" className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description</label>
                          <textarea rows={2} value={sessionForm.description} onChange={e => setSessionForm(f => ({ ...f, description: e.target.value }))} placeholder="What will be covered in this session?" className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors resize-none" />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Date *</label>
                            <input type="date" required value={sessionForm.date} onChange={e => setSessionForm(f => ({ ...f, date: e.target.value }))} className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500/50" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Time *</label>
                            <input type="time" required value={sessionForm.time} onChange={e => setSessionForm(f => ({ ...f, time: e.target.value }))} className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500/50" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Duration (min)</label>
                            <input type="number" min={15} max={480} value={sessionForm.duration} onChange={e => setSessionForm(f => ({ ...f, duration: parseInt(e.target.value) || 60 }))} className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500/50" />
                          </div>
                        </div>
                        {/* Type */}
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Session Type</label>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setSessionForm(f => ({ ...f, type: 'online' }))} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition-colors ${sessionForm.type === 'online' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'bg-black/40 text-gray-400 border-white/10'}`}>
                              <Video size={14} /> Online
                            </button>
                            <button type="button" onClick={() => setSessionForm(f => ({ ...f, type: 'offline' }))} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition-colors ${sessionForm.type === 'offline' ? 'bg-green-500/20 text-green-400 border-green-500/40' : 'bg-black/40 text-gray-400 border-white/10'}`}>
                              <MapPin size={14} /> Offline
                            </button>
                          </div>
                          <div className="mt-3">
                            {sessionForm.type === 'online' ? (
                              <input type="url" value={sessionForm.meetLink} onChange={e => setSessionForm(f => ({ ...f, meetLink: e.target.value }))} placeholder="https://meet.google.com/..." className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500/50 text-sm" />
                            ) : (
                              <input type="text" value={sessionForm.location} onChange={e => setSessionForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g., TAN Auditorium, Room 201" className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-green-500/50 text-sm" />
                            )}
                          </div>
                        </div>
                        {/* Recipients */}
                        {/* Recipients */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Invite Recipients</label>
                            {sessionForm.recipientType === 'all_members' ? (
                              <span className="text-[11px] text-blue-400 font-mono">
                                {members.length > 0 ? `${members.length} accepted members` : `${applicants.filter(a => a.email).length} total applicants`}
                              </span>
                            ) : (
                              <span className="text-[11px] text-blue-400 font-mono">
                                {sessionForm.specificRecipients.length} selected
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setSessionForm(f => ({ ...f, recipientType: 'all_members' }))}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${sessionForm.recipientType === 'all_members' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'bg-black/40 text-gray-400 border-white/10'}`}
                            >
                              All Cohort Members ({members.length > 0 ? members.length : applicants.filter(a => a.email).length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setSessionForm(f => ({ ...f, recipientType: 'specific' }))}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${sessionForm.recipientType === 'specific' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'bg-black/40 text-gray-400 border-white/10'}`}
                            >
                              Specific Members / Individuals
                            </button>
                          </div>

                          {sessionForm.recipientType === 'specific' && (
                            <div className="mt-3 p-4 bg-black/50 rounded-2xl border border-white/10 flex flex-col gap-3">
                              {/* Quick selector from applicant database */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                    Select from Cohort
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const acceptedEmails = members.map(m => m.email);
                                        setSessionForm(f => ({
                                          ...f,
                                          specificRecipients: Array.from(new Set([...f.specificRecipients, ...acceptedEmails]))
                                        }));
                                      }}
                                      className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors font-medium"
                                    >
                                      + Add All Accepted
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSessionForm(f => ({ ...f, specificRecipients: [] }))}
                                      className="text-[10px] text-red-400 hover:text-red-300 transition-colors font-medium"
                                    >
                                      Clear
                                    </button>
                                  </div>
                                </div>
                                <select
                                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
                                  onChange={(e) => {
                                    const email = e.target.value;
                                    if (!email) return;
                                    if (!sessionForm.specificRecipients.includes(email)) {
                                      setSessionForm(f => ({
                                        ...f,
                                        specificRecipients: [...f.specificRecipients, email]
                                      }));
                                    }
                                    e.target.value = '';
                                  }}
                                >
                                  <option value="">-- Choose an applicant/member to invite --</option>
                                  {applicants.filter(a => a.email).map(a => (
                                    <option key={a.id} value={a.email}>
                                      {a.name} — {a.email} [{a.status}]
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Manual email entry */}
                              <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                                  Or Type Custom Email
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="email"
                                    value={sessionSpecificInput}
                                    onChange={e => setSessionSpecificInput(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const trimmed = sessionSpecificInput.trim();
                                        if (trimmed && trimmed.includes('@')) {
                                          if (!sessionForm.specificRecipients.includes(trimmed)) {
                                            setSessionForm(f => ({ ...f, specificRecipients: [...f.specificRecipients, trimmed] }));
                                          }
                                          setSessionSpecificInput('');
                                        }
                                      }
                                    }}
                                    placeholder="e.g., student@thapar.edu or guest@gmail.com"
                                    className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/50"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const trimmed = sessionSpecificInput.trim();
                                      if (trimmed && trimmed.includes('@')) {
                                        if (!sessionForm.specificRecipients.includes(trimmed)) {
                                          setSessionForm(f => ({ ...f, specificRecipients: [...f.specificRecipients, trimmed] }));
                                        }
                                        setSessionSpecificInput('');
                                      }
                                    }}
                                    className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/40 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors"
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>

                              {/* Selected Chips */}
                              <div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
                                  Selected Invitees ({sessionForm.specificRecipients.length}):
                                </div>
                                {sessionForm.specificRecipients.length === 0 ? (
                                  <p className="text-xs text-gray-500 italic py-1">No invitees selected yet. Pick from above or type an email.</p>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar p-1">
                                    {sessionForm.specificRecipients.map(email => {
                                      const app = applicants.find(a => a.email?.toLowerCase() === email.toLowerCase());
                                      return (
                                        <span key={email} className="inline-flex items-center gap-1.5 bg-blue-500/15 border border-blue-500/30 text-blue-200 text-xs px-2.5 py-1 rounded-full">
                                          <span className="font-medium">{app ? app.name : email.split('@')[0]}</span>
                                          <span className="text-[10px] text-blue-400/70">&lt;{email}&gt;</span>
                                          <button
                                            type="button"
                                            onClick={() => setSessionForm(f => ({ ...f, specificRecipients: f.specificRecipients.filter(e => e !== email) }))}
                                            className="ml-1 text-blue-400 hover:text-white transition-colors text-sm"
                                          >
                                            ×
                                          </button>
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        {/* CC Admins */}
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">CC Admins on Invite</label>
                          <div className="relative">
                            <button type="button" onClick={() => setShowSessionCcDropdown(!showSessionCcDropdown)} className="w-full flex items-center justify-between bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-gray-400 hover:border-blue-500/40 transition-colors">
                              <span>{sessionForm.ccAdmins.length === 0 ? 'No admins in CC' : `${sessionForm.ccAdmins.length} admin(s) in CC`}</span>
                              <ChevronDown size={14} className={`transition-transform ${showSessionCcDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                              {showSessionCcDropdown && (
                                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl">
                                  {admins.map(admin => (
                                    <button key={admin.id} type="button" onClick={() => setSessionForm(f => ({ ...f, ccAdmins: f.ccAdmins.includes(admin.email) ? f.ccAdmins.filter(e => e !== admin.email) : [...f.ccAdmins, admin.email] }))} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
                                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${sessionForm.ccAdmins.includes(admin.email) ? 'bg-blue-500 border-blue-500' : 'border-white/20'}`}>
                                        {sessionForm.ccAdmins.includes(admin.email) && <Check size={12} className="text-white" />}
                                      </div>
                                      <p className="text-sm text-white">{admin.email} <span className="text-gray-500 text-xs">({admin.role})</span></p>
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                        {/* Tags */}
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tags (Enter to add)</label>
                          <input value={sessionTagInput} onChange={e => setSessionTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (sessionTagInput.trim()) { setSessionForm(f => ({ ...f, tags: [...f.tags, sessionTagInput.trim()] })); setSessionTagInput(''); } } }} placeholder="Workshop, Lecture, Hackathon, Guest Speaker..." className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500/50" />
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {sessionForm.tags.map(tag => (
                              <span key={tag} className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded-full">
                                {tag}<button type="button" onClick={() => setSessionForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))} className="ml-1 hover:text-white">×</button>
                              </span>
                            ))}
                          </div>
                        </div>
                        {/* Recurring */}
                        <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5">
                          <div>
                            <p className="text-sm text-white font-medium">Recurring Session</p>
                            <p className="text-xs text-gray-500">Repeat this session on a schedule</p>
                          </div>
                          <button type="button" onClick={() => setSessionForm(f => ({ ...f, isRecurring: !f.isRecurring }))} className={`w-11 h-6 rounded-full border transition-colors relative ${sessionForm.isRecurring ? 'bg-blue-500 border-blue-500' : 'bg-white/10 border-white/20'}`}>
                            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${sessionForm.isRecurring ? 'left-5' : 'left-0.5'}`} />
                          </button>
                        </div>
                        {sessionForm.isRecurring && (
                          <div className="flex gap-2">
                            {(['weekly', 'biweekly', 'monthly'] as const).map(pat => (
                              <button key={pat} type="button" onClick={() => setSessionForm(f => ({ ...f, recurringPattern: pat }))} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors capitalize ${sessionForm.recurringPattern === pat ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'bg-black/40 text-gray-400 border-white/10'}`}>{pat}</button>
                            ))}
                          </div>
                        )}
                        <button type="submit" disabled={isSendingClassEmail} className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                          {isSendingClassEmail ? <><RefreshCw size={16} className="animate-spin" /> Scheduling & Sending...</> : <><Send size={16} /> Schedule & Send Invites</>}
                        </button>
                      </form>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Edit Session Modal */}
              <AnimatePresence>
                {showEditSession && editingSession && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl">
                      <div className="p-6 border-b border-white/10 flex items-center justify-between">
                        <h4 className="text-white font-bold text-lg flex items-center gap-2">
                          <Pencil size={20} className="text-blue-400" /> Edit Class Session
                        </h4>
                        <button onClick={() => setShowEditSession(false)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                          <X size={18} />
                        </button>
                      </div>
                      <form onSubmit={handleSaveSessionEdit} className="p-6 flex flex-col gap-5">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Session Title *</label>
                          <input type="text" required value={editSessionForm.title} onChange={e => setEditSessionForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description</label>
                          <textarea rows={2} value={editSessionForm.description} onChange={e => setEditSessionForm(f => ({ ...f, description: e.target.value }))} className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors resize-none" />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Date *</label>
                            <input type="date" required value={editSessionForm.date} onChange={e => setEditSessionForm(f => ({ ...f, date: e.target.value }))} className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500/50" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Time *</label>
                            <input type="time" required value={editSessionForm.time} onChange={e => setEditSessionForm(f => ({ ...f, time: e.target.value }))} className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500/50" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Duration (min)</label>
                            <input type="number" min={15} max={480} value={editSessionForm.duration} onChange={e => setEditSessionForm(f => ({ ...f, duration: parseInt(e.target.value) || 60 }))} className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500/50" />
                          </div>
                        </div>

                        {/* Type */}
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Session Type</label>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setEditSessionForm(f => ({ ...f, type: 'online' }))} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition-colors ${editSessionForm.type === 'online' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'bg-black/40 text-gray-400 border-white/10'}`}>
                              <Video size={14} /> Online
                            </button>
                            <button type="button" onClick={() => setEditSessionForm(f => ({ ...f, type: 'offline' }))} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition-colors ${editSessionForm.type === 'offline' ? 'bg-green-500/20 text-green-400 border-green-500/40' : 'bg-black/40 text-gray-400 border-white/10'}`}>
                              <MapPin size={14} /> Offline
                            </button>
                          </div>
                          <div className="mt-3">
                            {editSessionForm.type === 'online' ? (
                              <input type="url" value={editSessionForm.meetLink} onChange={e => setEditSessionForm(f => ({ ...f, meetLink: e.target.value }))} placeholder="https://meet.google.com/..." className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500/50 text-sm" />
                            ) : (
                              <input type="text" value={editSessionForm.location} onChange={e => setEditSessionForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g., TAN Auditorium, Room 201" className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-green-500/50 text-sm" />
                            )}
                          </div>
                        </div>

                        {/* Recipients */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Invite Recipients</label>
                            <span className="text-[11px] text-blue-400 font-mono">
                              {editSessionForm.recipientType === 'all_members' ? 'All Cohort' : `${editSessionForm.specificRecipients.length} selected`}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setEditSessionForm(f => ({ ...f, recipientType: 'all_members' }))}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${editSessionForm.recipientType === 'all_members' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'bg-black/40 text-gray-400 border-white/10'}`}
                            >
                              All Cohort Members ({members.length > 0 ? members.length : applicants.filter(a => a.email).length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditSessionForm(f => ({ ...f, recipientType: 'specific' }))}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${editSessionForm.recipientType === 'specific' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'bg-black/40 text-gray-400 border-white/10'}`}
                            >
                              Specific Members
                            </button>
                          </div>
                          {editSessionForm.recipientType === 'specific' && (
                            <div className="mt-3 p-4 bg-black/50 rounded-2xl border border-white/10 flex flex-col gap-3">
                              <select
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
                                onChange={(e) => {
                                  const email = e.target.value;
                                  if (!email) return;
                                  if (!editSessionForm.specificRecipients.includes(email)) {
                                    setEditSessionForm(f => ({ ...f, specificRecipients: [...f.specificRecipients, email] }));
                                  }
                                  e.target.value = '';
                                }}
                              >
                                <option value="">-- Add applicant to invitees --</option>
                                {applicants.filter(a => a.email).map(a => (
                                  <option key={a.id} value={a.email}>{a.name} — {a.email} [{a.status}]</option>
                                ))}
                              </select>
                              <div className="flex gap-2">
                                <input
                                  type="email"
                                  value={editSessionSpecificInput}
                                  onChange={e => setEditSessionSpecificInput(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const trimmed = editSessionSpecificInput.trim();
                                      if (trimmed && trimmed.includes('@')) {
                                        if (!editSessionForm.specificRecipients.includes(trimmed)) {
                                          setEditSessionForm(f => ({ ...f, specificRecipients: [...f.specificRecipients, trimmed] }));
                                        }
                                        setEditSessionSpecificInput('');
                                      }
                                    }
                                  }}
                                  placeholder="or type custom email..."
                                  className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const trimmed = editSessionSpecificInput.trim();
                                    if (trimmed && trimmed.includes('@')) {
                                      if (!editSessionForm.specificRecipients.includes(trimmed)) {
                                        setEditSessionForm(f => ({ ...f, specificRecipients: [...f.specificRecipients, trimmed] }));
                                      }
                                      setEditSessionSpecificInput('');
                                    }
                                  }}
                                  className="bg-blue-500/20 text-blue-400 border border-blue-500/40 px-3.5 py-2 rounded-xl text-xs font-bold"
                                >
                                  Add
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                                {editSessionForm.specificRecipients.map(email => (
                                  <span key={email} className="inline-flex items-center gap-1.5 bg-blue-500/15 border border-blue-500/30 text-blue-200 text-xs px-2.5 py-1 rounded-full">
                                    {email}
                                    <button type="button" onClick={() => setEditSessionForm(f => ({ ...f, specificRecipients: f.specificRecipients.filter(e => e !== email) }))} className="ml-1 hover:text-white">×</button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Notification Toggle */}
                        <label className="flex items-center gap-3 cursor-pointer p-3 bg-black/40 rounded-xl border border-white/5">
                          <div onClick={() => setEditSessionNotify(!editSessionNotify)} className={`w-10 h-6 rounded-full border transition-colors relative ${editSessionNotify ? 'bg-blue-500 border-blue-500' : 'bg-white/10 border-white/20'}`}>
                            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${editSessionNotify ? 'left-4.5' : 'left-0.5'}`} />
                          </div>
                          <div>
                            <p className="text-sm text-white font-medium">Send Reschedule / Update Email</p>
                            <p className="text-xs text-gray-500">Notifies all participants about new time/link via email</p>
                          </div>
                        </label>

                        <button type="submit" disabled={isSavingSessionEdit} className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                          {isSavingSessionEdit ? <><RefreshCw size={16} className="animate-spin" /> Saving Changes...</> : <><Check size={16} /> Update Session</>}
                        </button>
                      </form>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Cancellation Confirmation Modal with Email Notification */}
              <AnimatePresence>
                {showCancelModal && sessionToCancel && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-[#111] border border-red-500/30 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
                      <div className="p-6 border-b border-white/10 flex items-center justify-between bg-red-500/5">
                        <h4 className="text-white font-bold text-lg flex items-center gap-2">
                          <AlertTriangle size={20} className="text-red-400" /> Cancel Class Session
                        </h4>
                        <button onClick={() => { setShowCancelModal(false); setSessionToCancel(null); }} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                          <X size={18} />
                        </button>
                      </div>
                      <div className="p-6 flex flex-col gap-4">
                        <p className="text-sm text-gray-300">
                          Are you sure you want to cancel <b className="text-white">"{sessionToCancel.title}"</b>?
                        </p>
                        <div className="bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-gray-400 flex flex-col gap-1">
                          <p><b className="text-gray-300">Scheduled:</b> {sessionToCancel.date} at {sessionToCancel.time}</p>
                          <p><b className="text-gray-300">Notice:</b> An official VEKTOR cancellation email will be automatically dispatched to all invitees and CC admins.</p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                            Reason for Cancellation (Optional)
                          </label>
                          <textarea
                            rows={2}
                            value={cancelReasonInput}
                            onChange={e => setCancelReasonInput(e.target.value)}
                            placeholder="e.g., Guest speaker unavailable, rescheduled to Friday..."
                            className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500/50 resize-none"
                          />
                        </div>
                        <div className="flex gap-3 mt-2">
                          <button
                            type="button"
                            onClick={() => { setShowCancelModal(false); setSessionToCancel(null); }}
                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-sm font-bold transition-colors border border-white/10"
                          >
                            Keep Session
                          </button>
                          <button
                            type="button"
                            disabled={isCancellingSession}
                            onClick={handleConfirmCancelSession}
                            className="flex-1 py-3 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                          >
                            {isCancellingSession ? <><RefreshCw size={14} className="animate-spin" /> Cancelling...</> : <><Send size={14} /> Cancel & Notify via Email</>}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* AUDIT LOGS TAB */}
          {activeTab === 'audit' && isSuperAdmin && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col">
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                  <h3 className="text-white font-bold text-xl mb-1 flex items-center gap-2">
                    <FileText className="text-blue-500" size={24} /> 
                    System Audit Logs
                  </h3>
                  <p className="text-gray-400 text-sm">Comprehensive record of administrative actions.</p>
                </div>
                {auditLogs.length > 0 && (
                  <button 
                    onClick={handleClearAuditLogs}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={16} /> Clear Logs
                  </button>
                )}
              </div>
              
              <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto p-0">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider text-gray-500">
                        <th className="p-4 font-medium">Timestamp</th>
                        <th className="p-4 font-medium">Admin / User</th>
                        <th className="p-4 font-medium">Action Type</th>
                        <th className="p-4 font-medium">Details</th>
                        <th className="p-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-gray-500">No logs found.</td>
                        </tr>
                      ) : (
                        auditLogs.map(log => (
                          <tr key={log.id || log.timestamp} className="hover:bg-white/5 transition-colors group">
                            <td className="p-4 text-gray-400 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="p-4 text-white">
                              {log.adminEmail}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                log.actionType === 'LOGIN' ? 'bg-blue-500/20 text-blue-400' :
                                log.actionType.includes('EMAIL') ? 'bg-purple-500/20 text-purple-400' :
                                log.actionType.includes('DELETE') || log.actionType.includes('CLEAR') ? 'bg-red-500/20 text-red-400' :
                                'bg-green-500/20 text-green-400'
                              }`}>
                                {log.actionType.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-4 text-gray-300">
                              {log.details}
                            </td>
                            <td className="p-4 text-right">
                              {log.id && (
                                <button 
                                  onClick={() => handleDeleteSingleLog(log.id!)}
                                  className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                  title="Delete Log"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
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
              <div className="p-4 md:p-6 border-b border-white/10 flex flex-col md:flex-row justify-between md:items-center gap-4 bg-[#111]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold text-xl border border-white/10 relative">
                    {selectedApplicant.name.charAt(0)}
                    {selectedApplicant.isPriority && (
                      <div className="absolute -top-1 -right-1 bg-yellow-500 text-black rounded-full p-1 shadow-[0_0_10px_rgba(234,179,8,0.5)]">
                        <Star size={12} className="fill-black" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-white font-hero tracking-wide flex items-center gap-3">
                      {isEditingApplicant ? (
                        <input
                          value={editForm.name || ''}
                          onChange={e => setEditForm({...editForm, name: e.target.value})}
                          className="bg-[#1a1a1a] border border-white/10 rounded px-3 py-1 text-lg md:text-xl font-body text-white focus:outline-none focus:border-blue-500 w-full max-w-[200px]"
                        />
                      ) : (
                        selectedApplicant.name
                      )}
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs md:text-sm font-mono text-gray-400 truncate">{selectedApplicant.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(selectedApplicant.status)}`}>
                        {selectedApplicant.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  {selectedApplicant.status !== 'Accepted' && (
                    <button 
                      onClick={() => handleStatusChange(selectedApplicant.id, 'Accepted')}
                      className="flex-1 md:flex-none bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={16} /> Accept
                    </button>
                  )}
                  {selectedApplicant.status !== 'Rejected' && (
                    <button 
                      onClick={() => handleStatusChange(selectedApplicant.id, 'Rejected')}
                      className="flex-1 md:flex-none bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  )}
                  
                  <div className="hidden md:block w-px h-8 bg-white/10 mx-2"></div>
                  
                  <button 
                    onClick={() => deleteApplicant(selectedApplicant.id, selectedApplicant.name)}
                    className="p-2 hover:bg-red-500/20 rounded-lg text-gray-500 hover:text-red-500 transition-colors"
                    title="Delete Record"
                  >
                    <Trash2 size={18} className="md:w-5 md:h-5" />
                  </button>

                  <button 
                    onClick={isEditingApplicant ? handleSaveEdit : handleStartEdit}
                    className={`px-3 py-2 md:p-2 rounded-lg transition-colors font-bold text-xs md:text-sm ${isEditingApplicant ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
                  >
                    {isEditingApplicant ? 'Save' : 'Edit'}
                  </button>
                  
                  <button 
                    onClick={() => { setSelectedApplicant(null); setIsEditingApplicant(false); }}
                    className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                  >
                    <XCircle size={20} className="md:w-6 md:h-6" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
                {/* Info Pane */}
                <div className="w-full md:w-1/3 border-r border-white/10 p-6 md:overflow-y-auto bg-[#0a0a0a] custom-scrollbar flex flex-col gap-6">
                  
                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Change Status</h4>
                    <select 
                      value={selectedApplicant.status}
                      onChange={(e) => handleStatusChange(selectedApplicant.id, e.target.value as ApplicationStatus)}
                      className="w-full bg-[#111] border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-white/30"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Reviewing">Reviewing</option>
                      <option value="Interview">Interview Phase</option>
                      <option value="Accepted">Accepted</option>
                      <option value="Rejected">Rejected</option>
                    </select>

                    <button 
                      onClick={openInterviewModal}
                      className="w-full mt-2 bg-white hover:bg-gray-200 text-black py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <Calendar size={16} /> {selectedApplicant.interviewDate ? 'Update / Cancel Interview' : 'Schedule Interview'}
                    </button>
                    <button 
                      onClick={() => {
                        setEmailAudience('Specific');
                        setSpecificRecipients([selectedApplicant]);
                        setActiveTab('emails');
                      }}
                      className="w-full mt-2 bg-purple-500 hover:bg-purple-600 text-white py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <Mail size={16} /> Compose Mail
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
                          <div className="text-sm text-white mb-1">
                            {formatInterviewDateTime(selectedApplicant.interviewDate)}
                          </div>
                          {selectedApplicant.interviewLocation && (
                            <div className="text-xs text-purple-300">
                              <span className="font-bold opacity-75">{selectedApplicant.interviewLocationType === 'virtual' ? 'URL:' : 'Loc:'}</span> {selectedApplicant.interviewLocation}
                            </div>
                          )}
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
                <div className="w-full md:w-2/3 bg-[#111] p-6 flex flex-col relative min-h-[500px] md:min-h-0">
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
      {/* Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && (
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
              className="bg-[#111] border border-white/10 p-6 md:p-8 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white font-hero">Transmission Preview</h3>
                <button onClick={() => setShowPreviewModal(false)} className="text-gray-500 hover:text-white transition-colors">
                  &times;
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto bg-black rounded-xl border border-white/10 p-6 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
                {emailTemplate === 'warning' ? (
                  <>
                    <h2 style={{ fontSize: '24px', marginBottom: '24px', color: '#ffffff', fontWeight: 500, letterSpacing: '-0.5px' }}>Action Required, [Applicant Name].</h2>
                    <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderLeft: '4px solid #f59e0b', padding: '24px', borderRadius: '8px', margin: '32px 0' }}>
                      <div style={{ fontSize: '15px', color: '#ffffff', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: emailBody.replace(/\n/g, '<br>') }} />
                    </div>
                  </>
                ) : emailTemplate === 'reminder' ? (
                  <>
                    <h2 style={{ fontSize: '24px', marginBottom: '24px', color: '#ffffff', fontWeight: 500, letterSpacing: '-0.5px' }}>Reminder for [Applicant Name].</h2>
                    <div style={{ fontSize: '15px', color: '#d4d4d4', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: emailBody.replace(/\n/g, '<br>') }} />
                  </>
                ) : emailTemplate === 'general' ? (
                  <>
                    <h2 style={{ fontSize: '24px', marginBottom: '24px', color: '#ffffff', fontWeight: 500, letterSpacing: '-0.5px' }}>Update for [Applicant Name].</h2>
                    <div style={{ fontSize: '15px', color: '#d4d4d4', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: emailBody.replace(/\n/g, '<br>') }} />
                  </>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: emailBody.replace(/{{name}}/gi, '[Applicant Name]') }} />
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setShowPreviewModal(false)}
                  className="bg-white hover:bg-gray-200 text-black px-6 py-3 rounded-xl font-bold text-sm transition-colors"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && selectedApplicant && (
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
              <h3 className="text-xl font-bold text-white mb-2 font-hero">Reject Applicant</h3>
              <p className="text-sm text-gray-400 mb-6">Are you sure you want to reject <strong className="text-white">{selectedApplicant.name}</strong>?</p>
              
              <div className="flex flex-col gap-4 mb-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={rejectReasonToggle}
                      onChange={(e) => setRejectReasonToggle(e.target.checked)}
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${rejectReasonToggle ? 'bg-red-500' : 'bg-white/10'}`}></div>
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${rejectReasonToggle ? 'translate-x-4' : ''}`}></div>
                  </div>
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Provide custom feedback/reason</span>
                </label>
                
                {rejectReasonToggle && (
                  <textarea
                    value={rejectReasonText}
                    onChange={(e) => setRejectReasonText(e.target.value)}
                    placeholder="Enter custom rejection reason or feedback..."
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-red-500/50 min-h-[100px] resize-y"
                  />
                )}
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 bg-transparent border border-white/10 hover:bg-white/5 text-white py-3 rounded-xl font-bold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmReject}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold text-sm transition-colors"
                >
                  Confirm Reject
                </button>
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
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Mode</label>
                  <select
                    value={interviewLocationType}
                    onChange={(e) => setInterviewLocationType(e.target.value as 'offline' | 'virtual')}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500/50 appearance-none"
                  >
                    <option value="virtual">Virtual (Online)</option>
                    <option value="offline">Offline (In-person)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    {interviewLocationType === 'virtual' ? 'Meeting URL' : 'Physical Location'}
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder={interviewLocationType === 'virtual' ? 'https://meet.google.com/...' : 'Room 101, Core Block...'}
                    value={interviewLocation}
                    onChange={(e) => setInterviewLocation(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  {selectedApplicant.interviewDate && (
                    <button 
                      type="button"
                      onClick={handleCancelInterview}
                      className="w-full sm:flex-1 py-3 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 font-bold text-sm transition-colors"
                    >
                      Cancel Interview
                    </button>
                  )}
                  <div className="flex gap-3 w-full sm:flex-[2]">
                    <button 
                      type="button"
                      onClick={() => setShowInterviewModal(false)}
                      className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold text-sm hover:bg-white/5 transition-colors"
                    >
                      Close
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-sm transition-colors"
                    >
                      {selectedApplicant.interviewDate ? 'Update' : 'Confirm'}
                    </button>
                  </div>
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
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const email = formData.get('email') as string;
                const password = formData.get('password') as string;
                const role = formData.get('role') as string;
                
                try {
                  // 1. Create a secondary app instance to avoid logging out the current admin
                  const secondaryApp = getApps().find(a => a.name === "Secondary") || initializeApp({
                    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
                    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                  }, "Secondary");
                  
                  const secondaryAuth = getAuth(secondaryApp);
                  
                  // 2. Create the real Firebase user
                  await secondaryCreateUser(secondaryAuth, email, password);
                  await secondaryAuth.signOut(); // Clean up

                  // 3. Save admin record to Firestore
                  const newAdminData = { email, role, addedAt: new Date().toISOString() };
                  const newId = await addAdminToDB(newAdminData);
                  
                  setAdmins([...admins, { id: newId, ...newAdminData }]);
                  setShowCreateAdmin(false);
                  addAuditLog({
                    adminEmail: currentUserEmail || 'unknown',
                    actionType: 'ADMIN_CREATE',
                    details: `Created new admin: ${email} with role ${role}.`
                  });
                  showToast("Admin Added", `${email} can now log into this panel.`);
                } catch (error: any) {
                  console.error("Admin creation failed", error);
                  showToast("Error", error.message || "Failed to create admin account.");
                }
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
              className="bg-[#111] border border-white/10 p-8 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar overscroll-contain"
              style={{ WebkitOverflowScrolling: 'touch' }}
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
                  addAuditLog({
                    adminEmail: currentUserEmail || 'unknown',
                    actionType: 'APPLICANT_CREATE',
                    details: `Created new applicant: ${newApp.name} (ID: ${newId}).`
                  });
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
