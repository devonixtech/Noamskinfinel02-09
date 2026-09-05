import { useEffect, useState } from "react";

import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Megaphone,
  Settings,
  Banknote,
  Activity,
  Star,
  MapPin,
  Sparkles,
  Zap,
  Target,
  BarChart3,
  Shield,
  Loader2
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { AdminLayout } from "@/components/admin/AdminLayout";
import api from "@/services/api";
import { format, subMonths, eachMonthOfInterval, isSameMonth, parseISO } from "date-fns";
import { cn, formatCompactNumber } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  ComposedChart,
  Line,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  totalSalons: number;
  activeSalons: number;
  pendingSalons: number;
  totalUsers: number;
  totalOwners: number;
  todayBookings: number;
  weeklyBookings: number;
  monthlyRevenue: number;
  topCities: Array<{ city: string; count: number }>;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    status: string;
  }>;
  revenueData: {
    monthly: Array<{ name: string; value: number }>;
    annual: Array<{ name: string; value: number }>;
  };
  planRevenue: number;
  serviceRevenue: number;
  productRevenue: number;
  popularTreatments: Array<{ name: string; value: number }>;
  customerStats: {
    new: number;
    existing: number;
    total: number;
  };
  alerts: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    created_at: string;
    is_read: number;
  }>;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function AdminDashboardEnhanced() {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchEnhancedStats = async () => {
    try {
      setLoading(true);

      // Fetch data from the local admin API.
      const stats = await api.admin.getStats();
      const salons = await api.admin.getAllSalons();
      const users = await api.admin.getAllUsers();
      const notifications = await api.notifications.getAll({ unread_only: '0' });
      const alerts = Array.isArray(notifications) ? notifications : [];

      const topCitiesMap = new Map<string, number>();
      salons.forEach((s: any) => {
        if (s.city) {
          topCitiesMap.set(s.city, (topCitiesMap.get(s.city) || 0) + 1);
        }
      });

      const topCities = Array.from(topCitiesMap.entries())
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const salonsList = Array.isArray(salons) ? salons : [];
      const usersList = Array.isArray(users) ? users : [];

      if (!stats) {
        throw new Error("No governance stats returned from registry node.");
      }

      setDashboardStats({
        totalSalons: stats.total_salons || 0,
        activeSalons: stats.active_salons || 0,
        pendingSalons: stats.pending_salons || 0,
        totalUsers: stats.total_users || 0,
        totalOwners: usersList.filter((u: any) => u.role === 'owner' || u.is_owner).length,
        todayBookings: stats.today_bookings || 0,
        weeklyBookings: stats.weekly_bookings || 0,
        monthlyRevenue: stats.total_revenue || 0,
        topCities,
        recentActivity: Array.isArray(stats.recent_activity) ? stats.recent_activity : [],
        revenueData: {
          monthly: Array.isArray(stats.revenue_history) ? stats.revenue_history : [],
          annual: [{ name: new Date().getFullYear().toString(), value: stats.total_revenue || 0 }]
        },
        planRevenue: stats.plan_revenue || 0,
        serviceRevenue: stats.service_revenue || 0,
        productRevenue: stats.product_revenue || 0,
        popularTreatments: Array.isArray(stats.popular_treatments) ? stats.popular_treatments : [],
        customerStats: stats.customer_stats || {
          new: 0,
          existing: 0,
          total: 0
        },
        alerts: alerts.slice(0, 5)
      });

    } catch (error: any) {
      console.error("Error fetching local enhanced admin stats:", error);
      const msg = error.message || "";
      setErrorMessage(msg);
      if (msg.includes('403') || msg.includes('Access Denied') || msg.includes('governance')) {
        setErrorStatus(403);
      } else if (msg.includes('401') || msg.includes('Unauthorized')) {
        navigate('/login');
      } else {
        setErrorStatus(500);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFixPermissions = async () => {
    try {
      setLoading(true);
      toast({
        title: "Use Seeded Admin",
        description: "Please sign in with a local Super Admin account such as superadmin@salon.com / admin123.",
        variant: "destructive",
      });
    } catch (err: any) {
      console.error("Promotion error:", err);
      toast({ title: "Promotion Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnhancedStats();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
          <Loader2 className="animate-spin h-12 w-12 text-accent" />
          <p className="text-slate-500 font-bold animate-pulse">Synchronizing Governance Data...</p>
        </div>
      </AdminLayout>
    );
  }

  if (errorStatus === 403) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 text-center px-4">
          <div className="w-24 h-24 bg-red-500/10 rounded-[2rem] flex items-center justify-center text-red-500 border border-red-500/20 shadow-2xl shadow-red-500/5">
            <Shield className="w-12 h-12" />
          </div>
          <div className="space-y-3">
            <h2 className="text-4xl font-black text-white tracking-tight">Access Restricted</h2>
            <p className="text-slate-400 font-medium max-w-lg mx-auto leading-relaxed underline decoration-accent/30 underline-offset-4">Your current session identity does not possess the required Super Admin credentials for the local platform backend.</p>
          </div>
          <div className="flex flex-col gap-4 w-full max-w-sm">
            <Button
              onClick={handleFixPermissions}
              className="bg-accent hover:bg-accent/90 text-white font-black h-16 rounded-[1.5rem] shadow-2xl shadow-accent/30 text-lg transition-all hover:scale-105 active:scale-95"
            >
              Restore Admin Rights
            </Button>
            <Link to="/login" className="text-slate-500 hover:text-white font-bold text-sm transition-colors">
              Login as different user
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (errorStatus === 500 || (!dashboardStats && !loading)) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center">
            <AlertCircle className="w-10 h-10" />
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-white">Registry Sync Failure</h2>
            <p className="text-slate-400 max-w-md mx-auto">
              {errorMessage.includes('DATABASE_CONNECTION_ERROR')
                ? "The database is currently coming online. This usually takes 10-15 seconds."
                : "The local platform backend could not be reached or returned an invalid response."}
            </p>
            {errorMessage && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                <p className="text-red-400 text-xs font-mono break-all">{errorMessage}</p>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
            <Button onClick={fetchEnhancedStats} className="bg-slate-800 text-white rounded-xl h-12 font-bold hover:bg-slate-700">
              Retry Connection
            </Button>
            <Button onClick={handleFixPermissions} variant="ghost" className="text-accent hover:text-accent/80 font-bold text-xs uppercase tracking-widest">
              Emergency Permission Reset
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!dashboardStats) return null;

  // Process Monthly Revenue Data (Last 12 Months)
  const chartData = (() => {
    const rawData = dashboardStats.revenueData.monthly || [];
    const end = new Date();
    const start = subMonths(end, 11);
    const months = eachMonthOfInterval({ start, end });

    const filledData = months.map(month => {
      // Backend returns dates as 'MMM YYYY' (e.g., 'Feb 2026')
      // but we can parse it or just compare formatted strings if backend format is consistent
      const monthStr = format(month, 'MMM yyyy');
      const found = rawData.find((item: any) => item.name === monthStr);

      return {
        name: monthStr,
        value: found ? Number(found.value) : 0
      };
    });

    // Ensure zero-start for visual growth
    return [{ name: '', value: 0 }, ...filledData];
  })();

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Dark Mode Header */}
        <div className="bg-slate-900 rounded-[2rem] p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 blur-[100px] rounded-full" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 bg-accent rounded-2xl flex items-center justify-center shadow-lg shadow-accent/20">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight">Admin Dashboard</h1>
                <p className="text-slate-400 font-medium mt-2">Platform overview</p>
              </div>
            </div>
            <Button onClick={fetchEnhancedStats} className="bg-white/10 hover:bg-white/20 border-white/10 backdrop-blur-md rounded-xl h-12 px-6 font-bold">
              <Activity className="h-4 w-4 mr-2" />
              Live Update
            </Button>
          </div>
        </div>

        {/* Global Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Total Salons", value: formatCompactNumber(dashboardStats.totalSalons), active: `${dashboardStats.activeSalons} Active`, icon: Building2, color: "text-blue-500", bg: "bg-blue-50" },
            { label: "Service Sales", value: `MYR ${formatCompactNumber(dashboardStats.serviceRevenue)}`, active: "Bookings", icon: Activity, color: "text-emerald-500", bg: "bg-emerald-50" },
            { label: "Product Sales", value: `MYR ${formatCompactNumber(dashboardStats.productRevenue)}`, active: "Retail", icon: Banknote, color: "text-rose-500", bg: "bg-rose-50" },
            { label: "Total Revenue", value: `MYR ${formatCompactNumber(dashboardStats.monthlyRevenue)}`, active: "Gross Intake", icon: BarChart3, color: "text-purple-500", bg: "bg-purple-50" },
          ].map((stat, i) => (
            <Card key={i} className={`border-none shadow-sm bg-white rounded-3xl group hover:shadow-xl transition-all ${stat.label === 'Total Revenue' ? 'lg:col-span-1' : ''}`}>
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
                    <stat.icon className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
                    <p className="text-2xl font-black text-slate-900 leading-none">{stat.value}</p>
                    <p className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{stat.active}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Dynamic Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-none shadow-2xl bg-slate-900 rounded-[2.5rem] overflow-hidden relative">
            {/* Background Gradient Effect */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10 p-8">
              <div>
                <CardTitle className="text-2xl font-black text-white">Revenue Projections</CardTitle>
                <CardDescription className="text-slate-400 font-medium mt-1">Monthly Earnings trend (Last 12 Months)</CardDescription>
              </div>
              <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/20 font-bold px-4 py-1.5 rounded-xl">Local Host</Badge>
            </CardHeader>
            <CardContent className="h-[400px] mt-4 relative z-10 px-8 pb-8">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}
                  margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#ffffff', fontWeight: 600, fontSize: 12 }}
                    dy={15}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#ffffff', fontWeight: 600, fontSize: 12 }}
                    tickFormatter={(value) => `MYR ${formatCompactNumber(value)}`}
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '16px',
                      border: '1px solid #1e293b',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)',
                      padding: '12px'
                    }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 600, marginBottom: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}
                    cursor={{ stroke: '#22d3ee', strokeWidth: 2, strokeDasharray: '5 5' }}
                    formatter={(value: number) => [`MYR ${formatCompactNumber(value)}`, 'Revenue']}
                  />

                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="none"
                    fill="url(#barGradient)"
                    fillOpacity={0.4}
                  />

                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#22d3ee"
                    strokeWidth={4}
                    dot={{ r: 6, fill: "#0f172a", stroke: "#22d3ee", strokeWidth: 3 }}
                    activeDot={{ r: 8, fill: "#22d3ee", stroke: "#fff", strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>

              {/* Custom Legend */}
              <div className="flex justify-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-400 box-shadow-glow" />
                  <span className="text-white font-bold text-sm">Revenue Trend</span>
                </div>

              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white rounded-[2.5rem] p-8">
            <CardTitle className="text-xl font-bold mb-6">Market Expansion</CardTitle>
            <div className="space-y-6">
              {dashboardStats.topCities.map((city, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between font-bold text-sm">
                    <span className="text-slate-700">{city.city}</span>
                    <span className="text-accent">{city.count} Saloons</span>
                  </div>
                  <Progress value={(city.count / dashboardStats.totalSalons) * 100} className="h-3 rounded-full bg-slate-100" />
                </div>
              ))}
              {dashboardStats.topCities.length === 0 && <p className="text-slate-400 text-center py-10 font-medium">No location data found.</p>}
            </div>
          </Card>
        </div>


      </div>
    </AdminLayout>
  );
}
