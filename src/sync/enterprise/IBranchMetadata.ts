/**
 * IBranchMetadata — restaurant branch configuration interfaces.
 *
 * Every POS terminal operates within a branch context.
 * Branch metadata drives localization, business rules,
 * and sync partitioning across the restaurant organization.
 *
 * Interface only. No implementation.
 */

// ── Branch Metadata ──

export interface IBranchMetadata {
  /** Unique branch identifier */
  branchId: string;

  /** Workspace this branch belongs to */
  workspaceId: string;

  /** Human-readable restaurant branch name */
  branchName: string;

  /** Short code for the branch (e.g., "DTX-01") */
  branchCode: string;

  /** Physical address of the branch */
  address: IBranchAddress;

  /** Contact information */
  contact: IBranchContact;

  /** Operational configuration */
  config: IBranchConfig;

  /** Localization settings */
  localization: IBranchLocalization;

  /** Business hours */
  businessHours: IBranchBusinessHours;

  /** ISO-8601 when this branch was created */
  createdAt: string;

  /** ISO-8601 when this branch was last updated */
  updatedAt: string;

  /** Whether this branch is currently active */
  isActive: boolean;
}

// ── Branch Address ──

export interface IBranchAddress {
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
}

// ── Branch Contact ──

export interface IBranchContact {
  phone: string | null;
  email: string | null;
  managerName: string | null;
  managerPhone: string | null;
}

// ── Branch Configuration ──

export interface IBranchConfig {
  /** Default currency code (ISO 4217) */
  currency: string;

  /** Currency symbol */
  currencySymbol: string;

  /** Currency locale for formatting */
  currencyLocale: string;

  /** Default tax rate in basis points (e.g., 850 = 8.5%) */
  defaultTaxRateBps: number;

  /** Whether tax is inclusive of prices */
  taxInclusive: boolean;

  /** Default language code */
  language: string;

  /** Default table service charge in basis points */
  serviceChargeBps: number;

  /** Whether tips are enabled */
  tipsEnabled: boolean;

  /** Default tip percentages */
  defaultTipPercentages: number[];

  /** Maximum number of concurrent tables */
  maxTables: number;

  /** Order number prefix for this branch */
  orderNumberPrefix: string;
}

// ── Branch Localization ──

export interface IBranchLocalization {
  /** IANA timezone (e.g., "America/Chicago") */
  timezone: string;

  /** Timezone offset from UTC in minutes */
  utcOffsetMinutes: number;

  /** Date format pattern */
  dateFormat: string;

  /** Time format pattern */
  timeFormat: string;

  /** First day of the week (0 = Sunday, 1 = Monday) */
  firstDayOfWeek: number;

  /** Number format (decimal and thousands separators) */
  numberFormat: IBranchNumberFormat;
}

export interface IBranchNumberFormat {
  decimalSeparator: string;
  thousandsSeparator: string;
}

// ── Business Hours ──

export interface IBranchBusinessHours {
  /** Business day start time in HH:mm (local timezone) */
  businessDayStart: string;

  /** Business day end time in HH:mm (local timezone) */
  businessDayEnd: string;

  /** Days the branch is open (0 = Sunday, 6 = Saturday) */
  openDays: number[];

  /** Holiday dates when the branch is closed */
  holidays: IBranchHoliday[];

  /** Special hours overrides */
  specialHours: IBranchSpecialHours[];
}

export interface IBranchHoliday {
  date: string;
  name: string;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
}

export interface IBranchSpecialHours {
  date: string;
  reason: string;
  openTime: string;
  closeTime: string;
}

// ── Branch Metadata Provider Interface ──

export interface IBranchMetadataProvider {
  /** Get the current branch metadata */
  getMetadata(): IBranchMetadata | null;

  /** Initialize branch metadata (called on first setup or after reset) */
  initialize(metadata: IBranchMetadata): Promise<void>;

  /** Update branch configuration */
  updateConfig(config: Partial<IBranchConfig>): Promise<void>;

  /** Update branch localization */
  updateLocalization(localization: Partial<IBranchLocalization>): Promise<void>;

  /** Update business hours */
  updateBusinessHours(hours: Partial<IBranchBusinessHours>): Promise<void>;

  /** Check if a given datetime is within business hours */
  isWithinBusinessHours(datetime?: Date): boolean;

  /** Get the current business date (respects business day boundary) */
  getBusinessDate(): string;

  /** Check if branch metadata has been initialized */
  isInitialized(): boolean;
}
