import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    MapPin, Star, Clock, Phone, Mail,
    ChevronLeft, Loader2, Scissors,
    Sparkles, Zap, Award, CheckCircle2,
    CalendarDays, Share2, Heart,
    Info, ShieldCheck, Instagram, Facebook, Twitter, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import api from "@/services/api";
import { getImageUrl } from "@/utils/imageUrl";

interface Service {
    id: string;
    name: string;
    description: string;
    price: number;
    duration_minutes: number;
    category: string;
    image_url: string;
}

interface KnowledgeItem {
    id: string;
    salon_id: string;
    category: 'Skin Care' | 'FAQ';
    title: string;
    content: string;
    is_active: boolean;
}

interface Salon {
    id: string;
    name: string;
    description: string;
    address: string;
    city: string;
    state: string;
    phone: string;
    email: string;
    logo_url: string;
    cover_image_url: string;
    rating?: number | string;
    review_count?: number;
}

export default function SalonServices() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [salon, setSalon] = useState<Salon | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState("All");

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const [salonData, servicesData, knowledgeData] = await Promise.all([
                    api.salons.getById(id),
                    api.services.getBySalon(id),
                    api.knowledgeBase.getBySalon(id)
                ]);
                setSalon(salonData);
                setServices(servicesData || []);
                setKnowledgeItems(knowledgeData || []);
            } catch (err: any) {
                console.error("Error fetching salon details:", err);
                setError("Could not load salon details. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const categories = ["All", ...new Set(services.map(s => s.category))];
    const filteredServices = activeCategory === "All"
        ? services
        : services.filter(s => s.category === activeCategory);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
                <p className="font-black text-muted-foreground uppercase tracking-widest text-xs">Loading Experience Registry...</p>
            </div>
        );
    }

    if (error || !salon) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <Scissors className="w-16 h-16 text-muted-foreground mb-6" />
                <h2 className="text-2xl font-black text-foreground mb-2">Registry Entry Not Found</h2>
                <p className="text-muted-foreground mb-8 text-center max-w-md">{error || "The salon you are looking for does not exist in our active database."}</p>
                <Button onClick={() => navigate("/services-simple")} className="bg-foreground text-background hover:bg-accent hover:text-white font-black px-8 rounded-2xl">
                    Return to Services
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <Navbar />

            <main className="container mx-auto px-4 pt-32 pb-20 max-w-6xl">
                {/* Banner Image */}
                <div className="relative w-full aspect-[21/9] rounded-[1.5rem] overflow-hidden shadow-sm">
                    <img
                        src={getImageUrl(salon.cover_image_url, 'cover', salon.id)}
                        alt={salon.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null; // Prevent infinite loop
                            target.src = getImageUrl(null, 'cover', salon.id);
                        }}
                    />
                </div>

                {/* Salon Identity Row */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mt-8 gap-6 px-2">
                    <div className="flex items-start gap-6">
                        {/* Circular Logo */}
                        <div className="relative -mt-16 md:-mt-20">
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-[6px] border-background overflow-hidden shadow-md bg-card">
                                <img
                                    src={getImageUrl(salon.logo_url, 'logo', salon.id)}
                                    alt={`${salon.name} logo`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.onerror = null;
                                        target.src = getImageUrl(null, 'logo', salon.id);
                                    }}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <h1 className="text-3xl md:text-3xl font-bold text-foreground flex items-center">
                                <span className="px-2 rounded mr-2 h-8 inline-flex items-center text-foreground/80">
                                    {salon.name.split(' ')[0]}
                                </span>
                                {salon.name.split(' ').slice(1).join(' ')}
                            </h1>
                            <p className="text-sm font-medium text-muted-foreground">{salon.address}, {salon.city}.</p>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            className={`w-4 h-4 ${star <= Math.floor(Number(salon.rating || 0)) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                                        />
                                    ))}
                                </div>
                                <span className="text-sm font-black text-foreground ml-1">
                                    {(Number(salon.rating || 0)).toFixed(1)}
                                </span>
                                <span className="text-xs font-medium text-muted-foreground">
                                    ({salon.review_count || 0} reviews)
                                </span>
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={() => navigate(`/book?salonId=${salon.id}&start=true`)}
                        className="bg-[#214E78] hover:bg-[#1a3d5e] text-white font-bold h-12 px-8 rounded-full shadow-md text-sm"
                    >
                        Book An Appointment
                    </Button>
                </div>

                {/* Salon Description */}
                <div className="mt-8 px-2">
                    <p className="text-muted-foreground text-[15px] leading-relaxed max-w-4xl">
                        {salon.description || `A modern grooming hub offering premium haircuts, styling, and skincare services for men and women who value sophistication and precision.`}
                    </p>
                </div>

                {/* Services Section */}
                <div className="mt-16 grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Left Column: Intro & Info */}
                    <div className="lg:col-span-5 space-y-6">
                        <h2 className="text-xl font-bold text-foreground">Our Services</h2>
                        <p className="text-muted-foreground text-[15px] leading-relaxed">
                            {salon.name} provides a wide range of services to meet the needs of our clients. We offer the best grooming solutions using high-quality products.
                        </p>

                        <div className="grid grid-cols-1 gap-4 pt-4">
                            {(() => {
                                let hours = salon.business_hours;
                                if (typeof hours === 'string') {
                                    try { hours = JSON.parse(hours); } catch { hours = null; }
                                }
                                const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                                const malaysiaNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
                                const today = dayNames[malaysiaNow.getDay()];
                                const todayHours = hours?.[today] || hours?.[today.charAt(0).toUpperCase() + today.slice(1)];
                                const timingText = todayHours && !todayHours.closed 
                                    ? `${todayHours.open} - ${todayHours.close} (Today)` 
                                    : "Closed Today";
                                
                                return [
                                    { icon: Phone, label: "Call Us", val: salon.phone || "Not available" },
                                    { icon: Mail, label: "Email", val: salon.email || "Not available" },
                                    { icon: Clock, label: "Timings", val: timingText }
                                ];
                            })().map((item, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground">
                                        <item.icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider leading-none">{item.label}</p>
                                        <p className="text-sm font-bold text-foreground mt-1">{item.val}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Services with Pricing */}
                    <div className="lg:col-span-7">
                        <Card className="border border-border shadow-sm rounded-2xl overflow-hidden bg-card">
                            <div className="p-6 border-b border-border bg-muted/30">
                                <h3 className="text-lg font-bold text-foreground">Services With Pricing</h3>
                            </div>
                            <CardContent className="p-0 max-h-[480px] overflow-y-auto overflow-x-hidden custom-scrollbar">
                                <div className="divide-y divide-border">
                                    {services.length === 0 ? (
                                        <div className="py-12 text-center text-muted-foreground font-medium">No services currently listed.</div>
                                    ) : services.map((service, index) => (
                                        <div
                                            key={service.id}
                                            className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-muted/50 transition-colors group"
                                        >
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h4
                                                        className="font-bold text-foreground group-hover:text-accent transition-colors cursor-pointer"
                                                        onClick={() => navigate(`/services/${service.id}`)}
                                                    >
                                                        {service.name}
                                                    </h4>
                                                    <Badge variant="outline" className="text-[9px] font-bold h-5 px-2 rounded font-sans border-border">
                                                        {service.category || "General"}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground line-clamp-1">{service.description || "Premium bespoke treatment curated for you."}</p>
                                                <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase mt-1">
                                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {service.duration_minutes} Mins</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-xl font-bold text-foreground tracking-tight">
                                                    MYR {service.price}
                                                </div>
                                                <Button
                                                    onClick={() => navigate(`/book?salonId=${salon.id}&serviceId=${service.id}`)}
                                                    className="h-10 bg-foreground text-background hover:bg-accent hover:text-white font-bold rounded-lg px-6 text-xs transition-all"
                                                >
                                                    Book Now
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* FAQ Section */}
                {knowledgeItems.filter(i => i.category === 'FAQ' && i.is_active).length > 0 && (
                    <div className="mt-24 space-y-12">
                        <div className="text-center max-w-2xl mx-auto">
                            <h2 className="text-3xl font-black text-foreground mb-4">Frequently Asked Questions</h2>
                            <p className="text-muted-foreground font-medium">Clear answers to common inquiries at {salon.name}.</p>
                        </div>

                        <div className="max-w-4xl mx-auto space-y-4">
                            {knowledgeItems.filter(i => i.category === 'FAQ' && i.is_active).map((item) => (
                                <div key={item.id} className="p-8 rounded-[2rem] bg-card border border-border shadow-sm hover:shadow-md transition-all group">
                                    <h4 className="text-lg font-bold text-foreground mb-3 flex items-start gap-4">
                                        <span className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent text-sm flex-shrink-0 mt-0.5">Q</span>
                                        {item.title}
                                    </h4>
                                    <div className="pl-12">
                                        <p className="text-muted-foreground leading-relaxed font-medium italic">
                                            "{item.content}"
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
