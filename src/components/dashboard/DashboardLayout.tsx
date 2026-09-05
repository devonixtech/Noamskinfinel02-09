import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCog,
  Scissors,
  Receipt,
  Package,
  BarChart3,
  Gift,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Store,
  Bell,
  Search,
  Plus,
  User,
  ShoppingBag,
  Mail,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useSalon } from "@/hooks/useSalon";
import { useAuth } from "@/hooks/useAuth";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { SalonNotificationSystem } from "./SalonNotificationSystem";
import { PendingApproval } from "./PendingApproval";
import { Loader2 } from "lucide-react";
import api from "@/services/api";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { salons, currentSalon, setCurrentSalon, isOwner, isManager, isStaff, refreshSalons } = useSalon();
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>({ suggestions: [], customers: [], appointments: [], services: [] });
  const [isSearching, setIsSearching] = useState(false);

  const isUserStaff = isStaff && !isOwner && !isManager;
  const basePath = isUserStaff ? "/staff" : "/salon";

  const navItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      path: `${basePath}/dashboard`,
      description: "Overview & analytics"
    },
    {
      icon: Calendar,
      label: "Calendar",
      path: `${basePath}/appointments`,
      description: "Manage schedule"
    },
    {
      icon: Users,
      label: "Customers",
      path: `${basePath}/customers`,
      description: "Client management"
    },
    {
      icon: UserCog,
      label: "Staff & Team",
      path: `${basePath}/staff`,
      description: "Team & roles"
    },
    {
      icon: Scissors,
      label: "Services",
      path: `${basePath}/services`,
      description: "Service catalog"
    },
    {
      icon: Receipt,
      label: "Billing",
      path: `${basePath}/billing`,
      description: "Payments & invoices"
    },
    {
      icon: Package,
      label: "Inventory",
      path: `${basePath}/inventory`,
      description: "Stock management"
    },
    {
      icon: BarChart3,
      label: "Reports",
      path: `${basePath}/reports`,
      description: "Analytics & insights"
    },
    {
      icon: Gift,
      label: "Offers",
      path: `${basePath}/offers`,
      description: "Promotions & deals"
    },
    {
      icon: Settings,
      label: "Settings",
      path: `${basePath}/settings`,
      description: "Business configuration"
    }
  ];

  if (isUserStaff) {
    // Override navItems for pure staff
    navItems.length = 0;
    navItems.push(
      {
        icon: LayoutDashboard,
        label: "My Dashboard",
        path: "/staff/dashboard",
        description: "Personal overview"
      },
      {
        icon: User,
        label: "My Attendance",
        path: "/staff/attendance",
        description: "Check-in/out"
      },
      {
        icon: Users,
        label: "My Customers",
        path: "/staff/customers",
        description: "Client management"
      },
      {
        icon: BookOpen,
        label: "Leaves",
        path: "/staff/leaves",
        description: "Manage time off"
      }
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const fetchDashboardStats = async () => {
    if (!currentSalon || !user) return;
    try {
      // 1. Fetch Today's Appointments
      const today = new Date().toISOString().split('T')[0];
      const bookings = await api.bookings.getAll({
        salon_id: currentSalon.id,
        date: today
      });
      setAppointmentCount(bookings.length);

      // 2. Fetch Unread Notifications (HANDLED BY SalonNotificationSystem)
      // const notifications = await api.notifications.getAll({
      //   salon_id: currentSalon.id,
      //   unread_only: '1'
      // });

      // 3. Fetch Unread Messages (REMOVED GLOBAL FEATURE)
      // const messages = await api.messages.getAll(currentSalon.id);
      // const unreadMessages = messages.filter((m: any) => {
      //   if (m.is_read) return false;
      //   if (m.receiver_id === user.id) return true;
      //   if (!m.receiver_id) {
      //     if (isOwner && m.recipient_type === 'owner') return true;
      //     if (isStaff && m.recipient_type === 'staff') return true;
      //   }
      //   return false;
      // });
      // setUnreadMessagesCount(unreadMessages.length);

      // setUnreadCount((notifications?.length || 0));
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
    const interval = setInterval(fetchDashboardStats, 60000); // Check every 60 seconds
    return () => clearInterval(interval);
  }, [currentSalon, user]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredNavItems = navItems.filter((item) => {
    // If it's the overridden list for staff, don't filter it further
    if (isUserStaff) {
      return true;
    }

    // Owners don't need "Staff Profile ", "Supply Store" or "Inventory" in the main sidebar list
    if (isOwner && (item.label === "Staff Profile " || item.label === "Supply Store" || item.label === "Inventory")) {
      return false;
    }

    // Managers can see most items except Settings
    if (isManager && !isOwner) {
      return item.label !== "Settings";
    }

    return true;
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentSalon?.approval_status === 'pending') {
      interval = setInterval(() => {
        refreshSalons();
      }, 30000); // Poll every 30 seconds, not 2s
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentSalon?.approval_status, refreshSalons]);

  useEffect(() => {
    const handleSearch = async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        try {
          const data = await api.search.query(searchQuery, currentSalon?.id);
          setSearchResults(data);
        } catch (error) {
          console.error("Search error:", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults({ suggestions: [], customers: [], appointments: [], services: [] });
      }
    };

    const timeoutId = setTimeout(handleSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  if (currentSalon?.approval_status === 'pending' && isOwner) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <header className="fixed top-0 left-0 right-0 h-20 bg-background/80 backdrop-blur-xl border-b border-border px-8 flex items-center justify-between z-50">
          <div className="flex items-center gap-3 cursor-default">
            <div className="w-10 h-10 bg-[#55402f] rounded-xl flex items-center justify-center shadow-lg">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-foreground">NoamSkin</span>
          </div>
          <Button variant="ghost" onClick={handleSignOut} className="font-bold text-muted-foreground hover:text-red-500 gap-2">
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </header>
        <PendingApproval salonName={currentSalon.name} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex w-full">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50 w-72 h-screen bg-card shadow-sm border-r border-border transform transition-all duration-300 ease-in-out lg:transform-none shadow-2xl lg:shadow-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Salon Selector */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-6">
              <Link to={basePath + "/dashboard"} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-accent to-accent/80 rounded-xl flex items-center justify-center shadow-lg">
                  <Scissors className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="font-bold text-xl text-foreground">NoamSkin</span>
                  <p className="text-xs text-muted-foreground">{isOwner ? "Owner Dashboard" : isManager ? "Manager Dashboard" : "Staff Profile"}</p>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden hover:bg-secondary/50"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Salon Selector - hidden for owners and staff as requested */}
            {salons.length > 0 && !isOwner && !isStaff && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between text-left font-normal h-12 bg-muted/30 border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                        <Store className="w-4 h-4 text-accent" />
                      </div>
                      <div className="truncate">
                        <p className="font-medium text-sm truncate">
                          {currentSalon?.name || "Select Salon"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {currentSalon?.city || "Location"}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 bg-card/95 backdrop-blur-xl border-border">
                  {salons.map((salon) => (
                    <DropdownMenuItem
                      key={salon.id}
                      onClick={() => setCurrentSalon(salon)}
                      className={cn(
                        "cursor-pointer p-3",
                        currentSalon?.id === salon.id && "bg-accent/10 text-accent"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                          <Store className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                          <p className="font-medium">{salon.name}</p>
                          <p className="text-xs text-muted-foreground">{salon.city}</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigate(`${basePath}/create-salon`)}
                    className="cursor-pointer p-3 text-accent hover:bg-accent/10"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Salon
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-hide">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative",
                    isActive
                      ? "bg-gradient-to-r from-accent to-accent/90 text-white shadow-lg shadow-accent/25"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5 transition-transform duration-200",
                    isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground",
                    "group-hover:scale-110"
                  )} />
                  <div className="flex-1 flex flex-row items-center justify-between">
                    <div className="flex flex-col">
                      <span className={cn(
                        "font-medium leading-none",
                        isActive ? "text-white" : "text-foreground"
                      )}>
                        {item.label}
                      </span>
                      <span className={cn(
                        "text-[10px] mt-1 line-clamp-1",
                        isActive ? "text-white/80" : "text-muted-foreground"
                      )}>
                        {item.description}
                      </span>
                    </div>
                    {(item.label === "Calendar" || item.label === "Appointments") && appointmentCount > 0 && (
                      <Badge className={cn(
                        "ml-auto h-5 w-5 p-0 flex items-center justify-center text-[10px] font-black rounded-full",
                        isActive ? "bg-white text-accent" : "bg-accent text-white"
                      )}>
                        {appointmentCount}
                      </Badge>
                    )}
                    {item.label === "Messages" && unreadMessagesCount > 0 && !isOwner && (
                      <Badge className={cn(
                        "ml-auto h-5 w-5 p-0 flex items-center justify-center text-[10px] font-black rounded-full",
                        isActive ? "bg-white text-accent" : "bg-accent text-white"
                      )}>
                        {unreadMessagesCount}
                      </Badge>
                    )}
                  </div>
                  {isActive && (
                    <div className="absolute right-2 w-2 h-2 bg-white rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 transition-colors">
              <div
                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate(`${basePath}/notifications`)}
              >
                <div className="relative">
                  <Avatar className="w-10 h-10 ring-2 ring-accent/20">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-gradient-to-br from-accent to-accent/80 text-white text-sm font-medium">
                      {user?.email ? getInitials(user.email) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-black text-white border-2 border-white animate-pulse shadow-lg">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">
                    {user?.email?.split("@")[0]}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs px-2 py-0.5">
                      {isOwner ? "Owner" : isManager ? "Manager" : "Staff"}
                    </Badge>
                  </div>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground hover:bg-white/20 rounded-lg"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur-xl border-border">
                  <DropdownMenuItem className="cursor-pointer" onClick={() => navigate(`${basePath}/profile`)}>
                    <User className="w-4 h-4 mr-2" />
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-8 h-20 flex items-center justify-between shadow-sm">
          {/* Left: Mobile Menu & Logo */}
          <div className="flex-1 flex items-center gap-4">
            <div className="flex items-center gap-3 lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-muted/50 rounded-xl"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5 text-foreground" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-accent to-accent/80 rounded-lg flex items-center justify-center shadow-md">
                  <Scissors className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-lg text-foreground tracking-tight">NoamSkin</span>
              </div>
            </div>

            {/* Desktop Page Info or Breadcrumb could go here */}
            <div className="hidden lg:flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Store className="w-4 h-4" />
              <span>{currentSalon?.name || "No Salon Selected"}</span>
            </div>
          </div>

          {/* Center: Search Bar */}
          <div className="flex-1 max-w-xl group">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
              </div>
              <Input
                placeholder="Search customers, appointments, reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 pr-4 py-6 bg-muted/20 border-border rounded-2xl focus:bg-background focus:ring-4 focus:ring-accent/5 focus:border-accent/30 transition-all duration-300 text-sm font-medium placeholder:text-muted-foreground/60 w-full shadow-inner"
              />
              <div className="absolute inset-y-0 right-4 flex items-center gap-2 pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity">
                <span className="text-[10px] font-bold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border">⌘K</span>
              </div>
            </div>

            {searchQuery.trim().length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[70vh] overflow-y-auto">
                {isSearching ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
                    <span className="ml-3 text-sm text-muted-foreground font-medium">Searching...</span>
                  </div>
                ) : (
                  <div className="p-2">
                    {searchResults.customers?.length > 0 && (
                      <div className="mb-2">
                        <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Customers</p>
                        {searchResults.customers.slice(0, 8).map((customer: any) => (
                          <button
                            key={customer.id}
                            onClick={() => {
                              if (customer.id || customer.user_id) {
                                navigate(`${basePath}/customers/${customer.id || customer.user_id}`);
                              } else {
                                navigate(`${basePath}/customers`);
                              }
                              setSearchQuery("");
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent/5 text-sm font-medium text-left transition-colors cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent shrink-0">
                              {customer.name?.[0] || "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-foreground truncate">{customer.name}</p>
                              {customer.phone && <p className="text-xs text-muted-foreground">{customer.phone}</p>}
                            </div>
                            {customer.email && !customer.email.endsWith('.local') && (
                              <span className="text-xs text-muted-foreground ml-auto shrink-0">{customer.email}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.appointments?.length > 0 && (
                      <div className="mb-2">
                        <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Appointments</p>
                        {searchResults.appointments.slice(0, 6).map((apt: any) => (
                          <button
                            key={apt.id}
                            onClick={() => {
                              if (apt.user_id) {
                                navigate(`${basePath}/customers/${apt.user_id}`);
                              } else {
                                navigate(`${basePath}/appointments`);
                              }
                              setSearchQuery("");
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent/5 text-sm font-medium text-left transition-colors cursor-pointer"
                          >
                            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-foreground truncate">{apt.customer_name || apt.customer}</p>
                              <p className="text-xs text-muted-foreground truncate">{apt.service_name || apt.service}</p>
                            </div>
                            <span className="text-xs text-muted-foreground ml-auto shrink-0">{apt.time || apt.date || apt.booking_date}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.services?.length > 0 && (
                      <div className="mb-2">
                        <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Services</p>
                        {searchResults.services.slice(0, 5).map((service: any) => (
                          <button
                            key={service.id}
                            onClick={() => { navigate(`${basePath}/services`); setSearchQuery(""); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent/5 text-sm font-medium text-left transition-colors"
                          >
                            <Scissors className="w-4 h-4 text-muted-foreground" />
                            <span>{service.name}</span>
                            {service.price && <span className="text-xs text-muted-foreground ml-auto">RM {service.price}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    {!searchResults.customers?.length && !searchResults.appointments?.length && !searchResults.services?.length && (
                      <div className="py-12 text-center">
                        <p className="text-sm text-muted-foreground">No results for "{searchQuery}"</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Try a different search term</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex-1 flex items-center justify-end gap-4">
            <div className="hidden md:flex items-center gap-2">
              {/* <Button
                variant="outline"
                size="sm"
                className="h-10 px-4 rounded-xl border-border/50 bg-white/50 hover:bg-white hover:border-accent/30 hover:shadow-lg transition-all"
                onClick={() => navigate("/dashboard/appointments")}
              >
                <Plus className="w-4 h-4 mr-2 text-accent" />
                <span className="font-bold text-xs uppercase tracking-wider text-foreground">Quick Add</span>
              </Button> */}
            </div>

            <Separator orientation="vertical" className="h-6 bg-border hidden md:block" />

            <div className="flex items-center gap-3">
              <SalonNotificationSystem onUnreadCountChange={setUnreadCount} />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="relative h-11 w-11 rounded-xl border-2 border-border/30 hover:border-accent/50 transition-colors cursor-pointer lg:hidden">
                    <Avatar className="h-full w-full">
                      <AvatarFallback className="bg-accent/10 text-accent text-xs font-bold">
                        {user?.email ? getInitials(user.email) : "U"}
                      </AvatarFallback>
                    </Avatar>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-black text-white border-2 border-white animate-pulse shadow-lg">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur-xl border-border lg:hidden">
                  <DropdownMenuItem className="cursor-pointer" onClick={() => navigate(`${basePath}/profile`)}>
                    <User className="w-4 h-4 mr-2" />
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="lg:hidden text-destructive hover:bg-destructive/10"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-10 bg-background text-foreground">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
