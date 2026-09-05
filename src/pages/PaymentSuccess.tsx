import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, ArrowRight, Calendar, User, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { api } from '@/services/api';

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const bookingId = searchParams.get('booking_id') || searchParams.get('reference');
    const billcode = searchParams.get('billcode');
    const statusId = searchParams.get('status_id');
    const type = searchParams.get('type');

    const isSuccess = !statusId || statusId === '1';
    const [verifying, setVerifying] = useState(false);
    const [verified, setVerified] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);

        if (isSuccess && type === 'order') {
            try {
                localStorage.removeItem('cart');
                localStorage.removeItem('salon_cart');
                window.dispatchEvent(new Event('cart-updated'));
            } catch (e) {}
        }

        if (isSuccess && billcode && !verified) {
            setVerifying(true);
            api.toyyibpay.verifyPayment({ billcode, reference: bookingId || undefined })
                .then((res: any) => {
                    if (res?.status === 'completed' || res?.status === 'already_completed') {
                        setVerified(true);
                        if (type === 'order') {
                            try {
                                localStorage.removeItem('cart');
                                localStorage.removeItem('salon_cart');
                                window.dispatchEvent(new Event('cart-updated'));
                            } catch (e) {}
                        }
                    }
                })
                .catch((err: any) => {
                    console.error('Payment verification failed:', err);
                })
                .finally(() => {
                    setVerifying(false);
                });
        }
    }, [isSuccess, billcode, bookingId, verified, type]);

    return (
        <div className="min-h-screen bg-[#F3EEEA]">
            <Navbar />

            <main className="container mx-auto px-4 max-w-3xl pt-32 pb-20 text-center">
                <div className="bg-white rounded-[2.5rem] p-12 shadow-sm border border-[#1A1A1A]/5 mt-10">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 animate-in zoom-in duration-500 ${isSuccess ? 'bg-green-100' : 'bg-red-100'}`}>
                        {isSuccess ? (
                            <CheckCircle className="w-12 h-12 text-green-600" />
                        ) : (
                            <XCircle className="w-12 h-12 text-red-600" />
                        )}
                    </div>

                    <h1 className="text-4xl font-['DM_Serif_Display'] text-[#1A1A1A] mb-4">
                        {isSuccess ? "Payment Successful!" : "Payment Failed!"}
                    </h1>
                    <p className="text-xl text-slate-500 font-medium mb-2">
                        {isSuccess ? "Your transaction has been processed successfully." : "Your transaction could not be processed or was cancelled."}
                    </p>

                    {verifying && (
                        <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-50 rounded-full border border-blue-100">
                            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                            <span className="text-sm font-medium text-blue-600">Verifying your payment...</span>
                        </div>
                    )}

                    {bookingId && (
                        <div className="inline-block mt-4 px-6 py-2 bg-slate-50 rounded-full border border-slate-100">
                            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest mr-2">Reference:</span>
                            <span className="text-sm font-black text-slate-900">#{bookingId}</span>
                        </div>
                    )}

                    {isSuccess ? (
                        <div className="mt-12 p-8 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 text-left space-y-4">
                            <p className="text-sm text-slate-500 leading-relaxed italic">
                                {verified
                                    ? (type === 'order'
                                        ? "Your payment has been verified and your order is confirmed! Check your dashboard for updates."
                                        : "Your payment has been verified and your booking is confirmed! Check your dashboard for details.")
                                    : (type === 'order'
                                        ? "Your order transaction has been recorded. We have sent a confirmation email with all details."
                                        : "Your session has been logged in our system. We have sent a confirmation email with all the details of your appointment.")
                                }
                            </p>
                            <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-tight">
                                <Calendar className="w-4 h-4" />
                                <span>Check your activity history for details</span>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-12 p-8 bg-red-50/50 rounded-3xl border border-dashed border-red-200 text-left space-y-4">
                            <p className="text-sm text-red-500/80 leading-relaxed italic font-medium">
                                {type === 'order'
                                    ? "We could not complete your order because the payment was cancelled or failed. Please try again or choose another payment method."
                                    : "We could not complete your booking because the payment failed. Please try again or choose another payment method."}
                            </p>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
                        {isSuccess ? (
                            <Button asChild className="h-14 px-8 rounded-full bg-[#1A1A1A] text-white hover:bg-black font-bold text-lg">
                                <Link to={type === 'order' ? "/my-bookings?tab=orders" : "/my-bookings"} className="flex items-center gap-2">
                                    {type === 'order' ? "View My Orders" : "View My Bookings"} <ArrowRight className="w-5 h-5" />
                                </Link>
                            </Button>
                        ) : (
                            <Button asChild className="h-14 px-8 rounded-full bg-[#1A1A1A] text-white hover:bg-black font-bold text-lg">
                                <Link to={type === 'order' ? "/checkout" : "/book"} className="flex items-center gap-2">
                                    Try Again <RefreshCw className="w-5 h-5" />
                                </Link>
                            </Button>
                        )}
                        <Button asChild variant="outline" className="h-14 px-8 rounded-full border-slate-200 text-[#1A1A1A] font-bold text-lg hover:bg-slate-50">
                            <Link to="/">Return Home</Link>
                        </Button>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default PaymentSuccess;
