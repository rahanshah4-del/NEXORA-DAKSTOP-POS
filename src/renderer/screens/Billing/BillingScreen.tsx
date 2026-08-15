import React, { useState, useCallback } from 'react';
import { useOrders } from '@/presentation/hooks/useOrders';
import { useProducts } from '@/presentation/hooks/useProducts';
import { useCustomers } from '@/presentation/hooks/useCustomers';
import { usePayments } from '@/presentation/hooks/usePayments';
import { useTables } from '@/presentation/hooks/useTables';
import { notifySuccess, notifyError, notifyInfo } from '@/stores/toast-store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { SearchBar } from '@/components/shared/SearchBar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/utils/formatters';
import { OrderViewModel } from '@/presentation/viewModels/OrderViewModel';
import { cn } from '@/utils/cn';
import {
  Plus, Minus, Trash2, Search, ShoppingCart, CreditCard, Printer, X,
  UtensilsCrossed, ShoppingBag, Truck, Clock, User, StickyNote, Tag,
  Percent, Banknote, Wallet, Smartphone, ChevronDown,
} from 'lucide-react';

type OrderMode = 'dine_in' | 'takeaway' | 'delivery';

interface CartItem {
  productId: string; name: string; priceCents: number;
  quantity: number; notes: string;
}

const CATEGORIES = ['All', 'Mains', 'Starters', 'Drinks', 'Desserts', 'Sides'];

