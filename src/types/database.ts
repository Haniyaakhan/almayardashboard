export interface Laborer {
  id: string;
  full_name: string;
  designation: string;
  supplier_name: string;
  id_number: string;
  nationality: string;
  phone: string;
  daily_rate: number | null;
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
