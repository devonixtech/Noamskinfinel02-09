import { useEffect, useState } from "react";
import { ResponsiveDashboardLayout } from "@/components/dashboard/ResponsiveDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Gift,
  Plus,
  Percent,
  Calendar,
  Users,
  TrendingUp,
  Tag,
  Clock,
  Star,
  Edit,
  Trash2,
  Loader2
} from "lucide-react";
import { useSalon } from "@/hooks/useSalon";
import { useAuth } from "@/hooks/useAuth";
import api from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Offer {
  id: string;
  salon_id: string;
  title: string;
  description: string | null;
  code: string;
  type: 'percentage' | 'fixed' | 'bogo';
  value: number;
  max_usage: number | null;
  usage_count: number;
  status: 'active' | 'inactive' | 'expired';
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

const OffersPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { currentSalon, loading: salonLoading, isOwner, isManager } = useSalon();

  const [activeTab, setActiveTab] = useState("active");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [isRedemptionsDialogOpen, setIsRedemptionsDialogOpen] = useState(false);
  const [viewingOffer, setViewingOffer] = useState<Offer | null>(null);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    code: "",
    type: "percentage" as 'percentage' | 'fixed' | 'bogo',
    value: "",
    max_usage: "",
    start_date: "",
    end_date: "",
    status: "active" as 'active' | 'inactive' | 'expired'
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  const fetchOffers = async () => {
    if (!currentSalon) {
      if (!salonLoading) setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await api.offers.getBySalon(currentSalon.id, true);
      const normalized: Offer[] = (Array.isArray(response) ? response : []).map((o: any) => {
        const isExpired = o.end_date && new Date(o.end_date) < new Date(Date.now() - 24 * 60 * 60 * 1000);
        const isMaxedOut = o.max_uses != null && o.used_count != null && o.used_count >= o.max_uses;
        const status: 'active' | 'inactive' | 'expired' = (o.is_active === false) ? 'inactive' : (isExpired || isMaxedOut) ? 'expired' : 'active';

        return {
          id: o.id,
          salon_id: o.salon_id,
          title: o.name || o.title || 'Special Offer',
          description: o.description || null,
          code: o.code || '',
          type: (o.discount_type || o.type || 'percentage') as any,
          value: Number(o.discount_value !== undefined ? o.discount_value : (o.value || 0)),
          max_usage: o.max_uses !== undefined ? o.max_uses : (o.max_usage || null),
          usage_count: Number(o.used_count !== undefined ? o.used_count : (o.usage_count || 0)),
          status,
          start_date: o.start_date || null,
          end_date: o.end_date || null,
          created_at: o.created_at || new Date().toISOString()
        };
      });
      setOffers(normalized);
    } catch (error) {
      console.error("Error fetching offers:", error);
      toast({
        title: "Error",
        description: "Failed to load offers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [currentSalon]);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      code: "",
      type: "percentage",
      value: "",
      max_usage: "",
      start_date: "",
      end_date: "",
      status: "active"
    });
    setEditingOffer(null);
  };

  const handleViewRedemptions = async (offer: Offer) => {
    setViewingOffer(offer);
    setIsRedemptionsDialogOpen(true);
    setLoadingRedemptions(true);
    try {
      const data = await api.offers.getRedemptions(offer.id);
      setRedemptions(data || []);
    } catch (error) {
      console.error("Error fetching redemptions:", error);
      toast({
        title: "Error",
        description: "Failed to load redemptions",
        variant: "destructive",
      });
    } finally {
      setLoadingRedemptions(false);
    }
  };

  const handleSaveOffer = async () => {
    if (!currentSalon || !formData.title || !formData.code) return;

    setSaving(true);
    try {
      const offerData = {
        name: formData.title,
        title: formData.title,
        description: formData.description || null,
        code: formData.code.trim().toUpperCase(),
        discount_type: formData.type,
        type: formData.type,
        discount_value: parseFloat(formData.value) || 0,
        value: parseFloat(formData.value) || 0,
        salon_id: currentSalon.id,
        max_uses: formData.max_usage ? parseInt(formData.max_usage) : null,
        max_usage: formData.max_usage ? parseInt(formData.max_usage) : null,
        is_active: formData.status === 'active',
        status: formData.status,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null
      };

      if (editingOffer) {
        await api.offers.update(editingOffer.id, offerData);
        toast({ title: "Success", description: "Offer updated successfully" });
      } else {
        await api.offers.create(offerData);
        toast({ title: "Success", description: "Offer created successfully" });
      }

      setIsAddDialogOpen(false);
      resetForm();
      fetchOffers();
    } catch (error: any) {
      console.error("Error saving offer:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save offer",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this offer?")) return;

    try {
      await api.offers.delete(id);
      toast({ title: "Success", description: "Offer deleted" });
      fetchOffers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const openEditDialog = (offer: Offer) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title,
      description: offer.description || "",
      code: offer.code,
      type: offer.type,
      value: offer.value.toString(),
      max_usage: offer.max_usage?.toString() || "",
      start_date: offer.start_date ? new Date(offer.start_date).toISOString().split('T')[0] : "",
      end_date: offer.end_date ? new Date(offer.end_date).toISOString().split('T')[0] : "",
      status: offer.status
    });
    setIsAddDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-sage/20 text-sage border-0">Active</Badge>;
      case "expired":
        return <Badge variant="secondary">Expired</Badge>;
      case "inactive":
        return <Badge variant="outline">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getOfferTypeIcon = (type: string) => {
    switch (type) {
      case "percentage":
        return <Percent className="w-5 h-5 text-accent" />;
      case "fixed":
        return <Tag className="w-5 h-5 text-accent" />;
      case "bogo":
        return <Gift className="w-5 h-5 text-accent" />;
      default:
        return <Gift className="w-5 h-5 text-accent" />;
    }
  };

  const activeOffers = offers.filter(offer => offer.status === "active");
  const expiredAndInactive = offers.filter(offer => offer.status !== "active");

  const stats = [
    {
      title: "Active Offers",
      value: activeOffers.length.toString(),
      icon: Gift
    },
    {
      title: "Total Redemptions",
      value: offers.reduce((acc, o) => acc + (o.usage_count || 0), 0).toString(),
      icon: Tag
    },
    {
      title: "Total Offers",
      value: offers.length.toString(),
      icon: TrendingUp
    },
    {
      title: "Top Performer",
      value: offers.length > 0 ? offers.sort((a, b) => b.usage_count - a.usage_count)[0].code : "None",
      icon: Percent
    }
  ];

  if (authLoading || salonLoading) {
    return (
      <ResponsiveDashboardLayout showBackButton={true}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </ResponsiveDashboardLayout>
    );
  }

  return (
    <ResponsiveDashboardLayout
      showBackButton={true}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Offers & Promotions</h1>
            <p className="text-muted-foreground">
              Create and manage promotional offers for your salon
            </p>
          </div>
          {(isOwner || isManager) && (
            <Button
              onClick={() => { resetForm(); setIsAddDialogOpen(true); }}
              className="bg-[#55402f] hover:bg-[#433225] text-white gap-2 shadow-md"
            >
              <Plus className="w-4 h-4" />
              Create Offer
            </Button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="border-border shadow-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">Active Offers</TabsTrigger>
            <TabsTrigger value="inactive">Expired & Inactive</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            <Card className="border-border shadow-card">
              <CardHeader>
                <CardTitle>Active Promotional Offers</CardTitle>
                <CardDescription>
                  Currently running offers and promotions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin text-accent" /></div>
                ) : activeOffers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No active offers found.</div>
                ) : (
                  <div className="space-y-4">
                    {activeOffers.map((offer) => (
                      <div
                        key={offer.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                            {getOfferTypeIcon(offer.type || offer.discount_type)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{offer.title}</p>
                            <p className="text-sm text-muted-foreground">{offer.description}</p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-xs text-muted-foreground font-bold">
                                Code: {offer.code}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Used: {offer.usage_count}/{offer.max_usage || "∞"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-medium text-foreground">
                              {(offer.type || offer.discount_type) === "percentage" ? `${(offer.value || offer.discount_value)}% OFF` :
                                (offer.type || offer.discount_type) === "fixed" ? `MYR ${(offer.value || offer.discount_value)} OFF` : "BOGO"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Expires: {offer.end_date ? new Date(offer.end_date).toLocaleDateString() : "Never"}
                            </p>
                          </div>
                          {getStatusBadge(offer.status)}
                          {(isOwner || isManager) && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewRedemptions(offer)}
                                className="h-9 w-9 rounded-xl hover:bg-accent hover:text-white transition-all duration-300 active:scale-95"
                              >
                                <Users className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(offer)}
                                className="h-9 w-9 rounded-xl hover:bg-slate-900 hover:text-white transition-all duration-300 active:scale-95"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive hover:text-white transition-all duration-300 active:scale-95"
                                onClick={() => handleDeleteOffer(offer.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inactive" className="space-y-4">
            <Card className="border-border shadow-card">
              <CardHeader>
                <CardTitle>Inactive & Expired Offers</CardTitle>
                <CardDescription>
                  Previously run or disabled promotional campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin text-accent" /></div>
                ) : expiredAndInactive.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No inactive offers found.</div>
                ) : (
                  <div className="space-y-4">
                    {expiredAndInactive.map((offer) => (
                      <div
                        key={offer.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 opacity-75"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                            {getOfferTypeIcon(offer.type || offer.discount_type)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{offer.title}</p>
                            <p className="text-sm text-muted-foreground">{offer.description}</p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-xs text-muted-foreground">
                                Code: {offer.code}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Final Usage: {offer.usage_count}/{offer.max_usage || "∞"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-medium text-muted-foreground">
                              {(offer.type || offer.discount_type) === "percentage" ? `${(offer.value || offer.discount_value)}% OFF` :
                                (offer.type || offer.discount_type) === "fixed" ? `MYR ${(offer.value || offer.discount_value)} OFF` : "BOGO"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              End Date: {offer.end_date ? new Date(offer.end_date).toLocaleDateString() : "Never"}
                            </p>
                          </div>
                          {getStatusBadge(offer.status)}
                          {(isOwner || isManager) && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewRedemptions(offer)}
                                className="h-9 w-9 rounded-xl hover:bg-accent hover:text-white transition-all duration-300 active:scale-95"
                              >
                                <Users className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(offer)}
                                className="h-9 w-9 rounded-xl hover:bg-slate-900 hover:text-white transition-all duration-300 active:scale-95"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive hover:text-white transition-all duration-300 active:scale-95"
                                onClick={() => handleDeleteOffer(offer.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Top Performing Offers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {offers.sort((a, b) => b.usage_count - a.usage_count).slice(0, 5).map((offer, index) => (
                      <div key={offer.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-accent">{index + 1}</span>
                          </div>
                          <span className="text-sm font-medium">{offer.title} ({offer.code})</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {offer.usage_count} uses
                        </span>
                      </div>
                    ))}
                    {offers.length === 0 && <p className="text-center text-muted-foreground">No data available</p>}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Offer Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Success Rate</span>
                      <span className="text-sm font-bold">High</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Potential Savings</span>
                      <span className="text-sm font-bold">Dynamic</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Create/Edit Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingOffer ? "Edit Offer" : "Create New Offer"}</DialogTitle>
              <DialogDescription>
                Fill in the details for your promotional offer.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Offer Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Summer Special"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Promo Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER20"
                  maxLength={20}
                  className="font-mono font-bold text-accent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Details about the offer..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Offer Type</Label>
                  <Select value={formData.type} onValueChange={(v: any) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                      <SelectItem value="bogo">BOGO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value">Value {formData.type === 'percentage' ? '(%)' : formData.type === 'fixed' ? '(MYR)' : ''}</Label>
                  <Input
                    id="value"
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    disabled={formData.type === 'bogo'}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_usage">Max Usage (Optional)</Label>
                  <Input
                    id="max_usage"
                    type="number"
                    value={formData.max_usage}
                    onChange={(e) => setFormData({ ...formData, max_usage: e.target.value })}
                    placeholder="Unlimited"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveOffer} disabled={saving}>
                {saving ? <Loader2 className="animate-spin mr-2" /> : null}
                {editingOffer ? "Update Offer" : "Create Offer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Redemptions Dialog */}
        <Dialog open={isRedemptionsDialogOpen} onOpenChange={setIsRedemptionsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Redemption History: {viewingOffer?.title}</DialogTitle>
              <DialogDescription>
                Specific customers who have used the code: <span className="font-mono font-bold text-accent">{viewingOffer?.code}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              {loadingRedemptions ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-accent" /></div>
              ) : redemptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground bg-accent/5 rounded-xl border border-dashed border-accent/20">
                  No redemptions tracked specifically for this code yet.
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {redemptions.map((r, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-secondary/40 border border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold">
                          {r.customer_name?.charAt(0) || "U"}
                        </div>
                        <div>
                          <p className="font-bold text-sm tracking-tight">{r.customer_name || "Unknown User"}</p>
                          <p className="text-[11px] text-muted-foreground">{r.customer_email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-accent tracking-widest uppercase">MYR {parseFloat(r.discount_amount).toFixed(2)} OFF</p>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                          Used on {new Date(r.booking_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="sm:justify-start">
              <div className="w-full flex justify-between items-center text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">
                <span>Total: {redemptions.length} Used</span>
                <Button variant="outline" size="sm" onClick={() => setIsRedemptionsDialogOpen(false)} className="rounded-full px-6">Close</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ResponsiveDashboardLayout>
  );
};

export default OffersPage;
