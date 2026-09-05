import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, Loader2, Store, Sparkles } from "lucide-react";
import logo from "@/assets/logo.png";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { countryCodes } from "@/utils/countryCodes";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Signup = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("Malaysia-+60");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [salonName, setSalonName] = useState("");
  const [salonSlug, setSalonSlug] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp } = useAuth();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!salonName.trim()) {
      toast({
        title: "Error",
        description: "Saloon brand name is mandatory",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
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

      if (phone.length < 9 || phone.length > 10) {
        toast({
          title: "Invalid Phone Number",
          description: "Phone number must be 10 digits (or 9 digits).",
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
        user_type: 'salon_owner',
        salon_name: salonName.trim(),
        salon_slug: salonSlug.trim() || undefined
      };

      await signUp(email.trim(), password, fullName.trim(), extraData);

      toast({
        title: "Station Registered!",
        description: "Your saloon station has been initialized in the local registry.",
      });

      navigate("/dashboard");
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        title: "Enrollment Failed",
        description: error.message || "Could not initialize account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSlug = (name: string) => {
    setSalonName(name);
    if (!salonSlug || salonSlug === name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) {
      setSalonSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      <Navbar />
      <div className="flex-grow flex items-center justify-center p-4 py-24">
        <Card className="w-full max-w-xl border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] bg-white rounded-[3rem] overflow-hidden">
          <CardHeader className="text-center pt-12 pb-8">
            <Link to="/" className="flex justify-center mb-6">
              <img src={logo} alt="Saloon Logo" className="h-14 w-auto" />
            </Link>
            <CardTitle className="text-4xl font-black text-slate-900 tracking-tight uppercase">Salon Owner Registration</CardTitle>
            <CardDescription className="font-bold text-slate-400 uppercase tracking-widest text-[10px] mt-2">Initialize your business management profile</CardDescription>
          </CardHeader>
          <form onSubmit={handleSignup} className="px-10 pb-12">
            <CardContent className="space-y-6 px-0">
              {/* Header Badge */}
              <div className="flex items-center gap-4 p-6 bg-slate-900 rounded-[2rem] mb-4">
                <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center shadow-lg shadow-accent/20">
                  <Store className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-black text-white text-sm uppercase tracking-tighter">Salon Owner Mode</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Exclusive Business Access</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Owner Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-14 bg-slate-50 border-none rounded-2xl font-bold px-5"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Business Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@saloon.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 bg-slate-50 border-none rounded-2xl font-bold px-5"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Contact Number</Label>
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
                    id="phone"
                    type="tel"
                    placeholder="000 000 0000"
                    value={phone}
                    maxLength={10}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="h-14 bg-slate-50 border-none rounded-2xl font-bold px-5 flex-1 shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-1 bg-accent/10 rounded-[2rem]">
                  <div className="bg-white rounded-[1.8rem] p-6 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Sparkles className="w-5 h-5 text-accent" />
                      <p className="font-black text-slate-900">Saloon Identity</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Saloon Brand Name *</Label>
                      <Input
                        placeholder="e.g. Noir Grooming Lounge"
                        value={salonName}
                        onChange={(e) => updateSlug(e.target.value)}
                        className="h-14 bg-slate-50 border-none rounded-2xl font-bold px-5"
                        required
                      />
                    </div>

                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Login Pass *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-14 bg-slate-50 border-none rounded-2xl font-bold px-5 pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Confirm Pass *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-14 bg-slate-50 border-none rounded-2xl font-bold px-5"
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-6 px-0 pt-8 mt-4">
              <Button type="submit" className="w-full h-16 bg-slate-900 hover:bg-black text-white rounded-[2rem] font-black text-lg shadow-xl shadow-slate-900/10 transition-all transform hover:scale-[1.01]" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    PROVISIONING NODE...
                  </>
                ) : (
                  "INITIALIZE MANAGEMENT STATION"
                )}
              </Button>

              <div className="text-center">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                  Existing Partner?{" "}
                  <Link to="/login" className="text-accent underline">
                    Access Dashboard
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

export default Signup;
