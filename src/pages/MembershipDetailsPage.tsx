import { useNavigate, Link } from "react-router-dom";
import {
    CircleDollarSign,
    UserPlus,
    Instagram,
    Smartphone,
    MessageSquare,
    Gift,
    ArrowRight
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

const MembershipDetailsPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const redeemVouchers = [
        { title: "RM25 OFF", points: "500 Points" },
        { title: "RM50 OFF", points: "1000 Points" },
        { title: "RM75 OFF", points: "1500 Points" },
        { title: "RM100 OFF", points: "2000 Points" },
    ];

    const earnPoints = [
        { icon: CircleDollarSign, points: "+1 Point", action: "RM1 Spent" },
        { icon: UserPlus, points: "+200 Points", action: "Refer a Friend" },
        { icon: Instagram, points: "+50 Points", action: "Like & Follow Instagram" },
        { icon: Smartphone, points: "+50 Points", action: "Like & Follow Rednote" },
        { icon: MessageSquare, points: "+100 Points", action: "Write a Review" },
        { icon: Gift, points: "+150 Bonus Points", action: "Spend over RM1000" },
    ];

    return (
        <div className="min-h-screen bg-background pb-12">
            <Navbar />



            {/* Welcome Section */}
            <section className="py-8 px-4 text-center max-w-3xl mx-auto mt-20">
                <Badge className="mb-6 bg-accent/10 text-accent border-accent/20 px-4 py-1.5 text-sm">
                    Become a Member
                </Badge>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent leading-tight">
                    Welcome to Our<br />Membership Rewards
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                    Earn points with every treatment and product purchase.<br />Enjoy exclusive rewards as a valued member.
                </p>

                <Link to={user ? "/dashboard" : "/signup"}>
                    <Button size="lg" className="bg-accent hover:bg-accent/90 text-white px-10 py-6 text-lg rounded-xl shadow-xl shadow-accent/20 transition-all hover:-translate-y-1">
                        {user ? "View My Membership" : "Become a Member"}
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                </Link>

                <div className="w-full max-w-md mx-auto h-px bg-border mt-16"></div>
            </section>

            {/* Redeem Rewards */}
            <section className="py-16 px-4">
                <div className="container mx-auto max-w-5xl text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-12">
                        Redeem Rewards
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                        {redeemVouchers.map((voucher, i) => (
                            <div
                                key={i}
                                className="border border-border rounded-2xl py-10 px-4 flex flex-col items-center justify-center bg-card shadow-sm transition-all hover:shadow-md hover:border-accent/40"
                            >
                                <h3 className="text-lg font-bold mb-2 text-foreground">{voucher.title}</h3>
                                <p className="text-sm text-muted-foreground font-medium">{voucher.points}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="w-full max-w-md mx-auto h-px bg-border mt-20"></div>
            </section>

            {/* How to Earn Points */}
            <section className="py-16 px-4">
                <div className="container mx-auto max-w-5xl text-center flex flex-col items-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-16 text-center">
                        How to Earn Points
                    </h2>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-16 gap-x-8 md:gap-x-16 place-items-center w-full max-w-4xl">
                        {earnPoints.map((item, i) => (
                            <div key={i} className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-6 text-accent">
                                    <item.icon className="w-8 h-8" strokeWidth={1.5} />
                                </div>
                                <h3 className="text-lg font-bold mb-2 text-foreground">{item.points}</h3>
                                <p className="text-sm text-muted-foreground text-center max-w-[150px] font-medium">{item.action}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="max-w-4xl mx-auto px-4 mt-8 mb-16">
                <div className="w-full h-px bg-border"></div>
            </div>

            {/* Membership Terms */}
            <section className="py-8 px-4">
                <div className="max-w-3xl mx-auto bg-muted/30 rounded-3xl p-8 md:p-12 border border-border">
                    <h2 className="text-2xl font-bold mb-8 text-foreground">
                        Membership Terms
                    </h2>
                    <ul className="space-y-4 text-base text-muted-foreground font-medium leading-relaxed list-disc pl-5 marker:text-accent">
                        <li>Membership is complimentary and begins after the first treatment visit.</li>
                        <li>Reward points are valid for 12 months from the last visit.</li>
                        <li>Points are earned from single treatments and retail product purchases only.</li>
                        <li>Package purchases, promotional treatments and discounted services are not eligible for points.</li>
                        <li>Points may be redeemed starting from 500 points.</li>
                        <li>Points may cover up to 30% of the purchase value.</li>
                        <li>Bonus points may be awarded for selected spending tiers or promotions.</li>
                        <li>Social media rewards (follow, like, review) are limited to once per account.</li>
                        <li>Referred friend points are awarded once the referred client completes their first treatment.</li>
                        <li>The management reserves the right to modify the membership program when necessary.</li>
                    </ul>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-16 px-4 mb-8">
                <div className="container mx-auto text-center max-w-3xl bg-accent/5 rounded-3xl p-12 border border-accent/10 shadow-lg">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Join Us?</h2>
                    <p className="text-lg text-muted-foreground mb-8">
                        Sign up today to start earning rewards for your everyday skincare.
                    </p>
                    <div className="flex justify-center">
                        <Link to={user ? "/dashboard" : "/signup"}>
                            <Button size="lg" className="bg-accent hover:bg-accent/90 text-white px-10 py-6 text-lg rounded-xl shadow-xl shadow-accent/20 transition-all hover:-translate-y-1">
                                {user ? "View My Membership" : "Become a Member"}
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>


            <Footer />
        </div>
    );
};

export default MembershipDetailsPage;
