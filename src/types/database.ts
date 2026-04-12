export interface Laborer {
  id: string;
  full_name: string;
  designation: string;
  supplier_name: string;
  id_number: string;
  nationality: string;
  phone: string;
  daily_rate: number | null;
  foreman_id?: string | null;
  site_number?: string | null;
  room_number?: string | null;
  start_date?: string | null;
  monthly_salary?: number | null;
  foreman_commission?: number | null;
  is_active: boolean;
  notes: string | null;
  front_photo: string | null;
  back_photo: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  name: string;
  contact_person: string;
  contact_person_phone: string;
  company_phone: string;
  email: string;
  address: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Machine {
  id: string;
  vendor_id: string | null;
  category: 'vehicle' | 'equipment';
  name: string;
  type: string;
  plate_number: string;
  model: string;
  year: number | null;
  daily_rate: number | null;
  status: 'available' | 'in_use' | 'maintenance' | 'returned';
  notes: string | null;
  is_active: boolean;
  contact_person: string | null;
  contact_number: string | null;
  operator_name: string | null;
  operator_id: string | null;
  vehicle_photo: string | null;
  vehicle_card: string | null;
  operator_card: string | null;
  created_at: string;
  updated_at: string;
  vendor?: Vendor;
}

export interface MachineUsageLog {
  id: string;
  machine_id: string;
  log_date: string;
  hours_used: number;
  operator_name: string;
  fuel_consumed: number | null;
  task_description: string | null;
  site_location: string | null;
  remarks: string | null;
  created_at: string;
  machine?: Machine;
}

export interface Timesheet {
  id: string;
  laborer_id: string | null;
  sheet_type: 'labor' | 'vehicle' | 'equipment' | null;
  labor_name: string | null;
  month: number;
  year: number;
  project_name: string;
  supplier_name: string;
  site_engineer_name: string;
  designation: string;
  total_worked: number;
  total_ot: number;
  total_actual: number;
  status: 'draft' | 'submitted' | 'approved';
  created_at: string;
  updated_at: string;
  laborer?: Laborer;
  entries?: TimesheetEntry[];
}

export interface TimesheetEntry {
  id: string;
  timesheet_id: string;
  day: number;
  time_in: string;
  time_out_lunch: string;
  lunch_break: string;
  time_in_2: string;
  time_out_2: string;
  total_duration: number;
  over_time: number;
  actual_worked: number;
  approver_sig: string;
  remarks: string;
  created_at: string;
}

export interface Foreman {
  id: string;
  laborer_id?: string | null;
  full_name: string;
  id_number: string;
  phone: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SalarySheetStatus = 'draft' | 'approved';

export interface SalarySheet {
  id: string;
  month: number;
  year: number;
  status: SalarySheetStatus;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  entries?: SalarySheetEntry[];
}

export interface SalarySheetEntry {
  id: string;
  sheet_id: string;
  laborer_id: string;
  labor_name: string;
  labor_code: string;
  designation: string;
  bank_name: string;
  bank_account_number: string;
  monthly_salary: number;
  actual_worked_hours: number;
  overtime_hours: number;
  total_worked_hours: number;
  hourly_rate: number;
  total_salary: number;
  deduction: number;
  created_at: string;
  updated_at: string;
}

export interface NPCInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  bill_to: string;
  project: string;
  service_description: string;
  vat_percent: number;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface NPCInvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  working_hours: number;
  hourly_rate: number;
  amount: number;
  created_at: string;
}
