import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  CalendarIcon,
  Clock,
  ArrowLeft,
  Loader2,
  MapPin,
  Phone,
  Star,
  CheckCircle,
  CheckCircle2,
  MessageSquare,
  Coins,
  Sparkles,
  ChevronRight,
  User,
  ShieldCheck,
  Gem,
  Gift,
  PlusCircle,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import api from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  category: string;
  salon_id: string;
}

interface Salon {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  business_hours: any;
  is_active: boolean;
}

const generateTimeSlots = (businessHours: any, date: Date | undefined): string[] => {
  if (!businessHours || !date) return [];
  if (typeof businessHours === 'string') {
    try { businessHours = JSON.parse(businessHours); } catch { return []; }
  }

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = dayNames[date.getDay()];
  const dayHours = businessHours[dayName.toLowerCase()] || businessHours[dayName];

  if (!dayHours || dayHours.closed) return [];

  const openTime = dayHours.open || "09:00";
  const closeTime = dayHours.close || "20:00";

  const slots: string[] = [];
  const [openH, openM] = openTime.split(":").map(Number);
  const [closeH, closeM] = closeTime.split(":").map(Number);
  let h = openH, m = openM;

  while (h < closeH || (h === closeH && m < closeM)) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += 30;
    if (m >= 60) { h += 1; m = 0; }
  }

  return slots;
};

const skinConcerns = [
  "Oily / Breakouts",
  "Redness / Sensitive",
  "Dry / Tired Skin",
  "Uneven Tone / Acne Scars",
  "Loss of Firmness"
];

const mainCategories = [
  { id: 'Facial', label: 'Facial', icon: Sparkles },
  { id: 'Body', label: 'Body (Coming Soon)', icon: User, disabled: true },
  { id: 'Other', label: 'Other', icon: PlusCircle }
];

