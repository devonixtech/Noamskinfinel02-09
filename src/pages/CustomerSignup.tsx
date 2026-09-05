import { useState } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, Loader2, Sparkles, User, Mail, Lock, Phone } from "lucide-react";
import logo from "@/assets/logo.png";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { countryCodes } from "@/utils/countryCodes";

const CustomerSignup = () => {
    const MAX_PHONE_DIGITS = 10;
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [countryCode, setCountryCode] = useState("Malaysia-+60");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();
    const { signUp } = useAuth();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!fullName.trim() || !email.trim() || !password.trim()) {
            toast({
                title: "Information Required",
                description: "Please provide your name, email and a secure password.",
                variant: "destructive",
            });
            return;
        }

        if (password !== confirmPassword) {
            toast({
                title: "Password Mismatch",
                description: "The confirmation password does not match.",
                variant: "destructive",
            });
            return;
        }

        if (password.length < 6) {
            toast({
                title: "Weak Password",
                description: "For your security, please use at least 6 characters.",
                variant: "destructive",
            });
            return;
        }

        if (phone) {
            if (!/^\d+$/.test(phone)) {
                toast({
                    title: "Invalid Phone Number",
                    description: "Phone number must contain digits only.",
                    variant: "destructive",
                });
                return;
            }

            if (phone.length < 9 || phone.length > MAX_PHONE_DIGITS) {
                toast({
                    title: "Invalid Phone Number",
                    description: `Phone number must be ${MAX_PHONE_DIGITS} digits (or 9 digits).`,
                    variant: "destructive",
                });
                return;
            }
        }

        setLoading(true);

        try {
            const dialCode = countryCode.split('-').pop() || "";
            const fullPhone = phone ? `${dialCode}${phone}` : "";
            const extraData = {
                phone: fullPhone,
                user_type: 'customer'
            };

            await signUp(email.trim(), password, fullName.trim(), extraData);

            toast({
                title: "Account Created!",
                description: "Welcome to the elite grooming network.",
            });

            // Redirect to intended location or fallback to dashboard/booking
            const salonId = searchParams.get("salonId");
            const from = location.state?.from;
            const redirectUrl = typeof from === 'string' 
                ? from 
                : from?.pathname 
                ? from.pathname + (from.search || '') 
                : salonId 
                    ? `/book?salonId=${salonId}` 
                    : "/";
            navigate(redirectUrl);
        } catch (error: any) {
            console.error("Signup error:", error);
            toast({
                title: "Registration Failed",
                description: error.message || "We encountered a glitch while setting up your account.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFCFB] flex flex-col pt-24">
            <Navbar />
            <div className="flex-grow flex items-center justify-center p-4">
                <Card className="w-full max-w-2xl border-none shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] bg-white/80 backdrop-blur-xl rounded-[1rem] overflow-hidden border border-white/60 relative z-10">
                    <CardHeader className="text-center pt-12 pb-8">
                        <div className="flex justify-center mb-6">
                            <img src={logo} alt="Salon Logo" className="h-14 w-auto" />
                        </div>
                        <CardTitle className="text-4xl font-black text-slate-900 tracking-tight">Join our club</CardTitle>
                        <CardDescription className="font-bold text-slate-400 uppercase tracking-widest text-[10px] mt-2">Create your premium customer profile</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSignup}>
                        <CardContent className="space-y-6 px-10">
                            {/* Row 1: Name and Email */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-1.5">
                                        <User className="w-3 h-3 text-slate-400" />
                                        Full Name
                                    </Label>
                                    <Input
                                        placeholder="e.g. Abdullah Rahman"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="h-14 bg-slate-50 border-none rounded-2xl font-bold px-5 shadow-inner transition-all focus:bg-white focus:ring-2 focus:ring-accent/10"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-1.5">
                                        <Mail className="w-3 h-3 text-slate-400" />
                                        Email Address
                                    </Label>
                                    <Input
                                        type="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="h-14 bg-slate-50 border-none rounded-2xl font-bold px-5 shadow-inner transition-all focus:bg-white focus:ring-2 focus:ring-accent/10"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Row 2: Phone */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-1.5">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    Phone (Optional)
                                </Label>
                                <div className="flex gap-2">
                                    <Select value={countryCode} onValueChange={setCountryCode}>
                                        <SelectTrigger className="w-[110px] h-14 bg-slate-50 border-none rounded-2xl font-bold px-4 shadow-inner">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-none shadow-2xl bg-white">
                                            {countryCodes.map((c) => (
                                                <SelectItem key={`${c.country}-${c.code}`} value={`${c.country}-${c.code}`} className="font-bold py-3 rounded-xl focus:bg-accent/10 cursor-pointer">
                                                    <span className="flex items-center gap-2">
                                                        <span>{c.flag}</span>
                                                        <span>{c.code}</span>
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="tel"
                                        placeholder="000 000 0000"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, MAX_PHONE_DIGITS))}
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={MAX_PHONE_DIGITS}
                                        className="h-14 bg-slate-50 border-none rounded-2xl font-bold px-5 shadow-inner flex-1 transition-all focus:bg-white focus:ring-2 focus:ring-accent/10"
                                    />
                                </div>
                            </div>

                            {/* Row 3: Passwords */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-1.5">
                                        <Lock className="w-3 h-3 text-slate-400" />
                                        Password
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="h-14 bg-slate-50 border-none rounded-2xl font-bold px-5 pr-12 shadow-inner transition-all focus:bg-white focus:ring-2 focus:ring-accent/10"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-1.5">
                                        <Sparkles className="w-3 h-3 text-slate-400" />
                                        Confirm Identity
                                    </Label>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="h-14 bg-slate-50 border-none rounded-2xl font-bold px-5 shadow-inner transition-all focus:bg-white focus:ring-2 focus:ring-accent/10"
                                        required
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-6 px-10 pb-12 pt-8">
                            <Button type="submit" className="w-full h-16 bg-slate-900 hover:bg-black text-white rounded-[2rem] font-black text-lg shadow-2xl transition-all transform hover:scale-[1.01]" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                                        REGISTERING...
                                    </>
                                ) : (
                                    "CREATE ACCOUNT"
                                )}
                            </Button>
                            <div className="text-center">
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                                    Already a member?{" "}
                                    <Link to="/login" state={location.state} className="text-accent underline font-black">
                                        Sign In
                                    </Link>
                                </p>
                            </div>
                        </CardFooter>
                    </form>
                </Card>
            </div>
            <Footer />
        </div>
    );
};

export default CustomerSignup;
