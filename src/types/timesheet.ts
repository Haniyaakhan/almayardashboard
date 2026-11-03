export interface DayEntry {
  day: number;
  timeIn: string;
  timeOutLunch: string;
  lunchBreak: string;
  timeIn2: string;
  timeOut2: string;
  totalDuration: number;
  overTime: number;
  actualWorked: number;
  approverSig: string;
  remarks: string;
}

export interface TimesheetState {
  month: number;
  year: number;
  laborName: string;
  projectName: string;
  supplierName: string;
  siteEngineerName: string;
  siteEngineerId: string;
  lpoNumber: string;
  designation: string;
  workData: DayEntry[];

  // Calculated fields
  totalWorked: number;
  totalOT: number;
  totalActual: number;
}

export interface TimesheetActions {
  setMonth: (month: number) => void;
  setYear: (year: number) => void;
  setLaborName: (name: string) => void;
  setProjectName: (name: string) => void;
  setSupplierName: (name: string) => void;
  setSiteEngineerName: (name: string) => void;
  setSiteEngineerId: (id: string) => void;
  setLpoNumber: (number: string) => void;
  setDesignation: (designation: string) => void;
  updateDayEntry: (day: number, field: keyof DayEntry, value: string | number) => void;
}

export type UseTimesheetReturn = TimesheetState & TimesheetActions;
