import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
    Send,
    Smile,
    ChevronRight,
    Loader2,
    CheckCircle2,
    ShieldCheck,
    Fingerprint,
    Search,
    Filter,
    MoreVertical,
    Share2,
    LayoutDashboard,
    ArrowLeft,
    Phone,
    Mail,
    Clock,
    Plus,
    AlertCircle,
    Pill,
    ClipboardList,
    Calendar,
    MessageCircle,
    Activity,
    Save,
    FileText,
    User,
    TrendingUp,
    Settings,
    Star,
    Sparkles,
    Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ResponsiveDashboardLayout } from "@/components/dashboard/ResponsiveDashboardLayout";
import { useSalon } from "@/hooks/useSalon";
import api from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { format, isValid, parseISO } from "date-fns";

const safeFormat = (dateInput: string | Date | null | undefined, fmt: string) => {
    if (!dateInput) return "N/A";
    let date;
    if (typeof dateInput === 'string') {
        const datePart = dateInput.split('T')[0].split(' ')[0];
        const parts = datePart.split('-');
        if (parts.length === 3) {
            date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        } else {
            date = new Date(dateInput);
        }
    } else {
        date = dateInput;
    }
    if (!isValid(date)) return "N/A";
    return format(date, fmt);
};

interface Booking {
    id: string;
    booking_date: string;
    booking_time: string;
    status: string;
    service_name: string;
    price: number;
    duration_minutes: number;
    notes: string | null;
}

interface CustomerProfile {
    id?: string;
    user_id?: string;
    full_name: string | null;
    phone: string | null;
    email?: string;
    avatar_url: string | null;
    created_at?: string;
    date_of_birth?: string;
    skin_type?: string;
    skin_issues?: string;
    allergy_records?: string;
}

