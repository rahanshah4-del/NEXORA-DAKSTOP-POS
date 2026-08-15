import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TableColors {
  free: string;
  selected: string;
  kotSaved: string;
  itemsInKOT: string;
  billSaved: string;
  billPrinted: string;
  draftBillPrinted: string;
  reserved: string;
}

const defaultTableColors: TableColors = {
  free: '#42b273',
  selected: '#2196F3',
  kotSaved: '#FF9800',
  itemsInKOT: '#FF5722',
  billSaved: '#9C27B0',
  billPrinted: '#00BCD4',
  draftBillPrinted: '#795548',
  reserved: '#607D8B',
};

export interface SettingsState {
  // Restaurant Info
  restaurantName: string;
  gstNo: string;
  phone: string;
  email: string;
  address: string;
  currency: string;

  // Table Settings
  billDetailsOnTable: boolean;
  customerNameOnTable: boolean;
  kotNumberOnTable: boolean;
  orderStatusOnTable: boolean;
  displayTimeOnTable: boolean;

  // Table Colors
  tableColors: TableColors;

  // Item Settings
  displayItemDetails: boolean;
  displayItemCode: boolean;
  displayItemImage: boolean;
  showPrepTime: boolean;
  compactItemView: boolean;

  // KDS
  kdsEnabled: boolean;

  // KOT Settings
  disableSaveKOT: boolean;
  disableSaveBill: boolean;

  // View Settings
  sortItemsBy: string;

  // Default/Disable Tabs
  defaultTabs: string[];
  disabledTabs: string[];

  // Quick Bill (keep — may be wired when printing is implemented)
  quickPrintKOT: boolean;
  quickPrintBill: boolean;

  // Printer (kept for future use, not wired yet)
  printerType: string;
  printerConnection: string;
  printerName: string;
  printerIp: string;
  useRealPrinter: boolean;
  autoPrintKOT: boolean;
  duplicateKOT: boolean;
  customerCopy: boolean;
  printGST: boolean;
  printLogo: boolean;
  labelPrinter: string;
  printByDept: boolean;
  printByDeptOnline: boolean;
  printAllInOne: boolean;
  printCatWise: boolean;
  printTableWise: boolean;
  printTableBill: boolean;
  groupDeptPrinter: boolean;

  // Formatting
  kotFormat: string;
  billPrefix: string;
  startingBillNumber: string;
  cgstRate: string;
  sgstRate: string;
  billFooter: string;

  // Order Numbering
  desktopOrderCounter: number;

  // Actions
  update: (data: Partial<SettingsState>) => void;
  reset: () => void;
  getNextOrderNumber: () => string;
}

const defaults: Omit<SettingsState, 'update' | 'reset' | 'getNextOrderNumber'> = {
  restaurantName: 'Nexora Solution',
  gstNo: '27AABCT1234C1Z5',
  phone: '+91-11-2345-6789',
  email: 'support@nexorasolution.online',
  address: '123, Connaught Place, New Delhi - 110001',
  currency: 'INR',

  billDetailsOnTable: true,
  customerNameOnTable: true,
  kotNumberOnTable: true,
  orderStatusOnTable: true,
  displayTimeOnTable: true,

  tableColors: defaultTableColors,

  displayItemDetails: true,
  displayItemCode: false,
  displayItemImage: false,
  showPrepTime: true,
  compactItemView: false,

  kdsEnabled: true,

  disableSaveKOT: false,
  disableSaveBill: false,

  sortItemsBy: 'top-amount',

  defaultTabs: ['Dine-in'],
  disabledTabs: [],

  quickPrintKOT: true,
  quickPrintBill: false,

  printerType: 'thermal',
  printerConnection: 'test',
  printerName: 'KOT Printer - Kitchen',
  printerIp: '192.168.1.100:9100',
  useRealPrinter: false,
  autoPrintKOT: true,
  duplicateKOT: true,
  customerCopy: false,
  printGST: true,
  printLogo: false,
  labelPrinter: 'disable',
  printByDept: true,
  printByDeptOnline: false,
  printAllInOne: false,
  printCatWise: false,
  printTableWise: true,
  printTableBill: true,
  groupDeptPrinter: true,

  kotFormat: 'format1',
  billPrefix: 'INV-NS-',
  startingBillNumber: '1000',
  cgstRate: '2.5',
  sgstRate: '2.5',
  billFooter: 'Powered by Nexora Solution — nexorasolution.online',

  desktopOrderCounter: 1000,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaults,
      update: (data) => set(data),
      reset: () => set(defaults),
      getNextOrderNumber: () => {
        const current = get().desktopOrderCounter;
        const next = current + 1;
        set({ desktopOrderCounter: next });
        return `D-${current}`;
      },
    }),
    {
      name: 'nexora-settings-store',
      version: 2,
      migrate: (persisted: unknown, _version: number) => {
        // Merge persisted values into current defaults so a version bump
        // never silently wipes all user settings. Fields that exist in the
        // persisted state are kept; fields only in old versions (dropped from
        // the schema) are discarded; new fields get their current defaults.
        return { ...defaults, ...(persisted as Record<string, unknown> || {}) };
      },
    },
  ),
);
