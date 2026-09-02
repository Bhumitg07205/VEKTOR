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
  limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './config';

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
  resumeUrl?: string;
  isPriority?: boolean;
  evaluationRequest?: string;
  queueNumber?: number;
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

export const findApplicantByEmail = async (email: string): Promise<Applicant | null> => {
  if (!email || !email.trim()) return null;
  const cleanEmail = email.trim().toLowerCase();
  
  try {
    // First try exact lowercase match
    const q = query(
      collection(db, APPLICANTS_COLLECTION), 
      where('email', '==', cleanEmail),
      limit(1)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Applicant;
    }

    // Secondary scan to check case-insensitive match if needed
    const allSnapshot = await getDocs(collection(db, APPLICANTS_COLLECTION));
    for (const d of allSnapshot.docs) {
      const data = d.data();
      if (data.email && data.email.trim().toLowerCase() === cleanEmail) {
        return { id: d.id, ...data } as Applicant;
      }
    }
    
    return null;
  } catch (err) {
    console.error("Error finding applicant by email:", err);
    return null;
  }
};

export const addApplicant = async (data: Omit<Applicant, 'id'>): Promise<string> => {
  // Ensure email is stored in clean lowercase for reliable lookup
  const cleanData = {
    ...data,
    email: data.email ? data.email.trim().toLowerCase() : ''
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
