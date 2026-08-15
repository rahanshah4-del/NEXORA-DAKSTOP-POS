export const APP_NAME = 'Nexora Solution';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'Smart Business Solutions';

export const SIDEBAR_WIDTH = 240;
export const SIDEBAR_COLLAPSED_WIDTH = 64;
export const HEADER_HEIGHT = 48;

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
export const DEFAULT_PAGE_SIZE = 25;

export const DATE_FORMAT = 'DD/MM/YYYY';
export const TIME_FORMAT = 'hh:mm A';
export const DATETIME_FORMAT = 'DD/MM/YYYY hh:mm A';

export const TAX_RATES = [
  { value: 0, label: '0%' },
  { value: 500, label: '5% (GST)' },
  { value: 1200, label: '12% (GST)' },
  { value: 1800, label: '18% (GST)' },
  { value: 2800, label: '28% (GST)' },
] as const;

export const CURRENCY_SYMBOL = '₹';
export const CURRENCY_CODE = 'INR';
