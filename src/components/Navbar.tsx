import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, Menu, LogOut, CalendarDays, LayoutDashboard, Search, ShoppingBag, ChevronDown, Star, ArrowRight, Store } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import api from "@/services/api";
import { UserNotificationSystem } from "./UserNotificationSystem";
import { getImageUrl } from "@/utils/imageUrl";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

const Navbar = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<{
        suggestions: string[];
        products: any[];
        salons: any[];
        services: any[];
    }>({ suggestions: [], products: [], salons: [], services: [] });
    const [isSearching, setIsSearching] = useState(false);
    const [shopProducts, setShopProducts] = useState<any[]>([]);
    const [isShopLoading, setIsShopLoading] = useState(true);
    const location = useLocation();
    const { user, signOut } = useAuth();
    const { cartCount, addToCart } = useCart();

    useEffect(() => {
        const fetchShopProducts = async () => {
            try {
                const data = await api.platformProducts.getAll('customer');
                setShopProducts(Array.isArray(data) ? data : (data?.products || data?.items || data?.data || []));
            } catch (error) {
                console.error("Shop fetch error:", error);
            } finally {
                setIsShopLoading(false);
            }
        };
        fetchShopProducts();
    }, []);

    useEffect(() => {
        const handleSearch = async () => {
            if (searchQuery.trim().length >= 2) {
                setIsSearching(true);
                try {
                    const data = await api.search.query(searchQuery);
                    setSearchResults(data);
                } catch (error) {
                    console.error("Search error:", error);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults({ suggestions: [], products: [], salons: [], services: [] });
            }
        };

        const timeoutId = setTimeout(handleSearch, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const navLinks = [
        { name: "HOME", href: "/" },
        { name: "SERVICES", href: "/services-simple" },
        { name: "MEMBERSHIP", href: "/membership" },
        // SHOP is handled separately for nested dropdown
        { name: "CONTACT US", href: "/contact" },
        { name: "ABOUT US", href: "/about" },
    ];

    // Extract unique categories dynamically from products
    const dynamicCategories = Array.from(
        new Set((Array.isArray(shopProducts) ? shopProducts : []).map(p => p.category?.trim()).filter(Boolean))
    ).sort() as string[];

    const getProductsByCategory = (category: string) => {
        return (Array.isArray(shopProducts) ? shopProducts : []).filter(p => p.category?.trim() === category).slice(0, 4);
    };

    const isShopActive = location.pathname.startsWith('/shop') || location.pathname.startsWith('/product');

    return (
        <header className="fixed top-0 left-0 right-0 z-50">

            <nav className="bg-[#FAF9F6] border-b border-[#F2EEE9] transition-all duration-300">
                <div className="container mx-auto px-4 md:px-8 h-16 md:h-[72px] flex items-center justify-between">

                    {/* Logo Section */}
                    <Link to="/" className="flex items-center gap-2">
                        <img src={logo} alt="Noamskin Logo" className="h-8 md:h-10 w-auto" />
                    </Link>

                    {/* Desktop Navigation Links - Center */}
                    <div className="hidden lg:flex items-center gap-8 xl:gap-11">
                        {navLinks.slice(0, 3).map((link) => {
                            const isActive = location.pathname === link.href;
                            return (
                                <Link
                                    key={link.name}
                                    to={link.href}
                                    className="text-[13px] font-medium tracking-[0.14em] text-black transition-all flex items-center gap-1.5 relative py-1 group"
                                >
                                    {link.name}
                                    <span className={`absolute bottom-0 left-0 w-full h-[1.5px] bg-black transition-transform duration-300 ease-out origin-left ${isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
                                </Link>
                            );
                        })}

                        {/* SHOP Nested Dropdown - 3rd Position */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="text-[13px] font-medium tracking-[0.14em] text-black transition-all flex items-center gap-1 relative py-1 group outline-none">
                                    SHOP
                                    <ChevronDown className="w-3.5 h-3.5 transition-transform group-data-[state=open]:rotate-180 opacity-70" />
                                    <span className={`absolute bottom-0 left-0 w-full h-[1.5px] bg-black transition-transform duration-300 ease-out origin-left ${isShopActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56 mt-4 p-2 bg-card rounded-2xl border border-border shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200">

                                {dynamicCategories.length > 0 ? (
                                    dynamicCategories.map((categoryName) => {
                                        const items = getProductsByCategory(categoryName);
                                        if (items.length === 0) return null;

                                        return (
                                            <DropdownMenuSub key={categoryName}>
                                                <DropdownMenuSubTrigger className="rounded-xl h-12 px-4 focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent/50 cursor-pointer">
                                                    <span className="font-bold">{categoryName}</span>
                                                </DropdownMenuSubTrigger>
                                                <DropdownMenuPortal>
                                                    <DropdownMenuSubContent className="w-64 p-2 bg-card rounded-2xl border border-border shadow-2xl backdrop-blur-xl animate-in slide-in-from-left-2 duration-300">
                                                        {items.map((product) => (
                                                            <DropdownMenuItem key={product.id} asChild className="rounded-xl h-12 px-4 cursor-pointer focus:bg-accent focus:text-accent-foreground">
                                                                <Link to={`/product/${product.id}`} className="flex flex-col items-start w-full">
                                                                    <span className="font-bold truncate w-full">{product.name}</span>
                                                                    <span className="text-[10px] text-muted-foreground font-medium truncate w-full">{product.brand || product.category}</span>
                                                                </Link>
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuSubContent>
                                                </DropdownMenuPortal>
                                            </DropdownMenuSub>
                                        );
                                    })
                                ) : (
                                    <div className="px-4 py-3 text-sm text-muted-foreground font-medium text-center">
                                        No products available
                                    </div>
                                )}

                                <DropdownMenuSeparator className="my-2" />

                                <DropdownMenuItem asChild className="rounded-xl h-10 px-4 cursor-pointer focus:bg-accent focus:text-accent-foreground">
                                    <Link to="/shop" className="flex items-center justify-between w-full group">
                                        <span className="font-black text-xs uppercase tracking-widest">Shop All Rituals</span>
                                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {navLinks.slice(3).map((link) => {
                            const isActive = location.pathname === link.href;
                            return (
                                <Link
                                    key={link.name}
                                    to={link.href}
                                    className="text-[13px] font-medium tracking-[0.14em] text-black transition-all flex items-center gap-1.5 relative py-1 group"
                                >
                                    {link.name}
                                    <span className={`absolute bottom-0 left-0 w-full h-[1.5px] bg-black transition-transform duration-300 ease-out origin-left ${isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
                                </Link>
                            );
                        })}
                    </div>

                    {/* Action Icons Section - Right */}
                    <div className="flex items-center gap-1 md:gap-2">
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-black hover:bg-black/5 rounded-full transition-all"
                            aria-label="Search"
                        >
                            <Search className="w-5 h-5 stroke-[1.3px]" />
                        </button>

                        {user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-black hover:bg-black/5 rounded-full transition-all outline-none" aria-label="User menu">
                                        <User className="w-5 h-5 stroke-[1.3px]" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 mt-4 p-2 bg-card rounded-2xl border border-border shadow-2xl">
                                    <div className="px-3 py-2 border-b border-slate-50 mb-1">
                                        <p className="text-sm font-black">{user.full_name}</p>
                                        <p className="text-[10px] text-slate-400">{user.email}</p>
                                    </div>
                                    <DropdownMenuItem asChild className="rounded-xl h-10 focus:bg-accent focus:text-accent-foreground cursor-pointer transition-colors">
                                        <Link to="/user/profile" className="flex items-center gap-3">
                                            <User className="w-4 h-4" /> Profile
                                        </Link>
                                    </DropdownMenuItem>
                                    {(() => {
                                        let dashPath = "/user/dashboard";
                                        let dashLabel = "My Dashboard";

                                        if (user.user_type === 'admin' || user.user_type === 'super_admin') {
                                            dashPath = "/super-admin/dashboard";
                                            dashLabel = "Super Admin";
                                        } else if (user.user_type === 'salon_owner' || user.salon_role === 'owner' || user.salon_role === 'manager') {
                                            dashPath = "/salon/dashboard";
                                            dashLabel = "Salon Hub";
                                        } else if (user.user_type === 'salon_staff' || user.salon_role === 'staff') {
                                            dashPath = "/staff/dashboard";
                                            dashLabel = "Staff Hub";
                                        } else if (user.user_type === 'customer') {
                                            dashPath = "/my-bookings";
                                            dashLabel = "My Bookings";
                                        }

                                        return (
                                            <DropdownMenuItem asChild className="rounded-xl h-10 focus:bg-accent focus:text-accent-foreground cursor-pointer font-bold transition-colors">
                                                <Link to={dashPath} className="flex items-center gap-3">
                                                    <LayoutDashboard className="w-4 h-4" /> {dashLabel}
                                                </Link>
                                            </DropdownMenuItem>
                                        );
                                    })()}
                                    <DropdownMenuSeparator className="bg-slate-50" />
                                    <DropdownMenuItem onClick={signOut} className="rounded-xl h-10 focus:bg-red-50 text-red-500 cursor-pointer">
                                        <LogOut className="w-4 h-4 mr-3" /> Logout
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-black hover:bg-black/5 rounded-full transition-all outline-none">
                                        <User className="w-5 h-5 md:w-6 md:h-6 stroke-[1.2px]" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64 mt-4 p-2 bg-card rounded-2xl border border-border shadow-2xl">
                                    <div className="px-3 py-3 border-b border-slate-50 mb-1">
                                        <p className="text-xs font-black uppercase tracking-widest text-[#1A1A1A]/40">Wellness Registry</p>
                                    </div>

                                    <DropdownMenuItem asChild className="rounded-xl h-12 focus:bg-[#F3EEEA] focus:text-[#1A1A1A] cursor-pointer transition-colors px-4">
                                        <Link to="/login" className="flex items-center justify-between w-full group">
                                            <div className="flex items-center gap-3">
                                                <User className="w-4 h-4" />
                                                <span className="font-bold">Member Login</span>
                                            </div>
                                            <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-accent" />
                                        </Link>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem asChild className="rounded-xl h-12 focus:bg-[#F3EEEA] focus:text-[#1A1A1A] cursor-pointer transition-colors px-4">
                                        <Link to="/signup" className="flex items-center justify-between w-full group">
                                            <div className="flex items-center gap-3">
                                                <Star className="w-4 h-4 text-accent fill-accent/10" />
                                                <span className="font-bold">Join as Member</span>
                                            </div>
                                            <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-accent" />
                                        </Link>
                                    </DropdownMenuItem>

                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        <Link to="/cart" className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-black hover:bg-black/5 rounded-full transition-all relative group" aria-label="Cart">
                            <ShoppingBag className="w-5 h-5 stroke-[1.3px]" />
                            {cartCount > 0 && (
                                <div className="absolute top-0 right-0 min-w-[17px] h-[17px] bg-accent text-white text-[10px] font-black rounded-full flex items-center justify-center animate-in zoom-in border-2 border-background shadow-sm">
                                    {cartCount}
                                </div>
                            )}
                        </Link>
                        <UserNotificationSystem />

                        {/* Mobile Menu */}
                        <div className="lg:hidden">
                            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 md:h-10 md:w-10 text-[#1A1A1A] hover:bg-black/5 rounded-full transition-all">
                                        <Menu className="w-5 h-5" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="right" className="w-full sm:w-[350px] bg-background border-none p-0">
                                    <div className="flex flex-col h-full">
                                        <div className="p-8 pb-4">
                                            <SheetHeader>
                                                <SheetTitle className="text-left text-2xl">Menu</SheetTitle>
                                            </SheetHeader>
                                        </div>

                                        <div className="flex-1 overflow-y-auto px-8 py-4">
                                            <nav className="flex flex-col gap-6">
                                                {navLinks.map((link) => (
                                                    <Link
                                                        key={link.name}
                                                        to={link.href}
                                                        onClick={() => setIsOpen(false)}
                                                        className="text-[16px] font-black tracking-widest text-[#1A1A1A] hover:opacity-100 transition-colors uppercase py-2 border-b border-[#1A1A1A]/5"
                                                    >
                                                        {link.name}
                                                    </Link>
                                                ))}
                                                <Link
                                                    to="/shop"
                                                    onClick={() => setIsOpen(false)}
                                                    className="text-[16px] font-black tracking-widest text-[#1A1A1A] hover:opacity-100 transition-colors uppercase py-2 border-b border-[#1A1A1A]/5"
                                                >
                                                    SHOP
                                                </Link>
                                            </nav>

                                            <div className="mt-12 space-y-4">
                                                {user ? (
                                                    <>
                                                        <Link to="/user/profile" className="flex items-center gap-4 p-4 bg-white/50 rounded-2xl" onClick={() => setIsOpen(false)}>
                                                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-accent shadow-sm">
                                                                {user.full_name?.[0]}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-sm">{user.full_name}</p>
                                                                <p className="text-[10px] text-slate-400">View Registry Profile</p>
                                                            </div>
                                                        </Link>
                                                        <Button
                                                            variant="destructive"
                                                            className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                                                            onClick={() => {
                                                                signOut();
                                                                setIsOpen(false);
                                                            }}
                                                        >
                                                            Sign Out
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <Link to="/login" onClick={() => setIsOpen(false)}>
                                                        <Button className="w-full h-14 bg-[#1A1A1A] text-white rounded-2xl font-black uppercase tracking-widest text-[10px]">
                                                            Join the Club
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </div>

                                        {/* <div className="p-8 bg-[#1A1A1A]/5 text-center">
 <p className="text-[10px] font-black uppercase tracking-widest text-[#1A1A1A]/40">
 daily habits wellness club © 2026
 </p>
 </div> */}
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Search Drawer */}
            <Sheet open={isSearchOpen} onOpenChange={(open) => {
                setIsSearchOpen(open);
                if (!open) setSearchQuery("");
            }}>
                <SheetContent side="right" className="w-full sm:w-[450px] bg-background border-none p-0">
                    <div className="p-8 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-3xl md:text-4xl font-['DM_Serif_Display'] text-[#1A1A1A]">Search</h2>
                        </div>

                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2">
                                <Search className="w-5 h-5 text-slate-400 group-focus-within:text-[#1A1A1A] transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search"
                                autoFocus
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-14 pl-14 pr-6 bg-white/50 border-none rounded-full text-lg focus:bg-white focus:ring-2 focus:ring-[#1A1A1A]/5 outline-none transition-all placeholder:text-slate-400"
                            />
                        </div>

                        {searchQuery.trim() !== "" && (
                            <div className="flex-1 mt-12 overflow-y-auto scrollbar-hide">
                                {isSearching ? (
                                    <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                                        <div className="w-12 h-12 rounded-full border-4 border-[#1A1A1A]/10 border-t-[#1A1A1A] animate-spin mb-4" />
                                        <p className="text-sm font-bold text-[#1A1A1A]/40 uppercase tracking-widest">Searching...</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Suggestions Section */}
                                        {searchResults.suggestions.length > 0 && (
                                            <div className="mb-10">
                                                <h3 className="text-xl font-bold text-[#1A1A1A] mb-4">Suggestions</h3>
                                                <div className="flex flex-col gap-3">
                                                    {searchResults.suggestions.map((item) => (
                                                        <button
                                                            key={item}
                                                            onClick={() => setSearchQuery(item)}
                                                            className="text-left text-base font-normal text-[#1A1A1A] hover:underline decoration-1 underline-offset-4"
                                                        >
                                                            {item}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Products Section */}
                                        {searchResults.products.length > 0 && (
                                            <div className="mb-10 border-t border-[#1A1A1A]/5 pt-10">
                                                <h3 className="text-xl font-bold text-[#1A1A1A] mb-8">Products</h3>
                                                <div className="flex flex-col gap-8">
                                                    {searchResults.products.map((product) => (
                                                        <div key={product.id} className="flex items-center gap-6 group cursor-pointer" onClick={() => setIsSearchOpen(false)}>
                                                            <div className="w-20 h-24 bg-white rounded-xl overflow-hidden shadow-sm flex-shrink-0">
                                                                <img
                                                                    src={getImageUrl(product.image_url, 'service', product.id)}
                                                                    alt={product.name}
                                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                                />
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-lg font-bold leading-tight group-hover:opacity-60 transition-opacity">
                                                                    {product.name}
                                                                </p>
                                                                <p className="text-sm font-medium text-slate-500 mt-1">RM {product.price}</p>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                className="rounded-full bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90 h-10 px-4"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    addToCart({
                                                                        id: product.id,
                                                                        name: product.name,
                                                                        price: Number(product.price),
                                                                        image_url: product.image_url,
                                                                        type: 'product'
                                                                    });
                                                                    toast.success("Added to bag");
                                                                }}
                                                            >
                                                                Add
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Services Section */}
                                        {searchResults.services.length > 0 && (
                                            <div className="mb-10 border-t border-[#1A1A1A]/5 pt-10">
                                                <h3 className="text-xl font-bold text-[#1A1A1A] mb-8">Services</h3>
                                                <div className="flex flex-col gap-8">
                                                    {searchResults.services.map((service) => (
                                                        <div key={service.id} className="flex items-center gap-6 group cursor-pointer" onClick={() => setIsSearchOpen(false)}>
                                                            <div className="w-20 h-24 bg-white rounded-xl overflow-hidden shadow-sm flex-shrink-0">
                                                                <img
                                                                    src={getImageUrl(service.image_url, 'service', service.id)}
                                                                    alt={service.name}
                                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                                />
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-lg font-bold leading-tight group-hover:opacity-60 transition-opacity">
                                                                    {service.name}
                                                                </p>
                                                                <p className="text-sm font-medium text-slate-500 mt-1">{service.salon_name}</p>
                                                                <p className="text-sm font-bold text-accent mt-1">RM {service.price}</p>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                className="rounded-full bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90 h-10 px-4"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    addToCart({
                                                                        id: service.id,
                                                                        name: service.name,
                                                                        price: Number(service.price),
                                                                        image_url: service.image_url,
                                                                        type: 'service'
                                                                    });
                                                                    toast.success("Added to bag");
                                                                }}
                                                            >
                                                                Add
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Salons Section */}
                                        {searchResults.salons.length > 0 && (
                                            <div className="mb-10 border-t border-[#1A1A1A]/5 pt-10">
                                                <h3 className="text-xl font-bold text-[#1A1A1A] mb-8">Salons</h3>
                                                <div className="flex flex-col gap-8">
                                                    {searchResults.salons.map((salon) => (
                                                        <div key={salon.id} className="flex items-center gap-6 group cursor-pointer" onClick={() => {
                                                            setIsSearchOpen(false);
                                                            navigate("/services-simple");
                                                        }}>
                                                            <div className="w-20 h-24 bg-white rounded-xl overflow-hidden shadow-sm flex-shrink-0">
                                                                <img
                                                                    src={getImageUrl(salon.logo_url, 'logo', salon.id)}
                                                                    alt={salon.name}
                                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                                />
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-lg font-bold leading-tight group-hover:opacity-60 transition-opacity">
                                                                    {salon.name}
                                                                </p>
                                                                <p className="text-sm font-medium text-slate-500 mt-1">{salon.city}, {salon.state}</p>
                                                                <div className="flex items-center gap-1 mt-1">
                                                                    <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                                                                    <span className="text-xs font-black text-slate-900">
                                                                        {(typeof salon.rating === 'number' ? salon.rating : Number(salon.rating || 0)).toFixed(1)}
                                                                    </span>
                                                                    {Number(salon.review_count) > 0 && (
                                                                        <span className="text-[10px] text-slate-400 font-bold ml-1">· {salon.review_count} reviews</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-accent group-hover:translate-x-1 transition-all" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* No Results Fallback */}
                                        {searchResults.suggestions.length === 0 &&
                                            searchResults.products.length === 0 &&
                                            searchResults.services.length === 0 &&
                                            searchResults.salons.length === 0 && (
                                                <div className="py-20 text-center">
                                                    <p className=" text-slate-400">No results found for "{searchQuery}"</p>
                                                </div>
                                            )}

                                        {/* Footer All Results */}
                                        <div className="mt-auto border-t border-[#1A1A1A]/10 pt-6 pb-4">
                                            <button className="flex items-center gap-2 text-sm font-bold text-[#1A1A1A] hover:gap-4 transition-all group">
                                                See all results for "{searchQuery}"
                                                <span className="text-xl transition-transform group-hover:translate-x-1">→</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </header>
    );
};

export default Navbar;