export const BillingScreen: React.FC = () => {
  const { createOrder, addItem, removeItem, isCreating, activeOrders } = useOrders() as any;
  const { products, searchProducts, refetchProducts } = useProducts() as any;
  const { customers, searchCustomers } = useCustomers() as any;
  const { processPayment } = usePayments() as any;
  const { tables, availableTables } = useTables() as any;

  const [mode, setMode] = useState<OrderMode>('dine_in');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [tipPercent, setTipPercent] = useState(0);
  const [customerSearch, setCustomerSearch] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [heldOrders, setHeldOrders] = useState<CartItem[][]>([]);

  // Cart calculations
  const subtotal = cart.reduce((s, i) => s + i.priceCents * i.quantity, 0);
  const taxBps = 850; // 8.5%
  const tax = Math.round(subtotal * taxBps / 10000);
  const tip = Math.round(subtotal * tipPercent / 100);
  const total = subtotal + tax + tip;

  const addToCart = useCallback((product: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { productId: product.id, name: product.name, priceCents: product.priceCents ?? product.price ?? 0, quantity: 1, notes: '' }];
    });
  }, []);

  const updateQty = useCallback((productId: string, delta: number) => {
    setCart((prev) => {
      const updated = prev.map((i) => i.productId === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i);
      return updated;
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateItemNotes = useCallback((productId: string, notes: string) => {
    setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, notes } : i));
  }, []);

  const holdOrder = useCallback(() => {
    if (cart.length === 0) return;
    setHeldOrders((prev) => [...prev, [...cart]]);
    setCart([]);
    notifySuccess('Order Held', 'Order has been placed on hold');
  }, [cart]);

  const resumeOrder = useCallback((index: number) => {
    setCart(heldOrders[index]);
    setHeldOrders((prev) => prev.filter((_, i) => i !== index));
    notifyInfo('Order Resumed', 'Held order resumed');
  }, [heldOrders]);

  const placeOrder = useCallback(async () => {
    if (cart.length === 0) { notifyError('Empty Cart', 'Add items to the cart first'); return; }
    const result = await createOrder({
      tableId: selectedTable || null,
      orderType: mode,
      items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, notes: i.notes || null })),
      notes: orderNotes || null,
      createdBy: 'current-user',
    });
    if (result?.success) {
      setCart([]);
      setOrderNotes('');
      setSelectedTable('');
    }
  }, [cart, mode, selectedTable, orderNotes, createOrder]);

  const handlePayment = useCallback(async () => {
    if (cart.length === 0) { notifyError('No Items', 'Add items before processing payment'); return; }
    // First place the order, then process payment
    const orderResult = await createOrder({
      tableId: selectedTable || null,
      orderType: mode,
      items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, notes: i.notes || null })),
      notes: orderNotes || null,
      createdBy: 'current-user',
    });
    if (orderResult?.success && (orderResult.data as any)?.id) {
      await processPayment({
        orderId: (orderResult.data as any).id,
        amountCents: total,
        method: paymentMethod,
        tipCents: tip,
        processedBy: 'current-user',
      });
      setCart([]);
      setPaymentOpen(false);
      setTipPercent(0);
    }
  }, [cart, mode, selectedTable, orderNotes, paymentMethod, total, tip, createOrder, processPayment]);

  const filteredProducts = (products ?? []).filter((p: any) => {
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const modeIcon = mode === 'dine_in' ? UtensilsCrossed : mode === 'takeaway' ? ShoppingBag : Truck;
  const modeLabel = mode === 'dine_in' ? 'Dine-In' : mode === 'takeaway' ? 'Takeaway' : 'Delivery';

  return (
    <div className="flex h-full">
      {/* Left Panel — Products */}
      <div className="flex-1 flex flex-col border-r border-border bg-surface-secondary">
        {/* Mode selector */}
        <div className="flex items-center gap-2 px-4 py-3 bg-surface border-b border-border">
          {(['dine_in', 'takeaway', 'delivery'] as OrderMode[]).map((m) => (
            <Button key={m} variant={mode === m ? 'primary' : 'ghost'} size="sm" onClick={() => setMode(m)}>
              {m === 'dine_in' ? <UtensilsCrossed className="w-4 h-4 mr-1.5" /> : m === 'takeaway' ? <ShoppingBag className="w-4 h-4 mr-1.5" /> : <Truck className="w-4 h-4 mr-1.5" />}
              {m === 'dine_in' ? 'Dine-In' : m === 'takeaway' ? 'Takeaway' : 'Delivery'}
            </Button>
          ))}
          {mode === 'dine_in' && (
            <select
              className="ml-auto text-sm border border-border rounded-lg px-2 py-1.5 bg-surface"
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
            >
              <option value="">Select Table</option>
              {(tables ?? []).map((t: any) => (
                <option key={t.id} value={t.id} disabled={!t.isAvailable}>
                  {t.name} ({t.capacity}p) {!t.isAvailable ? '— Occupied' : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Search + Categories */}
        <div className="px-4 py-3 space-y-3">
          <SearchBar
            placeholder="Search products..."
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={setSearchQuery}
          />
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <Button key={cat} variant={category === cat ? 'primary' : 'ghost'} size="sm" onClick={() => setCategory(cat)}>
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredProducts.map((product: any) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="text-left p-3 rounded-xl border border-border bg-surface hover:border-primary/40 hover:shadow-sm transition-all active:scale-[0.98]"
              >
                <p className="font-medium text-sm text-content truncate">{product.name}</p>
                <p className="text-xs text-content-tertiary mt-0.5">{product.categoryName ?? ''}</p>
                <p className="text-sm font-semibold text-primary mt-1.5">{product.price ?? formatCurrency(product.priceCents ?? 0)}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Cart */}
      <div className="w-96 shrink-0 flex flex-col bg-surface">
        {/* Cart Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-content">Current Order</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={holdOrder} disabled={cart.length === 0}>
              <Clock className="w-4 h-4 mr-1" /> Hold
            </Button>
          </div>
        </div>

        {/* Held Orders */}
        {heldOrders.length > 0 && (
          <div className="px-4 py-2 border-b border-border bg-surface-secondary">
            <p className="text-xs font-medium text-content-secondary mb-1.5">Held Orders</p>
            <div className="flex gap-2 overflow-x-auto">
              {heldOrders.map((_, i) => (
                <Button key={i} variant="outline" size="sm" onClick={() => resumeOrder(i)}>
                  Order {i + 1} ({_.length} items)
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-content-tertiary">
              <ShoppingCart className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm font-medium">Cart is empty</p>
              <p className="text-xs mt-1">Tap products to add them</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-primary/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-content truncate">{item.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <button onClick={() => updateQty(item.productId, -1)} className="w-6 h-6 rounded-md bg-surface-secondary flex items-center justify-center hover:bg-surface-tertiary">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-mono w-5 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.productId, 1)} className="w-6 h-6 rounded-md bg-surface-secondary flex items-center justify-center hover:bg-surface-tertiary">
                      <Plus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-mono text-content-secondary ml-auto">{formatCurrency(item.priceCents * item.quantity)}</span>
                  </div>
                  {item.notes && <p className="text-xs text-content-tertiary mt-1 italic">{item.notes}</p>}
                </div>
                <button onClick={() => removeFromCart(item.productId)} className="shrink-0 p-1 rounded-md hover:bg-danger/10 text-content-tertiary hover:text-danger transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Totals */}
        <div className="border-t border-border px-4 py-3 space-y-2">
          <div className="flex justify-between text-sm text-content-secondary">
            <span>Subtotal</span>
            <span className="font-mono">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-content-secondary">
            <span>Tax (8.5%)</span>
            <span className="font-mono">{formatCurrency(tax)}</span>
          </div>
          {tip > 0 && (
            <div className="flex justify-between text-sm text-content-secondary">
              <span>Tip ({tipPercent}%)</span>
              <span className="font-mono">{formatCurrency(tip)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold text-content pt-2 border-t border-border">
            <span>Total</span>
            <span className="font-mono text-primary">{formatCurrency(total)}</span>
          </div>

          {/* Tip Selector */}
          <div className="flex gap-1.5">
            {[0, 10, 15, 20].map((pct) => (
              <Button key={pct} variant={tipPercent === pct ? 'primary' : 'outline'} size="sm" onClick={() => setTipPercent(pct)} className="flex-1 text-xs">
                {pct === 0 ? 'None' : `${pct}%`}
              </Button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <Button onClick={placeOrder} isLoading={isCreating} className="flex-1" leftIcon={<UtensilsCrossed className="w-4 h-4" />}>
              Place Order
            </Button>
            <Button onClick={() => setPaymentOpen(true)} variant="secondary" className="flex-1" leftIcon={<CreditCard className="w-4 h-4" />}>
              Pay Now
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Modal open={paymentOpen} onClose={() => setPaymentOpen(false)} title="Process Payment" size="md">
        <div className="space-y-4">
          <div className="flex justify-between items-center py-2 px-4 bg-surface-secondary rounded-xl">
            <span className="text-sm text-content-secondary">Total Due</span>
            <span className="text-xl font-bold text-primary font-mono">{formatCurrency(total)}</span>
          </div>

          <div>
            <label className="text-sm font-medium text-content mb-2 block">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cash', label: 'Cash', icon: Banknote },
                { id: 'card', label: 'Card', icon: CreditCard },
                { id: 'upi', label: 'UPI', icon: Smartphone },
                { id: 'wallet', label: 'Wallet', icon: Wallet },
              ].map((pm) => (
                <button
                  key={pm.id}
                  onClick={() => setPaymentMethod(pm.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all',
                    paymentMethod === pm.id ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30 text-content-secondary',
                  )}
                >
                  <pm.icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{pm.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setPaymentOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handlePayment} className="flex-1" leftIcon={<CreditCard className="w-4 h-4" />}>
              Pay {formatCurrency(total)}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