export default function CustomerDetailsPage() {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { currentSalon } = useSalon();
    const location = useLocation();
    const isStaffMode = location.pathname.startsWith("/staff");

    const [profile, setProfile] = useState<CustomerProfile | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("history");
    const [purchases, setPurchases] = useState<any[]>([]);
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
    const [newPurchase, setNewPurchase] = useState({ product_name: "", price: "", inventory_id: "" });
    const [savingPurchase, setSavingPurchase] = useState(false);

    const [dob, setDob] = useState("");
    const [skinType, setSkinType] = useState("");
    const [allergies, setAllergies] = useState("");
    const [skinIssues, setSkinIssues] = useState("");
    const [medicalConditions, setMedicalConditions] = useState("");
    const [notes, setNotes] = useState("");
    const [concernPhotoUrl, setConcernPhotoUrl] = useState("");
    const [savingCRM, setSavingCRM] = useState(false);
    const [treatments, setTreatments] = useState<any[]>([]);

    const [isProfileEditDialogOpen, setIsProfileEditDialogOpen] = useState(false);
    const [editProfileData, setEditProfileData] = useState({
        full_name: "",
        phone: "",
        email: "",
        avatar_url: ""
    });

    // ... treatment record states ...
    const [isTreatmentDialogOpen, setIsTreatmentDialogOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [treatmentData, setTreatmentData] = useState({
        treatment_details: "",
        products_used: "",
        skin_reaction: "",
        improvement_notes: "",
        recommended_next_treatment: "",
        post_treatment_instructions: "",
        follow_up_reminder_date: "",
        marketing_notes: "",
        before_photo_url: "",
        after_photo_url: "",
        service_name_manual: "",
        record_date: new Date().toISOString().split('T')[0]
    });
    const [savingTreatment, setSavingTreatment] = useState(false);

    // Booking Dialog States
    const [isBookingOpen, setIsBookingOpen] = useState(false);
    const [selectedService, setSelectedService] = useState("");
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedTime, setSelectedTime] = useState("");

    const fetchData = async () => {
        if (!userId || !currentSalon) return;
        setLoading(true);
        try {
            // Fetch Profile from local API
            let profileData: any = null;
            try {
                profileData = await api.profiles.getById(userId);
            } catch (err) {
                console.warn("Could not fetch direct profile:", err);
            }

            // Fetch Bookings for this customer
            let bookingsData: any[] = [];
            try {
                bookingsData = await api.bookings.getAll({ user_id: userId, salon_id: currentSalon.id });
            } catch (err) {
                console.warn("Error fetching customer bookings:", err);
            }

            const directName = profileData?.full_name || profileData?.profile?.full_name || '';
            const directPhone = profileData?.phone || profileData?.profile?.phone || '';
            const directEmail = profileData?.email || profileData?.profile?.email || profileData?.user?.email || '';
            const directAvatar = profileData?.avatar_url || profileData?.profile?.avatar_url || null;

            let finalName = directName;
            let finalPhone = directPhone;
            let finalEmail = directEmail;

            // If profile is thin but bookings have data, enrich it only as fallback
            if (!finalName && bookingsData && bookingsData.length > 0) {
                for (const b of bookingsData) {
                    if (!finalName) {
                        finalName = b.full_name || b.user_name || (b as any).customer_name;
                        if (!finalName && b.notes) {
                            const walkInMatch = b.notes.match(/(?:Walk-in|Manual Customer):\s*([^|,#\n]+)/);
                            if (walkInMatch && walkInMatch[1].trim() && walkInMatch[1].trim() !== "undefined") {
                                finalName = walkInMatch[1].trim();
                            }
                        }
                    }
                    if (!finalPhone) finalPhone = b.phone || b.user_phone || (b as any).customer_phone;
                    if (!finalEmail) finalEmail = b.email || (b as any).customer_email;
                }
            }

            const enrichedProfile: CustomerProfile = {
                id: userId,
                user_id: userId,
                full_name: finalName || (finalEmail ? finalEmail.split('@')[0] : `Client #${userId.substring(0, 4)}`),
                phone: finalPhone || null,
                email: finalEmail || undefined,
                avatar_url: directAvatar
            };

            // Fetch CRM extended data
            try {
                const crmData = await api.customerRecords.getProfile(userId, currentSalon.id);
                if (crmData?.profile) {
                    setSkinType(crmData.profile.skin_type || "");
                    setAllergies(crmData.profile.allergy_records || "");
                    setSkinIssues(crmData.profile.skin_issues || "");
                    setDob(crmData.profile.date_of_birth ? crmData.profile.date_of_birth.split('T')[0] : "");
                    setMedicalConditions(crmData.profile.medical_conditions || "");
                    setNotes(crmData.profile.notes || "");
                    setConcernPhotoUrl(crmData.profile.concern_photo_url || "");
                }
            } catch (err) {
                console.warn("No CRM data found or error fetching it");
            }

            setProfile(enrichedProfile);
            setBookings(bookingsData || []);

            // Fetch Product Purchases
            try {
                const purchasesData = await api.productPurchases.getByCustomer(userId, currentSalon.id);
                setPurchases(purchasesData || []);
            } catch (err) {
                console.warn("Error fetching purchases:", err);
            }

            // Fetch Inventory
            try {
                const inventoryData = await api.inventory.getBySalon(currentSalon.id);
                setInventoryItems(inventoryData?.items || []);
            } catch (err) {
                console.warn("Error fetching inventory:", err);
            }

            // Fetch Treatment History
            try {
                const treatmentsData = await api.customerRecords.getUserTreatments(userId, currentSalon.id);
                setTreatments(treatmentsData?.treatments || []);
            } catch (err) {
                console.warn("Error fetching treatments:", err);
            }

            // Handle query parameters for direct record opening
            const params = new URLSearchParams(window.location.search);
            const tab = params.get("tab");
            const bookingId = params.get("bookingId");

            if (tab) setActiveTab(tab);
            if (bookingId && bookingsData) {
                const targetBooking = bookingsData.find((b: any) => b.id === bookingId);
                if (targetBooking) {
                    handleOpenTreatmentRecord(targetBooking);
                }
            }

        } catch (error) {
            console.error("Error fetching local customer details:", error);
            toast({
                title: "Error",
                description: "Could not load data from local database",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [userId, currentSalon]);

    const handleSaveCRM = async () => {
        if (!userId || !currentSalon) return;
        setSavingCRM(true);
        try {
            await api.customerRecords.saveProfile({
                user_id: userId,
                salon_id: currentSalon.id,
                skin_type: skinType,
                allergy_records: allergies,
                skin_issues: skinIssues,
                date_of_birth: dob,
                medical_conditions: medicalConditions,
                notes: notes,
                concern_photo_url: concernPhotoUrl
            });
            toast({
                title: "Success",
                description: "Customer health profile updated successfully.",
            });
            fetchData();
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update profile.",
                variant: "destructive"
            });
        } finally {
            setSavingCRM(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!userId || !currentSalon) return;
        setLoading(true);
        try {
            // 1. Update Basic Profile + Health Profile
            await api.profiles.updateById(userId, {
                full_name: editProfileData.full_name.trim(),
                phone: editProfileData.phone.trim(),
                email: editProfileData.email.trim(),
                avatar_url: editProfileData.avatar_url,
                salon_id: currentSalon.id,
                skin_type: skinType,
                allergy_records: allergies,
                skin_issues: skinIssues,
                date_of_birth: dob || null,
                medical_conditions: medicalConditions,
                notes: notes,
                concern_photo_url: concernPhotoUrl
            });

            // 2. Also save to CustomerRecords table
            await api.customerRecords.saveProfile({
                user_id: userId,
                salon_id: currentSalon.id,
                skin_type: skinType,
                allergy_records: allergies,
                skin_issues: skinIssues,
                date_of_birth: dob || null,
                medical_conditions: medicalConditions,
                notes: notes,
                concern_photo_url: concernPhotoUrl
            }).catch(err => console.warn("CRM save secondary call warning:", err));

            setProfile(prev => prev ? ({
                ...prev,
                full_name: editProfileData.full_name.trim(),
                phone: editProfileData.phone.trim(),
                email: editProfileData.email.trim(),
                avatar_url: editProfileData.avatar_url
            }) : null);

            toast({ title: "Profile Updated", description: "Customer information has been successfully updated." });
            setIsProfileEditDialogOpen(false);
            await fetchData();
        } catch (error: any) {
            console.error("handleSaveProfile error:", error);
            toast({ title: "Update Failed", description: error.message || "Failed to save profile changes.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const response = await api.uploads.upload(file);
            setEditProfileData(prev => ({ ...prev, avatar_url: response.url }));
            toast({ title: "Success", description: "Profile photo uploaded." });
        } catch (err) {
            toast({ title: "Upload Failed", variant: "destructive" });
        }
    };



    const handleBooking = async () => {
        if (!selectedService || !selectedDate || !selectedTime || !currentSalon) {
            toast({
                title: "Incomplete Details",
                description: "Required fields missing.",
                variant: "destructive"
            });
            return;
        }

        try {
            // Manual booking creation in local DB
            await api.bookings.create({
                salon_id: currentSalon.id,
                user_id: userId,
                service_id: 'local-sync-' + Date.now(), // Placeholder for service logic
                status: "confirmed",
                booking_date: selectedDate,
                booking_time: selectedTime,
            });

            setIsBookingOpen(false);
            toast({
                title: "Booking Confirmed",
                description: `Appointment scheduled for ${selectedDate}.`,
            });

            // Refresh list
            const bData = await api.bookings.getAll({
                salon_id: currentSalon.id,
                user_id: userId
            });
            setBookings(bData || []);
        } catch (e) {
            toast({ title: "Booking Failed", variant: "destructive" });
        }
    };

    const handleOpenTreatmentRecord = async (booking: Booking, existingRecord?: any) => {
        setSelectedBooking(booking);
        setIsTreatmentDialogOpen(true);
        
        if (existingRecord) {
            setTreatmentData({
                treatment_details: existingRecord.treatment_details || "",
                products_used: existingRecord.products_used || "",
                skin_reaction: existingRecord.skin_reaction || "",
                improvement_notes: existingRecord.improvement_notes || "",
                recommended_next_treatment: existingRecord.recommended_next_treatment || "",
                post_treatment_instructions: existingRecord.post_treatment_instructions || "",
                follow_up_reminder_date: existingRecord.follow_up_reminder_date || "",
                marketing_notes: existingRecord.marketing_notes || "",
                before_photo_url: existingRecord.before_photo_url || "",
                after_photo_url: existingRecord.after_photo_url || "",
                service_name_manual: existingRecord.service_name_manual || "",
                record_date: existingRecord.record_date || (booking.booking_date ? safeFormat(booking.booking_date, 'yyyy-MM-dd') : safeFormat(new Date(), 'yyyy-MM-dd'))
            });
            return;
        }

        try {
            const data = await api.customerRecords.getTreatmentRecord(booking.id);
            if (data?.record) {
                setTreatmentData({
                    treatment_details: data.record.treatment_details || "",
                    products_used: data.record.products_used || "",
                    skin_reaction: data.record.skin_reaction || "",
                    improvement_notes: data.record.improvement_notes || "",
                    recommended_next_treatment: data.record.recommended_next_treatment || "",
                    post_treatment_instructions: data.record.post_treatment_instructions || "",
                    follow_up_reminder_date: data.record.follow_up_reminder_date || "",
                    marketing_notes: data.record.marketing_notes || "",
                    before_photo_url: data.record.before_photo_url || "",
                    after_photo_url: data.record.after_photo_url || "",
                    service_name_manual: data.record.service_name_manual || "",
                    record_date: data.record.record_date || (booking.booking_date ? safeFormat(booking.booking_date, 'yyyy-MM-dd') : safeFormat(new Date(), 'yyyy-MM-dd'))
                });
            } else {
                setTreatmentData({
                    treatment_details: "",
                    products_used: "",
                    skin_reaction: "",
                    improvement_notes: "",
                    recommended_next_treatment: "",
                    post_treatment_instructions: "",
                    follow_up_reminder_date: "",
                    marketing_notes: "",
                    before_photo_url: "",
                    after_photo_url: "",
                    service_name_manual: "",
                    record_date: booking.booking_date ? safeFormat(booking.booking_date, 'yyyy-MM-dd') : safeFormat(new Date(), 'yyyy-MM-dd')
                });
            }
        } catch (error) {
            console.error("Error fetching treatment record:", error);
        }
    };

    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const response = await api.uploads.upload(file);
            if (response.url) {
                setTreatmentData(prev => ({
                    ...prev,
                    [type === 'before' ? 'before_photo_url' : 'after_photo_url']: response.url
                }));
                toast({ title: "Success", description: "Photo uploaded successfully" });
            }
        } catch (error) {
            console.error("Photo upload failed:", error);
            toast({ title: "Error", description: "Failed to upload photo", variant: "destructive" });
        }
    };

    const handleSaveTreatment = async () => {
        setSavingTreatment(true);
        try {
            // Save Profile Data (DOB & Skin Type)
            if (currentSalon && userId) {
                await api.customerRecords.saveProfile({
                    user_id: userId,
                    salon_id: currentSalon.id,
                    date_of_birth: dob,
                    skin_type: skinType,
                    allergy_records: allergies,
                    skin_issues: skinIssues
                });
            }

            await api.customerRecords.saveTreatmentRecord({
                booking_id: selectedBooking?.id || null,
                user_id: userId,
                salon_id: currentSalon.id,
                ...treatmentData
            });
            toast({
                title: "Success",
                description: "Treatment record updated successfully.",
            });
            setIsTreatmentDialogOpen(false);

            // Refresh treatments
            const treatmentsData = await api.customerRecords.getUserTreatments(userId, currentSalon.id);
            setTreatments(treatmentsData?.treatments || []);
        } catch (error: any) {
            console.error("Save failed:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to save treatment record.",
                variant: "destructive"
            });
        } finally {
            setSavingTreatment(false);
        }
    };

    const handleAddPurchase = async () => {
        if (!userId || !currentSalon || !newPurchase.product_name || !newPurchase.price) {
            toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
            return;
        }

        setSavingPurchase(true);
        try {
            await api.productPurchases.create({
                user_id: userId,
                salon_id: currentSalon.id,
                product_name: newPurchase.product_name,
                price: parseFloat(newPurchase.price),
                purchase_date: new Date().toISOString().split('T')[0],
                inventory_id: newPurchase.inventory_id || undefined
            });

            toast({ title: "Success", description: "Product purchase recorded." });
            setIsPurchaseDialogOpen(false);
            setNewPurchase({ product_name: "", price: "", inventory_id: "" });

            // Refresh purchases
            const purchasesData = await api.productPurchases.getByCustomer(userId, currentSalon.id);
            setPurchases(purchasesData || []);
        } catch (error) {
            toast({ title: "Error", description: "Failed to record purchase.", variant: "destructive" });
        } finally {
            setSavingPurchase(false);
        }
    };

    if (loading) {
        return (
            <ResponsiveDashboardLayout>
                <div className="flex items-center justify-center h-[60vh]">
                    <Loader2 className="animate-spin h-8 w-8 text-[#55402f]" />
                </div>
            </ResponsiveDashboardLayout>
        );
    }

    if (!profile) {
        return (
            <ResponsiveDashboardLayout>
                <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                        <User className="w-8 h-8 text-slate-400" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-700">Dossier Missing</h2>
                    <Button onClick={() => navigate(isStaffMode ? "/staff/customers" : "/salon/customers")} variant="outline">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Return
                    </Button>
                </div>
            </ResponsiveDashboardLayout>
        );
    }

    // Derived Data for UI
    const totalSpend = bookings.filter((b: any) => b.status !== 'cancelled').reduce((sum, b: any) => sum + (Number(b.price_paid || b.price) || 0), 0);
    const validBookings = bookings.filter((b: any) => b.status !== 'cancelled');
    const pastBookings = validBookings.filter((b: any) => new Date(b.booking_date) <= new Date());
    pastBookings.sort((a: any, b: any) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime());
    const totalVisits = validBookings.length;
    const uniqueServices = Array.from(new Set(bookings.map((b: any) => b.service_name).filter(Boolean)));
    const lastVisit = pastBookings.length > 0 ? pastBookings[0].booking_date : "N/A";

    return (
        <ResponsiveDashboardLayout>
            <div className="min-h-screen p-4 md:p-8 font-sans text-foreground -m-6">
                <div className="max-w-7xl mx-auto space-y-6">

                    {/* Main Header */}
                    <div className="bg-card text-foreground py-4 px-6 rounded-t-lg shadow-sm border-b-4 border-[#55402f] flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(isStaffMode ? "/staff/customers" : "/salon/customers")}
                                className="text-foreground hover:bg-muted"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <h1 className="text-2xl font-black tracking-wider uppercase">Customer Profile</h1>
                        </div>
                        <div className="hidden md:block h-px flex-1 bg-border/20 mx-8"></div>
                    </div>

                    {/* Top Row: Profile & History */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                        {/* Profile Card (Left - Wider) */}
                        <div className="lg:col-span-7">
                            <Card className="h-full border-border shadow-sm bg-card rounded-lg overflow-hidden">
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row gap-6">
                                        <div className="shrink-0 text-center md:text-left">
                                            <Avatar className="w-32 h-32 rounded-lg border-4 border-card shadow-md mx-auto md:mx-0">
                                                <AvatarImage src={profile.avatar_url || ""} className="object-cover" />
                                                <AvatarFallback className="rounded-lg text-4xl bg-muted text-muted-foreground">
                                                    {profile.full_name?.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 justify-center md:justify-start">
                                                    <h2 className="text-2xl font-black text-white">{profile.full_name || "Unknown Guest"}</h2>
                                                    {bookings.length > 5 && (
                                                        <span className="flex items-center gap-1 text-[#55402f] font-bold text-sm bg-[#55402f]/10 px-2 py-0.5 rounded-full border border-[#55402f]/20">
                                                            <Star className="w-3 h-3 fill-current" /> VIP Client
                                                        </span>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-[#55402f] text-[#55402f] font-bold hover:bg-[#55402f] hover:text-white"
                                                    onClick={() => {
                                                        setEditProfileData({
                                                            full_name: profile.full_name || "",
                                                            phone: profile.phone || "",
                                                            email: (profile.email && !profile.email.endsWith('.local')) ? profile.email : "",
                                                            avatar_url: profile.avatar_url || ""
                                                        });
                                                        setIsProfileEditDialogOpen(true);
                                                    }}
                                                >
                                                    <Settings className="w-4 h-4 mr-2" /> Edit Profile
                                                </Button>
                                            </div>

                                            <div className="space-y-2 pt-2 border-t border-border text-sm">
                                                <div className="flex items-center gap-3">
                                                    <Phone className="w-4 h-4 text-[#55402f]" />
                                                    <span className="font-semibold text-foreground">{profile.phone || "No Contact"}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Mail className="w-4 h-4 text-[#55402f]" />
                                                    <span className="font-semibold text-foreground">{profile.email || "No Email"}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Calendar className="w-4 h-4 text-[#55402f]" />
                                                    <span className="font-semibold text-foreground">DOB: {dob ? safeFormat(dob, 'MMM d, yyyy') : 'Not Set'} {dob && isValid(new Date(dob)) && `(Age: ${new Date().getFullYear() - new Date(dob).getFullYear()})`}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <ShieldCheck className="w-4 h-4 text-[#55402f]" />
                                                    <span className="font-semibold text-muted-foreground italic">Skin Type: {skinType || "Unspecified"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-border grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Last Visit</p>
                                            <p className="text-lg font-black text-foreground mt-1">{lastVisit !== "N/A" ? safeFormat(lastVisit, 'MMM d, yyyy') : "N/A"}</p>
                                        </div>
                                        <div className="border-l border-border">
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Total Visits</p>
                                            <p className="text-lg font-black text-foreground mt-1">{totalVisits}</p>
                                        </div>
                                        <div className="border-l border-border">
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Total Spend</p>
                                            <p className="text-lg font-black text-emerald-500 mt-1">MYR {totalSpend.toFixed(2)}</p>
                                        </div>
                                    </div>


                                </CardContent>
                            </Card>
                        </div>

                        {/* History & Clinical Tabs (Right) */}
                        <div className="lg:col-span-12 xl:col-span-5">
                            <Card className="h-full border-border shadow-sm bg-card rounded-lg overflow-hidden">
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                    <TabsList className="w-full bg-muted border-b border-border rounded-t-lg rounded-b-none justify-start px-4 h-11">
                                        <TabsTrigger value="history" className="text-xs font-black uppercase tracking-wider h-8 data-[state=active]:bg-card">History</TabsTrigger>
                                        <TabsTrigger value="clinical" className="text-xs font-black uppercase tracking-wider h-8 data-[state=active]:bg-card">Clinical</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="history" className="p-0 m-0">
                                        <div className="max-h-[500px] overflow-y-auto">
                                            {bookings.length === 0 ? (
                                                <div className="p-6 text-center text-muted-foreground text-sm italic">No history available.</div>
                                            ) : (
                                                <table className="w-full text-sm text-left">
                                                    <tbody className="divide-y divide-border">
                                                        {bookings.map((b) => (
                                                            <tr key={b.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => handleOpenTreatmentRecord(b)}>
                                                                <td className="py-3 px-4 font-black text-muted-foreground">{safeFormat(b.booking_date, 'MMM d, yyyy')}</td>
                                                                <td className="py-3 px-4 text-foreground font-black truncate max-w-[120px]">{b.service_name || "Service"}</td>
                                                                <td className="py-3 px-4 text-right font-black text-foreground">MYR {b.price}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="clinical" className="p-4 m-0 space-y-6">
                                        {/* Simplified Health Summary info in tab */}
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {dob && isValid(new Date(dob)) && <Badge variant="outline" className="bg-background">Age: {new Date().getFullYear() - new Date(dob).getFullYear()}</Badge>}
                                            {skinType && <Badge variant="outline" className="bg-background">Skin: {skinType}</Badge>}
                                            {allergies && <Badge variant="destructive" className="bg-rose-500/10 text-rose-500 border-rose-500/20">Allergy: {allergies.split(',')[0]}</Badge>}
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Treatment Timeline</h3>
                                                <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold uppercase" onClick={() => {
                                                    setSelectedBooking(null);
                                                    setTreatmentData({
                                                        treatment_details: "",
                                                        products_used: "",
                                                        skin_reaction: "",
                                                        improvement_notes: "",
                                                        recommended_next_treatment: "",
                                                        post_treatment_instructions: "",
                                                        follow_up_reminder_date: "",
                                                        marketing_notes: "",
                                                        before_photo_url: "",
                                                        after_photo_url: "",
                                                        service_name_manual: "",
                                                        record_date: safeFormat(new Date(), 'yyyy-MM-dd')
                                                    });
                                                    setIsTreatmentDialogOpen(true);
                                                }}>
                                                    <Plus className="w-3 h-3 mr-1" /> New Entry
                                                </Button>
                                            </div>

                                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                                {treatments.length === 0 ? (
                                                    <div className="text-center py-8 text-muted-foreground italic text-xs">No clinical records found.</div>
                                                ) : (
                                                    treatments.map((tr, idx) => (
                                                        <div key={tr.id} className="relative pl-6 border-l-2 border-border py-1">
                                                            <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-border border-2 border-card" />
                                                            <div className="bg-muted/30 p-3 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleOpenTreatmentRecord({ id: tr.booking_id, service_name: tr.service_name || tr.service_name_manual, booking_date: tr.booking_date || tr.record_date || tr.created_at } as any, tr)}>
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <span className="text-[10px] font-black text-muted-foreground uppercase">{safeFormat(tr.booking_date || tr.record_date || tr.created_at, 'MMM dd, yyyy')}</span>
                                                                    {tr.before_photo_url && tr.after_photo_url && <Sparkles className="w-3 h-3 text-emerald-500" />}
                                                                </div>
                                                                <h4 className="font-black text-foreground text-sm">{tr.service_name || tr.service_name_manual || "General Record"}</h4>
                                                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{tr.treatment_details || "No details provided."}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </Card>
                        </div>
                    </div>

                    {/* Bottom Row Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                        {/* Services Card */}
                        <div className="lg:col-span-1">
                            <Card className="h-full border-border shadow-sm bg-card rounded-lg flex flex-col">
                                <CardHeader className="py-3 px-4 border-b border-border bg-muted/30 rounded-t-lg">
                                    <CardTitle className="text-sm font-black text-[#55402f] uppercase tracking-wider">Services & Products</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 flex-1">
                                    <ul className="space-y-2">
                                        {uniqueServices.length > 0 ? uniqueServices.map((s, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-foreground font-black">
                                                <span className="mt-1.5 w-1.5 h-1.5 bg-[#55402f] rounded-full shrink-0" />
                                                {s}
                                            </li>
                                        )) : (
                                            <li className="text-sm text-muted-foreground italic">No services recorded.</li>
                                        )}
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Notes & Products Card */}
                        <div className="lg:col-span-1">
                            <Card className="h-full border-border shadow-sm bg-card rounded-lg">
                                <CardHeader className="py-3 px-4 border-b border-border bg-muted/30 rounded-t-lg">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-sm font-black text-[#55402f] uppercase tracking-wider">Clinical Notes</CardTitle>
                                        <Button variant="ghost" size="sm" className="h-6 w-6 text-muted-foreground" onClick={() => setActiveTab('plan')}><Settings className="w-3 h-3" /></Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <ul className="space-y-2">
                                        {(allergies || skinIssues) ? (
                                            <>
                                                {allergies.split(',').map((a, i) => a.trim() && (
                                                    <li key={`a-${i}`} className="flex items-start gap-2 text-sm text-rose-500 font-black">
                                                        <span className="mt-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0" />
                                                        Allergy: {a.trim()}
                                                    </li>
                                                ))}
                                                {skinIssues.split(',').map((s, i) => s.trim() && (
                                                    <li key={`s-${i}`} className="flex items-start gap-2 text-sm text-foreground font-black">
                                                        <span className="mt-1.5 w-1.5 h-1.5 bg-[#55402f] rounded-full shrink-0" />
                                                        {s.trim()}
                                                    </li>
                                                ))}
                                            </>
                                        ) : (
                                            <li className="text-sm text-muted-foreground italic">No clinical notes recorded.</li>
                                        )}
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-1">
                            <Card className="h-full border-border shadow-sm bg-card rounded-lg">
                                <CardHeader className="py-3 px-4 border-b border-border bg-muted/30 rounded-t-lg">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-sm font-black text-[#55402f] uppercase tracking-wider">Product Purchases</CardTitle>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-xs text-muted-foreground"
                                            onClick={() => setIsPurchaseDialogOpen(true)}
                                        >
                                            <Plus className="w-3 h-3 mr-1" /> Add
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <div className="space-y-2 text-sm">
                                        {purchases.length > 0 ? (
                                            <>
                                                {purchases.map((p, i) => (
                                                    <div key={p.id || i} className="flex justify-between items-center text-muted-foreground">
                                                        <span>{p.product_name}</span>
                                                        <span className="font-black text-foreground">MYR {parseFloat(p.price).toFixed(2)}</span>
                                                    </div>
                                                ))}
                                                <div className="pt-2 mt-2 border-t border-border flex justify-between items-center font-black text-foreground text-base">
                                                    <span>Total Product Spend</span>
                                                    <span className="text-emerald-500">MYR {purchases.reduce((sum, p) => sum + parseFloat(p.price || 0), 0).toFixed(2)}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center text-muted-foreground italic py-4">No purchases recorded.</div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>


                    </div>

                </div>
            </div>

            {/* KEEPING EXISTING DIALOGS HIDDEN BUT FUNCTIONAL */}
            <AnimatePresence>
                {isBookingOpen && (
                    <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>New Appointment</DialogTitle>
                                <DialogDescription>Schedule a session for {profile.full_name}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <Select onValueChange={setSelectedService}>
                                    <SelectTrigger className="bg-muted border-border"><SelectValue placeholder="Select Service" /></SelectTrigger>
                                    <SelectContent className="bg-card border-border">
                                        <SelectItem value="Hydrafacial">Hydrafacial</SelectItem>
                                        <SelectItem value="Hair Cut">Hair Cut</SelectItem>
                                        <SelectItem value="Consultation">Consultation</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-muted border-border" />
                                <Input type="time" value={selectedTime} onChange={e => setSelectedTime(e.target.value)} className="bg-muted border-border" />
                            </div>
                            <DialogFooter>
                                <Button onClick={handleBooking} className="bg-[#55402f] hover:bg-[#433225] text-white">Confirm Booking</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </AnimatePresence>

            <Dialog open={isTreatmentDialogOpen} onOpenChange={setIsTreatmentDialogOpen}>
                <DialogContent className="max-w-4xl bg-card border-border rounded-lg p-0 overflow-hidden max-h-[90vh] flex flex-col">
                    <DialogHeader className="p-6 pb-2 shrink-0 border-b border-border bg-muted/10">
                        <DialogTitle className="text-xl font-black text-[#55402f]">
                            {selectedBooking ? "Treatment Record" : "New Clinical Entry"}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedBooking
                                ? `Details for ${selectedBooking.service_name} on ${safeFormat(selectedBooking.booking_date, 'MM/dd/yyyy')}`
                                : "Add notes or a procedure that wasn't tied to a specific appointment."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 pt-2">
                        {/* Patient Context & Procedure Info */}
                        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-muted/20 rounded-lg border border-border">
                            {!selectedBooking && (
                                <>
                                    <div className="col-span-2">
                                        <Label className="uppercase text-[10px] font-black text-white/50 mb-1 block">Procedure / Service Name</Label>
                                        <Input
                                            value={treatmentData.service_name_manual}
                                            onChange={(e) => setTreatmentData({ ...treatmentData, service_name_manual: e.target.value })}
                                            placeholder="e.g. Skin Analysis, Consultation"
                                            className="bg-muted/50 border-border"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="uppercase text-[10px] font-black text-white/50 mb-1 block">Date of Record</Label>
                                        <Input
                                            type="date"
                                            value={treatmentData.record_date}
                                            onChange={(e) => setTreatmentData({ ...treatmentData, record_date: e.target.value })}
                                            className="bg-muted/50 border-border"
                                        />
                                    </div>
                                </>
                            )}
                            <div>
                                <Label className="uppercase text-[10px] font-black text-white/50 mb-1 block">Patient DOB</Label>
                                <Input
                                    type="date"
                                    value={dob}
                                    onChange={(e) => setDob(e.target.value)}
                                    className="bg-muted/50 border-border"
                                />
                            </div>
                            <div>
                                <Label className="uppercase text-[10px] font-black text-white/50 mb-1 block">Skin Type</Label>
                                <Input
                                    value={skinType}
                                    onChange={(e) => setSkinType(e.target.value)}
                                    placeholder="e.g. Oily, Dry"
                                    className="bg-muted/50 border-border"
                                />
                            </div>
                            <div className="col-span-2">
                                <Label className="uppercase text-[10px] font-black text-white/50 mb-1 block">Critical Health Notes (Allergies & Issues)</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        value={allergies}
                                        onChange={(e) => setAllergies(e.target.value)}
                                        placeholder="Allergies"
                                        className="bg-muted/50 border-border"
                                    />
                                    <Input
                                        value={skinIssues}
                                        onChange={(e) => setSkinIssues(e.target.value)}
                                        placeholder="Skin Issues"
                                        className="bg-muted/50 border-border"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {Object.keys(treatmentData).filter(k => k !== 'service_name_manual' && k !== 'record_date' && k !== 'follow_up_reminder_date').map(key => (
                                <div key={key} className={key.includes('notes') || key.includes('instructions') || key.includes('details') ? 'col-span-2' : ''}>
                                    <Label className="uppercase text-[10px] font-black text-white/50 mb-1 block">{key.replace(/_/g, ' ')}</Label>
                                    <Textarea
                                        value={(treatmentData as any)[key]}
                                        onChange={e => setTreatmentData({ ...treatmentData, [key]: e.target.value })}
                                        className="bg-muted/30 border-border min-h-[80px]"
                                    />
                                </div>
                            ))}
                            <div>
                                <Label className="uppercase text-[10px] font-black text-white/50 mb-1 block">Follow Up Reminder Date</Label>
                                <Input
                                    type="date"
                                    value={treatmentData.follow_up_reminder_date}
                                    onChange={(e) => setTreatmentData({ ...treatmentData, follow_up_reminder_date: e.target.value })}
                                    className="bg-muted/50 border-border"
                                />
                            </div>
                        </div>

                        {/* Photo Comparison Section */}
                        <div className="border-t border-border pt-4 mt-2">
                            <h3 className="text-sm font-black text-[#55402f] uppercase tracking-wider mb-4">Treatment Photos</h3>
                            <div className="grid grid-cols-2 gap-6">
                                {/* Before Photo */}
                                <div className="space-y-3">
                                    <Label className="flex items-center gap-2 text-[10px] font-black text-white/50 uppercase">
                                        <ImageIcon className="w-4 h-4" /> Before Treatment
                                    </Label>
                                    <div className="border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center bg-muted/20 relative group hover:border-[#55402f] transition-colors">
                                        {treatmentData.before_photo_url ? (
                                            <div className="relative w-full h-full">
                                                <img
                                                    src={treatmentData.before_photo_url}
                                                    alt="Before"
                                                    className="w-full h-48 object-cover rounded-md"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                                                    <Button variant="secondary" size="sm" className="pointer-events-none">Change Photo</Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center text-muted-foreground">
                                                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                                <span className="text-sm">Upload Photo</span>
                                            </div>
                                        )}
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={(e) => handlePhotoUpload(e, 'before')}
                                        />
                                    </div>
                                </div>

                                {/* After Photo */}
                                <div className="space-y-3">
                                    <Label className="flex items-center gap-2 text-[10px] font-black text-white/50 uppercase">
                                        <ImageIcon className="w-4 h-4" /> After Treatment
                                    </Label>
                                    <div className="border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center bg-muted/20 relative group hover:border-[#55402f] transition-colors">
                                        {treatmentData.after_photo_url ? (
                                            <div className="relative w-full h-full">
                                                <img
                                                    src={treatmentData.after_photo_url}
                                                    alt="After"
                                                    className="w-full h-48 object-cover rounded-md"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                                                    <Button variant="secondary" size="sm" className="pointer-events-none">Change Photo</Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center text-muted-foreground">
                                                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                                <span className="text-sm">Upload Photo</span>
                                            </div>
                                        )}
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={(e) => handlePhotoUpload(e, 'after')}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-6 pt-2 shrink-0">
                        <Button onClick={handleSaveTreatment} disabled={savingTreatment} className="bg-[#1e3a8a] hover:bg-blue-900 text-white">
                            {savingTreatment ? "Saving..." : "Save Record"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Purchase Dialog */}
            <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
                <DialogContent className="sm:max-w-md bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="text-foreground font-black">Record Product Purchase</DialogTitle>
                        <DialogDescription className="text-muted-foreground">Add a product sale for {profile.full_name}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="product-name">Product Name</Label>
                            <Input
                                id="product-name"
                                list="inventory-list"
                                placeholder="e.g. Daily Cleanser"
                                value={newPurchase.product_name}
                                onChange={e => {
                                    const val = e.target.value;
                                    const matched = inventoryItems.find((item: any) => item.name === val);
                                    if (matched) {
                                        setNewPurchase({ ...newPurchase, product_name: val, price: matched.price.toString(), inventory_id: matched.id });
                                    } else {
                                        setNewPurchase({ ...newPurchase, product_name: val, inventory_id: "" });
                                    }
                                }}
                                className="bg-muted border-border"
                            />
                            <datalist id="inventory-list">
                                {inventoryItems.map((item: any) => (
                                    <option key={item.id} value={item.name} />
                                ))}
                            </datalist>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="product-price">Price (MYR)</Label>
                            <Input
                                id="product-price"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={newPurchase.price}
                                onChange={e => setNewPurchase({ ...newPurchase, price: e.target.value })}
                                className="bg-muted border-border"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsPurchaseDialogOpen(false)}
                            disabled={savingPurchase}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddPurchase}
                            disabled={savingPurchase}
                            className="bg-[#55402f] hover:bg-[#433225] text-white"
                        >
                            {savingPurchase ? "Saving..." : "Record Sale"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Profile Dialog */}
            <Dialog open={isProfileEditDialogOpen} onOpenChange={setIsProfileEditDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-[#55402f]">Edit Customer Profile</DialogTitle>
                        <DialogDescription className="text-muted-foreground">Update identity and clinical health records for {profile.full_name}</DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
                        {/* Basic Info Column */}
                        <div className="space-y-6">
                            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-wider border-b border-border pb-2">Basic Information</h3>

                            <div className="flex flex-col items-center gap-4 p-4 bg-muted/20 rounded-xl border border-border">
                                <Avatar className="w-24 h-24 rounded-lg border-2 border-card shadow-sm">
                                    <AvatarImage src={editProfileData.avatar_url} />
                                    <AvatarFallback className="bg-muted text-muted-foreground text-2xl">
                                        {editProfileData.full_name?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="relative text-center">
                                    <Button variant="outline" size="sm" className="bg-background border-border">
                                        <ImageIcon className="w-4 h-4 mr-2 text-[#55402f]" /> Change Photo
                                    </Button>
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={handleProfileImageUpload}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-name">Full Name</Label>
                                    <Input
                                        id="edit-name"
                                        value={editProfileData.full_name}
                                        onChange={e => setEditProfileData({ ...editProfileData, full_name: e.target.value })}
                                        className="bg-muted/50 border-border"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-phone">Phone Number</Label>
                                    <Input
                                        id="edit-phone"
                                        value={editProfileData.phone}
                                        onChange={e => setEditProfileData({ ...editProfileData, phone: e.target.value })}
                                        className="bg-muted/50 border-border"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-email">Email Address</Label>
                                    <Input
                                        id="edit-email"
                                        value={editProfileData.email}
                                        onChange={e => setEditProfileData({ ...editProfileData, email: e.target.value })}
                                        className="bg-muted/50 border-border"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Health Info Column */}
                        <div className="space-y-6">
                            <h3 className="text-xs font-black text-white/40 uppercase tracking-wider border-b border-border pb-2">Clinical Health Profile</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Date of Birth</Label>
                                    <Input type="date" value={dob} onChange={e => setDob(e.target.value)} className="bg-muted/50 border-border" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Skin Type</Label>
                                    <Input value={skinType} onChange={e => setSkinType(e.target.value)} placeholder="e.g. Dry, Oily" className="bg-muted/50 border-border" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-rose-500 font-black">Allergies</Label>
                                    <Textarea
                                        value={allergies}
                                        onChange={e => setAllergies(e.target.value)}
                                        placeholder="List allergies..."
                                        className="min-h-[60px] border-rose-500/20 bg-rose-500/5"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-black text-white/60">Medical Conditions</Label>
                                    <Textarea
                                        value={medicalConditions}
                                        onChange={e => setMedicalConditions(e.target.value)}
                                        placeholder="Heart issues, pregnancy, etc..."
                                        className="min-h-[60px] bg-muted/30 border-border"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-black text-white/60">Skin Issues / Concerns</Label>
                                    <Textarea
                                        value={skinIssues}
                                        onChange={e => setSkinIssues(e.target.value)}
                                        placeholder="Acne, Rosacea, etc..."
                                        className="min-h-[60px] bg-muted/30 border-border"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-black text-white/60">Additional Private Notes</Label>
                                    <Textarea
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        placeholder="Internal notes for staff..."
                                        className="min-h-[80px] bg-muted/30 border-border"
                                    />
                                </div>

                                <div className="space-y-4 pt-4 border-t border-border">
                                    <Label className="font-black flex items-center gap-2 text-white/60">
                                        <ImageIcon className="w-4 h-4 text-[#55402f]" /> Skin Concern Photo
                                    </Label>
                                    <div className="flex items-start gap-4">
                                        <div className="w-24 h-24 bg-muted/20 rounded-lg overflow-hidden flex items-center justify-center relative border-2 border-dashed border-border">
                                            {concernPhotoUrl ? (
                                                <img src={concernPhotoUrl} alt="Concern" className="w-full h-full object-cover" />
                                            ) : (
                                                <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        try {
                                                            const res = await api.uploads.upload(file);
                                                            setConcernPhotoUrl(res.url);
                                                        } catch (err) {
                                                            toast({ title: "Upload Failed", variant: "destructive" });
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div className="flex-1 text-[10px] text-white/40 italic pt-2 leading-relaxed">
                                            Upload a clear photo of the customer's skin concern for clinical review.
                                            This photo is visible to therapists during treatment planning.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="border-t border-border pt-6">
                        <Button variant="outline" onClick={() => setIsProfileEditDialogOpen(false)} className="border-border">Cancel</Button>
                        <Button onClick={handleSaveProfile} className="bg-[#55402f] hover:bg-[#433225] text-white font-black px-8">
                            Save Complete Dossier
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </ResponsiveDashboardLayout>
    );
}

