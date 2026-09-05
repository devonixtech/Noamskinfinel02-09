import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Users,
  Search,
  Mail,
  Phone,
  Calendar,
  Banknote,
  ChevronRight,
  Plus,
  Filter,
  Star,
  TrendingUp,
  Clock,
  MoreHorizontal,
  UserPlus,
  Crown,
  Award,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ResponsiveDashboardLayout } from "@/components/dashboard/ResponsiveDashboardLayout";
import { useSalon } from "@/hooks/useSalon";
import { useAuth } from "@/hooks/useAuth";
import { useMobile } from "@/hooks/use-mobile";
import api from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { sendAppointmentConfirmation } from "@/utils/whatsapp";

interface Customer {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  email?: string;
  total_visits: number;
  total_spent: number;
  last_visit: string | null;
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { currentSalon, loading: salonLoading } = useSalon();
  const isMobile = useMobile();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addFormData, setAddFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    initial_service: ""
  });
  const [sortBy, setSortBy] = useState<"visits" | "spent" | "recent">("visits");
  const [showSearch, setShowSearch] = useState(false);
  const location = useLocation();
  const isStaffMode = location.pathname.startsWith("/staff");
  const [staffProfileId, setStaffProfileId] = useState<string | null>(null);

  // Book Appointment Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedCustomerForBooking, setSelectedCustomerForBooking] = useState<Customer | null>(null);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    serviceId: "",
    staffId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "10:00",
    notes: ""
  });

  useEffect(() => {
    const fetchServicesAndStaff = async () => {
      if (!currentSalon) return;
      try {
        const [servicesData, staffData] = await Promise.all([
          api.services.getBySalon(currentSalon.id),
          api.staff.getBySalon(currentSalon.id)
        ]);
        setAvailableServices(Array.isArray(servicesData) ? servicesData : []);
        setStaffMembers(Array.isArray(staffData) ? staffData : []);
      } catch (e) {
        console.error("Failed to load services or staff", e);
      }
    };
    fetchServicesAndStaff();
  }, [currentSalon]);

  const handleOpenBookAppointment = (customer: Customer) => {
    setSelectedCustomerForBooking(customer);
    setBookingForm({
      serviceId: availableServices[0]?.id || "",
      staffId: isStaffMode && staffProfileId ? staffProfileId : "",
      date: format(new Date(), "yyyy-MM-dd"),
      time: "10:00",
      notes: ""
    });
    setShowBookingModal(true);
  };

  const handleCreateBooking = async () => {
    if (!currentSalon || !selectedCustomerForBooking || !bookingForm.serviceId) {
      toast({
        title: "Missing Service",
        description: "Please select a service for the appointment.",
        variant: "destructive"
      });
      return;
    }

    setCreatingBooking(true);
    try {
      const custName = selectedCustomerForBooking.full_name || "Customer";
      const custPhone = selectedCustomerForBooking.phone || "";

      await api.bookings.create({
        salon_id: currentSalon.id,
        service_id: bookingForm.serviceId,
        staff_id: bookingForm.staffId || (isStaffMode ? staffProfileId : null) || null,
        booking_date: bookingForm.date,
        booking_time: bookingForm.time,
        user_id: selectedCustomerForBooking.user_id,
        notes: `Walk-in: ${custName}${custPhone ? ' | ' + custPhone : ''}${bookingForm.notes ? ' | ' + bookingForm.notes : ''}`,
        status: "confirmed",
      });

      toast({
        title: "Appointment Booked",
        description: `Appointment for ${custName} scheduled for ${format(new Date(bookingForm.date), "MMM d, yyyy")} at ${bookingForm.time}.`,
      });

      if (custPhone) {
        const selectedService = availableServices.find(s => s.id === bookingForm.serviceId);
        sendAppointmentConfirmation({
          user_name: custName,
          user_phone: custPhone,
          booking_date: bookingForm.date,
          booking_time: bookingForm.time,
          service_name: selectedService?.name || 'Service'
        }, currentSalon);
      }

      setShowBookingModal(false);
      fetchCustomers();
    } catch (error: any) {
      console.error("Error creating booking:", error);
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to schedule appointment.",
        variant: "destructive",
      });
    } finally {
      setCreatingBooking(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  const handleExport = () => {
    if (customers.length === 0) return;

    const headers = ["Name", "Phone", "Visits", "Total Spent (MYR)", "Last Visit"];
    const csvContent = [
      headers.join(","),
      ...filteredCustomers.map(c => [
        `"${c.full_name || 'Anonymous'}"`,
        `"${c.phone || 'N/A'}"`,
        c.total_visits,
        c.total_spent,
        c.last_visit ? format(new Date(c.last_visit), "yyyy-MM-dd") : "Never"
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `NoamSkin_Customers_${format(new Date(), "yyyy_MM_dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Downloaded ${filteredCustomers.length} customer records.`,
    });
  };

  const handleAddCustomer = async () => {
    if (!addFormData.full_name || !currentSalon) return;

    const cleanPhone = (addFormData.phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone && (cleanPhone.length < 9 || cleanPhone.length > 10)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 9 to 10 digit Malaysian phone number (e.g. 12 345 6789).",
        variant: "destructive",
      });
      return;
    }

    const formattedPhone = cleanPhone ? `+60${cleanPhone}` : '';

    setAdding(true);
    try {
      // Manual creation for walk-in via API
      await api.bookings.create({
        salon_id: currentSalon.id,
        service_id: addFormData.initial_service,
        staff_id: isStaffMode ? staffProfileId : null,
        status: "completed",
        booking_date: new Date().toISOString().split('T')[0],
        booking_time: "12:00",
        customer_phone: formattedPhone || null,
        notes: `Manual Customer: ${addFormData.full_name}${formattedPhone ? ', Phone: ' + formattedPhone : ''}`
      });

      toast({
        title: "Customer Added",
        description: `${addFormData.full_name} has been added to local records.`,
      });

      setIsAddDialogOpen(false);
      setAddFormData({ full_name: "", phone: "", email: "", initial_service: "" });
      fetchCustomers();
    } catch (error: any) {
      console.error("Error adding customer:", error);
      toast({
        title: "Failed",
        description: error.message || "Could not create customer record locally.",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const fetchCustomers = async () => {
    if (!currentSalon) {
      if (!salonLoading) setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let staffId = staffProfileId;

      // If in staff mode and don't have staff ID yet, fetch it
      if (isStaffMode && !staffId && user) {
        try {
          const staffData = await api.staff.getMe(currentSalon.id);
          if (staffData?.id) {
            staffId = staffData.id;
            setStaffProfileId(staffId);
          }
        } catch (err) {
          console.error("Failed to fetch staff profile:", err);
        }
      }

      // Get bookings for this salon, filtered by staff if in staff mode
      const filters: any = { salon_id: currentSalon.id };
      if (isStaffMode && staffId) {
        filters.staff_id = staffId;
      }

      const bookings = await api.bookings.getAll(filters);

      if (!bookings || bookings.length === 0) {
        setCustomers([]);
        setLoading(false);
        return;
      }

      // Group by user_id to identify unique customers
      const customerMap = new Map<string, Customer>();

      for (const booking of bookings) {
        const userId = booking.user_id;
        if (!userId) continue;

        if (!customerMap.has(userId)) {
          const extractedName = booking.customer_name || "Walk-in";

          customerMap.set(userId, {
            user_id: userId,
            full_name: extractedName,
            phone: booking.customer_phone || null,
            email: booking.customer_email || null,
            avatar_url: booking.avatar_url || null,
            total_visits: 0,
            total_spent: 0,
            last_visit: null,
          });
        }

        const stats = customerMap.get(userId)!;
        stats.total_visits += 1;
        stats.total_spent += Number(booking.price || 0);

        if (!stats.last_visit || new Date(booking.booking_date) > new Date(stats.last_visit)) {
          stats.last_visit = booking.booking_date;
        }
      }

      const customerList = Array.from(customerMap.values());

      // Sort by selected criteria
      if (sortBy === "visits") {
        customerList.sort((a, b) => b.total_visits - a.total_visits);
      } else if (sortBy === "spent") {
        customerList.sort((a, b) => b.total_spent - a.total_spent);
      } else if (sortBy === "recent") {
        customerList.sort((a, b) => {
          if (!a.last_visit) return 1;
          if (!b.last_visit) return -1;
          return new Date(b.last_visit).getTime() - new Date(a.last_visit).getTime();
        });
      }

      setCustomers(customerList);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast({
        title: "Error",
        description: "Failed to load customers from local database",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [currentSalon, sortBy, isStaffMode]);

  const getCustomerTier = (totalSpent: number) => {
    if (totalSpent >= 10000) return {
      label: "VIP",
      color: "from-purple-500 to-purple-600",
      bg: "bg-purple-50",
      text: "text-purple-700",
      icon: Crown
    };
    if (totalSpent >= 5000) return {
      label: "Gold",
      color: "from-amber-500 to-amber-600",
      bg: "bg-amber-50",
      text: "text-amber-700",
      icon: Award
    };
    if (totalSpent >= 2000) return {
      label: "Silver",
      color: "from-gray-400 to-gray-500",
      bg: "bg-gray-50",
      text: "text-gray-700",
      icon: Shield
    };
    return {
      label: "Regular",
      color: "from-blue-500 to-blue-600",
      bg: "bg-blue-50",
      text: "text-blue-700",
      icon: Users
    };
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const topCustomers = customers.slice(0, 3);
  const totalRevenue = customers.reduce((sum, c) => sum + c.total_spent, 0);
  const avgSpentPerCustomer = customers.length > 0 ? totalRevenue / customers.length : 0;

  const filteredCustomers = customers.filter(
    (c) =>
      c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery)
  );

  if (authLoading || salonLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <ResponsiveDashboardLayout
      headerActions={
        isMobile ? (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9"
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search className="w-5 h-5" />
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className={`space-y-${isMobile ? '4' : '6'} pb-${isMobile ? '20' : '0'}`}>
        {/* Mobile Search Bar */}
        {isMobile && showSearch && (
          <Card className="border-0 shadow-sm bg-card">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 bg-secondary/30 border-border/50 focus:bg-card transition-colors"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mobile Stats Cards */}
        {isMobile && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-0 shadow-sm bg-blue-500/10">
              <CardContent className="p-3 text-center">
                <Users className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-blue-400">{customers.length}</p>
                <p className="text-xs text-blue-500/80 font-medium">Total</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-emerald-500/10">
              <CardContent className="p-3 text-center">
                <Banknote className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-emerald-400">MYR {Math.round(totalRevenue / 1000)}K</p>
                <p className="text-xs text-emerald-500/80 font-medium">Revenue</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-amber-500/10">
              <CardContent className="p-3 text-center">
                <TrendingUp className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-amber-400">MYR {Math.round(avgSpentPerCustomer)}</p>
                <p className="text-xs text-amber-500/80 font-medium">Avg</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Desktop Header */}
        {!isMobile && (
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h1 className="text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
                Customer CRM
                <Badge className="bg-accent/10 text-accent border-0 font-black px-3">
                  {customers.length}
                </Badge>
              </h1>
              <p className="text-muted-foreground font-medium">Analyze loyalty and manage client relationships from local DB</p>
            </div>
          </div>
        )}

        {/* Desktop Stats Cards */}
        {!isMobile && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-0 shadow-lg bg-blue-500/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-500">Total Customers</p>
                    <p className="text-3xl font-bold text-blue-400 mt-2">{customers.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-emerald-500/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-500">Total Revenue</p>
                    <p className="text-3xl font-bold text-emerald-400">MYR {totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <Banknote className="w-6 h-6 text-emerald-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-amber-500/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-500">Avg. Spent</p>
                    <p className="text-3xl font-bold text-amber-400">MYR {Math.round(avgSpentPerCustomer).toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Mobile Sort Options */}
        {isMobile && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Button
              variant={sortBy === "visits" ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy("visits")}
              className={`flex-shrink-0 ${sortBy === "visits" ? "bg-accent text-white" : ""}`}
            >
              Most Visits
            </Button>
            <Button
              variant={sortBy === "spent" ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy("spent")}
              className={`flex-shrink-0 ${sortBy === "spent" ? "bg-emerald-500 text-white hover:bg-emerald-600" : ""}`}
            >
              Top Spenders
            </Button>
            <Button
              variant={sortBy === "recent" ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy("recent")}
              className={`flex-shrink-0 ${sortBy === "recent" ? "bg-blue-500 text-white hover:bg-blue-600" : ""}`}
            >
              Recent Activity
            </Button>
          </div>
        )}



        {/* Desktop Search & Filters */}
        {!isMobile && (
          <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, phone, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 bg-secondary/30 border-border/50 focus:bg-card transition-colors text-base"
                  />
                </div>
                <Select value={sortBy} onValueChange={(v: "visits" | "spent" | "recent") => setSortBy(v)}>
                  <SelectTrigger className="w-full lg:w-48 h-12 bg-secondary/30 border-border/50">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visits">Most Visits</SelectItem>
                    <SelectItem value="spent">Highest Spender</SelectItem>
                    <SelectItem value="recent">Recent Activity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customers List */}
        <Card className="border-0 shadow-sm bg-card">
          <CardHeader className={`${isMobile ? 'pb-3 px-4 pt-4' : 'pb-4'}`}>
            <div className="flex items-center justify-between">
              <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold`}>
                All Customers ({filteredCustomers.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className={isMobile ? 'px-4 pb-4' : ''}>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`flex items-center gap-3 ${isMobile ? 'p-3' : 'p-4'} rounded-lg bg-secondary/20 animate-pulse`}>
                    <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-secondary/50 rounded-full`} />
                    <div className="flex-1 space-y-2">
                      <div className="w-32 h-4 bg-secondary/50 rounded" />
                      <div className="w-24 h-3 bg-secondary/50 rounded" />
                    </div>
                    <div className="w-16 h-6 bg-secondary/50 rounded" />
                  </div>
                ))}
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className={`text-center ${isMobile ? 'py-8' : 'py-12'}`}>
                <div className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} bg-gradient-to-br from-secondary/30 to-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <Users className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-muted-foreground`} />
                </div>
                <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-foreground mb-2`}>No customers found</h3>
                <p className={`text-muted-foreground mb-4 ${isMobile ? 'text-sm' : ''}`}>
                  {searchQuery
                    ? "Try adjusting your search criteria"
                    : "Start building your customer base by adding your first customer"
                  }
                </p>
                {/* Manual customer addition disabled */}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCustomers.map((customer) => {
                  const tier = getCustomerTier(customer.total_spent);
                  const TierIcon = tier.icon;
                  return (
                    <div
                      key={customer.user_id}
                      onClick={() => navigate(`${isStaffMode ? '/staff' : '/salon'}/customers/${customer.user_id}`)}
                      className={`group flex items-center ${isMobile ? 'gap-3 p-3' : 'gap-4 p-4'} rounded-lg bg-gradient-to-r from-secondary/10 to-secondary/5 hover:from-secondary/20 hover:to-secondary/10 transition-all duration-200 border border-border/20 hover:border-border/40 cursor-pointer`}
                    >
                      <Avatar className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} ring-2 ring-accent/20`}>
                        <AvatarImage src={customer.avatar_url || ""} />
                        <AvatarFallback className="bg-gradient-to-br from-accent/20 to-accent/10 text-accent font-semibold">
                          {getInitials(customer.full_name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-semibold text-foreground ${isMobile ? 'text-sm' : 'text-base'} truncate`}>
                            {customer.full_name}
                          </h3>
                          <TierIcon className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} ${tier.text} flex-shrink-0`} />
                          {!isMobile && (
                            <Badge className={`${tier.bg} ${tier.text} border-0 text-xs font-medium`}>
                              {tier.label}
                            </Badge>
                          )}
                        </div>
                        <div className={`flex ${isMobile ? 'flex-col gap-0' : 'items-center gap-4'} ${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                          {customer.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{customer.phone}</span>
                            </div>
                          )}
                          {customer.last_visit && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">
                                {isMobile
                                  ? format(new Date(customer.last_visit), "MMM d")
                                  : `Last visit ${formatDistanceToNow(new Date(customer.last_visit), { addSuffix: true })}`
                                }
                              </span>
                            </div>
                          )}
                        </div>
                        {isMobile && (
                          <div className="flex items-center gap-4 mt-1 text-xs">
                            <span className="text-accent font-medium">{customer.total_visits} visits</span>
                            <span className="text-emerald-500 font-medium">MYR {customer.total_spent.toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Desktop Stats */}
                      {!isMobile && (
                        <div className="hidden lg:flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-lg font-bold text-foreground">{customer.total_visits}</p>
                            <p className="text-xs text-muted-foreground font-medium">Visits</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-foreground">MYR {customer.total_spent.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground font-medium">Total Spent</p>
                          </div>
                          <div className="text-center min-w-[100px]">
                            <p className="text-sm font-medium text-foreground">
                              {customer.last_visit
                                ? format(new Date(customer.last_visit), "MMM d, yyyy")
                                : "Never"}
                            </p>
                            <p className="text-xs text-muted-foreground font-medium">Last Visit</p>
                          </div>
                        </div>
                      )}

                      {/* Action Menu */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`${isMobile ? 'w-8 h-8' : 'w-9 h-9 opacity-0 group-hover:opacity-100'} transition-opacity hover:bg-secondary/50`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent 
                            align="end" 
                            className="w-56 p-2 rounded-2xl border-none shadow-2xl bg-card"
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <DropdownMenuItem
                              className="rounded-xl py-3 font-semibold hover:bg-secondary/50 cursor-pointer text-accent focus:text-accent"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenBookAppointment(customer);
                              }}
                            >
                              <Calendar className="w-4 h-4 mr-2" />
                              Book Appointment
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="rounded-xl py-3 font-semibold hover:bg-secondary/50 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`${isStaffMode ? '/staff' : '/salon'}/customers/${customer.user_id}`);
                              }}
                            >
                              <Users className="w-4 h-4 mr-2" />
                              View Customer Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Book Appointment Dialog */}
        <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-accent" />
                Book Appointment
              </DialogTitle>
              <DialogDescription>
                Schedule a new appointment for <span className="font-bold text-foreground">{selectedCustomerForBooking?.full_name || 'Customer'}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Customer</Label>
                  <Input 
                    value={selectedCustomerForBooking?.full_name || ""} 
                    disabled 
                    className="bg-muted/40 font-medium rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Phone</Label>
                  <Input 
                    value={selectedCustomerForBooking?.phone || "No phone"} 
                    disabled 
                    className="bg-muted/40 font-medium rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Service <span className="text-rose-500">*</span></Label>
                <Select 
                  value={bookingForm.serviceId} 
                  onValueChange={v => setBookingForm(prev => ({ ...prev, serviceId: v }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {availableServices.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} - MYR {Number(s.price).toFixed(2)} ({s.duration_minutes || 30} mins)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Specialist / Staff (Optional)</Label>
                <Select 
                  value={bookingForm.staffId} 
                  onValueChange={v => setBookingForm(prev => ({ ...prev, staffId: v }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select specialist (Optional)" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {staffMembers.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.display_name || s.name || s.user?.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Date</Label>
                  <Input
                    type="date"
                    value={bookingForm.date}
                    onChange={e => setBookingForm(prev => ({ ...prev, date: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Time</Label>
                  <Input
                    type="time"
                    value={bookingForm.time}
                    onChange={e => setBookingForm(prev => ({ ...prev, time: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Notes (Optional)</Label>
                <Input
                  placeholder="Special requests or notes..."
                  value={bookingForm.notes}
                  onChange={e => setBookingForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowBookingModal(false)} className="rounded-xl font-bold">
                Cancel
              </Button>
              <Button
                onClick={handleCreateBooking}
                disabled={creatingBooking || !bookingForm.serviceId}
                className="bg-accent text-white font-bold rounded-xl"
              >
                {creatingBooking ? "Booking..." : "Confirm Booking"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Customer Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Add New Customer</DialogTitle>
              <DialogDescription>
                Manual entries are stored in your local local database for records.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  placeholder="Enter customer name"
                  value={addFormData.full_name}
                  onChange={(e) => setAddFormData({ ...addFormData, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  {addFormData.phone && (
                    <span className={`text-[10px] font-bold ${
                      addFormData.phone.length >= 9 && addFormData.phone.length <= 10
                        ? 'text-emerald-500'
                        : 'text-amber-500'
                    }`}>
                      {addFormData.phone.length >= 9 && addFormData.phone.length <= 10
                        ? '✓ Valid'
                        : `${addFormData.phone.length}/10 digits`}
                    </span>
                  )}
                </div>
                <div className="relative flex items-center">
                  <div className="absolute left-3 flex items-center gap-1.5 pointer-events-none text-muted-foreground font-bold text-sm select-none border-r border-border/50 pr-2.5">
                    <span className="text-base leading-none">🇲🇾</span>
                    <span className="text-foreground font-black text-xs">+60</span>
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="12 345 6789"
                    value={addFormData.phone}
                    onChange={(e) => {
                      let val = e.target.value.replace(/[^0-9]/g, '');
                      if (val.startsWith('60')) val = val.substring(2);
                      if (val.startsWith('0')) val = val.substring(1);
                      val = val.slice(0, 10);
                      setAddFormData({ ...addFormData, phone: val });
                    }}
                    className={`pl-20 h-10 bg-secondary/30 border-border/60 focus:bg-card text-foreground font-medium rounded-xl transition-all ${
                      addFormData.phone && (addFormData.phone.length < 9 || addFormData.phone.length > 10)
                        ? 'border-amber-500/60 focus-visible:ring-amber-500/30'
                        : ''
                    }`}
                    maxLength={10}
                  />
                </div>
                {addFormData.phone && (addFormData.phone.length < 9 || addFormData.phone.length > 10) && (
                  <p className="text-[10px] text-amber-500 font-medium pl-1">
                    Enter 9 to 10 digits (e.g. 12 345 6789)
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="customer@example.com"
                  value={addFormData.email}
                  onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddCustomer}
                className="bg-accent text-white font-bold"
                disabled={!addFormData.full_name || adding}
              >
                {adding ? "Adding..." : "Add Customer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ResponsiveDashboardLayout >
  );
}
