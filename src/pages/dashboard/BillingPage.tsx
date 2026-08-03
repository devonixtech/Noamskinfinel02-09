import { useState, useEffect, useCallback } from "react";
import { ResponsiveDashboardLayout } from "@/components/dashboard/ResponsiveDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useSalon } from "@/hooks/useSalon";
import api from "@/services/api";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Receipt,
  CreditCard,
  Download,
  Eye,
  Wallet,
  Calendar,
  TrendingUp,
  FileText,
  Search,
  Plus,
  Smartphone,
  Banknote,
  MoreHorizontal,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  User,
  X,
  Check,
  ChevronsUpDown,
  Scissors
} from "lucide-react";
import { format } from "date-fns";
import logo from "@/assets/logo.png";

interface Invoice {
  id: string;
  bookingId: string;
  customer: string;
  customerId: string;
  service: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'cash' | 'deposit';
  paymentMethod: string;
  time: string;
  customerEmail?: string;
  customerPhone?: string;
  discount: number;
  subtotal: number;
  totalValue?: number;
  coinsUsed: number;
  loyaltyPointsUsed: number;
  coinValue: number;
  type: 'appointment' | 'product';
  invoiceUrl?: string;
  notes?: string;
  staff?: string;
}

interface PaymentStats {
  todayRevenue: number;
  pendingAmount: number;
  totalInvoices: number;
  monthlyRevenue: number;
  cashPayments: number;
  upiPayments: number;
  cardPayments: number;
}

