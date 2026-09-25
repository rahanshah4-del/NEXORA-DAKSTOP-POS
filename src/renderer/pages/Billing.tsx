import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/utils/cn';
import {
  Plus, Search, ChevronDown, Printer, CreditCard,
  MinusCircle, RotateCw, X, Minus, Trash2,
  User, Clock, Bell, MapPin, Phone, FileText, UserPlus, Users as UsersIcon,
  Check, AlertTriangle, ExternalLink, Pencil, Package,
  LayoutGrid, ArrowLeft, Eye, Edit, Banknote, Ticket, Wallet,
} from 'lucide-react';
import { useMenuStore } from '@/stores/menu-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useAuthStore } from '@/stores/auth-store';
import { useTableStore } from '@/stores/table-store';
import type { TableData } from '@/stores/table-store';
import { IconBar } from '@/components/layout/IconBar';
import { Button } from '@/components/ui/Button';
import { notifyPrint, notifySuccess, notifyError, notifyInfo } from '@/stores/toast-store';
import { useWorkspaceCurrencyValue } from '@/hooks/useWorkspaceCurrency';
import { formatWorkspaceMoney, getWorkspaceSymbol } from '@/utils/workspaceMoney';
import { applyCouponDiscount, isCouponValid } from '@/utils/coupon-utils';
import type { CouponData, CouponResult } from '@/utils/coupon-utils';
import { userFriendlyError } from '@/utils/error-helper';
import { CancelOrderModal } from '@/components/shared/CancelOrderModal';

interface OrderItem { id: string; name: string; qty: number; price: number; sentToKitchen?: boolean; }

let idCounter = 100;

const sections = ['All', 'Indoor', 'Outdoor', 'Private', 'Terrace'];

