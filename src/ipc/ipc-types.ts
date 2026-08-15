import type { IPC_CHANNELS } from './channels';

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
}

export interface IpcChannelMap {
  [IPC_CHANNELS.AUTH_SIGN_IN]: {
    request: { email: string; password: string };
    response: {
      success: boolean;
      user?: AuthUser;
      staff?: { uid: string; staffId: string; staffLoginId: string; workspaceId: string; ownerId: string; role: string; name: string; email: string };
      error?: string;
    };
  };
  [IPC_CHANNELS.AUTH_SIGN_OUT]: {
    request: void;
    response: { success: boolean; error?: string };
  };
  [IPC_CHANNELS.AUTH_GET_CURRENT_USER]: {
    request: void;
    response: AuthUser | null;
  };
  [IPC_CHANNELS.AUTH_STAFF_PIN_LOGIN]: {
    request: { workspaceCode: string; staffLoginId: string; pin: string };
    response: {
      success: boolean;
      customToken: string | null;
      staff: { uid: string; staffId: string; staffLoginId: string; workspaceId: string; ownerId: string; role: string; name: string; email: string } | null;
      errorCode: string | null;
      error: string | null;
    };
  };
  [IPC_CHANNELS.AUTH_GET_STAFF_PROFILE]: {
    request: void;
    response: {
      workspaceId: string;
      staffUid: string;
      staffName: string;
      staffRole: string;
    } | null;
  };
  [IPC_CHANNELS.DB_QUERY]: {
    request: { sql: string; params?: unknown[] };
    response: unknown[];
  };
  [IPC_CHANNELS.DB_EXECUTE]: {
    request: { sql: string; params?: unknown[] };
    response: { changes: number; lastInsertRowid: number };
  };
  [IPC_CHANNELS.APP_GET_VERSION]: {
    request: void;
    response: string;
  };
  [IPC_CHANNELS.APP_GET_PLATFORM]: {
    request: void;
    response: string;
  };
  [IPC_CHANNELS.APP_CHECK_FOR_UPDATES]: {
    request: void;
    response: { updateAvailable: boolean; version: string | null };
  };
  [IPC_CHANNELS.WINDOW_MINIMIZE]: {
    request: void;
    response: void;
  };
  [IPC_CHANNELS.WINDOW_MAXIMIZE]: {
    request: void;
    response: void;
  };
  [IPC_CHANNELS.WINDOW_CLOSE]: {
    request: void;
    response: void;
  };
  [IPC_CHANNELS.WINDOW_IS_MAXIMIZED]: {
    request: void;
    response: boolean;
  };

  // ── Firestore POS Collections ──

  [IPC_CHANNELS.FIRESTORE_PAYMENTS_CREATE]: {
    request: { workspaceId: string; data: Record<string, unknown> };
    response: { success: boolean; id?: string; error?: string };
  };
  [IPC_CHANNELS.FIRESTORE_PAYMENTS_LIST]: {
    request: { workspaceId: string; filters?: Record<string, unknown> };
    response: { success: boolean; payments?: Record<string, unknown>[]; error?: string };
  };
  [IPC_CHANNELS.FIRESTORE_PAYMENTS_UPDATE]: {
    request: { workspaceId: string; paymentId: string; updates: Record<string, unknown> };
    response: { success: boolean; error?: string };
  };

  [IPC_CHANNELS.FIRESTORE_CASH_SESSIONS_OPEN]: {
    request: { workspaceId: string; data: Record<string, unknown> };
    response: { success: boolean; id?: string; error?: string };
  };
  [IPC_CHANNELS.FIRESTORE_CASH_SESSIONS_CLOSE]: {
    request: { workspaceId: string; sessionId: string; closingData: Record<string, unknown> };
    response: { success: boolean; error?: string };
  };
  [IPC_CHANNELS.FIRESTORE_CASH_SESSIONS_GET_ACTIVE]: {
    request: { workspaceId: string };
    response: { success: boolean; session?: Record<string, unknown> | null; error?: string };
  };
  [IPC_CHANNELS.FIRESTORE_CASH_SESSIONS_HISTORY]: {
    request: { workspaceId: string; filters?: Record<string, unknown> };
    response: { success: boolean; sessions?: Record<string, unknown>[]; error?: string };
  };

