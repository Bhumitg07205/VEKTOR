import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  orderBy,
  limit,
  getCountFromServer
} from 'firebase/firestore';
import { db } from './config';

// Applicant Type matches the one in page.tsx
export type ApplicationStatus = 'Pending' | 'Reviewing' | 'Interview' | 'Accepted' | 'Rejected';

export interface Applicant {
  id: string; // Firestore document ID
  name: string;
  regNo: string;
  year: string;
  branch: string;
  mobile: string;
  email: string;
  whyJoin: string;
  status: ApplicationStatus;
  appliedDate: string;
  interviewDate?: string;
  interviewLocationType?: 'offline' | 'virtual';
  interviewLocation?: string;
  resumeUrl?: string;
  isPriority?: boolean;
  evaluationRequest?: string;
  queueNumber?: number;
  emailHash?: string;
  regNoHash?: string;
}

const APPLICANTS_COLLECTION = 'applicants';

export const getApplicants = async (): Promise<Applicant[]> => {
  try {
    const q = query(collection(db, APPLICANTS_COLLECTION), orderBy('appliedDate', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Applicant));
  } catch {
    // Fallback if index on appliedDate is building
    const snapshot = await getDocs(collection(db, APPLICANTS_COLLECTION));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Applicant));
  }
};

export const generateHash = (str: string): string => {
  if (!str) return '';
  const s = str.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

export const findExistingApplicant = async (email?: string, regNo?: string): Promise<Applicant | null> => {
  try {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanRegNo = regNo ? regNo.trim().toLowerCase() : '';
    
    if (!cleanEmail && !cleanRegNo) return null;

    const emailHash = cleanEmail ? generateHash(cleanEmail) : '';
    const regNoHash = cleanRegNo ? generateHash(cleanRegNo) : '';

    const queries = [];
    
    if (emailHash) {
      queries.push(getDocs(query(collection(db, APPLICANTS_COLLECTION), where('emailHash', '==', emailHash), limit(1))));
    } else if (cleanEmail) {
      queries.push(getDocs(query(collection(db, APPLICANTS_COLLECTION), where('email', '==', cleanEmail), limit(1))));
    }

    if (regNoHash) {
      queries.push(getDocs(query(collection(db, APPLICANTS_COLLECTION), where('regNoHash', '==', regNoHash), limit(1))));
    } else if (cleanRegNo) {
      queries.push(getDocs(query(collection(db, APPLICANTS_COLLECTION), where('regNo', '==', cleanRegNo), limit(1))));
    }
    
    const snapshots = await Promise.all(queries);
    
    for (const snap of snapshots) {
      if (!snap.empty) {
        const doc = snap.docs[0];
        return { id: doc.id, ...doc.data() } as Applicant;
      }
    }
    
    return null;
  } catch (err) {
    console.error("Error finding existing applicant:", err);
    return null;
  }
};

export const addApplicant = async (data: Omit<Applicant, 'id'>): Promise<string> => {
  const cleanEmail = data.email ? data.email.trim().toLowerCase() : '';
  const cleanRegNo = data.regNo ? data.regNo.trim().toLowerCase() : '';
  
  const cleanData = {
    ...data,
    email: cleanEmail,
    regNo: cleanRegNo,
    emailHash: cleanEmail ? generateHash(cleanEmail) : '',
    regNoHash: cleanRegNo ? generateHash(cleanRegNo) : '',
  };
  const docRef = await addDoc(collection(db, APPLICANTS_COLLECTION), cleanData);
  return docRef.id;
};

export const updateApplicant = async (id: string, data: Partial<Applicant>): Promise<void> => {
  const docRef = doc(db, APPLICANTS_COLLECTION, id);
  await updateDoc(docRef, data);
};

export const removeApplicant = async (id: string): Promise<void> => {
  const docRef = doc(db, APPLICANTS_COLLECTION, id);
  await deleteDoc(docRef);
};

export const getQueueStats = async (): Promise<{ normalCount: number, priorityCount: number }> => {
  try {
    const qPriority = query(collection(db, APPLICANTS_COLLECTION), where('isPriority', '==', true));
    const prioritySnap = await getCountFromServer(qPriority);
    
    // Also consider those where isPriority is undefined or not set
    // In firestore, if we just want normal, we can get total count and subtract priority
    const totalSnap = await getCountFromServer(collection(db, APPLICANTS_COLLECTION));
    
    const priorityCount = prioritySnap.data().count;
    const totalCount = totalSnap.data().count;
    const normalCount = totalCount - priorityCount;

    return { normalCount, priorityCount };
  } catch (err) {
    console.error("Error fetching queue stats:", err);
    return { normalCount: 0, priorityCount: 0 };
  }
};

/**
 * Uploads a resume file to Vercel Blob (bypassing all limitations)
 */
export const uploadResumeFile = async (file: File, userIdentifier: string): Promise<string> => {
  try {
    const cleanId = userIdentifier.replace(/[^a-zA-Z0-9]/g, '_');
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const finalName = `${cleanId}_${Date.now()}_${cleanFileName}`;

    const res = await fetch(`/api/upload?filename=${encodeURIComponent(finalName)}`, {
      method: 'POST',
      body: file,
    });

    if (!res.ok) {
      throw new Error('Vercel Blob upload failed with status ' + res.status);
    }

    const data = await res.json();
    return data.url; // The live public HTTPS URL
  } catch (error) {
    console.warn("Blob upload failed. Skipping resume to save application.", error);
    return ""; 
  }
};

// --- Admins ---
export interface AdminUser {
  id: string;
  email: string;
  role: string;
  addedAt: string;
}

const ADMINS_COLLECTION = 'admins';

export const getAdmins = async (): Promise<AdminUser[]> => {
  try {
    const q = query(collection(db, ADMINS_COLLECTION), orderBy('addedAt', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminUser));
  } catch {
    const snapshot = await getDocs(collection(db, ADMINS_COLLECTION));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminUser));
  }
};

