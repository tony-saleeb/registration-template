import { Timestamp } from 'firebase/firestore';

// ─── Registrant ────────────────────────────────────────────────────
export type RegistrantStatus =
  | 'pending_verification'
  | 'auto_approved'
  | 'manual_review'
  | 'approved'
  | 'rejected';

export interface Registrant {
  fullName: string;
  phoneNumber: string;
  whatsappNumber: string;
  church: string;
  paymentScreenshotUrl: string;
  status: RegistrantStatus;
  selfReportedReference: string | null;
  selfReportedAmount: number | null;
  adminNotes: string | null;
  createdAt: Timestamp;
  verifiedAt: Timestamp | null;
}

// ─── Phone Index ───────────────────────────────────────────────────
export interface PhoneIndex {
  registrantId: string;
}

// ─── Bank Transaction ──────────────────────────────────────────────
export interface BankTransaction {
  amount: number;
  senderName: string | null;
  transactionDate: Timestamp;
  matchedRegistrantId: string | null;
  importedAt: Timestamp;
}

// ─── Ticket ────────────────────────────────────────────────────────
export interface Ticket {
  qrToken: string;
  qrImageUrl: string;
  used: boolean;
  usedAt: Timestamp | null;
  usedByUsherId: string | null;
  createdAt: Timestamp;
}

// ─── Staff ─────────────────────────────────────────────────────────
export type StaffRole = 'admin' | 'usher';

export interface Staff {
  name: string;
  role: StaffRole;
}

// ─── Bank Statement CSV Row ────────────────────────────────────────
export interface BankStatementRow {
  referenceNumber: string;
  amount: number;
  senderName: string | null;
  transactionDate: string;
}

// ─── Scan Result ───────────────────────────────────────────────────
export type ScanResultType = 'success' | 'already_used' | 'invalid_ticket' | 'tampered';

export interface ScanResult {
  type: ScanResultType;
  registrantName?: string;
  church?: string;
  usedAt?: string;
  message: string;
  messageAr: string;
}

// ─── Registration Form Data ────────────────────────────────────────
export interface RegistrationFormData {
  fullName: string;
  church: string;
  customChurch: string;
  phoneNumber: string;
  whatsappNumber: string;
  sameAsPhone: boolean;
  selfReportedReference: string;
  selfReportedAmount: string;
  paymentScreenshot: File | null;
}

// ─── Step Wizard ───────────────────────────────────────────────────
export interface WizardStep {
  id: string;
  titleAr: string;
  titleEn: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: 'name', titleAr: 'الاسم', titleEn: 'Name' },
  { id: 'church', titleAr: 'الكنيسة', titleEn: 'Church' },
  { id: 'phone', titleAr: 'رقم الموبايل', titleEn: 'Phone' },
  { id: 'payment', titleAr: 'إثبات الدفع', titleEn: 'Payment' },
];

// ─── Church List ───────────────────────────────────────────────────
// TODO: Replace with actual church list from the user
export const CHURCHES: string[] = [
  'كنيسة مارمرقس',
  'كنيسة العذراء مريم',
  'كنيسة مارجرجس',
  'كنيسة الأنبا أنطونيوس',
  'كنيسة الأنبا بيشوي',
  'كنيسة الأنبا رويس',
  'كنيسة مارمينا',
  'كنيسة السيدة العذراء',
  'كنيسة الملاك ميخائيل',
  'كنيسة مارى جرجس',
];