  [IPC_CHANNELS.FIRESTORE_RECIPES_LIST]: {
    request: { workspaceId: string };
    response: { success: boolean; recipes?: Record<string, unknown>[]; error?: string };
  };
  [IPC_CHANNELS.FIRESTORE_RECIPES_GET]: {
    request: { workspaceId: string; recipeId: string };
    response: { success: boolean; recipe?: Record<string, unknown> | null; error?: string };
  };
  [IPC_CHANNELS.FIRESTORE_RECIPES_CREATE]: {
    request: { workspaceId: string; data: Record<string, unknown> };
    response: { success: boolean; id?: string; error?: string };
  };
  [IPC_CHANNELS.FIRESTORE_RECIPES_UPDATE]: {
    request: { workspaceId: string; recipeId: string; updates: Record<string, unknown> };
    response: { success: boolean; error?: string };
  };

  [IPC_CHANNELS.FIRESTORE_TABLES_LIST]: {
    request: { workspaceId: string };
    response: { success: boolean; tables?: Record<string, unknown>[]; error?: string };
  };

  [IPC_CHANNELS.FIRESTORE_MENU_ITEMS_LIST]: {
    request: { workspaceId: string };
    response: { success: boolean; items?: Record<string, unknown>[]; error?: string };
  };

  [IPC_CHANNELS.FIRESTORE_RESERVATIONS_CREATE]: {
    request: { workspaceId: string; data: Record<string, unknown> };
    response: { success: boolean; id?: string; error?: string };
  };
  [IPC_CHANNELS.FIRESTORE_RESERVATIONS_LIST]: {
    request: { workspaceId: string; filters?: Record<string, unknown> };
    response: { success: boolean; reservations?: Record<string, unknown>[]; error?: string };
  };
  [IPC_CHANNELS.FIRESTORE_RESERVATIONS_UPDATE]: {
    request: { workspaceId: string; reservationId: string; updates: Record<string, unknown> };
    response: { success: boolean; error?: string };
  };
  [IPC_CHANNELS.FIRESTORE_RESERVATIONS_CANCEL]: {
    request: { workspaceId: string; reservationId: string };
    response: { success: boolean; error?: string };
  };

  [IPC_CHANNELS.FIRESTORE_ORDERS_CREATE]: {
    request: { workspaceId: string; orderNumber: string; data: Record<string, unknown> };
    response: { success: boolean; id?: string; error?: string };
  };
  [IPC_CHANNELS.FIRESTORE_ORDERS_UPDATE]: {
    request: { workspaceId: string; orderNumber: string; updates: Record<string, unknown> };
    response: { success: boolean; error?: string };
  };
  [IPC_CHANNELS.FIRESTORE_ORDERS_UPDATE_STATUS]: {
    request: { workspaceId: string; orderNumber: string; status: string };
    response: { success: boolean; error?: string };
  };
  [IPC_CHANNELS.FIRESTORE_ORDERS_LIST]: {
    request: { workspaceId: string; filters?: Record<string, unknown> };
    response: { success: boolean; orders?: Record<string, unknown>[]; error?: string };
  };

  [IPC_CHANNELS.FIRESTORE_COUPONS_GET_BY_CODE]: {
    request: { workspaceId: string; code: string };
    response: { success: boolean; coupon?: Record<string, unknown> | null; error?: string };
  };
  [IPC_CHANNELS.FIRESTORE_COUPONS_INCREMENT_USAGE]: {
    request: { workspaceId: string; couponId: string };
    response: { success: boolean; error?: string };
  };

  [IPC_CHANNELS.FIRESTORE_CUSTOMERS_LIST]: {
    request: { workspaceId: string; searchTerm?: string };
    response: { success: boolean; customers?: Record<string, unknown>[]; error?: string };
  };
  [IPC_CHANNELS.FIRESTORE_CUSTOMERS_CREATE]: {
    request: { workspaceId: string; data: Record<string, unknown> };
    response: { success: boolean; id?: string; error?: string };
  };
  [IPC_CHANNELS.FIRESTORE_CUSTOMERS_UPDATE]: {
    request: { workspaceId: string; customerId: string; updates: Record<string, unknown> };
    response: { success: boolean; error?: string };
  };
}

export type IpcChannelName = keyof IpcChannelMap;