export const addAdminToDB = async (data: Omit<AdminUser, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, ADMINS_COLLECTION), data);
  return docRef.id;
};

export const removeAdminFromDB = async (id: string): Promise<void> => {
  const docRef = doc(db, ADMINS_COLLECTION, id);
  await deleteDoc(docRef);
};

export const updateAdminRole = async (id: string, newRole: string): Promise<void> => {
  const docRef = doc(db, ADMINS_COLLECTION, id);
  await updateDoc(docRef, { role: newRole });
};

export interface AuditLog {
  id?: string;
  adminEmail: string;
  actionType: string;
  details: string;
  timestamp: string;
}

const AUDIT_LOGS_COLLECTION = 'audit_logs';

export const addAuditLog = async (log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> => {
  try {
    const newLog = {
      ...log,
      timestamp: new Date().toISOString()
    };
    await addDoc(collection(db, AUDIT_LOGS_COLLECTION), newLog);
  } catch (error) {
    console.error('Failed to add audit log:', error);
  }
};

export const getAuditLogs = async (): Promise<AuditLog[]> => {
  try {
    const q = query(collection(db, AUDIT_LOGS_COLLECTION), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
  } catch (error) {
    console.error('Failed to fetch audit logs, trying without index:', error);
    try {
      const snapshot = await getDocs(collection(db, AUDIT_LOGS_COLLECTION));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog)).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (e) {
      console.error('Fallback failed:', e);
      return [];
    }
  }
};
export const clearAllAuditLogs = async (): Promise<void> => {
  try {
    const q = query(collection(db, AUDIT_LOGS_COLLECTION));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error("Error clearing audit logs:", error);
    throw error;
  }
};
export const deleteAuditLog = async (id: string): Promise<void> => {
  const docRef = doc(db, AUDIT_LOGS_COLLECTION, id);
  await deleteDoc(docRef);
};

// =====================
// ASSIGNMENTS
// =====================
export interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  createdAt: string;
  createdBy: string;
  recipientType: 'all_members' | 'specific';
  specificRecipients: string[];
  ccAdmins: string[];
  submissionLink?: string;
  attachmentUrls?: { name: string; url: string }[];
  remindersSent: number;
  lastReminderAt?: string;
  isActive: boolean;
  isPriority?: boolean;
  tags?: string[];
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  memberEmail: string;
  memberName: string;
  submittedAt: string;
  submissionUrl?: string;
  notes?: string;
}

const ASSIGNMENTS_COLLECTION = 'assignments';
const SUBMISSIONS_COLLECTION = 'assignment_submissions';

export const getAssignments = async (): Promise<Assignment[]> => {
  try {
    const q = query(collection(db, ASSIGNMENTS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Assignment));
  } catch {
    const snapshot = await getDocs(collection(db, ASSIGNMENTS_COLLECTION));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Assignment));
  }
};

export const addAssignment = async (data: Omit<Assignment, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, ASSIGNMENTS_COLLECTION), data);
  return docRef.id;
};

export const updateAssignment = async (id: string, data: Partial<Assignment>): Promise<void> => {
  const docRef = doc(db, ASSIGNMENTS_COLLECTION, id);
  await updateDoc(docRef, data);
};

export const removeAssignment = async (id: string): Promise<void> => {
  const docRef = doc(db, ASSIGNMENTS_COLLECTION, id);
  await deleteDoc(docRef);
};

export const getSubmissionsForAssignment = async (assignmentId: string): Promise<AssignmentSubmission[]> => {
  try {
    const q = query(collection(db, SUBMISSIONS_COLLECTION), where('assignmentId', '==', assignmentId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AssignmentSubmission));
  } catch (err) {
    console.error('Error fetching submissions:', err);
    return [];
  }
};

export const addSubmission = async (data: Omit<AssignmentSubmission, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, SUBMISSIONS_COLLECTION), data);
  return docRef.id;
};

export const removeSubmission = async (id: string): Promise<void> => {
  const docRef = doc(db, SUBMISSIONS_COLLECTION, id);
  await deleteDoc(docRef);
};

// =====================
// CLASS SESSIONS
// =====================
export interface ClassSession {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number; // in minutes
  type: 'online' | 'offline';
  meetLink?: string;
  location?: string;
  createdBy: string;
  createdAt: string;
  ccAdmins: string[];
  recipientType: 'all_members' | 'specific';
  specificRecipients: string[];
  reminderSent: boolean;
  isRecurring: boolean;
  recurringPattern?: 'weekly' | 'biweekly' | 'monthly';
  tags: string[];
  isCancelled?: boolean;
  cancelReason?: string;
}

const CLASS_SESSIONS_COLLECTION = 'class_sessions';

export const getClassSessions = async (): Promise<ClassSession[]> => {
  try {
    const q = query(collection(db, CLASS_SESSIONS_COLLECTION), orderBy('date', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClassSession));
  } catch {
    const snapshot = await getDocs(collection(db, CLASS_SESSIONS_COLLECTION));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClassSession));
  }
};

export const addClassSession = async (data: Omit<ClassSession, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, CLASS_SESSIONS_COLLECTION), data);
  return docRef.id;
};

export const updateClassSession = async (id: string, data: Partial<ClassSession>): Promise<void> => {
  const docRef = doc(db, CLASS_SESSIONS_COLLECTION, id);
  await updateDoc(docRef, data);
};

export const removeClassSession = async (id: string): Promise<void> => {
  const docRef = doc(db, CLASS_SESSIONS_COLLECTION, id);
  await deleteDoc(docRef);
};