const BillingPage = () => {
  const ownerEmail = "noamskin@gmail.com";
  const [activeTab, setActiveTab] = useState("invoices");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<PaymentStats>({
    todayRevenue: 0,
    pendingAmount: 0,
    totalInvoices: 0,
    monthlyRevenue: 0,
    cashPayments: 0,
    upiPayments: 0,
    cardPayments: 0,
  });

  // Create Invoice Dialog State
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [services, setServices] = useState<Array<{ id: string; name: string; price: number }>>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string; price: number }>>([]);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; phone: string }>>([]);
  type InvoiceItem = { type: 'service' | 'product', id?: string, name: string, price: number, quantity: number };
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    customerId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: format(new Date(), "HH:mm"),
    paymentMethod: "Cash",
    status: "paid" as 'paid' | 'pending',
    notes: "",
    guestPhone: "",
    guestEmail: ""
  });

  const computedTotalAmount = invoiceItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Selected Invoice Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const isMobile = useMobile();
  const { toast } = useToast();
  const { currentSalon, loading: salonLoading } = useSalon();

  const handleDownloadPDF = () => {
    if (!selectedInvoice) return;
    window.print();
    toast({
      title: "Generating PDF",
      description: "Printing dialog opened for invoice " + selectedInvoice.id
    });
  };

  const handleDirectDownload = (inv: Invoice) => {
    setSelectedInvoice(inv);
    // Tiny delay to ensure the hidden print container has the right data
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleCreateRemainingInvoice = async (inv: Invoice) => {
    try {
      setLoading(true);
      await api.bookings.settleDeposit(inv.bookingId);
      toast({
        title: "Success",
        description: "Remaining amount invoice generated successfully.",
      });
      fetchInvoices();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create invoice.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotify = async (type: 'sms' | 'whatsapp') => {
    if (!selectedInvoice) return;

    const phone = selectedInvoice.customerPhone || "";
    const cleanPhone = phone.replace(/[^0-9]/g, '');

    if (!cleanPhone) {
      toast({
        title: "No Phone Number",
        description: "Customer does not have a phone number saved.",
        variant: "destructive"
      });
      return;
    }

    // Failsafe: if the invoice doesn't have a Cloudinary link in the invoice URL,
    // fetch/generate it on-the-fly from the backend!
    let invoiceLink = selectedInvoice.invoiceUrl || "";
    if (!invoiceLink || !invoiceLink.includes('cloudinary')) {
      try {
        const res = await api.bookings.getInvoice(selectedInvoice.bookingId);
        if (res?.invoice?.pdfUrl) {
          invoiceLink = res.invoice.pdfUrl;
          // Update local state to cache the generated URL
          setSelectedInvoice(prev => prev ? { ...prev, invoiceUrl: res.invoice.pdfUrl } : null);
          setInvoices(prev => prev.map(inv => inv.bookingId === selectedInvoice.bookingId ? { ...inv, invoiceUrl: res.invoice.pdfUrl } : inv));
        }
      } catch (err) {
        console.error("Failed to generate/fetch Cloudinary link on click:", err);
      }
    }

    // Fallback if no Cloudinary link could be retrieved
    if (!invoiceLink || !invoiceLink.includes('cloudinary')) {
      invoiceLink = `${window.location.origin}/invoices/${selectedInvoice.bookingId}`;
    }

    const message = `Hello ${selectedInvoice.customer}, your invoice for ${selectedInvoice.service} at ${currentSalon?.name} is ready. Total: MYR ${selectedInvoice.amount.toFixed(2)}. View invoice: ${invoiceLink}`;

    const encodedMsg = encodeURIComponent(message);
    const url = type === 'whatsapp'
      ? `https://wa.me/${cleanPhone}?text=${encodedMsg}`
      : `sms:${cleanPhone}${isMobile ? '?' : '&'}body=${encodedMsg}`;

    window.open(url, '_blank');

    toast({
      title: "Notification Sent",
      description: `Opening ${type === 'whatsapp' ? 'WhatsApp' : 'SMS'} to send details to ${selectedInvoice.customer}`
    });
  };

  const fetchInvoices = useCallback(async () => {
    if (!currentSalon) {
      if (!salonLoading) setLoading(false);
      return;
    }

    setRefreshing(true);
    try {
      const bookings = await api.bookings.getAll({ salon_id: currentSalon.id });
      const bookingsArray = Array.isArray(bookings) ? bookings : [];

      const invoicesData: Invoice[] = bookingsArray.map((booking: any, index: number) => {
        const pp = booking.platformPayments?.[0];
        const invoiceNumber = pp?.invoice_number || `L-INV-${String(index + 1).padStart(4, '0')}`;
        
        const actualPaid = Number(booking.price_paid || 0);
        let totalValue = Number(booking.service?.price || 0);

        if (booking.notes && booking.notes.includes('ITEMS: {')) {
          try {
            const jsonStr = booking.notes.substring(booking.notes.indexOf('ITEMS: ') + 7);
            const parsed = JSON.parse(jsonStr);
            if (parsed.items && Array.isArray(parsed.items)) {
              totalValue = parsed.items.reduce((sum: number, item: any) => sum + (Number(item.price) * Number(item.quantity)), 0);
            }
          } catch (e) {}
        }

        const discount = Number(booking.discount_amount || 0);
        const coinsUsed = Number(booking.coins_used || 0);
        const loyaltyPointsUsed = Number(booking.loyalty_points_used || 0);
        const coinValue = Number(booking.coin_currency_value || 0) * (coinsUsed + loyaltyPointsUsed);
        
        const finalPayable = Math.max(0, totalValue - discount - coinValue);

        const isPaid = booking.status === 'completed';
        const isDeposit = booking.status === 'confirmed' && actualPaid > 0 && actualPaid < finalPayable;
        const iscash = !isPaid && !isDeposit && new Date(booking.booking_date) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        const guestNameMatch = booking.notes?.match(/\[GUEST:\s*(.*?)\s*\|/);
        const guestPhoneMatch = booking.notes?.match(/\|\s*(.*?)\s*\]/);
        
        const customerName = (guestNameMatch ? guestNameMatch[1] : null) || booking.customer_name || booking.user?.profile?.full_name || 'Walk-in';
        const customerPhone = (guestPhoneMatch ? guestPhoneMatch[1] : null) || booking.customer_phone || booking.user?.profile?.phone || '';

        return {
          id: invoiceNumber,
          bookingId: booking.id,
          customer: customerName,
          customerId: booking.user_id,
          service: booking.service_name || booking.service?.name || 'Service',
          amount: actualPaid || totalValue, // Show what was paid, or what is due
          date: booking.booking_date,
          status: isDeposit ? 'deposit' : iscash ? 'cash' : isPaid ? 'paid' : 'pending',
          paymentMethod: pp?.payment_method || booking.payment_method || 'Cash',
          time: booking.booking_time || '00:00',
          customerEmail: pp?.invoice_url ? '' : (booking.customer_email || booking.user?.email || ''),
          customerPhone: customerPhone,
          discount,
          subtotal: actualPaid || totalValue, // base subtotal for the display
          totalValue, // keeping track of the actual total for later calculations
          coinsUsed,
          loyaltyPointsUsed,
          coinValue,
          type: 'appointment',
          invoiceUrl: pp?.invoice_url || `${window.location.origin}/invoices/${booking.id}`,
          notes: booking.notes,
          staff: booking.staff_name || booking.staff?.display_name || '-',
        };
      });

      // Extract unique customers via the new Directory API
      try {
        const dirRes = await api.customerRecords.getDirectory(currentSalon.id);
        if (dirRes.customers) {
          setCustomers(dirRes.customers);
        }
      } catch (err) {
        console.error("Failed to load salon directory", err);
      }

      // Sort invoices by creation date (newest first) or booking date
      const sortedInvoices = invoicesData.sort((a, b) => {
        const dateA = new Date(bookingsArray.find((bk: any) => bk.id === a.bookingId)?.created_at || a.date);
        const dateB = new Date(bookingsArray.find((bk: any) => bk.id === b.bookingId)?.created_at || b.date);
        return dateB.getTime() - dateA.getTime();
      });

      setInvoices(sortedInvoices);

      const todayStr = format(new Date(), "yyyy-MM-dd");
      const monthStr = format(new Date(), "yyyy-MM");

      const todayInvoices = invoicesData.filter(inv => inv.date === todayStr);
      const monthInvoices = invoicesData.filter(inv => inv.date.startsWith(monthStr));

      setStats({
        todayRevenue: todayInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0),
        pendingAmount: invoicesData.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + inv.amount, 0),
        totalInvoices: invoicesData.length,
        monthlyRevenue: monthInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0),
        cashPayments: invoicesData.filter(inv => inv.status === 'paid' && inv.paymentMethod === 'Cash').reduce((sum, inv) => sum + inv.amount, 0),
        upiPayments: invoicesData.filter(inv => (inv.status === 'paid' && (inv.paymentMethod === 'UPI' || inv.paymentMethod === 'QR'))).reduce((sum, inv) => sum + inv.amount, 0),
        cardPayments: invoicesData.filter(inv => inv.status === 'paid' && inv.paymentMethod === 'Card').reduce((sum, inv) => sum + inv.amount, 0),
      });

    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentSalon, salonLoading]);

  const fetchServicesAndProducts = useCallback(async () => {
    if (!currentSalon) return;
    try {
      const [servicesData, inventoryResponse, platformProductsData] = await Promise.all([
        api.services.getBySalon(currentSalon.id).catch(() => []),
        api.inventory.getBySalon(currentSalon.id).catch(() => ({ items: [] })),
        api.platformProducts.getAll().catch(() => [])
      ]);
      setServices(Array.isArray(servicesData) ? servicesData.filter((s: any) => s.is_active) : []);
      const inventoryData = inventoryResponse?.items || inventoryResponse || [];
      const platformProducts = Array.isArray(platformProductsData) ? platformProductsData : [];
      
      const mergedProducts = [...inventoryData];
      platformProducts.forEach((pp: any) => {
        if (!mergedProducts.some(mp => mp.name === pp.name)) {
          mergedProducts.push(pp);
        }
      });
      setProducts(mergedProducts);
    } catch (error) {
      console.error("Error fetching services and products:", error);
    }
  }, [currentSalon]);

  const handleCreateInvoice = async () => {
    if (!currentSalon || invoiceItems.length === 0) return;

    setCreating(true);
    try {
      const mainService = invoiceItems.find(i => i.type === 'service') || invoiceItems[0];
      const itemsPayload = JSON.stringify({ items: invoiceItems });
      
      let finalCustomerId = newInvoice.customerId;

      // If it's a new walk-in (no existing customer ID selected), create one in the directory first!
      if (!finalCustomerId && newInvoice.notes) {
        try {
          const newCustRes = await api.customerRecords.addCustomer(currentSalon.id, {
            name: newInvoice.notes,
            phone: newInvoice.guestPhone
          });
          if (newCustRes.success && newCustRes.customer) {
            finalCustomerId = newCustRes.customer.id;
          }
        } catch (e) {
          console.warn("Failed to create shadow customer, proceeding as pure walk-in", e);
        }
      }
      
      await api.bookings.create({
        salon_id: currentSalon.id,
        user_id: finalCustomerId || undefined,
        service_id: mainService.id || 'custom-item',
        booking_date: newInvoice.date,
        booking_time: newInvoice.time,
        price_paid: computedTotalAmount,
        status: newInvoice.status === 'paid' ? 'completed' : 'confirmed',
        payment_method: newInvoice.paymentMethod,
        notes: `[GUEST: ${newInvoice.notes || 'Walk-in'} | ${newInvoice.guestPhone || ''} ] ITEMS: ${itemsPayload}`,
      });

      toast({ title: "Invoice Created", description: "Successfully added to ledger" });
      setShowCreateDialog(false);
      fetchInvoices();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-emerald-100 text-emerald-700 border-0 font-bold px-3 uppercase text-[9px] tracking-wider">Paid</Badge>;
      case "pending":
        return <Badge className="bg-amber-100 text-amber-700 border-0 font-bold px-3 uppercase text-[9px] tracking-wider">Pending</Badge>;
      case "cash":
        return <Badge className="bg-red-100 text-red-700 border-0 font-bold px-3 uppercase text-[9px] tracking-wider">cash</Badge>;
      case "deposit":
        return <Badge className="bg-blue-100 text-blue-700 border-0 font-bold px-3 uppercase text-[9px] tracking-wider">Deposit</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.service.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || salonLoading) {
    return (
      <ResponsiveDashboardLayout showBackButton={true}>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin shadow-lg shadow-accent/20" />
          <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px] animate-pulse">Syncing Ledger...</p>
        </div>
      </ResponsiveDashboardLayout>
    );
  }

  return (
    <ResponsiveDashboardLayout
      headerActions={
        isMobile ? (
          <Button variant="ghost" size="icon" onClick={fetchInvoices} disabled={refreshing}>
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-6 pb-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight">Ledger & Billing</h1>
            <p className="text-muted-foreground font-medium">Financial operations connected to your local platform backend</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={fetchInvoices} disabled={refreshing} className="rounded-xl font-bold bg-muted/50 border-border hover:bg-muted transition-all">
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button onClick={() => { fetchServicesAndProducts(); setInvoiceItems([]); setShowCreateDialog(true); }} className="bg-accent text-white font-black rounded-xl shadow-lg shadow-accent/20">
              <Plus className="w-4 h-4 mr-2" /> New Invoice
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Today Revenue", value: `MYR ${stats.todayRevenue}`, icon: Wallet, color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { title: "Pending", value: `MYR ${stats.pendingAmount}`, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
            { title: "Monthly", value: `MYR ${stats.monthlyRevenue}`, icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-500/10" },
            { title: "UPI Total", value: `MYR ${stats.upiPayments}`, icon: Smartphone, color: "text-purple-500", bg: "bg-purple-500/10" },
          ].map((s, i) => (
            <Card key={i} className="border-none shadow-sm bg-card rounded-2xl border border-border/50">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center ${s.color} border border-current/10`}>
                  <s.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{s.title}</p>
                  <p className="text-xl font-black text-foreground">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Invoices List */}
        <Card className="border-none shadow-sm bg-card rounded-[2rem] overflow-hidden border border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-6">
            <CardTitle className="text-xl font-black text-foreground">Transaction History</CardTitle>
            <div className="relative w-64 lg:block hidden">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search ID or Customer"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-muted/50 border-border rounded-xl focus:ring-accent"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredInvoices.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground">No invoices found.</div>
              ) : (
                filteredInvoices.map(inv => (
                  <div key={inv.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl bg-muted/20 hover:bg-muted/40 transition-all border border-transparent hover:border-border/50 gap-4 group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-accent">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-black text-foreground">{inv.id}</p>
                        <p className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                          <User className="w-3 h-3" /> {inv.customer}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 px-4">
                      <p className="font-bold text-foreground/90">{inv.service}</p>
                      <p className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-[0.05em]">
                        {format(new Date(inv.date), "MMM d, yyyy")} • {inv.time}
                      </p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-lg font-black text-foreground">MYR {inv.amount}</p>
                        <p className="text-[10px] font-black uppercase text-muted-foreground/60">{inv.paymentMethod}</p>
                      </div>
                      <div className="min-w-20 text-center">
                        {getStatusBadge(inv.status)}
                      </div>
                      <div className="flex items-center gap-2">
                        {inv.status === 'deposit' ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl h-9 w-9 bg-card shadow-sm border border-border/50 hover:bg-muted"
                              >
                                <MoreHorizontal className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleCreateRemainingInvoice(inv)}>
                                Create remaining amount invoice
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl h-9 w-9 bg-card shadow-sm border border-border/50 hover:bg-muted"
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setShowDetailDialog(true);
                              }}
                            >
                              <Eye className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl h-9 w-9 bg-card shadow-sm border border-border/50 hover:text-accent hover:bg-muted"
                              onClick={() => handleDirectDownload(inv)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="w-[calc(100%-2rem)] md:w-full max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-none bg-white rounded-3xl shadow-2xl border border-slate-200">
            {selectedInvoice && (
              <div className="flex flex-col">
                <div className="p-4 md:p-12 space-y-8 md:space-y-12 text-sm text-slate-700 print:text-slate-900 print-only">
                  {/* Row 1: Logo and Title */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <img src={logo} alt="Noamskin Logo" className="h-8 sm:h-10 w-auto object-contain object-left" />
                    </div>
                    <div className="text-right">
                      <div className="space-y-1 text-slate-500 print:text-slate-500 font-medium text-sm">
                        <p>Invoice no: <span className="text-slate-900 print:text-slate-900">{selectedInvoice.id.replace('L-INV-', '')}</span></p>
                        <p>Invoice date: <span className="text-slate-900 print:text-slate-900">{format(new Date(selectedInvoice.date), "MMM d, yyyy")}</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Addresses */}
                  <div className="grid grid-cols-1 md:grid-cols-3 print:grid-cols-3 gap-6 md:gap-8">
                    <div className="space-y-3 border-l-4 border-slate-200 print:border-slate-100 pl-4">
                      <p className="font-bold text-slate-400 print:text-slate-400 uppercase tracking-widest text-[10px]">From</p>
                      <div>
                        <p className="text-lg font-black text-slate-900 print:text-slate-900 mb-1">{currentSalon?.name || "Salon Name"}</p>
                        <p className="font-medium text-slate-800 print:text-slate-700">{ownerEmail}</p>
                        <p className="font-medium text-slate-500 print:text-slate-500">{currentSalon?.address || "No Address Provided"}</p>
                        <p className="font-medium text-slate-500 print:text-slate-500">{currentSalon?.phone}</p>
                      </div>
                    </div>
                    <div className="space-y-3 border-l-4 border-slate-200 print:border-slate-100 pl-4">
                      <p className="font-bold text-slate-400 print:text-slate-400 uppercase tracking-widest text-[10px]">Bill to</p>
                      <div>
                        <p className="text-lg font-black text-slate-900 print:text-slate-900 mb-1">{selectedInvoice.customer}</p>
                        <p className="font-medium text-slate-500 print:text-slate-500">{selectedInvoice.customerPhone}</p>
                      </div>
                    </div>
                    {selectedInvoice.type === 'product' && (
                      <div className="space-y-3 border-l-4 border-slate-100 pl-4">
                        <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Ship to</p>
                        <div>
                          <p className="font-medium text-slate-500 italic">Deliverables same as billing address.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Table */}
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#0066FF] text-white font-bold uppercase tracking-widest text-[10px]">
                          <th className="px-4 md:px-6 py-4">Description</th>
                          <th className="px-4 md:px-6 py-4 text-center hidden md:table-cell">Rate</th>
                          <th className="px-4 md:px-6 py-4 text-center hidden md:table-cell">Qty</th>
                          <th className="px-4 md:px-6 py-4 text-center hidden md:table-cell">Tax</th>
                          <th className="px-4 md:px-6 py-4 text-center hidden md:table-cell">Disc</th>
                          <th className="px-4 md:px-6 py-4 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          let items = [];
                          if (selectedInvoice.notes && selectedInvoice.notes.includes('ITEMS: {')) {
                            try {
                              const jsonStr = selectedInvoice.notes.substring(selectedInvoice.notes.indexOf('ITEMS: ') + 7);
                              const parsed = JSON.parse(jsonStr);
                              if (parsed.items && Array.isArray(parsed.items)) {
                                items = parsed.items;
                              }
                            } catch (e) {}
                          }
                          if (items.length === 0) {
                            items = [{
                              name: selectedInvoice.service,
                              price: selectedInvoice.subtotal,
                              quantity: 1,
                              type: 'service'
                            }];
                          }
                          return items.map((item: any, idx: number) => (
                            <tr key={idx} className="font-medium border-b border-slate-100">
                              <td className="px-4 md:px-6 py-5">
                                <p className="text-slate-900 print:text-slate-900 font-bold">{item.name}</p>
                                <p className="text-slate-500 print:text-slate-500 text-xs mt-1 hidden md:block capitalize">{item.type || 'Item'}</p>
                                {/* On mobile, show summary details inline */}
                                <div className="text-[10px] text-slate-500 mt-1 md:hidden space-y-0.5">
                                  <p>Rate: MYR {item.price} • Qty: {item.quantity}</p>
                                </div>
                              </td>
                              <td className="px-4 md:px-6 py-5 text-center text-slate-800 print:text-slate-700 hidden md:table-cell">MYR {item.price}</td>
                              <td className="px-4 md:px-6 py-5 text-center text-slate-800 print:text-slate-700 hidden md:table-cell">{item.quantity}</td>
                              <td className="px-4 md:px-6 py-5 text-center text-slate-800 print:text-slate-700 hidden md:table-cell">0%</td>
                              <td className="px-4 md:px-6 py-5 text-center text-slate-800 print:text-slate-700 hidden md:table-cell">-</td>
                              <td className="px-4 md:px-6 py-5 text-right font-bold text-slate-900 print:text-slate-900">MYR {(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Section */}
                  <div className="flex flex-col md:flex-row justify-between pt-6">
                    <div className="space-y-8 max-w-sm">
                      <div className="space-y-2">
                        <p className="font-bold text-slate-900 print:text-slate-900">Payment Instructions</p>
                        <div className="text-slate-500 print:text-slate-500 space-y-1 text-sm">
                          <p>Bank Name: <span className="font-bold text-slate-800 print:text-slate-700">Alliance Bank</span></p>
                          <p>Account Name: <span className="font-bold text-slate-800 print:text-slate-700">Noam Skin Enterprise</span></p>
                          <p>Account No: <span className="font-bold text-slate-800 print:text-slate-700">140730013008888</span></p>
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:w-72 space-y-3 mt-8 md:mt-0">
                      <div className="flex justify-between font-medium">
                        <span className="text-slate-500 print:text-slate-500">Subtotal</span>
                        <span className="text-slate-800 print:text-slate-700">MYR {selectedInvoice.subtotal.toFixed(2)}</span>
                      </div>
                      {selectedInvoice.discount > 0 && (
                        <div className="flex justify-between font-medium text-amber-600">
                          <span>Coupons/Discount</span>
                          <span>- MYR {selectedInvoice.discount.toFixed(2)}</span>
                        </div>
                      )}
                      {(selectedInvoice.coinsUsed > 0 || selectedInvoice.loyaltyPointsUsed > 0) && (
                        <div className="flex justify-between font-medium text-blue-600">
                          <span className="flex flex-col">
                            <span>Points Redeemed</span>
                            <span className="text-[9px] uppercase tracking-tighter opacity-70">
                              ({selectedInvoice.coinsUsed + selectedInvoice.loyaltyPointsUsed} pts)
                            </span>
                          </span>
                          <span>- MYR {selectedInvoice.coinValue.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="h-px bg-slate-200 print:bg-slate-100 my-2" />
                      <div className="flex justify-between text-lg font-black text-slate-900 print:text-slate-900">
                        <span>Total Paid</span>
                        <span className="print:text-slate-900">MYR {selectedInvoice.amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium text-emerald-600 print:text-emerald-700">
                        <span>Amount Settled</span>
                        <span className="print:text-emerald-700">- MYR {selectedInvoice.status === 'paid' ? selectedInvoice.amount.toFixed(2) : '0.00'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 md:gap-3 rounded-b-3xl print:hidden">
                  <Button variant="ghost" onClick={() => setShowDetailDialog(false)} className="rounded-xl font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all h-12 sm:h-10">
                    Close
                  </Button>
                  <Button variant="outline" onClick={handleDownloadPDF} className="rounded-xl font-bold bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all h-12 sm:h-10">
                    <Download className="w-4 h-4 mr-2" /> Download PDF
                  </Button>
                  <Button onClick={() => handleSendNotify('whatsapp')} className="bg-[#0066FF] hover:bg-[#0055DD] text-white font-black rounded-xl px-6 shadow-xl shadow-[#0066FF]/20 transition-all h-12 sm:h-10">
                    <Smartphone className="w-4 h-4 mr-2" /> SMS/WhatsApp
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Invoice Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-md rounded-3xl border-none p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">Manual Billing</DialogTitle>
              <DialogDescription className="font-medium">Direct entry for walk-in payments.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-4 mb-4">
                <div className="space-y-2 flex flex-col">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Select Existing Customer</Label>
                  <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={customerSearchOpen}
                        className="w-full justify-between bg-secondary/30 border-none h-12 rounded-xl text-left font-normal"
                      >
                        {newInvoice.customerId
                          ? newInvoice.customerId === "walkin" 
                            ? "Walk-in Guest" 
                            : (customers.find((c) => c.id === newInvoice.customerId)?.name || "Unknown Customer")
                          : "Select or walk-in..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search customer by name or phone..." />
                        <CommandList>
                          <CommandEmpty>No customer found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="walkin"
                              onSelect={() => {
                                setNewInvoice({ ...newInvoice, customerId: "walkin", notes: "", guestPhone: "" });
                                setCustomerSearchOpen(false);
                              }}
                              className="cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  newInvoice.customerId === "walkin" ? "opacity-100" : "opacity-0"
                                )}
                              />
                              Walk-in Guest
                            </CommandItem>
                            {customers.map((c) => (
                              <CommandItem
                                key={c.id}
                                value={`${c.name} ${c.phone || ""}`}
                                onSelect={() => {
                                  setNewInvoice({ ...newInvoice, customerId: c.id, notes: c.name, guestPhone: c.phone || "" });
                                  setCustomerSearchOpen(false);
                                }}
                                className="cursor-pointer"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    newInvoice.customerId === c.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {c.name} {c.phone ? `(${c.phone})` : ""}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Guest Name</Label>
                  <Input
                    placeholder="Customer Name"
                    value={newInvoice.notes}
                    onChange={e => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                    className="bg-secondary/30 border-none h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Guest Phone</Label>
                  <Input
                    placeholder="+60123456789"
                    value={newInvoice.guestPhone}
                    onChange={e => setNewInvoice({ ...newInvoice, guestPhone: e.target.value })}
                    className="bg-secondary/30 border-none h-12 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Items ({invoiceItems.length})</Label>
                <div className="max-h-[25vh] overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                  {invoiceItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-secondary/20 p-2 rounded-xl">
                      <div className="flex-1 text-sm font-medium">{item.name}</div>
                      <div className="text-sm">MYR {item.price} x {item.quantity}</div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setInvoiceItems(prev => prev.filter((_, i) => i !== idx))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Select onValueChange={v => {
                    const s = services.find(x => x.id === v);
                    if (s) setInvoiceItems(prev => [...prev, { type: 'service', id: s.id, name: s.name, price: Number(s.price), quantity: 1 }]);
                  }}>
                    <SelectTrigger className="bg-secondary/30 border-none h-10 rounded-xl flex-1">
                      <SelectValue placeholder="+ Add Service" />
                    </SelectTrigger>
                    <SelectContent side="bottom" sideOffset={4}>
                      {services.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name} (MYR {s.price})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select onValueChange={v => {
                    const p = products.find(x => x.id === v);
                    if (p) setInvoiceItems(prev => [...prev, { type: 'product', id: p.id, name: p.name, price: Number(p.price), quantity: 1 }]);
                  }}>
                    <SelectTrigger className="bg-secondary/30 border-none h-10 rounded-xl flex-1">
                      <SelectValue placeholder="+ Add Product" />
                    </SelectTrigger>
                    <SelectContent side="bottom" sideOffset={4}>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name} (MYR {p.price})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-between items-center bg-accent/10 p-3 rounded-xl">
                  <span className="font-bold">Total Amount</span>
                  <span className="font-black text-accent text-lg">MYR {computedTotalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateInvoice} disabled={creating || invoiceItems.length === 0} className="bg-accent text-white font-black w-full h-12 rounded-xl shadow-lg shadow-accent/20">
                {creating ? "Processing..." : "Generate & Post Invoice"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Hidden Print Container for Direct Download (No Preview Modal) */}
      {
        selectedInvoice && (
          <div className="hidden print:block fixed inset-0 bg-white z-[9999] pointer-events-none print-invoice-container">
            <div className="p-12 space-y-12 text-sm text-slate-700">
              {/* Logo and Title */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <img src={logo} alt="Noamskin Logo" className="h-8 sm:h-10 w-auto object-contain object-left" />
                </div>
                <div className="text-right">
                  <h2 className="text-3xl font-black text-slate-900 mb-4 uppercase tracking-tighter">Tax Invoice</h2>
                  <div className="space-y-1 text-slate-500 font-medium text-sm">
                    <p>Invoice no: <span className="text-slate-900">{selectedInvoice.id.replace('L-INV-', '')}</span></p>
                    <p>Invoice date: <span className="text-slate-900">{format(new Date(selectedInvoice.date), "MMM d, yyyy")}</span></p>
                  </div>
                </div>
              </div>

              {/* Addresses */}
              <div className="grid grid-cols-3 gap-8">
                <div className="space-y-3 border-l-4 border-slate-100 pl-4">
                  <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">From</p>
                  <div>
                    <p className="text-lg font-black text-slate-900 mb-1">{currentSalon?.name || "Salon Name"}</p>
                    <p className="font-medium text-slate-700">{ownerEmail}</p>
                    <p className="font-medium text-slate-500">{currentSalon?.address || "No Address Provided"}</p>
                    <p className="font-medium text-slate-500">{currentSalon?.phone}</p>
                  </div>
                </div>
                <div className="space-y-3 border-l-4 border-slate-100 pl-4">
                  <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Bill to</p>
                  <div>
                    <p className="text-lg font-black text-slate-900 mb-1">{selectedInvoice.customer}</p>
                    <p className="font-medium text-slate-500">{selectedInvoice.customerPhone}</p>
                  </div>
                </div>
                {selectedInvoice.type === 'product' && (
                  <div className="space-y-3 border-l-4 border-slate-100 pl-4">
                    <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Ship to</p>
                    <div>
                      <p className="font-medium text-slate-500 italic">Deliverables same as billing address.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Table */}
              <div className="overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0066FF] text-white font-bold uppercase tracking-widest text-[10px]">
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4 text-center">Rate</th>
                      <th className="px-6 py-4 text-center">Qty</th>
                      <th className="px-6 py-4 text-center">Tax</th>
                      <th className="px-6 py-4 text-center">Disc</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let items = [];
                      if (selectedInvoice.notes && selectedInvoice.notes.includes('ITEMS: {')) {
                        try {
                          const jsonStr = selectedInvoice.notes.substring(selectedInvoice.notes.indexOf('ITEMS: ') + 7);
                          const parsed = JSON.parse(jsonStr);
                          if (parsed.items && Array.isArray(parsed.items)) {
                            items = parsed.items;
                          }
                        } catch (e) {}
                      }
                      if (items.length === 0) {
                        items = [{
                          name: selectedInvoice.service,
                          price: selectedInvoice.subtotal,
                          quantity: 1,
                          type: 'service'
                        }];
                      }
                      return items.map((item: any, idx: number) => (
                        <tr key={idx} className="font-medium text-slate-700">
                          <td className="px-6 py-5">
                            <p className="font-bold text-slate-900">{item.name}</p>
                            <p className="text-[10px] text-slate-400 mt-1 capitalize">{item.type === 'product' ? 'Product' : 'Professional session inclusive of all taxes.'}</p>
                          </td>
                          <td className="px-6 py-5 text-center">MYR {item.price}</td>
                          <td className="px-6 py-5 text-center">{item.quantity}</td>
                          <td className="px-6 py-5 text-center">0%</td>
                          <td className="px-6 py-5 text-center">-</td>
                          <td className="px-6 py-5 text-right font-bold text-slate-900">MYR {(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Footer Summary */}
              <div className="flex justify-between items-start pt-6 border-t border-slate-100">
                <div className="space-y-4">
                  <p className="font-bold text-slate-900">Payment Instructions</p>
                  <div className="text-slate-500 space-y-1 text-sm">
                    <p>Bank Name: <span className="font-bold text-slate-700">Alliance Bank</span></p>
                    <p>Account Name: <span className="font-bold text-slate-700">Noam Skin Enterprise</span></p>
                    <p>Account No: <span className="font-bold text-slate-700">140730013008888</span></p>
                  </div>
                </div>
                <div className="w-72 space-y-3">
                  <div className="flex justify-between font-medium text-slate-500">
                    <span>Subtotal</span>
                    <span className="text-slate-700">MYR {selectedInvoice.subtotal.toFixed(2)}</span>
                  </div>
                  {selectedInvoice.discount > 0 && (
                    <div className="flex justify-between font-medium text-amber-600">
                      <span>Discount</span>
                      <span>- MYR {selectedInvoice.discount.toFixed(2)}</span>
                    </div>
                  )}
                  {(selectedInvoice.coinsUsed > 0 || selectedInvoice.loyaltyPointsUsed > 0) && (
                    <div className="flex justify-between font-medium text-blue-600">
                      <span>Points ({selectedInvoice.coinsUsed + selectedInvoice.loyaltyPointsUsed})</span>
                      <span>- MYR {selectedInvoice.coinValue.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="h-px bg-slate-100 my-2" />
                  <div className="flex justify-between text-lg font-black text-slate-900">
                    <span>Total Paid</span>
                    <span className="text-slate-900">MYR {selectedInvoice.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-emerald-600">
                    <span>Amount Settled</span>
                    <span>- MYR {selectedInvoice.status === 'paid' ? selectedInvoice.amount.toFixed(2) : '0.00'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      <style>{`
        @media print {
          /* Reset page margins */
          @page { margin: 0; size: auto; }
          
          /* Hide everything by default using visibility to handle nested elements */
          body { 
            visibility: hidden !important; 
            background: white !important;
          }
          
          /* Show specifically the print container and its children */
          .print-invoice-container, .print-invoice-container * { 
            visibility: visible !important; 
          }

          /* Position the print container to cover the page */
          .print-invoice-container { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important; 
            min-height: 100% !important;
            margin: 0 !important; 
            padding: 0 !important; 
            background: white !important; 
            z-index: 99999 !important;
            display: block !important; /* Ensure display:block overrides 'hidden' class */
          }

          /* Ensure content inside has proper spacing */
          .print-invoice-container > div {
             padding: 2cm !important;
          }

          /* Hide UI elements that shouldn't print if they somehow sneak in */
          .print\\:hidden, button, [role="button"], .no-print { display: none !important; }
          
          /* Color exactness */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </ResponsiveDashboardLayout>
  );
};

export default BillingPage;