export default function Billing() {
  const navigate = useNavigate();
  const location = useLocation();
  const s = useSettingsStore();

  // ── Check for table passed from Tables page ──
  const passedTableId = (location.state as any)?.tableId || null;
  // Clear the state so it doesn't persist on refresh
  if (passedTableId && !sessionStorage.getItem('tableLoaded')) {
    sessionStorage.setItem('tableLoaded', '1');
    setTimeout(() => sessionStorage.removeItem('tableLoaded'), 500);
  }

  const allTabs = ['Dine-in', 'PickUp', 'Delivery', 'Quick Bill'];
  const availableTabs = useMemo(() => allTabs.filter((t) => !s.disabledTabs.includes(t)), [s.disabledTabs]);
  const [activeTab, setActiveTab] = useState(() => {
    if (passedTableId) return 'Dine-in';
    return s.defaultTabs[0] || availableTabs[0] || 'Dine-in';
  });

  // ── Table selection (Dine-in only) ──
  const tables = useTableStore((s) => s.tables);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('All');
  const [tableSearch, setTableSearch] = useState('');

  const filteredTables = tables.filter((t) => {
    if (activeSection !== 'All' && t.section !== activeSection) return false;
    if (tableSearch && !t.name.toLowerCase().includes(tableSearch.toLowerCase())) return false;
    return true;
  });

  const occupiedCount = tables.filter((t) => t.status === 'occupied').length;
  const availableCount = tables.filter((t) => t.status === 'available').length;
  const reservedCount = tables.filter((t) => t.status === 'reserved').length;
  const selectedTable = selectedTableId ? tables.find((t) => t.id === selectedTableId) ?? null : null;

  // ── Menu ──
  const [activeCat, setActiveCat] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const allMenuItems = useMenuStore((st) => st.items);
  const menuCategories = useMenuStore((st) => st.categories);
  const menuItems = useMemo(() => allMenuItems.filter((i) => i.active), [allMenuItems]);
  const sortedMenuItems = useMemo(() => {
    const items = [...menuItems];
    switch (s.sortItemsBy) {
      case 'name': case 'alphabetical': return items.sort((a, b) => a.name.localeCompare(b.name));
      case 'short-code': return items.sort((a, b) => a.id.localeCompare(b.id));
      case 'top-amount': return items.sort((a, b) => b.price - a.price);
      default: return items;
    }
  }, [menuItems, s.sortItemsBy]);
  const filteredMenu = useMemo(() => {
    let items = sortedMenuItems;
    if (activeCat !== 'All') items = items.filter((i) => i.category === activeCat);
    if (searchQuery) items = items.filter((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return items;
  }, [sortedMenuItems, activeCat, searchQuery]);

  // ── Order ──
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [isSavingKot, setIsSavingKot] = useState(false);

  // ── Coupon state ──
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponData | null>(null);
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [showPrintView, setShowPrintView] = useState(false);

  // ── Cancel Order modal state ──
  const [showCancelModal, setShowCancelModal] = useState(false);

  // ── Edit item actions ──
  const startEditItem = (item: OrderItem) => {
    setEditingItemId(item.id);
    setEditName(item.name);
    setEditPrice(String(item.price));
  };
  const saveEditItem = () => {
    if (!editingItemId || !editName.trim()) return;
    const trimmed = editPrice.trim();
    if (trimmed === '') {
      // Empty price field → keep the existing price
      setOrderItems((prev) => prev.map((i) => (i.id === editingItemId ? { ...i, name: editName.trim() } : i)));
      setEditingItemId(null);
      return;
    }
    const nextPrice = Number(trimmed);
    if (!Number.isFinite(nextPrice) || nextPrice < 0) {
      notifyError('Price cannot be negative');
      return;
    }
    setOrderItems((prev) => prev.map((i) => (i.id === editingItemId ? { ...i, name: editName.trim(), price: nextPrice } : i)));
    setEditingItemId(null);
  };
  const cancelEditItem = () => { setEditingItemId(null); };
  const deleteOrder = () => { resetOrderState(); };

  // Currency comes from the workspace document (web dashboard), not local settings.
  const { currencyCode, currencySymbol: currencyOverride } = useWorkspaceCurrencyValue();
  const currSymbol = getWorkspaceSymbol(currencyCode, currencyOverride);
  const money = (amount: number) => formatWorkspaceMoney(amount, currencyCode, currencyOverride);
  const parsedCgst = parseFloat(s.cgstRate);
  const parsedSgst = parseFloat(s.sgstRate);
  const cgstRate = (Number.isFinite(parsedCgst) ? parsedCgst : 0) / 100;
  const sgstRate = (Number.isFinite(parsedSgst) ? parsedSgst : 0) / 100;

  // ── Discount calculation (order of operations) ──
  // 1. Manual discount % applied to subtotal
  const subtotal = orderItems.reduce((sum, i) => sum + i.qty * i.price, 0);
  const manualDiscount = Math.round(subtotal * (discountPercent / 100));
  const afterManualDiscount = subtotal - manualDiscount;

  // 2. Coupon discount — recomputed live from the current cart (not frozen at
  //    apply time) so editing the cart re-derives the correct discount.
  const couponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0;
    const cr = applyCouponDiscount(afterManualDiscount, appliedCoupon);
    return cr.valid ? cr.discount : 0;
  }, [appliedCoupon, afterManualDiscount]);

  // Auto-remove the coupon if the cart falls below its minimum order amount.
  useEffect(() => {
    if (!appliedCoupon) return;
    const min = Number(appliedCoupon.minOrderAmount || 0);
    if (min > 0 && afterManualDiscount < min) {
      setAppliedCoupon(null);
      setCouponResult(null);
      setCouponCode('');
      setCouponError(null);
      notifyInfo('Coupon removed — minimum order amount no longer met');
    }
  }, [appliedCoupon, afterManualDiscount]);

  // 3. Net = subtotal - manual discount - coupon discount (never negative)
  const netSubtotal = Math.max(0, afterManualDiscount - couponDiscount);

  // 4. Tax on the net amount
  const cgst = Math.round(netSubtotal * cgstRate);
  const sgst = Math.round(netSubtotal * sgstRate);

  // 5. Final total
  const total = netSubtotal + cgst + sgst;
  const discount = manualDiscount + couponDiscount;

  // ── Auth (declared early — used by customer, coupon, and payment sections below) ──
  const staffProfile = useAuthStore((s) => s.staffProfile);

  // ── Customer ──
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState(4);
  const [kotNotes, setKotNotes] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showAddCustomerForm, setShowAddCustomerForm] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Firestore-backed customers (replaces local mock store)
  const [firestoreCustomers, setFirestoreCustomers] = useState<any[]>([]);

  // Fetch customers on mount and when modal opens
  const loadCustomers = async () => {
    const wsId = staffProfile?.workspaceId;
    if (!wsId) return;
    try {
      const result = await window.api.firestore.customers.list(wsId);
      if (result.success && result.customers) {
        setFirestoreCustomers(result.customers as any[]);
      }
    } catch { /* silent — customers are optional at checkout */ }
  };

  useEffect(() => { loadCustomers(); }, [staffProfile?.workspaceId]);
  // Reload when the customer modal opens (to pick up newly added customers)
  useEffect(() => { if (showCustomerModal) loadCustomers(); }, [showCustomerModal]);

  const selectedCustomer = selectedCustomerId ? firestoreCustomers.find((c: any) => c.id === selectedCustomerId) ?? null : null;

  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return firestoreCustomers;
    const q = customerSearchQuery.toLowerCase();
    return firestoreCustomers.filter((c: any) =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(customerSearchQuery) ||
      (c.email || '').toLowerCase().includes(q),
    );
  }, [firestoreCustomers, customerSearchQuery]);

  // ── Shared order restore (used by Dine-in selectTable AND Quick Bill pending tabs) ──
  const restoreOrder = async (orderNumber: string, label: string): Promise<boolean> => {
    try {
      const result = await window.api.local.orders.get(orderNumber);
      if (result.success && result.order) {
        const o = result.order;
        const cartRows = (o.cartRows || []) as Array<{ itemId: string; itemName: string; itemPrice: number; qty: number; note: string }>;
        // Recover the id counter from restored numeric ids so newly added items
        // don't collide with the restored ones.
        let maxId = 100;
        cartRows.forEach((row) => {
          const n = parseInt(String(row.itemId ?? ''), 10);
          if (Number.isFinite(n) && n > maxId) maxId = n;
        });
        idCounter = Math.max(maxId, 100);
        setOrderItems(cartRows.map((row) => ({
          id: row.itemId || `oi-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          name: row.itemName,
          price: row.itemPrice,
          qty: row.qty,
          sentToKitchen: true,
        })));
        if (o.customerId) setSelectedCustomerId(String(o.customerId));
        if (o.notes) setKotNotes(String(o.notes));
        notifyInfo(`Restored ${cartRows.length} item${cartRows.length !== 1 ? 's' : ''} from ${label}`);
        return true;
      }
    } catch { /* fall through */ }
    return false;
  };

  // ── Actions ──
  const selectTable = async (table: TableData) => {
    setSelectedTableId(table.id);
    setGuestCount(table.capacity >= 4 ? 4 : 2);
    // Clear the previous order's coupon/discount/wallet/customer BEFORE restoring
    // so they don't bleed onto the restored order.
    resetOrderState();

    if (table.orderId && (table.status === 'billing' || table.status === 'occupied')) {
      const restored = await restoreOrder(table.orderId, table.name);
      if (restored) return;
    }
  };
  const deselectTable = () => {
    setSelectedTableId(null);
    resetOrderState();
  };

  const addItem = (menu: { name: string; price: number }) => {
    // Merge into an UNSENT line if one exists; never merge into a sent (KOT'd)
    // line, otherwise the qty bump never gets sent and totals diverge from the DB.
    const unsent = orderItems.find((i) => i.name === menu.name && !i.sentToKitchen);
    if (unsent) setOrderItems((prev) => prev.map((i) => (i.id === unsent.id ? { ...i, qty: i.qty + 1 } : i)));
    else setOrderItems((prev) => [...prev, { id: String(++idCounter), name: menu.name, qty: 1, price: menu.price, sentToKitchen: false }]);
  };
  const removeItem = (id: string) => setOrderItems((prev) => prev.filter((i) => i.id !== id));
  const changeQty = (id: string, delta: number) => {
    const item = orderItems.find((i) => i.id === id);
    if (item && item.sentToKitchen && delta > 0) {
      // Bumping a sent line → add a fresh unsent line for the delta so it gets KOT'd.
      setOrderItems((prev) => [...prev, { id: String(++idCounter), name: item.name, qty: delta, price: item.price, sentToKitchen: false }]);
      return;
    }
    setOrderItems((prev) => prev.map((i) => { if (i.id !== id) return i; const q = i.qty + delta; return q <= 0 ? null : { ...i, qty: q }; }).filter(Boolean) as OrderItem[]);
  };
  const [showNewOrderConfirm, setShowNewOrderConfirm] = useState(false);

  const newOrder = () => {
    // If there are unsaved (not-yet-KOT'd) items, warn before clearing
    const hasUnsaved = orderItems.length > 0 && orderItems.some((i) => !i.sentToKitchen);
    if (hasUnsaved && !showNewOrderConfirm) {
      setShowNewOrderConfirm(true);
      setTimeout(() => setShowNewOrderConfirm(false), 4000);
      return;
    }
    setShowNewOrderConfirm(false);
    resetOrderState();
    setShowDiscountInput(false);
    setOrderPlaced(false);
    setActiveCat('All');
    setSearchQuery('');
  };

  const printAndSaveKOT = () => {
    if (orderItems.length === 0 || s.disableSaveKOT || isSavingKot) return;
    setIsSavingKot(true);

    // Reuse an existing active (unpaid) order — for the table OR a Quick Bill /
    // PickUp pending order — otherwise mint a new number.
    const existingOrderId = selectedTable?.orderId ?? activePendingOrderNumber ?? null;

    const isAppend = !!existingOrderId;
    // Determine the number WITHOUT advancing the counter yet — the counter is
    // only advanced after a successful write.
    const orderNumber = isAppend
      ? existingOrderId!
      : `D-${useSettingsStore.getState().desktopOrderCounter}`;
    const numericPart = orderNumber.slice(2);

    // Delta: only new items that haven't been sent to kitchen yet
    const newItems = orderItems.filter((item) => !item.sentToKitchen);

    const orderData = {
      orderNumber, billNumber: numericPart, kotNumber: numericPart,
      orderType: activeTab === 'Dine-in' ? 'Dine-in' : activeTab === 'Delivery' ? 'Delivery' : activeTab === 'PickUp' ? 'Takeaway' : 'Quick Bill',
      table: activeTab === 'Dine-in' ? (selectedTableId ?? '') : '',
      source: 'desktop', notes: kotNotes,
      customer: selectedCustomer?.name || 'Walk-in Guest',
      customerId: selectedCustomer?.id ?? '',
      phone: selectedCustomer?.phone || '',
      deliveryAddress: activeTab === 'Delivery' ? deliveryAddress : '',
      riderNotes: activeTab === 'Delivery' ? kotNotes : '',
      cartRows: newItems.map((item) => ({
        itemId: item.id, itemName: item.name, itemPrice: item.price, qty: item.qty, note: '',
      })),
      totals: { subtotal, discount, netSubtotal, serviceCharges: 0, tax: cgst + sgst, total, cgst, sgst },
      total, paidAmount: 0, dueAmount: total,
      orderStatus: 'pending', paymentStatus: 'unpaid',
      paymentMethod: '', lastPaymentId: '', lastPaymentAt: '',
      createdBy: staffProfile?.staffUid ?? 'unknown',
      staffName: staffProfile?.staffName ?? 'Unknown',
      staffId: staffProfile?.staffUid ?? 'unknown',
      workspaceId: staffProfile?.workspaceId ?? '', businessType: 'restaurant', ownerId: staffProfile?.workspaceId ?? '',
    };

    let writePromise: Promise<any>;
    try {
      writePromise = isAppend
        ? window.api.local.orders.appendItems(orderNumber, newItems.map((item) => ({
            itemId: item.id, itemName: item.name, itemPrice: item.price, qty: item.qty, note: '',
          })), { subtotal, tax: cgst + sgst, discount, total })
        : window.api.local.orders.write(orderData as any);
    } catch (e: any) {
      notifyError('Failed to save KOT');
      setIsSavingKot(false);
      return;
    }

    writePromise.then((res: any) => {
      if (res.success) {
        // Advance the counter only after the write succeeded.
        if (!isAppend) {
          useSettingsStore.getState().update({ desktopOrderCounter: parseInt(numericPart, 10) + 1 });
        }
        // Mark the table occupied only after the write succeeded.
        if (selectedTableId) {
          useTableStore.getState().updateTable(selectedTableId, {
            status: 'occupied', orderTotal: total, guests: guestCount, orderId: orderNumber,
          });
        }
        notifySuccess(isAppend ? `KOT Updated — ${orderNumber} (+${newItems.length} items)` : `KOT Saved — ${orderNumber}`);
        setOrderPlaced(true);
        if (activeTab === 'Quick Bill' || activeTab === 'PickUp') setActivePendingOrderNumber(orderNumber);
        setTimeout(() => setOrderPlaced(false), 2500);

        // Mark all items as sent to kitchen
        setOrderItems((prev) => prev.map((i) => ({ ...i, sentToKitchen: true })));

        // Print delta KOT (only new items)
        if (newItems.length > 0) {
          const kotData = { ...orderData, cartRows: newItems.map((item) => ({
            itemId: item.id, itemName: item.name, itemPrice: item.price, qty: item.qty, note: '',
          })) };
          // Print-only copy — the order document itself is not modified.
          const cleanOrder = JSON.parse(JSON.stringify(kotData));
          cleanOrder.restaurantInfo = {
            ...(cleanOrder.restaurantInfo ?? {}),
            currency: currencyCode,
            currencySymbol: currencyOverride,
          };
          window.api.printer.printKOT(cleanOrder, getPrinterSettings()).then((pr: any) => {
            if (pr.success) notifyInfo('KOT sent to printer (test mode — saved to print-jobs)');
            else notifyError(`Print failed: ${pr.error}`);
          }).catch((e: any) => notifyError(`Print error: ${e.message}`));
        }
      } else {
        notifyError('Failed to save KOT');
      }
    }).catch(() => notifyError('Failed to save KOT'))
      .finally(() => setIsSavingKot(false));
  };

  /** Print a draft bill WITHOUT finalizing payment or mutating table state. */
  const handlePrintBill = () => {
    if (orderItems.length === 0) return;
    // Do NOT mint a new number or mutate table state here — reuse the existing
    // order number (table or pending order) so re-opening restores the same order.
    const orderNumber = selectedTable?.orderId || activePendingOrderNumber || '';

    if (!orderNumber) {
      notifyInfo('Save a KOT first to generate an order number');
      return;
    }

    const billData = {
      orderNumber, billNumber: orderNumber ? orderNumber.slice(2) : '', kotNumber: orderNumber ? orderNumber.slice(2) : '',
      orderType: 'Dine-in',
      table: selectedTable?.name || (selectedTableId ?? ''),
      customer: selectedCustomer?.name || 'Walk-in Guest',
      phone: selectedCustomer?.phone || '',
      cartRows: orderItems.map((item) => ({
        itemId: item.id, itemName: item.name, itemPrice: item.price, qty: item.qty, note: '',
      })),
      totals: { subtotal, discount, netSubtotal, serviceCharges: 0, tax: cgst + sgst, total, cgst, sgst },
      total, walletAmountUsed, notes: kotNotes,
      orderStatus: 'pending', paymentStatus: 'due',
      paymentMethod: walletAmountUsed > 0 ? 'Split' : 'Cash',
      restaurantInfo: {
        name: s.restaurantName, address: s.address, phone: s.phone, email: s.email,
        // Currency code stays as-is; the resolved workspace symbol rides along so
        // the receipt templates can print the owner's override.
        gstNo: s.gstNo, currency: s.currency, currencySymbol: currencyOverride,
        billPrefix: s.billPrefix,
        billFooter: s.billFooter, cgstRate: s.cgstRate, sgstRate: s.sgstRate,
      },
    };

    const cleanBill = JSON.parse(JSON.stringify(billData));
    window.api.printer.printBill(cleanBill, getPrinterSettings()).then((pr: any) => {
      if (pr.success) notifyInfo('Bill printed (test mode — saved to print-jobs) — awaiting payment');
      else notifyError(`Print failed: ${pr.error}`);
    }).catch((e: any) => notifyError(`Print error: ${e.message}`));
  };

  const voidOrder = () => {
    // Open the modal if there is a saved order to cancel OR items in the cart.
    if (activePendingOrderNumber || selectedTable?.orderId || orderItems.length > 0) {
      setShowCancelModal(true);
      return;
    }
    // Truly nothing to cancel — just reset local state.
    resetOrderState();
    setShowDiscountInput(false);
    setOrderPlaced(false);
    setActiveCat('All');
    setSearchQuery('');
  };

  const confirmCancelOrder = async (reason: string) => {
    const wsId = staffProfile?.workspaceId;
    if (!wsId) {
      const msg = 'Not signed in — cannot cancel order.';
      notifyError(msg);
      throw new Error(msg);
    }

    // If there's an active KOT'd order, mark it cancelled in local SQLite
    const orderToCancel = (selectedTable?.orderId)
      || ((activeTab === 'Quick Bill' || activeTab === 'PickUp') ? activePendingOrderNumber : null)
      || null;
    if (orderToCancel) {
      try {
        await window.api.local.orders.cancel(orderToCancel, reason, wsId);
        fetchPendingTabs();
      } catch { /* non-critical */ }

      // Firestore sync: update the order document directly when online.
      window.api.firestore.orders.update(wsId, orderToCancel, {
        orderStatus: 'cancelled',
        cancelReason: reason,
      }).catch(() => {});
    }

    // Clear the order locally
    resetOrderState();
    setShowDiscountInput(false);
    setOrderPlaced(false);
    setShowCancelModal(false);
    setActiveCat('All');
    setSearchQuery('');

    // Release table on Dine-in cancellation
    if (needsTable && selectedTableId) {
      useTableStore.getState().updateTable(selectedTableId, {
        status: 'available', orderId: null as any, orderTotal: null as any,
      });
      setSelectedTableId(null);
    }
  };

  // ── Coupon actions ──

  const handleApplyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) return;
    const wsId = staffProfile?.workspaceId;
    if (!wsId) { setCouponError('Not signed in'); return; }
    if (orderItems.length === 0) { setCouponError('Add items to the order first'); return; }

    setIsApplyingCoupon(true);
    setCouponError(null);
    try {
      const result = await window.api.firestore.coupons.getByCode(wsId, code);
      if (!result.success) {
        setCouponError(result.error ?? 'Failed to look up coupon');
        return;
      }
      const coupon = result.coupon as CouponData | null;
      if (!coupon) {
        setCouponError(`Coupon "${code}" not found`);
        return;
      }
      if (!isCouponValid(coupon)) {
        setCouponError(`Coupon "${code}" is expired, inactive, or has reached its usage limit`);
        return;
      }
      // Apply against the after-manual-discount amount
      const cr = applyCouponDiscount(afterManualDiscount, coupon);
      if (!cr.valid) {
        setCouponError(cr.reason ?? 'Coupon cannot be applied to this order');
        return;
      }
      setAppliedCoupon(coupon);
      setCouponResult(cr);
      if (cr.type === 'free_product') {
        notifySuccess(`Coupon applied: FREE ${cr.freeProduct}!`);
      } else if (cr.type === 'free_delivery') {
        notifySuccess('Coupon applied: Free Delivery!');
      } else {
        notifySuccess(`Coupon applied: ${money(cr.discount)} off!`);
      }
    } catch (err: any) {
      setCouponError(err?.message ?? 'Failed to apply coupon');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleClearCoupon = () => {
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponResult(null);
    setCouponError(null);
    notifyInfo('Coupon removed');
  };

  // ── Online detection ──
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  /** Extract plain-data printer settings — no functions, IPC-safe. */
  function getPrinterSettings() {
    return {
      printerType: s.printerType, printerName: s.printerName,
      printerIp: s.printerIp, printerConnection: s.printerConnection,
      useRealPrinter: s.useRealPrinter, autoPrintKOT: s.autoPrintKOT,
      duplicateKOT: s.duplicateKOT, customerCopy: s.customerCopy,
      printGST: s.printGST, printLogo: s.printLogo, kotFormat: s.kotFormat,
    };
  }

  // ── Payment ──
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // ── Pending order tabs (Quick Bill + PickUp) ──
  interface PendingTab { orderNumber: string; total: number; itemCount: number; createdAt: string; customerName?: string; }
  const [pendingTabs, setPendingTabs] = useState<PendingTab[]>([]);
  const [activePendingOrderNumber, setActivePendingOrderNumber] = useState<string | null>(null);

  /** Map UI tab name → stored order_type value */
  const storedOrderType = activeTab === 'PickUp' ? 'Takeaway' : activeTab;

  const fetchPendingTabs = async () => {
    if (activeTab !== 'Quick Bill' && activeTab !== 'PickUp') { setPendingTabs([]); return; }
    try {
      const result = await window.api.local.orders.listPending(storedOrderType);
      if (result.success) setPendingTabs((result.pending || []) as PendingTab[]);
    } catch { /* non-critical */ }
  };

  // Refresh on tab switch and after KOT/payment
  useEffect(() => { fetchPendingTabs(); }, [activeTab]);
  // Also refresh after orderPlaced changes (KOT saved) or payment completes
  useEffect(() => { fetchPendingTabs(); }, [orderPlaced]);

  // ── Shift to Table / Shift Table ──
  const [showShiftToTablePicker, setShowShiftToTablePicker] = useState(false);
  const [showShiftTablePicker, setShowShiftTablePicker] = useState(false);

  /** Convert Quick Bill or PickUp into a Dine-in order assigned to a table — preserve cart. */
  const shiftToTable = (table: TableData) => {
    // If the order was already KOT'd, update its type + table in local SQLite
    // so the PickUp pending strip doesn't show a stale chip for it.
    const orderToShift = activePendingOrderNumber || null;
    if (orderToShift) {
      window.api.local.orders.updateType(orderToShift, 'Dine-in', table.id).then(() => {
        fetchPendingTabs();
      }).catch(() => {});
    }
    // Attach the order to the destination table so payment reuses its number.
    useTableStore.getState().updateTable(table.id, {
      status: 'occupied',
      orderTotal: total,
      ...(orderToShift ? { orderId: orderToShift } : {}),
    });
    setActiveTab('Dine-in');
    setSelectedTableId(table.id);
    setShowShiftToTablePicker(false);
    notifyInfo(`Shifted to ${table.name}`);
  };

  /** Move an existing Dine-in order from its current table to a different table. */
  const shiftTable = (newTable: TableData) => {
    const srcOrderId = selectedTable?.orderId ?? null;
    const srcOrderTotal = selectedTable?.orderTotal ?? null;
    if (srcOrderId) {
      window.api.local.orders.updateType(srcOrderId, 'Dine-in', newTable.id).catch(() => {});
    }
    if (selectedTableId) {
      useTableStore.getState().updateTable(selectedTableId, {
        status: 'available', orderId: null as any, orderTotal: null as any,
      });
    }
    useTableStore.getState().updateTable(newTable.id, {
      status: 'occupied',
      ...(srcOrderId ? { orderId: srcOrderId } : {}),
      ...(srcOrderTotal != null ? { orderTotal: srcOrderTotal } : {}),
    });
    setSelectedTableId(newTable.id);
    setShowShiftTablePicker(false);
    notifyInfo(`Moved to ${newTable.name}`);
  };

  // ── Wallet payment ──
  const [walletAmountUsed, setWalletAmountUsed] = useState(0);
  const selectedCustomerWalletCredit: number = (selectedCustomer as any)?.walletCredit ?? 0;
  const canUseWallet = Boolean(isOnline && selectedCustomerId && selectedCustomerWalletCredit > 0 && selectedCustomer);
  const maxWalletAmount = Math.min(selectedCustomerWalletCredit, total);
  const remainingAfterWallet = total - walletAmountUsed;
  // Reset wallet amount when customer or total changes
  useEffect(() => { setWalletAmountUsed(0); }, [selectedCustomerId, total]);
  // Zero the wallet amount whenever wallet is no longer usable (e.g. went offline).
  useEffect(() => { if (!canUseWallet) setWalletAmountUsed(0); }, [canUseWallet]);

  // ── Reset order state (shared by New Order, Delete, and tab switching) ──
  const resetOrderState = () => {
    setOrderItems([]);
    setAppliedCoupon(null);
    setCouponResult(null);
    setCouponCode('');
    setCouponError(null);
    setDiscountPercent(0);
    setKotNotes('');
    setSelectedCustomerId(null);
    setWalletAmountUsed(0);
    setActivePendingOrderNumber(null);
  };

  /**
   * Attempt a Firestore write with a short timeout.
   * Returns the result on success, or { success: false } if it times out
   * or the network is unreachable.
   */
  const firestoreWithTimeout = async <T,>(promise: Promise<T>, timeoutMs = 8000): Promise<T> => {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('OFFLINE_TIMEOUT')), timeoutMs),
    );
    return Promise.race([promise, timeout]);
  };

  /** Complete the bill: write locally FIRST, then sync to cloud in background. */
  const completePayment = async (andPrint: boolean) => {
    if (orderItems.length === 0 || isProcessingPayment) return;

    const wsId = staffProfile?.workspaceId;
    if (!wsId) {
      notifyError('Not signed in — please log in again.');
      return;
    }

    setIsProcessingPayment(true);
    try {
      console.log('[Billing] completePayment started — andPrint:', andPrint, 'orderItems:', orderItems.length);
      // ── 1. Reuse existing order number if there's an active KOT'd order, else generate new ──
      const existingOrderId = (selectedTable?.orderId) || ((activeTab === 'Quick Bill' || activeTab === 'PickUp') ? activePendingOrderNumber : null) || null;
      const orderNumber = existingOrderId || useSettingsStore.getState().getNextOrderNumber();
      const numericPart = orderNumber.slice(2);

      // ── 2. Determine order type from active tab ──
      const orderTypeMap: Record<string, string> = {
        'Dine-in': 'Dine-in', 'PickUp': 'Takeaway', 'Delivery': 'Delivery', 'Quick Bill': 'Quick Bill',
      };
      const orderType = orderTypeMap[activeTab] || 'Quick Bill';

      // ── 3. Build customer info ──
      const customerName = selectedCustomer?.name || (selectedTable?.customer ?? 'Walk-in Guest');
      const customerId = selectedCustomer?.id ?? '';
      const customerPhone = selectedCustomer?.phone || (activeTab === 'Delivery' ? deliveryPhone : '') || '';
      const custAddress = selectedCustomer?.address || (activeTab === 'Delivery' ? deliveryAddress : '') || '';
      const riderNotes = activeTab === 'Delivery' ? kotNotes : '';

      // ── 4. Build cart rows ──
      const cartRows = orderItems.map((item) => ({
        itemId: item.id, itemName: item.name, itemPrice: item.price, qty: item.qty, note: '',
      }));

      // ── 5. Build the order document ──
      const computedNetSubtotal = subtotal - discount;
      const tax = cgst + sgst;
      const useWallet = walletAmountUsed > 0 && selectedCustomerId && canUseWallet;
      const effectivePaymentMethod = useWallet
        ? (remainingAfterWallet > 0 ? 'Split (Wallet + Cash)' : 'Wallet')
        : 'Cash';

      const orderData = {
        orderNumber, billNumber: numericPart, kotNumber: numericPart,
        orderType,
        table: activeTab === 'Dine-in' ? (selectedTableId ?? '') : '',
        source: 'desktop', notes: kotNotes,
        customer: customerName, customerId, phone: customerPhone,
        deliveryAddress: custAddress, riderNotes,
        cartRows,
        totals: { subtotal, discount, netSubtotal, serviceCharges: 0, tax, total, cgst, sgst },
        discountType: discountPercent > 0 ? 'percentage' : (couponResult ? couponResult.type : 'none'),
        discountPercent,
        couponCode: appliedCoupon?.code ?? '', couponId: appliedCoupon?.id ?? '',
        couponDiscount, couponType: couponResult?.type ?? '',
        taxRates: { cgst: s.cgstRate, sgst: s.sgstRate },
        taxBreakdown: { cgst, sgst },
        currency: s.currency,
        total, paidAmount: total, dueAmount: 0,
        walletAmountUsed: useWallet ? walletAmountUsed : 0,
        paymentStatus: 'paid', paymentMethod: effectivePaymentMethod,
        // Orders paid without ever being KOT'd still need a terminal status so
        // they don't read as 'pending' on the KDS/reports; KOT'd orders keep the
        // kitchen-owned status (createOrder merges, so omitting it preserves it).
        ...(existingOrderId ? {} : { orderStatus: 'served' }),
        lastPaymentId: '', lastPaymentAt: '',
        createdBy: staffProfile?.staffUid ?? 'unknown',
        staffName: staffProfile?.staffName ?? 'Unknown',
        staffId: staffProfile?.staffUid ?? 'unknown',
        workspaceId: wsId, businessType: 'restaurant', ownerId: wsId,
      };

      // ═══ STEP WALLET: Debit wallet FIRST (live Firestore balance check) ═══
      if (useWallet) {
        console.log('[Billing] STEP WALLET: Debiting wallet — amount:', walletAmountUsed, 'customerId:', selectedCustomerId);
        const walletResult = await window.api.firestore.wallet.transactionAdd(wsId, selectedCustomerId!, {
          type: 'debit',
          amount: walletAmountUsed,
          source: 'order_payment',
          sourceId: orderNumber,
          note: `Order payment — ${orderType}`,
        });
        if (!walletResult.success) {
          throw new Error(`Wallet payment failed: ${walletResult.error ?? 'Transaction rejected'}`);
        }
        console.log('[Billing] STEP WALLET SUCCEEDED: wallet debited, new balance:', walletResult.newWalletCredit);
      }

      // ═══ STEP A: Write to LOCAL SQLite (instant — milliseconds) ═══
      console.log('[Billing] STEP A: Attempting local SQLite write — orderNumber:', orderNumber);
      if (!window.api?.local?.orders?.write) {
        const available = window.api ? Object.keys(window.api) : 'window.api is undefined';
        console.error('[Billing] window.api shape:', available);
        console.error('[Billing] window.api.local:', window.api?.local);
        throw new Error('Local database is not available. Please restart the app. Subsystems present: ' + String(available));
      }
      const localResult = await window.api.local.orders.write(orderData as any);
      if (!localResult.success) {
        console.error('[Billing] STEP A FAILED: local SQLite write returned success=false — error:', localResult.error);
        throw new Error(`Local write failed: ${localResult.error ?? 'unknown error'}`);
      }
      console.log('[Billing] STEP A SUCCEEDED: local SQLite write complete — orderId:', localResult.orderId);

      // ═══ STEP B: Success immediately — the sale is done ═══
      console.log('[Billing] STEP B: Local write confirmed, resetting cart and notifying UI');
      const paymentBreakdown = useWallet
        ? (remainingAfterWallet > 0
          ? `Wallet: ${money(walletAmountUsed)} + Cash: ${money(remainingAfterWallet)}`
          : `Wallet: ${money(walletAmountUsed)}`)
        : `${money(total)}`;
      notifySuccess(`Bill Paid — ${paymentBreakdown} (${orderNumber})`);
      if (andPrint) {
        // Print-only copy — the Firestore/SQLite orderData above is not modified.
        const cleanOrderData = JSON.parse(JSON.stringify(orderData));
        cleanOrderData.restaurantInfo = {
          ...(cleanOrderData.restaurantInfo ?? {}),
          currency: currencyCode,
          currencySymbol: currencyOverride,
        };
        window.api.printer.printBill(cleanOrderData, getPrinterSettings()).then((pr: any) => {
          if (pr.success) notifyInfo('Bill sent to printer (test mode — saved to print-jobs)');
          else notifyError(`Print failed: ${pr.error}`);
        }).catch((e: any) => notifyError(`Print error: ${e.message}`));
      }

      // Release table on Dine-in payment
      if (needsTable && selectedTableId) {
        useTableStore.getState().updateTable(selectedTableId, {
          status: 'available', orderId: null as any, orderTotal: null as any,
        });
      }

      // Reset cart
      resetOrderState();
      setShowDiscountInput(false);
      setOrderPlaced(false);
      setSelectedTableId(null);
      if (activeTab === 'Delivery') resetDeliveryForm();
      setTimeout(() => fetchPendingTabs(), 200);

      // ═══ STEP C: Background cloud sync (fire-and-forget — never blocks) ═══
      console.log('[Billing] STEP C: Enqueuing background cloud sync — orderNumber:', orderNumber);
      const syncToCloud = async () => {
        try {
          // Order → Firestore
          console.log('[Billing] STEP C-1: Firestore order.create attempted — orderNumber:', orderNumber);
          const orderResult = await firestoreWithTimeout(
            window.api.firestore.orders.create(wsId, orderNumber, orderData as any),
          );
          console.log('[Billing] STEP C-1: Firestore order.create result:', JSON.stringify(orderResult));
          if (orderResult?.success) {
            // Payment → Firestore
            console.log('[Billing] STEP C-2: Firestore payment.create attempted — orderId:', orderNumber);
            const paymentResult = await firestoreWithTimeout(
              window.api.firestore.payments.createWithId(wsId, `PMT-${orderNumber}`, {
                orderId: orderNumber, amountCents: remainingAfterWallet * 100, method: useWallet ? 'wallet+cash' : 'cash', status: 'paid',
                processedBy: staffProfile?.staffUid ?? 'unknown', tipCents: 0,
                reference: orderNumber, notes: useWallet ? `Wallet: ${walletAmountUsed}, Cash: ${remainingAfterWallet} — ${orderType} order — ${customerName}` : `${orderType} order — ${customerName}`,
              }),
            );
            console.log('[Billing] STEP C-2: Firestore payment.create result:', JSON.stringify(paymentResult));
            if (paymentResult?.success && paymentResult.id) {
              // Link payment back
              console.log('[Billing] STEP C-3: Linking payment to order — paymentId:', paymentResult.id);
              window.api.firestore.orders.update(wsId, orderNumber, {
                lastPaymentId: paymentResult.id, lastPaymentAt: new Date().toISOString(),
              } as any).catch((e) => {
                console.error('[Billing] STEP C-3 FAILED: link payment —', e?.message ?? e, e?.stack ?? '');
              });
            }
            // Coupon usage
            if (appliedCoupon?.id) {
              console.log('[Billing] STEP C-4: Incrementing coupon usage — couponId:', appliedCoupon.id);
              window.api.firestore.coupons.incrementUsage(wsId, appliedCoupon.id).catch((e) => {
                console.error('[Billing] STEP C-4 FAILED: increment coupon —', e?.message ?? e, e?.stack ?? '');
              });
            }
            console.log('[Billing] STEP C: Cloud sync COMPLETED for', orderNumber);
          } else {
            console.warn('[Billing] STEP C: Cloud sync DEFERRED for', orderNumber, '(orderResult.success was falsy):', JSON.stringify(orderResult));
          }
        } catch (err: any) {
          console.error('[Billing] STEP C FAILED: Cloud sync threw for', orderNumber, '—', err?.message ?? err, err?.stack ?? '');
        }
      };
      syncToCloud();

    } catch (err: any) {
      // Local write failures end up here — network failures are handled in the background.
      // ⚠️ EDGE CASE: If the wallet debit succeeded (STEP WALLET) but the local write (STEP A)
      // failed, the wallet has already been charged. The error message tells the cashier to
      // verify with the owner. This is rare and recoverable by humans — we do not build
      // complex compensation logic for it.
      const walletWasCharged = walletAmountUsed > 0 && selectedCustomerId && err?.message && !err.message.includes('Wallet payment failed');
      console.error('[Billing] completePayment FAILED at outer catch — message:', err?.message ?? err);
      console.error('[Billing] completePayment FAILED — full error:', err);
      if (err?.stack) console.error('[Billing] completePayment FAILED — stack:', err.stack);
      if (walletWasCharged) {
        notifyError(`⚠️ Wallet was charged ${money(walletAmountUsed)} but order save failed. Please verify with owner. Error: ${err.message}`);
      } else {
        notifyError(userFriendlyError(err, 'processing payment'));
      }
      // Do NOT clear cart on local write failure
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const selectCustomer = (id: string | null) => { setSelectedCustomerId(id); setShowCustomerModal(false); setCustomerSearchQuery(''); setShowAddCustomerForm(false); };
  const handleQuickAddCustomer = async () => {
    if (!newCustName.trim() || !newCustPhone.trim()) return;
    const wsId = staffProfile?.workspaceId;
    if (!wsId) { notifyError('Not signed in'); return; }
    try {
      const result = await window.api.firestore.customers.create(wsId, {
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        address: newCustAddress.trim() || undefined,
      } as any);
      if (!result.success) throw new Error(result.error ?? 'Failed to create customer');
      const cust = { id: result.id, name: newCustName.trim(), phone: newCustPhone.trim(), address: newCustAddress.trim() };
      setFirestoreCustomers((prev: any[]) => [cust as any, ...prev]);
      setSelectedCustomerId(result.id!);
      setShowAddCustomerForm(false);
      setShowCustomerModal(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustAddress('');
      setCustomerSearchQuery('');
      notifySuccess('Customer added');
    } catch (err: any) {
      notifyError(userFriendlyError(err, 'creating customer'));
    }
  };
  const clearCustomer = () => { setSelectedCustomerId(null); setGuestCount(4); setKotNotes(''); };
  const [showDeleteCustConfirm, setShowDeleteCustConfirm] = useState(false);
  const [editCustomerMode, setEditCustomerMode] = useState(false);
  const [editCustName, setEditCustName] = useState('');
  const [editCustPhone, setEditCustPhone] = useState('');

  // ── Delivery/PickUp customer form ──
  const [deliveryStep, setDeliveryStep] = useState<'customer' | 'menu'>('customer');
  const [deliveryName, setDeliveryName] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  const needsCustomerForm = activeTab === 'Delivery';

  const handleDeliveryContinue = async () => {
    if (!deliveryName.trim()) { setDeliveryError('Customer name is required'); return; }
    if (!deliveryPhone.trim()) { setDeliveryError('Phone number is required'); return; }
    setDeliveryError(null);
    setDeliveryLoading(true);

    try {
      // Check local state for existing customer by phone
      const existing = firestoreCustomers.find((c: any) => c.phone === deliveryPhone.trim());
      if (existing) {
        setSelectedCustomerId(existing.id);
      } else {
        // Try to create the customer in Firestore
        const wsId = staffProfile?.workspaceId;
        if (wsId) {
          try {
            const result = await window.api.firestore.customers.create(wsId, {
              name: deliveryName.trim(),
              phone: deliveryPhone.trim(),
              address: deliveryAddress.trim() || undefined,
            } as any);
            if (result.success && result.id) {
              const cust = { id: result.id, name: deliveryName.trim(), phone: deliveryPhone.trim(), address: deliveryAddress.trim() };
              setFirestoreCustomers((prev: any[]) => [cust, ...prev]);
              setSelectedCustomerId(result.id);
            }
          } catch { /* Firestore unavailable — proceed with name/phone fallback */ }
        }
        // If we couldn't get a customer ID (no wsId, Firestore down, etc.),
        // the order-write code uses deliveryName/deliveryPhone/deliveryAddress
        // directly as fallbacks, so it's safe to proceed without a selectedCustomerId.
      }
      setDeliveryStep('menu');
    } finally {
      setDeliveryLoading(false);
    }
  };

  const resetDeliveryForm = () => {
    setDeliveryStep('customer');
    setDeliveryName('');
    setDeliveryPhone('');
    setDeliveryAddress('');
    setSelectedCustomerId(null);
    setOrderItems([]);
  };

  const startEditCustomer = () => {
    if (!selectedCustomer) return;
    setEditCustName(selectedCustomer.name);
    setEditCustPhone(selectedCustomer.phone);
    setEditCustomerMode(true);
  };
  const saveEditCustomer = async () => {
    if (!selectedCustomerId || !editCustName.trim()) return;
    const wsId = staffProfile?.workspaceId;
    if (wsId) {
      try {
        await window.api.firestore.customers.update(wsId, selectedCustomerId, {
          name: editCustName.trim(), phone: editCustPhone.trim(),
        } as any);
        setFirestoreCustomers((prev: any[]) => prev.map((c: any) =>
          c.id === selectedCustomerId ? { ...c, name: editCustName.trim(), phone: editCustPhone.trim() } : c,
        ));
      } catch { /* non-critical */ }
    }
    setEditCustomerMode(false);
  };
  const confirmDeleteCustomer = () => {
    setShowDeleteCustConfirm(true);
  };
  const executeDeleteCustomer = async () => {
    if (selectedCustomerId) {
      const wsId = staffProfile?.workspaceId;
      if (wsId) {
        try {
          await window.api.firestore.customers.update(wsId, selectedCustomerId, { status: 'Inactive' } as any);
          setFirestoreCustomers((prev: any[]) => prev.filter((c: any) => c.id !== selectedCustomerId));
          notifyInfo('Customer deactivated');
        } catch { /* non-critical */ }
      }
    }
    clearCustomer();
    setShowDeleteCustConfirm(false);
  };

  const needsTable = activeTab === 'Dine-in';
  // Right panel: Dine-in needs a table selected; Delivery needs customer form completed;
  // Quick Bill & PickUp always show the menu + cart immediately (no customer form).
  const showRightPanel =
    activeTab === 'Dine-in' ? !!selectedTableId :
    activeTab === 'Delivery' ? deliveryStep === 'menu' :
    true; // Quick Bill, PickUp

  // ── Auto-select table when coming from Tables page ──
  useEffect(() => {
    if (passedTableId && !selectedTableId) {
      const table = tables.find((t) => t.id === passedTableId);
      if (table) selectTable(table);
    }
  }, [passedTableId]); // eslint-disable-line

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-pos-ground select-none font-sans">
      <IconBar />
      <div className="flex flex-1 flex-col min-w-0 ml-rail">
        {/* Header */}
        <header className="flex items-center h-[48px] px-4 bg-pos-bar border-b border-pos-card-border shrink-0">
          <h1 className="text-[14px] font-bold text-pos-ink tracking-tight">Nexora Solution</h1>
          <span className="h-4 w-px bg-pos-card-border mx-2.5" />
          <span className="text-[11px] text-pos-muted font-medium">Enterprise POS</span>
          <div className="flex-1 drag-region h-full" />
          <div className="flex items-center gap-3 no-drag">
            <span className="text-[11px] text-pos-muted flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-pos-muted" />02:45 PM</span>
            <div className="flex items-center gap-1.5 text-[11px] text-pos-muted">
              <div className="h-6 w-6 rounded-full bg-pos-primary-soft flex items-center justify-center"><User className="h-3 w-3 text-pos-primary" /></div>
              Admin <ChevronDown className="h-3 w-3 text-pos-muted" />
            </div>
          </div>
        </header>

        {/* Top Tab Bar */}
        <div className="flex items-center h-[40px] bg-pos-bar border-b border-pos-card-border shrink-0">
          {availableTabs.map((tab) => (
            <button key={tab} onClick={() => {
              if (tab === activeTab) return;
              // Leaving Dine-in: free the table if it has no saved order.
              if (needsTable && selectedTableId) {
                const leavingTable = tables.find((t) => t.id === selectedTableId);
                if (leavingTable && !leavingTable.orderId) {
                  useTableStore.getState().updateTable(selectedTableId, { status: 'available', orderTotal: null as any });
                }
              }
              setActiveTab(tab);
              resetOrderState();
              if (tab === 'Delivery') resetDeliveryForm();
              if (tab !== 'Dine-in') setSelectedTableId(null);
            }}
              className={cn('flex-1 h-full text-[11px] font-semibold transition-colors border-b-2', activeTab === tab ? 'text-pos-primary border-pos-primary bg-white' : 'text-pos-muted border-transparent hover:text-pos-muted hover:bg-pos-ground')}
            >{tab}</button>
          ))}
        </div>

        {/* Sub-header */}
        <div className="flex items-center h-[32px] px-3 bg-pos-bar border-b border-pos-card-border shrink-0 gap-1.5">
          {needsTable && selectedTableId && (
            <button onClick={deselectTable} className="flex items-center gap-1 text-[10px] text-pos-primary font-medium hover:underline">
              <ArrowLeft className="h-3 w-3" />Back to Tables
            </button>
          )}
          {needsCustomerForm && deliveryStep === 'menu' && (
            <button onClick={() => setDeliveryStep('customer')} className="flex items-center gap-1 text-[10px] text-pos-primary font-medium hover:underline">
              <ArrowLeft className="h-3 w-3" />Edit Customer
            </button>
          )}
          {needsTable && selectedTableId && selectedTable && (
            <span className="text-[10px] text-pos-muted font-semibold">{selectedTable.name} · {selectedTable.section} · {selectedTable.capacity} seats</span>
          )}
          {needsCustomerForm && deliveryStep === 'menu' && selectedCustomer && (
            <span className="text-[10px] text-pos-muted font-semibold">{selectedCustomer.name} · {selectedCustomer.phone}</span>
          )}
          {!needsTable && !needsCustomerForm && <span className="text-[10px] text-pos-muted font-medium">{activeTab} Order</span>}

          {/* ── Pending Order Tabs (Quick Bill + PickUp) ── */}
          {(activeTab === 'Quick Bill' || activeTab === 'PickUp') && pendingTabs.length > 0 && (
            <div className="flex items-center gap-1 ml-2 overflow-x-auto">
              {pendingTabs.map((tab) => (
                <button
                  key={tab.orderNumber}
                  onClick={() => {
                    if (activePendingOrderNumber === tab.orderNumber) return;
                    restoreOrder(tab.orderNumber, tab.orderNumber).then((ok) => {
                      if (ok) setActivePendingOrderNumber(tab.orderNumber);
                    });
                  }}
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 text-[9px] font-medium rounded whitespace-nowrap transition-colors border',
                    activePendingOrderNumber === tab.orderNumber
                      ? 'bg-pos-primary text-white border-pos-primary'
                      : 'bg-white text-pos-muted border-pos-card-border hover:border-pos-primary hover:text-pos-primary',
                  )}
                >
                  {activeTab === 'PickUp' && tab.customerName && tab.customerName !== 'Walk-in Guest'
                    ? tab.customerName
                    : tab.orderNumber}
                  <span className="opacity-70">· {money(tab.total)}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex-1" />

          {/* ── Unsaved warning ── */}
          {showNewOrderConfirm && (
            <span className="text-[9px] text-red-500 font-medium mr-1">Unsaved items — click again to confirm</span>
          )}

          <button onClick={() => { newOrder(); if (needsCustomerForm) resetDeliveryForm(); }} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-white bg-pos-primary hover:bg-pos-primary-dark rounded transition-colors"><Plus className="h-3 w-3" />New Order</button>
        </div>

        {/* WORKSPACE */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT SIDE: Table View OR Menu Grid */}
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            {needsTable && !selectedTableId ? (
              /* ═══ TABLE VIEW (Dine-in) ═══ */
              <>
                {/* Section tabs */}
                <div className="flex items-center h-[34px] px-3 border-b border-pos-card-border shrink-0 gap-1 bg-pos-bar">
                  {sections.map((sec) => (
                    <button key={sec} onClick={() => setActiveSection(sec)}
                      className={cn('px-2.5 py-1 text-[9px] font-semibold rounded whitespace-nowrap transition-colors', activeSection === sec ? 'bg-pos-primary text-white' : 'text-pos-muted hover:bg-white')}>{sec}</button>
                  ))}
                  <div className="flex-1" />
                  <div className="flex items-center gap-2 text-[9px] text-pos-muted">
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.tableColors.free }} />{availableCount} Free</span>
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.tableColors.itemsInKOT }} />{occupiedCount} Occupied</span>
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.tableColors.reserved }} />{reservedCount} Reserved</span>
                  </div>
                  <div className="relative ml-1">
                    <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-pos-muted" />
                    <input type="text" placeholder="Find table..." value={tableSearch} onChange={(e) => setTableSearch(e.target.value)}
                      className="h-[22px] w-28 pl-6 pr-2 text-[9px] bg-white border border-pos-card-border rounded focus:outline-none focus:ring-1 focus:ring-pos-primary" />
                  </div>
                </div>

                {/* Table Cards */}
                <div className="flex-1 overflow-auto p-3">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7 gap-2.5">
                    {filteredTables.map((table) => {
                      const isAvail = table.status === 'available';
                      const isOcc = table.status === 'occupied';
                      const isRes = table.status === 'reserved';
                      const isBill = table.status === 'billing';
                      const isSel = table.id === selectedTableId;
                      const tc = s.tableColors;
                      const statusColor = isSel ? tc.selected : isAvail ? tc.free : isOcc ? tc.itemsInKOT : isBill ? tc.billSaved : isRes ? tc.reserved : 'rgb(var(--pos-muted))';
                      return (
                        <button key={table.id} onClick={() => selectTable(table)}
                          style={{
                            borderColor: isSel ? tc.selected : `${statusColor}40`,
                            backgroundColor: isSel ? `${tc.selected}10` : isAvail ? 'white' : `${statusColor}10`,
                            boxShadow: isSel ? `0 0 0 2px ${tc.selected}30` : undefined,
                          }}
                          className="relative text-left p-3 rounded-xl border-2 transition-all duration-150 hover:shadow-md hover:-translate-y-0.5">
                          <span className="absolute top-2 right-2 h-2 w-2 rounded-full"
                            style={{ backgroundColor: statusColor }}
                            data-animate={isOcc || isSel} />
                          <p className="text-[12px] font-bold text-pos-ink leading-tight">{table.name}</p>
                          <p className="text-[8px] text-pos-muted mt-0.5">{table.section}</p>
                          <div className="flex items-center gap-1 mt-1.5 text-[9px] text-pos-muted">
                            <UsersIcon className="h-3 w-3" /><span>{table.capacity} seats</span>
                          </div>
                          {(isOcc || isBill) && table.customer && (
                            <div className="mt-2 pt-2 border-t border-pos-card-border space-y-0.5">
                              <p className="text-[10px] font-medium text-pos-ink">{table.customer}</p>
                              <p className="text-[9px] text-pos-muted">{table.orderId} · {money(table.orderTotal ?? 0)}</p>
                              <p className="text-[8px] text-pos-muted">{table.time} · {table.guests} guests</p>
                            </div>
                          )}
                          {isRes && <div className="mt-2 pt-2 border-t border-pos-card-border"><p className="text-[9px] text-sky-600 font-medium">Reserved</p></div>}
                          {isAvail && <div className="mt-2 pt-2 border-t border-pos-card-border"><p className="text-[9px] text-pos-primary font-medium">Tap to open</p></div>}
                          {isSel && <div className="mt-2 pt-2 border-t border-pos-card-border"><p className="text-[9px] text-pos-prep-fg font-medium">Selected ✓</p></div>}
                        </button>
                      );
                    })}
                  </div>
                  {filteredTables.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 gap-2">
                      <p className="text-pos-muted text-xs">
                        {tables.length === 0
                          ? 'No tables loaded. Go to Settings → Menu Configuration to load tables.'
                          : 'No tables match your search.'}
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : needsCustomerForm && deliveryStep === 'customer' ? (
              /* ═══ DELIVERY / PICKUP CUSTOMER FORM ═══ */
              <div className="flex-1 flex items-center justify-center bg-pos-bar">
                <div className="w-full max-w-md bg-white border border-pos-card-border rounded-xl shadow-sm p-6 mx-4">
                  <div className="text-center mb-5">
                    <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-[15px] font-bold text-pos-ink">{activeTab} Order</h2>
                    <p className="text-[11px] text-content-secondary mt-1">Enter customer details to continue</p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-content mb-1">Customer Name *</label>
                      <input type="text" value={deliveryName} onChange={(e) => { setDeliveryName(e.target.value); setDeliveryError(null); }} placeholder="Enter customer name" autoFocus
                        className="w-full h-[34px] px-3 text-[11px] border border-pos-card-border rounded-lg focus:outline-none focus:ring-1 focus:ring-pos-primary" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-content mb-1">Phone Number *</label>
                      <input type="tel" value={deliveryPhone} onChange={(e) => { setDeliveryPhone(e.target.value); setDeliveryError(null); }} placeholder="+91 XXXXXXXXXX"
                        className="w-full h-[34px] px-3 text-[11px] border border-pos-card-border rounded-lg focus:outline-none focus:ring-1 focus:ring-pos-primary" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-content mb-1">Delivery Address</label>
                      <input type="text" value={deliveryAddress} onChange={(e) => { setDeliveryAddress(e.target.value); setDeliveryError(null); }} placeholder="Full address for delivery"
                        className="w-full h-[34px] px-3 text-[11px] border border-pos-card-border rounded-lg focus:outline-none focus:ring-1 focus:ring-pos-primary" />
                    </div>
                    {deliveryError && (
                      <p className="text-[10px] font-medium text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{deliveryError}</p>
                    )}
                    <div className="flex items-center gap-2 pt-2">
                      <button onClick={() => { setDeliveryName('Walk-in'); setDeliveryPhone('N/A'); setDeliveryError(null); setDeliveryStep('menu'); }}
                        className="flex-1 h-[38px] text-[11px] font-medium border border-pos-card-border text-pos-muted rounded-lg hover:bg-pos-ground transition-colors">
                        Skip (Walk-in)
                      </button>
                      <button onClick={handleDeliveryContinue} disabled={!deliveryName.trim() || !deliveryPhone.trim() || deliveryLoading}
                        className="flex-1 h-[38px] text-[11px] font-semibold bg-pos-primary text-white rounded-lg hover:bg-pos-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {deliveryLoading ? 'Creating customer…' : 'Continue to Menu →'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ═══ MENU GRID ═══ */
              <>
                {/* Categories + Search */}
                <div className="flex items-center h-[30px] px-3 border-b border-pos-card-border shrink-0 gap-0.5 bg-pos-bar overflow-x-auto">
                  <button onClick={() => setActiveCat('All')} className={cn('px-2.5 py-0.5 text-[9px] font-semibold rounded whitespace-nowrap', activeCat === 'All' ? 'bg-pos-primary text-white' : 'text-pos-muted hover:bg-white')}>All</button>
                  {menuCategories.map((cat) => (
                    <button key={cat} onClick={() => setActiveCat(cat)} className={cn('px-2.5 py-0.5 text-[9px] font-semibold rounded whitespace-nowrap', activeCat === cat ? 'bg-pos-primary text-white' : 'text-pos-muted hover:bg-white')}>{cat}</button>
                  ))}
                  <div className="flex-1" />
                  <div className="relative mr-1">
                    <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-pos-muted" />
                    <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-[22px] w-32 pl-6 pr-2 text-[9px] bg-white border border-pos-card-border rounded focus:outline-none focus:ring-1 focus:ring-pos-primary" />
                  </div>
                  <button onClick={() => navigate('/products')} className="flex items-center gap-1 px-2 py-0.5 text-[9px] text-pos-muted font-medium hover:text-pos-primary hover:bg-pos-primary-soft rounded transition-colors"><ExternalLink className="h-3 w-3" />Menu</button>
                </div>

                {/* Menu Cards */}
                <div className="flex-1 overflow-auto p-2">
                  {filteredMenu.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-pos-muted text-xs">No items found</div>
                  ) : (
                    <div className={cn('grid gap-1.5', s.compactItemView ? 'grid-cols-5 xl:grid-cols-7' : 'grid-cols-3 xl:grid-cols-4')}>
                      {filteredMenu.map((menu) => (
                        <button key={menu.id} onClick={() => addItem(menu)}
                          className={cn(
                            'text-left rounded-lg border bg-white transition-all cursor-pointer active:scale-[0.98] group',
                            'border-pos-card-border hover:border-pos-primary hover:shadow-md hover:-translate-y-0.5',
                            s.compactItemView ? 'p-2' : 'p-3',
                          )}>
                          {s.displayItemImage && menu.image && (
                            <img src={menu.image} alt={menu.name} className="w-full h-20 object-cover rounded-md mb-2"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          )}
                          <p className={cn(
                            'font-semibold text-pos-ink leading-snug line-clamp-2',
                            s.compactItemView ? 'text-[11px]' : 'text-[13px]',
                          )}>{menu.name}</p>
                          {s.displayItemDetails && (
                            <p className="text-[10px] text-pos-muted mt-0.5 truncate">{menu.category}</p>
                          )}
                          {s.displayItemCode && (
                            <p className="text-[8px] text-pos-muted font-mono mt-0.5">
                              SKU-{menu.id.slice(-6).toUpperCase()}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-pos-ground">
                            <span className={cn(
                              'font-bold text-pos-primary tabular-nums tracking-tight',
                              s.compactItemView ? 'text-[12px]' : 'text-[14px]',
                            )}>{money(menu.price)}</span>
                            {s.showPrepTime && typeof menu.prepTimeMinutes === 'number' && menu.prepTimeMinutes > 0 && (
                              <>
                                <span className="text-pos-axis text-[10px]">·</span>
                                <span className="text-[10px] text-pos-muted">~{menu.prepTimeMinutes}m</span>
                              </>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* RIGHT: Order Panel (show only when menu is visible) */}
          {showRightPanel && (
            <div className="w-[380px] flex flex-col border-l border-pos-card-border shrink-0 bg-white">
              {/* Table info */}
              {needsTable && selectedTable && (
                <div className="flex items-center justify-between px-3 h-[30px] border-b border-pos-card-border bg-pos-bar shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-pos-ink">{selectedTable.name}</span>
                    {s.customerNameOnTable && selectedTable.customer && <span className="text-[10px] text-pos-muted">· {selectedTable.customer}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {s.displayTimeOnTable && selectedTable.time && <span className="text-[10px] text-pos-muted">{selectedTable.time}</span>}
                    {s.orderStatusOnTable && <span className="text-[10px] text-content-secondary bg-pos-primary-soft px-1.5 py-0.5 rounded">Active</span>}
                    {s.kotNumberOnTable && selectedTable.orderId && <span className="text-[11px] font-semibold text-pos-primary">{selectedTable.orderId}</span>}
                  </div>
                </div>
              )}

              {/* Order Action Buttons */}
              {orderItems.length > 0 && (
                <div className="flex items-center gap-1 px-2.5 py-1.5 border-b border-pos-card-border bg-pos-bar shrink-0 flex-wrap">
                  <button onClick={() => { const first = orderItems[0]; if (first) startEditItem(first); }}
                    className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-medium text-pos-muted border border-pos-card-border rounded hover:bg-pos-ground hover:text-pos-ink transition-colors">
                    <Edit className="h-3 w-3" />Edit
                  </button>
                  <button onClick={deleteOrder}
                    className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-medium text-pos-cancel-fg border border-pos-card-border rounded hover:bg-red-50 transition-colors">
                    <Trash2 className="h-3 w-3" />Delete
                  </button>
                  {/* Shift to Table — Quick Bill / PickUp only */}
                  {(activeTab === 'Quick Bill' || activeTab === 'PickUp') && (
                    <button onClick={() => setShowShiftToTablePicker(true)}
                      className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-medium text-pos-primary border border-pos-primary/30 rounded hover:bg-pos-primary-soft transition-colors">
                      <LayoutGrid className="h-3 w-3" />Shift to Table
                    </button>
                  )}
                  {/* Shift Table — Dine-in only, already assigned */}
                  {needsTable && selectedTableId && (
                    <button onClick={() => setShowShiftTablePicker(true)}
                      className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-medium text-pos-muted border border-pos-card-border rounded hover:bg-pos-ground hover:text-pos-ink transition-colors">
                      <ArrowLeft className="h-3 w-3" />Shift Table
                    </button>
                  )}
                  <div className="flex-1" />
                  <button onClick={() => setShowPrintView(true)}
                    className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-medium text-pos-primary border border-pos-primary/30 rounded hover:bg-pos-primary-soft transition-colors">
                    <Eye className="h-3 w-3" />Print View
                  </button>
                </div>
              )}

              {/* Order Items */}
              <div className="flex-1 overflow-auto">
                <div className="p-2.5 space-y-1">
                  {orderItems.length === 0 ? (
                    <div className="text-center py-8 text-pos-muted text-[11px]"><Package className="h-8 w-8 mx-auto mb-2 opacity-30" />No items<br />Click menu to add</div>
                  ) : (
                    orderItems.map((item, idx) => (
                      <div key={item.id} className={cn('flex items-center gap-2 p-2 rounded-lg transition-all group border', idx === 0 ? 'bg-pos-cancel-bg border-pos-cancel-bg' : 'border-transparent hover:border-pos-card-border hover:bg-pos-bar')}>
                        {editingItemId === item.id ? (
                          // Inline edit mode
                          <div className="flex-1 space-y-1">
                            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus
                              className="w-full h-[24px] px-1.5 text-[10px] border border-pos-card-border rounded focus:outline-none focus:ring-1 focus:ring-pos-primary" />
                            <div className="flex items-center gap-1">
                              <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)}
                                className="w-16 h-[22px] px-1.5 text-[10px] border border-pos-card-border rounded focus:outline-none focus:ring-1 focus:ring-pos-primary" />
                              <button onClick={saveEditItem} className="text-[9px] px-2 py-0.5 bg-pos-primary text-white rounded font-medium">Save</button>
                              <button onClick={cancelEditItem} className="text-[9px] px-2 py-0.5 border border-pos-card-border rounded text-pos-muted">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-0 shrink-0">
                              <button onClick={() => changeQty(item.id, -1)} className="h-5 w-5 flex items-center justify-center rounded border border-pos-card-border text-pos-muted hover:text-pos-ink hover:bg-white active:scale-90"><Minus className="h-2.5 w-2.5" /></button>
                              <span className="w-5 text-center text-[11px] font-semibold tabular-nums">{item.qty}</span>
                              <button onClick={() => changeQty(item.id, 1)} className="h-5 w-5 flex items-center justify-center rounded border border-pos-card-border text-pos-muted hover:text-pos-ink hover:bg-white active:scale-90"><Plus className="h-2.5 w-2.5" /></button>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium text-pos-ink leading-tight">{item.name}</p>
                              <button onClick={() => startEditItem(item)} className="text-[8px] text-content-tertiary hover:text-pos-primary opacity-0 group-hover:opacity-100 transition-all"><Edit className="h-2.5 w-2.5 inline mr-0.5" />Edit</button>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[11px] font-semibold tabular-nums">{money(item.qty * item.price)}</span>
                              <button onClick={() => removeItem(item.id)} className="opacity-0 group-hover:opacity-100 text-pos-muted hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Customer / Table Info Section */}
                <div className="border-t border-pos-card-border mx-2.5" />
                <div className="px-3 py-2 space-y-1.5">
                  {/* Customer name row with Edit/Add/Delete */}
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <User className="h-3 w-3 text-pos-muted shrink-0" />
                    {editCustomerMode && selectedCustomer ? (
                      <div className="flex-1 flex items-center gap-1">
                        <input type="text" value={editCustName} onChange={(e) => setEditCustName(e.target.value)} autoFocus placeholder="Name"
                          className="flex-1 h-[22px] px-1.5 text-[10px] border border-pos-card-border rounded focus:outline-none focus:ring-1 focus:ring-pos-primary" />
                        <button onClick={saveEditCustomer} className="text-[9px] px-1.5 py-0.5 bg-pos-primary text-white rounded font-medium">Save</button>
                        <button onClick={() => setEditCustomerMode(false)} className="text-[9px] px-1.5 py-0.5 border border-pos-card-border rounded text-pos-muted">Cancel</button>
                      </div>
                    ) : (
                      <>
                        {selectedCustomer ? (
                          <span className="text-pos-primary font-semibold truncate">{selectedCustomer.name}</span>
                        ) : selectedTable?.customer ? (
                          <span className="text-pos-ink font-semibold">{selectedTable.customer}</span>
                        ) : (
                          <span className="text-pos-muted">Walk-in Customer</span>
                        )}
                        {/* Action buttons */}
                        <div className="flex items-center gap-1 ml-auto">
                          {selectedCustomer && (
                            <button onClick={startEditCustomer} className="p-1.5 text-pos-muted hover:text-pos-primary hover:bg-pos-primary-soft rounded transition-colors" title="Edit customer">
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => { setShowAddCustomerForm(false); setShowCustomerModal(true); }} className="p-1.5 text-pos-muted hover:text-pos-primary hover:bg-pos-primary-soft rounded transition-colors" title="Add/Select customer">
                            <UserPlus className="h-3.5 w-3.5" />
                          </button>
                          {selectedCustomer && (
                            <button onClick={confirmDeleteCustomer} className="p-1.5 text-pos-muted hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete customer">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {selectedCustomer && (
                            <button onClick={clearCustomer} className="p-1.5 text-pos-muted hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Remove from order">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  {(selectedCustomer || selectedTable?.customer) && (
                    <div className="flex items-center gap-1.5 text-[10px]"><Phone className="h-3 w-3 shrink-0 text-pos-muted" />
                      <span className="text-pos-muted text-[9px]">{selectedCustomer?.phone || 'From table order'}</span>
                    </div>
                  )}
                  {selectedTable && (
                    <div className="flex items-center gap-1.5 text-[10px] text-pos-muted">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="text-pos-muted text-[9px]">{selectedTable.section} · {selectedTable.name} · {selectedTable.capacity} seats</span>
                    </div>
                  )}
                  {selectedTable?.time && (
                    <div className="flex items-center gap-1.5 text-[10px] text-pos-muted">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span className="text-pos-muted text-[9px]">Since {selectedTable.time}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <FileText className="h-3 w-3 text-pos-muted shrink-0" />
                    <input type="text" value={kotNotes} onChange={(e) => setKotNotes(e.target.value)} placeholder="KOT notes..." className="flex-1 h-[22px] text-[9px] border border-pos-card-border rounded px-1.5 focus:outline-none focus:ring-1 focus:ring-pos-primary" />
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <UsersIcon className="h-3 w-3 text-pos-muted shrink-0" />
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => setGuestCount((g) => Math.max(1, g - 1))} className="h-[18px] w-[18px] flex items-center justify-center rounded border border-pos-card-border"><Minus className="h-2 w-2" /></button>
                      <span className="w-6 text-center text-[10px] font-semibold">{guestCount}</span>
                      <button onClick={() => setGuestCount((g) => Math.min(99, g + 1))} className="h-[18px] w-[18px] flex items-center justify-center rounded border border-pos-card-border"><Plus className="h-2 w-2" /></button>
                    </div>
                    <span className="text-pos-muted text-[9px] ml-1">Guests</span>
                  </div>
                </div>

                {/* Coupon */}
                <div className="px-3 pb-1 space-y-1">
                  {appliedCoupon ? (
                    <div className="flex items-center gap-1.5 bg-pos-primary-soft border border-pos-primary/20 rounded px-2 py-1.5">
                      <Ticket className="h-3 w-3 text-pos-primary shrink-0" />
                      <span className="text-[10px] font-semibold text-pos-primary">{appliedCoupon.code}</span>
                      {couponResult?.discount! > 0 && (
                        <span className="text-[9px] text-pos-muted">(-{money(couponResult!.discount)})</span>
                      )}
                      {couponResult?.type === 'free_product' && (
                        <span className="text-[9px] text-pos-muted">Free: {couponResult.freeProduct}</span>
                      )}
                      {couponResult?.type === 'free_delivery' && (
                        <span className="text-[9px] text-pos-muted">Free Delivery</span>
                      )}
                      <button onClick={handleClearCoupon} className="ml-auto p-0.5 text-pos-muted hover:text-red-500 rounded"><X className="h-3 w-3" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleApplyCoupon(); }}
                        placeholder="Coupon code..."
                        className="flex-1 h-[24px] px-2 text-[10px] border border-pos-card-border rounded focus:outline-none focus:ring-1 focus:ring-pos-primary"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={isApplyingCoupon || !couponCode.trim()}
                        className="h-[24px] px-2.5 text-[10px] font-semibold bg-pos-primary text-white rounded hover:bg-pos-primary-dark disabled:opacity-50 transition-colors"
                      >
                        {isApplyingCoupon ? '...' : 'Apply'}
                      </button>
                    </div>
                  )}
                  {couponError && (
                    <p className="text-[9px] text-red-500">{couponError}</p>
                  )}
                </div>

                {/* Discount */}
                <div className="px-3 pb-2 flex items-center gap-3">
                  {showDiscountInput ? (
                    <div className="flex items-center gap-1"><input type="number" min="0" max="100" step="any" value={discountPercent || ''} onChange={(e) => { const n = parseFloat(e.target.value); setDiscountPercent(Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0); }} className="w-12 h-6 text-[10px] border border-pos-card-border rounded px-1.5 text-center focus:outline-none focus:ring-1 focus:ring-pos-primary" /><span className="text-[10px] text-pos-muted">%</span><button onClick={() => setShowDiscountInput(false)} className="text-[10px] text-pos-primary font-medium">Done</button></div>
                  ) : (
                    <button onClick={() => setShowDiscountInput(true)} className="text-[10px] text-pos-primary font-medium hover:underline">+ Discount</button>
                  )}
                </div>
              </div>

              {/* Totals + Print & Save KOT */}
              <div className="border-t border-pos-card-border shrink-0">
                <div className="bg-pos-ground px-3 py-2 space-y-1.5 text-[11px]">
                  <div className="flex justify-between"><span className="text-pos-muted">Subtotal</span><span className="font-semibold tabular-nums">{money(subtotal)}</span></div>
                  {manualDiscount > 0 && <div className="flex justify-between"><span className="text-pos-muted">Discount ({discountPercent}%)</span><span className="font-semibold text-pos-cancel-fg tabular-nums">-{money(manualDiscount)}</span></div>}
                  {couponDiscount > 0 && <div className="flex justify-between"><span className="text-pos-muted">Coupon ({couponResult?.type})</span><span className="font-semibold text-pos-cancel-fg tabular-nums">-{money(couponDiscount)}</span></div>}
                  <div className="flex justify-between"><span className="text-pos-muted">CGST ({s.cgstRate}%)</span><span className="font-semibold tabular-nums">{money(cgst)}</span></div>
                  <div className="flex justify-between"><span className="text-pos-muted">SGST ({s.sgstRate}%)</span><span className="font-semibold tabular-nums">{money(sgst)}</span></div>
                </div>
                <div className="flex items-center justify-between px-3 py-2.5 bg-pos-primary"><span className="text-[13px] font-bold text-white">Total</span><span className="text-[13px] font-bold text-white tabular-nums">{money(total)}</span></div>
                {s.billDetailsOnTable && <div className="px-3 py-1 bg-pos-bar text-center text-[8px] text-content-tertiary">{s.billPrefix}#{s.startingBillNumber} · {s.billFooter}</div>}

                {/* ── Wallet Payment ── */}
                {canUseWallet && (
                  <div className="px-3 py-2 bg-pos-primary-soft border-b border-pos-primary-soft space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-pos-primary flex items-center gap-1">
                        <Wallet className="h-3.5 w-3.5" />Wallet Credit
                      </span>
                      <span className="text-[10px] font-bold text-pos-primary">{money(selectedCustomerWalletCredit)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-pos-muted whitespace-nowrap">Use wallet:</span>
                      <input
                        type="number"
                        min={0}
                        max={maxWalletAmount}
                        value={walletAmountUsed || ''}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setWalletAmountUsed(Math.max(0, Math.min(v, maxWalletAmount)));
                        }}
                        placeholder="0"
                        className="flex-1 h-[28px] px-2 text-[11px] border border-pos-primary-soft rounded focus:outline-none focus:ring-1 focus:ring-pos-primary bg-white"
                      />
                      <button
                        onClick={() => setWalletAmountUsed(maxWalletAmount)}
                        className="text-[9px] font-medium text-pos-primary hover:underline whitespace-nowrap"
                      >
                        Max
                      </button>
                    </div>
                    {walletAmountUsed > 0 && (
                      <div className="flex items-center justify-between text-[9px]">
                        <span className="text-pos-muted">Remaining (Cash/Card):</span>
                        <span className="font-bold text-pos-ink tabular-nums">{money(remainingAfterWallet)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Offline wallet notice */}
                {!isOnline && selectedCustomerId && selectedCustomerWalletCredit > 0 && (
                  <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-200 text-[9px] text-amber-700 flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    Wallet payment requires internet connection — cash/card only
                  </div>
                )}

                <div className="px-3 py-2 bg-white space-y-1.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={voidOrder} disabled={s.disableSaveBill} className={cn('flex items-center justify-center gap-1 h-8 text-[10px] font-medium border rounded active:scale-[0.98] transition-all', s.disableSaveBill ? 'opacity-40 cursor-not-allowed' : 'border-pos-card-border text-pos-cancel-fg hover:bg-red-50 hover:border-red-300')}><X className="h-3 w-3" />Cancel Order</button>
                    <button onClick={printAndSaveKOT} disabled={orderItems.length === 0 || s.disableSaveKOT || isSavingKot} className={cn('flex items-center justify-center gap-1 h-8 text-[10px] font-bold rounded active:scale-[0.98] transition-all', orderItems.length === 0 || s.disableSaveKOT || isSavingKot ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-pos-primary hover:bg-pos-primary-dark text-white')}><Printer className="h-3 w-3" />{isSavingKot ? 'Saving...' : 'Print & Save KOT'}</button>
                  </div>
                  {orderPlaced && <div className="text-center text-[10px] font-semibold text-success"><Check className="h-3.5 w-3.5 inline mr-1" />KOT Saved & Printed!</div>}

                  {/* Print Bill — Dine-in only, distinct from payment */}
                  {needsTable && selectedTableId && (
                    <div className="pt-1 border-t border-pos-card-border">
                      <button
                        onClick={handlePrintBill}
                        disabled={orderItems.length === 0}
                        className={cn(
                          'w-full flex items-center justify-center gap-1 h-8 text-[10px] font-bold rounded active:scale-[0.98] transition-all',
                          orderItems.length === 0
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-pos-primary-soft hover:bg-pos-primary-soft text-pos-primary border border-pos-primary/30',
                        )}
                      >
                        <FileText className="h-3 w-3" />Print Bill
                      </button>
                    </div>
                  )}

                  {/* Payment buttons */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-pos-card-border">
                    <button
                      onClick={() => completePayment(false)}
                      disabled={orderItems.length === 0 || isProcessingPayment}
                      className={cn(
                        'flex items-center justify-center gap-1 h-8 text-[10px] font-bold rounded active:scale-[0.98] transition-all',
                        orderItems.length === 0 || isProcessingPayment
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-pos-primary hover:bg-pos-primary-dark text-white',
                      )}
                    >
                      <Banknote className="h-3 w-3" />
                      {isProcessingPayment ? 'Processing...' : 'Payment Paid'}
                    </button>
                    <button
                      onClick={() => completePayment(true)}
                      disabled={orderItems.length === 0 || isProcessingPayment}
                      className={cn(
                        'flex items-center justify-center gap-1 h-8 text-[10px] font-bold rounded active:scale-[0.98] transition-all',
                        orderItems.length === 0 || isProcessingPayment
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-pos-primary-dark hover:bg-pos-primary-dark text-white',
                      )}
                    >
                      <Printer className="h-3 w-3" />
                      {isProcessingPayment ? 'Processing...' : 'Print and Paid'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <footer className="flex items-center justify-between h-[32px] px-3 bg-pos-deep shrink-0 gap-2">
          <div className="flex items-center gap-1">
            <button onClick={newOrder} className="flex items-center gap-1 h-[22px] px-2.5 text-[9px] font-semibold bg-white text-pos-deep rounded-sm hover:bg-gray-100 active:scale-[0.98] transition-all"><Plus className="h-3 w-3" />New Order</button>
            <button onClick={voidOrder} className="flex items-center gap-1 h-[22px] px-2 text-[9px] font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-sm active:scale-[0.98] transition-all"><MinusCircle className="h-3 w-3" />Cancel Order</button>
            <button onClick={() => { notifyPrint('Sending to printer...'); setTimeout(() => notifySuccess('Printed!'), 800); }} className="flex items-center gap-1 h-[22px] px-2 text-[9px] font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-sm active:scale-[0.98] transition-all"><Printer className="h-3 w-3" />Print</button>
          </div>
          <div className="flex items-center gap-3 text-[9px] text-white/60">
            <span>Table: <span className="text-white font-semibold">{selectedTable ? selectedTable.name : '—'}</span></span>
            <span>Items: <span className="text-white font-semibold">{orderItems.reduce((_s, i) => _s + i.qty, 0)}</span></span>
            <span>Total: <span className="text-white font-semibold">{money(total)}</span></span>
          </div>
          <span className="text-[9px] text-white/70 flex items-center gap-1.5">
            <span className="text-white/50">{currSymbol}</span>
            <span className="text-white font-semibold">{total.toLocaleString(currencyCode === 'INR' ? 'en-IN' : 'en-US')}</span>
          </span>
        </footer>
      </div>

      {/* ═══ DELETE CUSTOMER CONFIRMATION ═══ */}
      {showDeleteCustConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteCustConfirm(false); }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-[320px] bg-white rounded-xl shadow-2xl border border-pos-card-border p-6 text-center animate-slide-up">
            <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="text-[14px] font-bold text-pos-ink mb-1">Delete Customer?</h3>
            <p className="text-[11px] text-content-secondary mb-4">
              Are you sure you want to delete <span className="font-semibold text-pos-ink">{selectedCustomer?.name}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteCustConfirm(false)}
                className="flex-1 h-[34px] text-[11px] font-medium border border-pos-card-border text-pos-muted rounded-lg hover:bg-pos-ground transition-colors">
                Cancel
              </button>
              <button onClick={executeDeleteCustomer}
                className="flex-1 h-[34px] text-[11px] font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print View Modal */}
      {showPrintView && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowPrintView(false); }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-[360px] bg-white rounded-xl shadow-2xl border border-pos-card-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-pos-card-border bg-pos-bar">
              <h3 className="text-[13px] font-bold text-pos-ink">KOT Print Preview</h3>
              <button onClick={() => setShowPrintView(false)} className="p-1 rounded text-pos-muted hover:text-pos-ink hover:bg-pos-card-border"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4">
              {/* KOT Receipt */}
              <div className="bg-white border-2 border-dashed border-pos-card-border rounded-lg p-4 font-mono text-[10px] leading-relaxed">
                <div className="text-center font-bold text-[12px] mb-1">{s.restaurantName || 'Nexora Solution'}</div>
                <div className="text-center text-[9px] text-content-tertiary mb-1">{s.address}</div>
                {(s.phone || s.email) && <div className="text-center text-[8px] text-content-tertiary mb-1">{[s.phone, s.email].filter(Boolean).join(' · ')}</div>}
                {s.gstNo && <div className="text-center text-[8px] text-content-tertiary mb-2">GST: {s.gstNo}</div>}
                <div className="border-t border-dashed border-pos-card-border pt-2">
                  <div className="flex justify-between mb-0.5"><span>KOT No:</span><span className="font-bold">#{s.startingBillNumber}</span></div>
                  {selectedTable && <div className="flex justify-between mb-0.5"><span>Table:</span><span className="font-semibold">{selectedTable.name}</span></div>}
                  <div className="flex justify-between mb-0.5"><span>Date:</span><span>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
                  <div className="flex justify-between mb-0.5"><span>Time:</span><span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span></div>
                  {selectedCustomer && <div className="flex justify-between mb-0.5"><span>Customer:</span><span className="font-semibold">{selectedCustomer.name}</span></div>}
                  <div className="flex justify-between mb-0.5"><span>Guests:</span><span>{guestCount}</span></div>
                </div>
                <div className="border-t border-dashed border-pos-card-border mt-2 pt-2">
                  <div className="flex justify-between font-bold text-[9px] mb-1"><span>Item</span><span>Qty × Price</span><span>Amt</span></div>
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-[9px]">
                      <span className="truncate max-w-[120px]">{item.name}</span>
                      <span>{item.qty} × {money(item.price)}</span>
                      <span className="tabular-nums font-semibold">{money(item.qty * item.price)}</span>
                    </div>
                  ))}
                </div>
                {kotNotes && <div className="border-t border-dashed border-pos-card-border mt-2 pt-1 text-[9px]"><span className="font-semibold">Note:</span> {kotNotes}</div>}
                <div className="border-t border-dashed border-pos-card-border mt-2 pt-2">
                  <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{money(subtotal)}</span></div>
                  {discount > 0 && <div className="flex justify-between text-pos-cancel-fg"><span>Discount ({discountPercent}%)</span><span className="tabular-nums">-{money(discount)}</span></div>}
                  <div className="flex justify-between"><span>CGST ({s.cgstRate}%)</span><span className="tabular-nums">{money(cgst)}</span></div>
                  <div className="flex justify-between"><span>SGST ({s.sgstRate}%)</span><span className="tabular-nums">{money(sgst)}</span></div>
                  <div className="flex justify-between font-bold text-[11px] mt-1 pt-1 border-t border-pos-card-border"><span>TOTAL</span><span className="tabular-nums">{money(total)}</span></div>
                  {walletAmountUsed > 0 && (
                    <div className="mt-2 pt-2 border-t border-dashed border-pos-card-border">
                      <div className="flex justify-between text-[9px]"><span className="text-pos-primary font-semibold">Paid via Wallet</span><span className="tabular-nums font-semibold text-pos-primary">{money(walletAmountUsed)}</span></div>
                      {remainingAfterWallet > 0 && (
                        <div className="flex justify-between text-[9px] mt-0.5"><span className="text-pos-muted">Balance (Cash/Card)</span><span className="tabular-nums">{money(remainingAfterWallet)}</span></div>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-center text-[8px] text-content-tertiary mt-2">{s.billFooter}</div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="secondary" size="sm" onClick={() => setShowPrintView(false)}>Close</Button>
                <Button size="sm" leftIcon={<Printer className="h-3.5 w-3.5" />} onClick={() => { printAndSaveKOT(); setShowPrintView(false); }}>Print KOT</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) { setShowCustomerModal(false); setShowAddCustomerForm(false); setCustomerSearchQuery(''); } }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-pos-card-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-pos-card-border bg-pos-bar"><h3 className="text-[13px] font-bold text-pos-ink">{showAddCustomerForm ? 'Add Customer' : 'Select Customer'}</h3><button onClick={() => { setShowCustomerModal(false); setShowAddCustomerForm(false); }} className="p-1 rounded text-pos-muted hover:text-pos-ink hover:bg-pos-card-border"><X className="h-4 w-4" /></button></div>
            {showAddCustomerForm ? (
              <div className="p-4 space-y-3">
                <div><label className="block text-[10px] font-semibold text-pos-muted mb-1">Name *</label><input type="text" value={newCustName} onChange={(e) => setNewCustName(e.target.value)} placeholder="Name" autoFocus className="w-full h-[32px] px-2.5 text-[11px] border border-pos-card-border rounded-lg focus:outline-none focus:ring-1 focus:ring-pos-primary" /></div>
                <div><label className="block text-[10px] font-semibold text-pos-muted mb-1">Phone *</label><input type="tel" value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)} placeholder="+91 XXXXXXXXXX" className="w-full h-[32px] px-2.5 text-[11px] border border-pos-card-border rounded-lg focus:outline-none focus:ring-1 focus:ring-pos-primary" /></div>
                <div className="flex gap-2 pt-1"><button onClick={() => { setShowAddCustomerForm(false); setNewCustName(''); setNewCustPhone(''); }} className="flex-1 h-[34px] text-[11px] font-medium border border-pos-card-border text-pos-muted rounded-lg hover:bg-pos-ground">Back</button><button onClick={handleQuickAddCustomer} disabled={!newCustName.trim() || !newCustPhone.trim()} className="flex-1 h-[34px] text-[11px] font-semibold bg-pos-primary text-white rounded-lg hover:bg-pos-primary-dark disabled:opacity-50">Add & Select</button></div>
              </div>
            ) : (
              <>
                <div className="px-4 py-2.5 border-b border-pos-card-border"><div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-pos-muted" /><input type="text" value={customerSearchQuery} onChange={(e) => setCustomerSearchQuery(e.target.value)} placeholder="Search..." autoFocus className="w-full h-[34px] pl-8 pr-3 text-[11px] border border-pos-card-border rounded-lg focus:outline-none focus:ring-1 focus:ring-pos-primary" /></div></div>
                <div className="max-h-[300px] overflow-auto">
                  <button onClick={() => selectCustomer(null)} className={cn('w-full flex items-center gap-3 px-4 py-3 border-b border-pos-divider', !selectedCustomerId ? 'bg-pos-primary-soft' : 'hover:bg-pos-bar')}><div className="h-8 w-8 rounded-full bg-pos-ground flex items-center justify-center"><User className="h-4 w-4 text-pos-muted" /></div><div><p className="text-[12px] font-semibold text-pos-ink">Walk-in</p></div>{!selectedCustomerId && <Check className="h-4 w-4 text-pos-primary ml-auto" />}</button>
                  {filteredCustomers.map((cust) => (
                    <button key={cust.id} onClick={() => selectCustomer(cust.id)} className={cn('w-full flex items-center gap-3 px-4 py-3 border-b border-pos-divider', selectedCustomerId === cust.id ? 'bg-pos-primary-soft' : 'hover:bg-pos-bar')}><div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"><span className="text-[11px] font-bold text-pos-primary">{cust.name.charAt(0)}</span></div><div className="flex-1 min-w-0"><p className="text-[12px] font-semibold text-pos-ink truncate">{cust.name}</p><p className="text-[10px] text-pos-muted truncate">{cust.phone}</p></div>{selectedCustomerId === cust.id && <Check className="h-4 w-4 text-pos-primary" />}</button>
                  ))}
                </div>
                <div className="border-t border-pos-card-border px-4 py-2.5 bg-pos-bar"><button onClick={() => { setShowAddCustomerForm(true); setNewCustName(''); setNewCustPhone(''); }} className="w-full flex items-center justify-center gap-1.5 h-[34px] text-[11px] font-semibold text-pos-primary border border-dashed border-pos-primary/40 rounded-lg hover:bg-pos-primary-soft"><UserPlus className="h-3.5 w-3.5" />Add Customer</button></div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Shift to Table Picker (Quick Bill / PickUp → Dine-in) ── */}
      {showShiftToTablePicker && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowShiftToTablePicker(false); }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-pos-card-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-pos-card-border bg-pos-bar">
              <h3 className="text-[13px] font-bold text-pos-ink">Shift to Table</h3>
              <button onClick={() => setShowShiftToTablePicker(false)} className="p-1 rounded text-pos-muted hover:text-pos-ink hover:bg-pos-card-border"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[350px] overflow-auto p-2">
              {tables.length === 0 ? (
                <div className="text-center py-8 text-pos-muted text-[11px]">No tables loaded</div>
              ) : (
                tables.map((t) => (
                  <button key={t.id} onClick={() => shiftToTable(t)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-pos-bar border-b border-pos-divider text-left transition-colors">
                    <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-bold',
                      t.status === 'available' ? 'bg-emerald-50 text-emerald-600' :
                      t.status === 'occupied' ? 'bg-amber-50 text-amber-600' :
                      t.status === 'billing' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-500')}>
                      {t.name.slice(0, 3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-pos-ink">{t.name}</p>
                      <p className="text-[9px] text-pos-muted">{t.section} · {t.capacity} seats · {t.status}</p>
                    </div>
                    <span className="text-[9px] text-pos-primary font-medium">Select →</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Shift Table Picker (Dine-in: move to different table) ── */}
      {showShiftTablePicker && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowShiftTablePicker(false); }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-pos-card-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-pos-card-border bg-pos-bar">
              <h3 className="text-[13px] font-bold text-pos-ink">Shift Table — currently: {selectedTable?.name || '—'}</h3>
              <button onClick={() => setShowShiftTablePicker(false)} className="p-1 rounded text-pos-muted hover:text-pos-ink hover:bg-pos-card-border"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[350px] overflow-auto p-2">
              {tables.filter((t) => t.id !== selectedTableId && t.status === 'available').length === 0 ? (
                <div className="text-center py-8 text-pos-muted text-[11px]">No available tables to shift to</div>
              ) : (
                tables.filter((t) => t.id !== selectedTableId && t.status === 'available').map((t) => (
                  <button key={t.id} onClick={() => shiftTable(t)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-pos-bar border-b border-pos-divider text-left transition-colors">
                    <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-[10px] font-bold text-emerald-600">
                      {t.name.slice(0, 3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-pos-ink">{t.name}</p>
                      <p className="text-[9px] text-pos-muted">{t.section} · {t.capacity} seats · available</p>
                    </div>
                    <span className="text-[9px] text-pos-primary font-medium">Move →</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* ── Cancel Order Modal (shared component) ── */}
      <CancelOrderModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={confirmCancelOrder}
        orderIdentifier={activePendingOrderNumber || selectedTable?.orderId || undefined}
        isOnline={isOnline}
        workspaceId={staffProfile?.workspaceId || ''}
      />

    </div>
  );
}