const BookAppointment = () => {
  const { id: routeSalonId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const salonId = searchParams.get("salonId") || routeSalonId;

  const [salon, setSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedAddOns, setSelectedAddOns] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string, discount: number, type?: string } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [pendingBookingIds, setPendingBookingIds] = useState<string[]>([]);

  const timeSlots = useMemo(() => generateTimeSlots(salon?.business_hours, selectedDate), [salon?.business_hours, selectedDate]);

  const [step, setStep] = useState(1); // 1 to 8

  // New States for 8-Step Flow
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [facialType, setFacialType] = useState<'custom' | 'advanced' | null>(null);
  const [selectedConcern, setSelectedConcern] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState<'service' | 'decide_later' | 'package' | 'membership'>('service');
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [paymentOption, setPaymentOption] = useState<'full' | 'deposit'>('full');

  // Member Details States
  const [memberDetails, setMemberDetails] = useState({
    fullName: "",
    email: "",
    phone: ""
  });

  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [salonOffers, setSalonOffers] = useState<any[]>([]);
  const [availableStaff, setAvailableStaff] = useState<any[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [userCoins, setUserCoins] = useState(0);
  const [coinPrice, setCoinPrice] = useState(1);
  const [coinSettings, setCoinSettings] = useState({
    min_redemption: 0,
    max_discount_percent: 100,
    earning_rate: 10
  });
  const [useCoins, setUseCoins] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!salonId) {
      toast({ title: "No Salon Selected", description: "Choosing the best for you...", variant: "default" });
      navigate("/services-simple");
      return;
    }
    fetchSalonAndServices();
  }, [salonId]);

  useEffect(() => {
    if (!loading && !user) {
      toast({
        title: "Login Required",
        description: "To reserve your bespoke experience, please join our community first.",
        variant: "default"
      });
      navigate("/signup", { 
        state: { 
          from: `/book?salonId=${salonId}${searchParams.get("serviceId") ? `&serviceId=${searchParams.get("serviceId")}` : ""}`
        } 
      });
    }
  }, [user, loading, salonId, navigate]);

  useEffect(() => {
    if (user) {
      setMemberDetails(prev => ({
        ...prev,
        fullName: prev.fullName || user.full_name || "",
        email: prev.email || user.email || "",
        phone: prev.phone || user.phone || ""
      }));
    }
  }, [user]);

  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!salonId || !selectedDate) return;
      setLoadingSlots(true);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const bookings = await api.bookings.getAll({ salon_id: salonId, date: dateStr });
        const booked = bookings.map((b: any) => b.booking_time.substring(0, 5));
        setBookedSlots(booked);
      } catch (err) {
        console.error("Error checking availability:", err);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchBookedSlots();
  }, [salonId, selectedDate]);

  useEffect(() => {
    const fetchAvailableStaff = async () => {
      if (!salonId) {
        setAvailableStaff([]);
        return;
      }
      setLoadingStaff(true);
      try {
        const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined;
        const staff = await api.staff.getAvailableSpecialists({
          salon_id: salonId,
          service_id: selectedServices[0]?.id,
          date: dateStr,
          time: selectedTime
        });
        setAvailableStaff(staff);
      } catch (err) {
        console.error("Error fetching available staff:", err);
        setAvailableStaff([]);
      } finally {
        setLoadingStaff(false);
      }
    };
    fetchAvailableStaff();
  }, [salonId, selectedDate, selectedTime, selectedServices, bookingType]);

  const fetchSalonAndServices = async () => {
    if (!salonId) return;
    setLoading(true);
    try {
      const salonData = await api.salons.getById(salonId);
      if (!salonData) throw new Error("Salon not found");
      setSalon(salonData);

      const servicesData = await api.services.getBySalon(salonId);
      setServices(servicesData || []);

      const offersData = await api.offers.getBySalon(salonId);
      setSalonOffers(offersData || []);

      const serviceId = searchParams.get("serviceId");
      if (serviceId && servicesData) {
        const preselected = servicesData.find((s: any) => s.id === serviceId);
        if (preselected) {
          setSelectedServices([preselected]);
          setActiveCategory(preselected.category);
          setBookingType('service');
          // Don't auto-jump, let them see what they selected or add more
          setStep(2);
        }
      } else if (searchParams.get("start") === "true") {
        setStep(2);
      }
    } catch (error) {
      console.error("Error fetching salon data:", error);
      toast({ title: "Error", description: error.message || "Could not connect to the server. Please check your internet connection.", variant: "destructive" });
      navigate("/services-simple");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchPoints = async () => {
      if (!user || !salonId) return;
      try {
        // 1. Fetch Platform Coins
        const coinData = await api.coins.getBalance();
        const coins = Number(coinData.balance || 0);

        // 2. Fetch Salon-specific Loyalty Points
        let loyaltyPoints = 0;
        try {
          loyaltyPoints = await api.loyalty.getMyPoints(salonId);
        } catch (e) {
          console.error("Error fetching loyalty points:", e);
        }

        setUserCoins(coins + loyaltyPoints);
        setCoinPrice(Number(coinData.price || 1));

        if (coinData.settings) {
          setCoinSettings(coinData.settings);
        }
      } catch (err) {
        console.error("Error fetching coins:", err);
      }
    };
    fetchPoints();
  }, [user, salonId]);

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !salonId || !policyAccepted) {
      toast({ title: "Incomplete Ritual", description: "Please complete all steps to reserve your session.", variant: "destructive" });
      return;
    }

    setBooking(true);
    try {
      // 1. Create the booking(s) first with 'pending' status
      const bookingIds = await completeBookingRecordsCreation();

      if (!bookingIds || bookingIds.length === 0) {
        throw new Error("Failed to create booking records.");
      }

      const finalPrice = calculateTotal();

      // 2. If payment is required, redirect to ToyyibPay
      if (finalPrice > 0) {
        toast({ title: "Redirecting...", description: "Taking you to ToyyibPay for secure payment." });

        // We use the first booking ID as reference, or join them
        const referenceId = bookingIds.join(',');
        const depositAmount = paymentOption === 'deposit' && finalPrice > 100 ? 100 : finalPrice;
        const response = await api.toyyibpay.createBill({ booking_id: referenceId, payment_type: paymentOption, amount: depositAmount });

        if (response?.payment_url) {
          window.location.href = response.payment_url;
        } else {
          throw new Error("Failed to generate payment URL.");
        }
        return;
      }

      // 3. If entirely free, show success step
      toast({
        title: "Booking Ritual Initiated!",
        description: "Your session is being prepared by our stylists."
      });
      setStep(7);

    } catch (error: any) {
      console.error("[handleBooking] Error:", error);
      toast({ title: "Ritual Interrupted", description: error.message || "An error occurred.", variant: "destructive" });
    } finally {
      if (calculateTotal() === 0) setBooking(false); // Only reset if not redirecting
    }
  };

  const completeBookingRecordsCreation = async (): Promise<string[]> => {
    const subtotal = calculateSubtotal();
    const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
    const coinDiscount = calculateCoinDiscount();
    const finalPriceTotal = Math.max(0, subtotal - couponDiscount - coinDiscount);

    const isPayingNow = calculateTotal() > 0;
    const bookingPayload = {
      user_id: user?.id,
      salon_id: salonId,
      staff_id: selectedStaffId,
      booking_date: format(selectedDate!, "yyyy-MM-dd"),
      booking_time: selectedTime,
      notes: `[GUEST: ${memberDetails.fullName} | ${memberDetails.phone}] ${notes}`.trim(),
      status: isPayingNow ? "pending" : "confirmed",
      use_coins: useCoins,
      price_paid: 0,
      discount_amount: couponDiscount,
      coupon_code: appliedCoupon?.code
    };

    let newBookingIds: string[] = [];

    if (bookingType === 'decide_later' || (selectedServices.length === 0 && selectedAddOns.length === 0)) {
      const res: any = await api.bookings.create({
        ...bookingPayload,
        service_id: selectedServices[0]?.id || null,
        price_paid: 0
      });
      if (res?.id) newBookingIds.push(res.id);
    } else {
      const totalItems = [...selectedServices, ...selectedAddOns];
      for (let i = 0; i < totalItems.length; i++) {
        const service = totalItems[i];
        const serviceDiscount = i === 0 ? couponDiscount : 0;
        const res: any = await api.bookings.create({
          ...bookingPayload,
          service_id: service.id,
          price_paid: 0,
          discount_amount: serviceDiscount
        });
        if (res?.id) newBookingIds.push(res.id);
      }
    }
    setPendingBookingIds(newBookingIds);
    return newBookingIds;
  };

  const handlePaymentError = (msg: string) => {
    console.warn("Payment error", msg);
  };

  const applyCoupon = async (code?: string) => {
    const codeToValidate = code || couponCode;
    if (!codeToValidate.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }

    try {
      const coupon = await api.coupons.validate(codeToValidate, salonId || undefined);

      if (coupon && coupon.is_active) {
        const subtotal = calculateSubtotal();
        const discountVal = Number(coupon.value || coupon.discount_value);
        const type = (coupon.type || coupon.discount_type || '').toLowerCase();

        const discountAmount = type === 'percentage' || type === 'percent'
          ? (subtotal * discountVal / 100)
          : discountVal;

        setAppliedCoupon({
          code: coupon.code,
          discount: discountAmount,
          type: type
        });
        setCouponError("");
        toast({
          title: "Coupon Applied!",
          description: `You saved RM ${discountAmount.toFixed(2)}`,
        });
      } else {
        setCouponError("Invalid or expired coupon code");
        toast({ title: "Invalid Coupon", description: "This coupon code is not valid or has expired.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Coupon validation error:", error);
      setCouponError(error.message || "Invalid coupon code");
      toast({ title: "Invalid Coupon", description: error.message || "This coupon code is not valid.", variant: "destructive" });
    }
  };

  const calculateSubtotal = () => {
    if (bookingType === 'decide_later') return 100;
    const subtotal = [...selectedServices, ...selectedAddOns].reduce((sum, s) => sum + Number(s.price), 0);
    return subtotal;
  };

  const calculateCoinDiscount = () => {
    if (!useCoins || userCoins < coinSettings.min_redemption) return 0;

    const subtotal = calculateSubtotal();
    const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
    const remainingTotal = Math.max(0, subtotal - couponDiscount);

    // Calculate potential value of coins
    let potentialDiscount = userCoins * coinPrice;

    // Respect max_discount_percent
    const maxAllowedDiscount = (subtotal * coinSettings.max_discount_percent) / 100;
    potentialDiscount = Math.min(potentialDiscount, maxAllowedDiscount);

    // Cannot exceed remaining total
    return Math.min(potentialDiscount, remainingTotal);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = appliedCoupon ? appliedCoupon.discount : 0;
    const coinDiscount = calculateCoinDiscount();
    return Math.max(0, subtotal - discount - coinDiscount);
  };

  const validateMemberDetails = () => {
    if (!memberDetails.fullName.trim() || !memberDetails.email.trim() || !memberDetails.phone.trim()) {
      toast({
        title: "Details Required",
        description: "Please complete all member fields to proceed with your ritual.",
        variant: "destructive"
      });
      return false;
    }
    // Simple email valid check
    if (!memberDetails.email.includes('@')) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const getStepTitle = (s: number) => {
    switch (s) {
      case 1: return "Welcome to Noam Skin";
      case 2: return "Select Your Treatments";
      case 3: return "Select Your Therapist";
      case 4: return "Calendar";
      case 5: return "Member Details";
      case 6: return "Policy Review";
      case 7: return "Session Reserved";
      default: return "";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-accent mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Syncing Registry...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB]">
      <Navbar />
      <div className="container mx-auto px-4 pt-32 pb-20">
        <div className="max-w-4xl mx-auto space-y-12">

          {/* Progress Header */}
          {step < 7 && (
            <div className="space-y-8">
              <div className="flex items-center gap-6">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}
                  className="rounded-full bg-white shadow-sm hover:shadow-md transition-all"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-1">Step 0{step} of 06</span>
                  <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight uppercase">{getStepTitle(step)}</h1>
                </div>
              </div>

              <div className="flex gap-2 h-1.5 px-1">
                {[1, 2, 3, 4, 5, 6].map((s) => (
                  <div key={s} className={`flex-1 rounded-full transition-all duration-500 ${step >= s ? (step === s ? 'bg-accent w-2/3' : 'bg-slate-900') : 'bg-slate-100'}`} />
                ))}
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* STEP 1: WELCOME */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12 py-12 text-center"
              >
                <div className="space-y-6">
                  <div className="w-20 h-20 bg-accent/10 rounded-[2rem] flex items-center justify-center mx-auto">
                    <Sparkles className="w-10 h-10 text-accent" />
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight uppercase">
                    Ready to start<br />your ritual?
                  </h2>
                  <p className="text-sm md:text-lg text-slate-500 font-medium max-w-lg mx-auto italic">
                    Step into a space of calm. Select your services, find your stylist, and reserve your moment.
                  </p>
                </div>
                <Button
                  onClick={() => setStep(2)}
                  className="h-14 md:h-20 px-8 md:px-16 bg-slate-900 hover:bg-black text-white rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-xs md:text-sm shadow-2xl transition-all hover:scale-105"
                >
                  Start Booking
                </Button>
              </motion.div>
            )}

            {/* STEP 2: SELECT SERVICES (NEW) */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* Categories Tabs */}
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                  {["All", ...Array.from(new Set(services.map(s => s.category)))].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat === "All" ? null : cat)}
                      className={cn(
                        "px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all",
                        (activeCategory === cat || (cat === "All" && !activeCategory))
                          ? "bg-slate-900 text-white shadow-lg"
                          : "bg-white text-slate-400 hover:bg-slate-50 border border-slate-100"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Services Grid */}
                <div className="grid grid-cols-1 gap-4">
                  {services
                    .filter(s => !activeCategory || s.category === activeCategory)
                    .map(service => {
                      const isSelected = selectedServices.some(s => s.id === service.id);
                      return (
                        <div
                          key={service.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedServices(prev => prev.filter(s => s.id !== service.id));
                            } else {
                              setSelectedServices(prev => [...prev, service]);
                            }
                          }}
                          className={cn(
                            "group cursor-pointer relative p-6 rounded-[2rem] border-2 transition-all duration-300",
                            isSelected
                              ? "border-accent bg-accent/5 shadow-xl shadow-accent/10"
                              : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-md"
                          )}
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className={cn("text-lg font-black uppercase tracking-tight", isSelected ? "text-slate-900" : "text-slate-700")}>
                                  {service.name}
                                </h3>
                                {isSelected && <CheckCircle2 className="w-5 h-5 text-accent animate-in zoom-in spin-in-90" />}
                              </div>
                              <p className="text-sm font-medium text-slate-500 line-clamp-2">{service.description}</p>
                              <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase pt-2">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {service.duration_minutes} min</span>
                                <span className={cn("px-2 py-1 rounded bg-slate-100", isSelected && "bg-accent/10 text-accent")}>
                                  {service.category}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={cn("text-xl font-black", isSelected ? "text-accent" : "text-slate-900")}>
                                RM {service.price}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Summary Footer */}
                <div className="mt-8 pt-8 border-t border-slate-100">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Selection</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900">RM {calculateSubtotal().toFixed(2)}</span>
                        <span className="text-sm font-bold text-slate-500">
                          ({selectedServices.length} items)
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                      <Button onClick={() => setStep(1)} variant="outline" className="flex-1 md:flex-none h-14 rounded-2xl px-8 font-black uppercase">Back</Button>
                      <Button
                        onClick={() => setStep(3)}
                        disabled={selectedServices.length === 0}
                        className="flex-[2] md:flex-none h-14 rounded-2xl px-10 bg-slate-900 text-white font-black uppercase shadow-xl hover:bg-accent hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Confirm & Continue
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: SELECT THERAPIST (was Step 2) */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-12"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setSelectedStaffId(null)}
                    className={cn(
                      "p-6 md:p-8 rounded-[2rem] border-2 transition-all flex items-center gap-4 md:gap-6",
                      !selectedStaffId ? "border-accent bg-accent/5 shadow-lg shadow-accent/5" : "border-slate-100 bg-white hover:border-slate-200"
                    )}
                  >
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0">
                      <User className={cn("w-6 h-6 md:w-8 md:h-8", !selectedStaffId ? "text-accent" : "text-slate-300")} />
                    </div>
                    <div className="text-left">
                      <h4 className="text-lg md:text-xl font-black text-slate-900 uppercase">Any Beautician</h4>
                      <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-tight">Best for immediate registry</p>
                    </div>
                  </button>

                  {availableStaff.map((staff) => (
                    <button
                      key={staff.id}
                      onClick={() => setSelectedStaffId(staff.id)}
                      className={cn(
                        "p-6 md:p-8 rounded-[2rem] border-2 transition-all flex items-center gap-4 md:gap-6 text-left",
                        selectedStaffId === staff.id ? "border-accent bg-accent/5 shadow-lg shadow-accent/5" : "border-slate-100 bg-white hover:border-slate-200"
                      )}
                    >
                      <Avatar className="w-12 h-12 md:w-16 md:h-16 rounded-2xl border-4 border-white shadow-sm shrink-0">
                        <AvatarImage src={staff.avatar_url} />
                        <AvatarFallback className="bg-slate-100 font-black text-slate-400">{staff.display_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="text-lg md:text-xl font-black text-slate-900 uppercase">{staff.display_name}</h4>
                        <p className="text-[10px] md:text-xs text-accent font-bold uppercase tracking-widest">Master Specialist</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-4">
                  <Button onClick={() => setStep(2)} variant="outline" className="h-14 md:h-20 rounded-[2.5rem] px-6 md:px-12 font-black uppercase tracking-widest text-xs md:text-sm">Back</Button>
                  <Button onClick={() => setStep(4)} className="flex-1 h-14 md:h-20 rounded-[2.5rem] bg-slate-900 text-white font-black text-sm md:text-lg shadow-xl uppercase">Select Time & Date</Button>
                </div>
              </motion.div>
            )}


            {/* STEP 4: REGISTRY CALENDAR - DATE & TIME */}
            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <Card className="border-none shadow-sm bg-white rounded-[3rem]  md:p-10 flex justify-center items-center overflow-hidden">
                    <div className="w-full max-w-[350px] md:max-w-none transform scale-90 md:scale-100 origin-top">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const compareDate = new Date(date);
                          compareDate.setHours(0, 0, 0, 0);
                          return compareDate < today || date.getDay() === 0;
                        }}
                        className="mx-auto border border-slate-100 rounded-xl md:border-none p-2 md:p-0"

                        classNames={{
                          day_selected: " text-white font-bold rounded-lg",
                          day_today: "border border-[#4A3728] p-2",
                          day: " p-2 rounded-lg transition",
                        }}
                      />
                    </div>
                  </Card>

                  <div className="space-y-8">
                    <div className="flex items-center gap-3 ml-2">
                      <Clock className="w-5 h-5 text-accent" />
                      <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Available Time Slots</Label>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {timeSlots.map(time => {
                        const isBooked = bookedSlots.includes(time);
                        return (
                          <button
                            key={time}
                            disabled={isBooked}
                            onClick={() => setSelectedTime(time)}
                            className={cn(
                              "h-12 md:h-16 rounded-2xl font-black transition-all text-xs md:text-sm uppercase",
                              isBooked ? "bg-slate-50 text-slate-200 cursor-not-allowed border border-slate-100" :
                                selectedTime === time ? "bg-accent text-white shadow-xl shadow-accent/20 scale-105" :
                                  "bg-white text-slate-900 hover:bg-slate-50 border border-slate-100 shadow-sm"
                            )}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                    {selectedTime && (
                      <div className="p-4 md:p-6 rounded-3xl bg-slate-900 text-white flex justify-between items-center animate-in slide-in-from-bottom-2">
                        <span className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-60">Selection</span>
                        <span className="text-sm md:text-lg font-black">{selectedDate ? format(selectedDate, "MMM dd") : ''} at {selectedTime}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button onClick={() => setStep(3)} variant="outline" className="h-14 md:h-20 rounded-[2.5rem] px-6 md:px-12 font-black uppercase tracking-widest text-xs md:text-sm">Back</Button>
                  <Button onClick={() => setStep(5)} disabled={!selectedDate || !selectedTime} className="flex-1 h-14 md:h-20 rounded-[2.5rem] bg-slate-900 text-white font-black text-sm md:text-lg shadow-xl uppercase">Complete Details</Button>
                </div>
              </motion.div>
            )}

            {/* STEP 5: PERSONAL DETAILS (was Step 4) */}
            {step === 5 && (
              <motion.div key="step5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
                <Card className="border-none shadow-sm bg-white rounded-[3rem] p-6 md:p-12 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-bl-[5rem]" />
                  <div className="relative space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                      <div className="space-y-3">
                        <Label className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</Label>
                        <Input
                          value={memberDetails.fullName}
                          onChange={(e) => setMemberDetails({ ...memberDetails, fullName: e.target.value })}
                          className="h-14 md:h-16 rounded-2xl bg-white border-2 border-slate-100 focus:border-accent px-4 md:px-6 font-bold text-sm md:text-base"
                          placeholder="Your identity..."
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</Label>
                        <Input
                          value={memberDetails.email}
                          onChange={(e) => setMemberDetails({ ...memberDetails, email: e.target.value })}
                          className="h-14 md:h-16 rounded-2xl bg-white border-2 border-slate-100 focus:border-accent px-4 md:px-6 font-bold text-sm md:text-base"
                          placeholder="ritual@noam.com"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</Label>
                      <Input
                        value={memberDetails.phone}
                        onChange={(e) => setMemberDetails({ ...memberDetails, phone: e.target.value })}
                        className="h-14 md:h-16 rounded-2xl bg-white border-2 border-slate-100 focus:border-accent px-4 md:px-6 font-bold text-sm md:text-base"
                        placeholder="01X-XXX XXXX"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Additional Notes</Label>
                      <Textarea
                        className="h-24 md:h-32 rounded-3xl bg-white border-2 border-slate-100 focus:border-accent p-4 md:p-6 font-medium italic text-sm md:text-base"
                        placeholder="Any allergies or specific requirements we should prepare for?"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>
                </Card>

                <div className="flex gap-4">
                  <Button onClick={() => setStep(4)} variant="outline" className="h-14 md:h-20 rounded-[2.5rem] px-6 md:px-12 font-black uppercase tracking-widest text-xs md:text-sm">Back</Button>
                  <Button onClick={() => setStep(6)} className="flex-1 h-14 md:h-20 rounded-[2.5rem] bg-slate-900 text-white font-black text-sm md:text-lg shadow-xl uppercase">Review & Policy</Button>
                </div>
              </motion.div>
            )}

            {/* STEP 6: POLICY REVIEW (was Step 5) */}
            {step === 6 && (
              <motion.div key="step6" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-12">
                <Card className="border-2 border-slate-900 shadow-sm bg-white text-slate-900 rounded-[1.5rem] p-12 space-y-12">
                  <div className="space-y-6">
                    <h3 className="text-xl md:text-2xl font-semibold tracking-tight border-b border-slate-200 pb-4">
                      Cancellation & House Policy
                    </h3>
                    <div className="space-y-8 text-slate-600 font-normal leading-relaxed text-sm md:text-base">
                      <p>We value everyone’s time and kindly request that any changes or cancellations be made at least 24 hours in advance.</p>
                      <div className="space-y-4">
                        <p className="text-slate-900 font-black uppercase tracking-widest text-[10px] opacity-60">To maintain a comfortable environment:</p>
                        <ul className="space-y-3">
                          <li className="flex gap-3">
                            <span className="font-semibold">1.</span>
                            <span>No pets are allowed in the studio.</span>
                          </li>
                          <li className="flex gap-3">
                            <span className="font-semibold">2.</span>
                            <span>Children under 12 years old are not permitted.</span>
                          </li>
                          <li className="flex gap-3">
                            <span className="font-semibold">3.</span>
                            <span>Only one accompanying person allowed.</span>
                          </li>
                          <li className="flex gap-3">
                            <span className="font-semibold">4.</span>
                            <span>Same-day cancellations, no-shows, or late arrivals (15+ min) will be charged 100% of the service fee.</span>
                          </li>
                        </ul>
                      </div>
                      <p className="pt-4 border-t border-slate-100">By booking with us, you agree to these terms. For assistance, contact: 011-2319 8819.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-8 rounded-[2rem] bg-slate-50 border border-slate-100">
                    <Checkbox
                      id="policy"
                      checked={policyAccepted}
                      onCheckedChange={(val) => setPolicyAccepted(val as boolean)}
                      className="mt-1 border-slate-200 data-[state=checked]:bg-accent data-[state=checked]:text-white"
                    />
                    <Label htmlFor="policy" className="text-xs md:text-sm font-bold text-slate-700 cursor-pointer select-none leading-relaxed">
                      I have read and agree to the Cancellation & House Policy.
                    </Label>
                  </div>

                  {/* Available Offers */}
                  {salonOffers.length > 0 && (
                    <div className="space-y-4">
                      <Label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Gift className="w-4 h-4" /> Available Offers
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {salonOffers.filter((o: any) => o.code).map((offer: any) => {
                          const isApplied = appliedCoupon?.code === offer.code;
                          const discountText = offer.discount_type === 'percentage' || offer.discount_type === 'percent'
                            ? `${offer.discount_value}% OFF`
                            : `RM ${Number(offer.discount_value).toFixed(2)} OFF`;
                          return (
                            <button
                              key={offer.id}
                              type="button"
                              onClick={() => {
                                if (isApplied) {
                                  setCouponCode("");
                                  setAppliedCoupon(null);
                                  setCouponError("");
                                } else {
                                  setCouponCode(offer.code);
                                  setAppliedCoupon(null);
                                  setCouponError("");
                                  applyCoupon(offer.code);
                                }
                              }}
                              className={`text-left p-4 rounded-2xl border-2 transition-all ${
                                isApplied
                                  ? 'bg-accent/10 border-accent'
                                  : 'bg-white border-slate-100 hover:border-accent/50 hover:shadow-sm'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-black text-sm text-slate-900">{offer.name}</span>
                                <Badge variant="outline" className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                                  isApplied ? 'border-accent text-accent bg-accent/5' : 'border-emerald-500/30 text-emerald-600 bg-emerald-50'
                                }`}>
                                  {discountText}
                                </Badge>
                              </div>
                              {offer.description && (
                                <p className="text-[11px] font-medium text-slate-500 leading-relaxed">{offer.description}</p>
                              )}
                              {isApplied && (
                                <div className="flex items-center gap-1 mt-2 text-accent text-[10px] font-black uppercase">
                                  <CheckCircle2 className="w-3 h-3" /> Applied
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Have an Offer Code?</Label>
                      <div className="flex gap-4">
                        <Input
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="PROMO CODE"
                          className="h-14 md:h-16 rounded-2xl bg-white border-2 border-slate-100 focus:border-accent px-4 md:px-6 font-bold text-slate-900 placeholder:text-slate-400 text-sm"
                        />
                        <Button
                          onClick={() => {
                            if (appliedCoupon) {
                              setCouponCode("");
                              setAppliedCoupon(null);
                              setCouponError("");
                            } else {
                              applyCoupon();
                            }
                          }}
                          disabled={!couponCode && !appliedCoupon}
                          className="h-14 md:h-16 px-6 md:px-8 rounded-2xl bg-[#1A1A1A] hover:bg-black text-white font-black uppercase tracking-widest text-xs md:text-sm"
                        >
                          {appliedCoupon ? "Remove" : "Apply"}
                        </Button>
                      </div>
                      {appliedCoupon && appliedCoupon.discount > 0 && (
                        <div className="flex items-center gap-2 text-accent animate-in fade-in slide-in-from-top-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase">RM {appliedCoupon.discount.toFixed(2)} Savings applied</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Use Loyalty points</Label>
                        <Badge variant="outline" className="border-accent/30 text-accent bg-accent/5 font-black text-[10px] px-3 py-1 rounded-full">
                          {userCoins} POINTS (RM {(userCoins * coinPrice).toFixed(2)})
                        </Badge>
                      </div>

                      <button
                        onClick={() => setUseCoins(!useCoins)}
                        disabled={userCoins < coinSettings.min_redemption}
                        className={cn(
                          "w-full h-14 md:h-16 rounded-2xl border-2 transition-all flex items-center justify-between px-4 md:px-6",
                          useCoins
                            ? "bg-accent/10 border-accent text-accent"
                            : "bg-white border-slate-100 text-slate-900 hover:border-slate-200",
                          userCoins < coinSettings.min_redemption && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Coins className={cn("w-5 h-5", useCoins ? "text-accent" : "text-slate-400")} />
                          <span className="font-black uppercase text-xs tracking-widest">
                            {useCoins ? "Redeeming Balance" : "Redeem Points"}
                          </span>
                        </div>
                        <Switch
                          checked={useCoins}
                          disabled={userCoins < coinSettings.min_redemption}
                          className="data-[state=checked]:bg-accent"
                        />
                      </button>

                      {userCoins < coinSettings.min_redemption ? (
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-tight italic ml-1">
                          Min. {coinSettings.min_redemption} points required to redeem
                        </p>
                      ) : useCoins && (
                        <div className="flex items-center gap-2 text-accent animate-in fade-in slide-in-from-top-1">
                          <Gem className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase">RM {calculateCoinDiscount().toFixed(2)} Point Discount Applied</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price Breakdown */}
                  <div className="space-y-4 pt-8 border-t border-slate-100">
                    <div className="flex justify-between items-center text-xs md:text-sm font-medium text-slate-500">
                      <span>Subtotal</span>
                      <span>RM {calculateSubtotal().toFixed(2)}</span>
                    </div>
                    {appliedCoupon && appliedCoupon.discount > 0 && (
                      <div className="flex justify-between items-center text-xs md:text-sm font-bold text-accent">
                        <span>Discount ({appliedCoupon.code})</span>
                        <span>- RM {appliedCoupon.discount.toFixed(2)}</span>
                      </div>
                    )}
                    {useCoins && calculateCoinDiscount() > 0 && (
                      <div className="flex justify-between items-center text-xs md:text-sm font-bold text-accent">
                        <span>Loyalty Points Redemption</span>
                        <span>- RM {calculateCoinDiscount().toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {calculateTotal() > 100 && (
                    <div className="pt-8 border-t border-slate-100 space-y-4">
                      <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Payment Option</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div 
                          onClick={() => setPaymentOption('deposit')} 
                          className={cn("p-4 border-2 rounded-xl cursor-pointer transition-all", paymentOption === 'deposit' ? "border-accent bg-accent/5" : "border-slate-100 bg-white")}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-sm">Pay Deposit Only</span>
                            {paymentOption === 'deposit' && <CheckCircle2 className="w-5 h-5 text-accent" />}
                          </div>
                          <p className="text-xs text-slate-500 mt-2">Pay RM 100 now to secure your booking. The remaining balance will be paid at the salon.</p>
                        </div>
                        <div 
                          onClick={() => setPaymentOption('full')} 
                          className={cn("p-4 border-2 rounded-xl cursor-pointer transition-all", paymentOption === 'full' ? "border-accent bg-accent/5" : "border-slate-100 bg-white")}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-sm">Pay Full Amount</span>
                            {paymentOption === 'full' && <CheckCircle2 className="w-5 h-5 text-accent" />}
                          </div>
                          <p className="text-xs text-slate-500 mt-2">Pay RM {calculateTotal().toFixed(2)} to complete your payment.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="text-center md:text-left w-full md:w-auto flex justify-between md:block items-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0 md:mb-2">{paymentOption === 'deposit' && calculateTotal() > 100 ? 'Amount to Pay Now' : 'Total Reservation Value'}</p>
                      <p className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">RM {paymentOption === 'deposit' && calculateTotal() > 100 ? '100.00' : calculateTotal().toFixed(2)}</p>
                    </div>

                    <div className="w-full md:w-auto">
                      <Button
                        onClick={handleBooking}
                        disabled={!policyAccepted || booking}
                        className="w-full md:w-auto h-16 md:h-20 px-8 md:px-16 bg-[#1A1A1A] hover:bg-black text-white rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-xs md:text-sm shadow-xl transition-all"
                      >
                        {booking ? (
                          <div className="flex items-center gap-3">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{calculateTotal() > 0 ? "Redirecting to ToyyibPay..." : "Finalizing..."}</span>
                          </div>
                        ) : (
                          calculateTotal() > 0 ? "Pay Now with ToyyibPay" : "Confirm & Book Now"
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* STEP 7: SUCCESS (was Step 6) */}
            {step === 7 && (
              <motion.div key="step7" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-12 py-12">
                <div className="space-y-8">
                  <div className="w-24 h-24 md:w-32 md:h-32 bg-accent/10 rounded-[3rem] flex items-center justify-center mx-auto">
                    <CheckCircle className="w-12 h-12 md:w-16 md:h-16 text-accent" />
                  </div>
                  <div className="space-y-2 md:space-y-4">
                    <h1 className="text-3xl md:text-6xl font-black text-slate-900 tracking-tight uppercase">Session Reserved.</h1>
                    <p className="text-base md:text-xl text-slate-500 font-medium max-w-sm mx-auto italic">Your ritual has been successfully logged. We are preparing for your arrival.</p>
                  </div>
                </div>

                <div className="p-6 md:p-10 bg-white rounded-[3rem] border border-slate-100 shadow-sm max-w-md mx-auto space-y-4 md:space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Date & Time</span>
                    <span className="text-xs md:text-sm font-black text-slate-900">{selectedDate ? format(selectedDate, "PPP") : ''} at {selectedTime}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Therapist</span>
                    <span className="text-xs md:text-sm font-black text-slate-900">{selectedStaffId ? 'Master Specialist' : 'Direct Registry'}</span>
                  </div>
                </div>

                <div className="pt-8 flex flex-col gap-4 max-w-xs mx-auto">
                  <Button onClick={() => navigate("/my-bookings")} className="h-14 md:h-20 bg-slate-900 text-white font-black rounded-3xl w-full text-xs md:text-sm uppercase tracking-widest shadow-xl">View Appointments</Button>
                  <Button variant="ghost" onClick={() => navigate("/")} className="text-slate-400 font-bold hover:bg-slate-50 rounded-2xl uppercase tracking-widest text-[10px]">Return Home</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
      <Footer />
    </div>
  );
};

export default BookAppointment;
