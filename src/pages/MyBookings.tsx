import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { CalendarDays, Clock, ArrowLeft, Loader2, Plus, MapPin, Phone, Scissors, Store, MessageSquare, Star, FileText, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import api from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Footer from "@/components/Footer";
import { getImageUrl } from "@/utils/imageUrl";
import { cleanStylistNote as getCleanStylistNote } from "@/utils/cleanNotes";


interface Booking {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  notes: string | null;
  created_at: string;
  salon_id: string;
  service_name: string;
  price: number;
  duration_minutes: number;
  salon_name: string;
  salon_address: string;
  salon_city: string;
  category: string;
  image_url?: string;
  discount_amount?: number;
  coupon_code?: string;
  original_price?: number;
  service_price?: number;
}

const MyBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();



  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'bookings' | 'orders'>(
    (searchParams.get('tab') as 'bookings' | 'orders') || 'bookings'
  );

  const [reviewDialog, setReviewDialog] = useState<{ isOpen: boolean; booking: Booking | null; isEditing?: boolean }>({
    isOpen: false,
    booking: null,
    isEditing: false
  });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewedBookings, setReviewedBookings] = useState<Set<string>>(new Set());
  const [cancelDialog, setCancelDialog] = useState<{ isOpen: boolean; bookingId: string | null }>({
    isOpen: false,
    bookingId: null
  });

  const checkReviews = async (bookingList: Booking[]) => {
    const reviewed = new Set<string>();
    for (const b of bookingList) {
      if (b.status === 'completed') {
        try {
          const res = await api.bookings.getReview(b.id);
          if (res?.review) reviewed.add(b.id);
        } catch (e) {
          console.error(e);
        }
      }
    }
    setReviewedBookings(reviewed);
  };

  const fetchBookings = async () => {
    if (!user) return;
    try {
      // Fetch customer-specific bookings from the migrated backend API.
      const data = await api.bookings.getAll({ user_id: user.id });
      setBookings(data || []);
      if (data) checkReviews(data);
    } catch (error) {
      console.error("Error fetching local bookings:", error);
    } finally {
      if (activeTab === 'bookings') setLoading(false);
    }
  };

  const fetchOrders = async () => {
    if (!user) return;
    try {
      const data = await api.orders.getMyOrders();
      setOrders(data || []);
    } catch (error) {
      console.error("Failed to fetch orders", error);
    } finally {
      if (activeTab === 'orders') setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (user) {
      setLoading(true);
      if (activeTab === 'bookings') fetchBookings();
      else fetchOrders();
    }

    // Reset scroll on tab switch
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const scrollTargets = [
        document.getElementById('app-routes-container'),
        document.getElementById('mobile-main-content'),
        document.querySelector('main'),
        document.querySelector('.overflow-y-auto'),
        document.querySelector('[data-scroll-container]'),
    ];
    scrollTargets.forEach((el) => {
        if (el) el.scrollTop = 0;
    });
  }, [user, authLoading, activeTab]);

  const confirmCancel = async () => {
    if (!cancelDialog.bookingId) return;
    try {
      await api.bookings.update(cancelDialog.bookingId, { status: 'cancelled' });
      toast({ title: "Booking Cancelled", description: "Updated in local records." });
      setCancelDialog({ isOpen: false, bookingId: null });
      fetchBookings();
    } catch (error: any) {
      const msg = error.message || "Failed to update record";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewDialog.booking) return;
    setSubmittingReview(true);
    try {
      if (reviewDialog.isEditing) {
        await api.bookings.updateReview(reviewDialog.booking.id, rating, comment);
        toast({ title: "Review Updated", description: "Your feedback has been updated." });
      } else {
        await api.bookings.submitReview(reviewDialog.booking.id, rating, comment);
        toast({ title: "Feedback Received", description: "Thank you for sharing your experience!" });
        setReviewedBookings(prev => new Set([...prev, reviewDialog.booking!.id]));
      }
      setReviewDialog({ isOpen: false, booking: null, isEditing: false });
      setComment("");
      setRating(5);
    } catch (error: any) {
      const msg = error.message || "Could not submit review";
      toast({ title: "Submission Failed", description: msg, variant: "destructive" });
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold">Confirmed</Badge>;
      case 'pending': return <Badge className="bg-amber-100 text-amber-700 border-none font-bold">Pending</Badge>;
      case 'completed': return <Badge className="bg-blue-100 text-blue-700 border-none font-bold">Completed</Badge>;
      case 'cancelled': return <Badge className="bg-red-100 text-red-700 border-none font-bold">Cancelled</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'placed': return <Badge className="bg-yellow-100 text-yellow-800 border-none">Placed</Badge>;
      case 'dispatched': return <Badge className="bg-blue-100 text-blue-800 border-none">Dispatched</Badge>;
      case 'delivered': return <Badge className="bg-emerald-100 text-emerald-800 border-none">Delivered</Badge>;
      case 'cancelled': return <Badge className="bg-red-100 text-red-800 border-none">Cancelled</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB]">
      <Navbar />
      <div className="container mx-auto px-4 pt-28 pb-12">
        <div className="w-full mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-6">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Activity History</h1>
              <p className="text-slate-400 font-medium font-bold uppercase tracking-widest text-[10px] mt-1">Local History</p>
            </div>

            <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
              <button
                onClick={() => setActiveTab('bookings')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'bookings' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Bookings
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'orders' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Orders
              </button>
            </div>

            <Link to="/services-simple">
              <Button className="bg-accent text-white font-black rounded-2xl h-14 px-8 shadow-xl shadow-accent/20">
                <Plus className="w-5 h-5 mr-3" /> Book Experience
              </Button>
            </Link>
          </div>

          {activeTab === 'bookings' ? (
            bookings.length === 0 ? (
              <Card className="border-none shadow-sm bg-white rounded-[3rem] py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto text-slate-300">
                  <CalendarDays className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">No appointments found</h3>
                  <p className="text-slate-400 font-medium">Your local booking archive is empty.</p>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {bookings.map(booking => (
                  <Card key={booking.id} className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden group hover:shadow-xl transition-all">
                    <CardContent className="p-0">
                      <div className="p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                        {/* 1. Service & Salon Info */}
                        <div className="flex items-start gap-5 flex-grow min-w-0">
                          <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 rounded-3xl flex-shrink-0 relative overflow-hidden group-hover:scale-105 transition-transform duration-500">
                            <img
                              src={getImageUrl(booking.image_url, 'service', booking.id)}
                              alt={booking.service_name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 right-2">
                              {getStatusBadge(booking.status)}
                            </div>
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <Store className="w-3.5 h-3.5 text-accent" />
                              <p className="text-[11px] font-black uppercase text-accent tracking-widest truncate">{booking.salon_name}</p>
                            </div>
                            <h3 className="text-xl md:text-2xl font-black text-slate-900 truncate tracking-tight">{booking.service_name}</h3>
                            <div className="flex items-center gap-2 text-slate-400 mt-1.5">
                              <MapPin className="w-4 h-4 flex-shrink-0" />
                              <p className="text-sm font-medium truncate">{booking.salon_address}{booking.salon_city ? `, ${booking.salon_city}` : ''}</p>
                            </div>
                          </div>
                        </div>

                        {/* 2. Date & Time Pill */}
                        <div className="flex-shrink-0 bg-slate-50 border border-slate-100/50 rounded-3xl px-8 py-4 flex items-center gap-8 justify-center lg:justify-start">
                          <div className="text-center">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Session Date</p>
                            <p className="text-lg font-black text-slate-800">{format(new Date(booking.booking_date), "MMM dd")}</p>
                          </div>
                          <div className="w-px h-8 bg-slate-200" />
                          <div className="text-center">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Start Time</p>
                            <p className="text-lg font-black text-slate-800">{booking.booking_time.slice(0, 5)}</p>
                          </div>
                        </div>

                        {/* 3. Price & Actions */}
                        <div className="flex items-center justify-between lg:justify-end gap-6 flex-shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                          <div className="text-right">
                            <p className="text-3xl font-black text-slate-900 tracking-tight">MYR {Number(booking.price || 0).toFixed(2)}</p>
                            {Number(booking.discount_amount || 0) > 0 && (
                              <div className="flex flex-col items-end gap-0.5 mt-1">
                                <span className="text-xs font-bold text-slate-400 line-through">
                                  MYR {Number(booking.original_price || booking.service_price || (Number(booking.price || 0) + Number(booking.discount_amount || 0))).toFixed(2)}
                                </span>
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[10px] font-black uppercase px-2 py-0.5">
                                  -MYR {Number(booking.discount_amount).toFixed(2)} OFF {booking.coupon_code ? `(${booking.coupon_code})` : ''}
                                </Badge>
                              </div>
                            )}
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right mt-1">{booking.duration_minutes} MINS</p>
                          </div>

                          <div className="flex items-center gap-3">
                            {booking.status === 'completed' && (
                              <div className="flex flex-col gap-2">
                                {!reviewedBookings.has(booking.id) && (
                                  <Button
                                    onClick={() => {
                                      setReviewDialog({ isOpen: true, booking, isEditing: false });
                                      setRating(5);
                                      setComment("");
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl h-11 px-6 shadow-lg shadow-blue-600/20"
                                  >
                                    <MessageSquare className="w-4 h-4 mr-2" /> Leave Feedback
                                  </Button>
                                )}
                                <Button
                                  asChild
                                  variant="outline"
                                  className="h-11 rounded-2xl font-bold border-slate-200 text-slate-600"
                                >
                                  <Link to={`/my-bookings/${booking.id}/treatment`}>
                                    <FileText className="w-4 h-4 mr-2" /> View Clinical Details
                                  </Link>
                                </Button>
                              </div>
                            )}

                            {reviewedBookings.has(booking.id) && (
                              <Button
                                variant="secondary"
                                onClick={async () => {
                                  try {
                                    const res = await api.bookings.getReview(booking.id);
                                    if (res?.review) {
                                      setRating(res.review.rating);
                                      setComment(res.review.comment);
                                      setReviewDialog({ isOpen: true, booking, isEditing: true });
                                    }
                                  } catch (e) {
                                    console.error("Failed to fetch review", e);
                                  }
                                }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold h-12 px-5 rounded-2xl"
                              >
                                <Star className="w-4 h-4 mr-2 text-amber-500 fill-amber-500" /> My Review
                              </Button>
                            )}

                            {(booking.status === 'pending' || booking.status === 'confirmed') && (
                              <Button
                                variant="outline"
                                onClick={() => setCancelDialog({ isOpen: true, bookingId: booking.id })}
                                className="h-12 border-2 border-red-50 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-100 rounded-2xl font-bold px-6 transition-colors"
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      {(() => {
                        const cleanNote = getCleanStylistNote(booking.notes);
                        if (!cleanNote) return null;
                        return (
                          <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 italic text-xs text-slate-500 font-medium">
                            Note for Stylist: {cleanNote}
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          ) : (
            orders.length === 0 ? (
              <Card className="border-none shadow-sm bg-white rounded-[3rem] py-20 text-center space-y-4">
                <Package className="w-20 h-20 bg-slate-50 rounded-3xl p-5 mx-auto text-slate-300" />
                <div>
                  <h3 className="text-xl font-bold text-slate-900">No orders found</h3>
                  <p className="text-slate-400 font-medium">You haven't placed any orders yet.</p>
                </div>
                <Link to="/shop">
                  <Button variant="outline" className="mt-4 rounded-xl">Go Shopping</Button>
                </Link>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <Card key={order.id} className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden group hover:shadow-xl transition-all">
                    <CardContent className="p-0">
                      <div className="p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                            <Package className="w-8 h-8" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-[#1A1A1A]">Order #{order.id.slice(0, 8)}</h3>
                            <p className="text-slate-400 text-sm">{new Date(order.created_at).toLocaleDateString()}</p>
                            <div className="mt-2">
                              {getOrderStatusBadge(order.status)}
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 lg:max-w-md">
                          <div className="space-y-1">
                            {Array.isArray(order.items) && order.items.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="text-slate-600">{item.name} x{item.quantity}</span>
                                <span className="font-bold">MYR {(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>MYR {parseFloat(order.total_amount).toFixed(2)}</span>
                          </div>
                        </div>

                        <div>
                          {/* Use specific icons later */}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Review Dialog ... */}
      <Dialog open={reviewDialog.isOpen} onOpenChange={(open) => !open && setReviewDialog({ isOpen: false, booking: null })}>
        <DialogContent className="rounded-[3rem] border-none shadow-2xl p-10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black text-slate-900 tracking-tighter">Session Feedback</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium text-lg">
              How was your experience with {reviewDialog.booking?.service_name} at {reviewDialog.booking?.salon_name}?
            </DialogDescription>
          </DialogHeader>

          <div className="py-8 space-y-8">
            <div className="space-y-4">
              <Label className="text-sm font-black uppercase tracking-widest text-slate-400">Experience Rating</Label>
              <div className="flex gap-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${rating >= star ? 'bg-amber-100 text-amber-500 scale-110 shadow-lg shadow-amber-500/10' : 'bg-slate-50 text-slate-300'
                      }`}
                  >
                    <Star className={`w-7 h-7 ${rating >= star ? 'fill-current' : ''}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-black uppercase tracking-widest text-slate-400">Your Comments</Label>
              <Textarea
                placeholder="Details about your visit (service quality, environment, etc.)..."
                className="bg-slate-50 border-none rounded-[2rem] p-6 min-h-[160px] focus-visible:ring-blue-500 transition-all font-medium text-slate-700"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-between gap-4">
            <Button variant="ghost" onClick={() => setReviewDialog({ isOpen: false, booking: null })} className="font-bold text-slate-400 h-14 px-8 rounded-2xl">Skip for now</Button>
            <Button
              onClick={handleReviewSubmit}
              disabled={submittingReview}
              className="bg-slate-900 hover:bg-black text-white font-black h-14 px-10 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              {submittingReview ? <Loader2 className="w-5 h-5 animate-spin" /> : "Publish Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialog.isOpen} onOpenChange={(open) => !open && setCancelDialog({ isOpen: false, bookingId: null })}>
        <DialogContent className="rounded-[3rem] border-none shadow-2xl p-10 max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 mx-auto">Cancel Appointment</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium mt-2">
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-6 sm:justify-center">
            <Button variant="outline" onClick={() => setCancelDialog({ isOpen: false, bookingId: null })} className="h-12 rounded-2xl font-bold w-full sm:w-auto">Keep It</Button>
            <Button onClick={confirmCancel} variant="destructive" className="h-12 rounded-2xl font-bold w-full sm:w-auto">Yes, Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>

  );
};

export default MyBookings;
