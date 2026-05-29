import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { adminAPI } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Search, 
  Filter,
  Download,
  Calendar,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface VendorEarning {
  id: string;
  vendor: {
    id: string;
    email: string;
    store_name: string;
  };
  order_item: {
    id: string;
    order: {
      id: string;
      created_at: string;
    };
    product: {
      name: string;
    };
  };
  amount: number;
  status: 'pending' | 'processing' | 'paid' | 'cancelled';
  payout_date?: string;
  payout_reference?: string;
  admin_note?: string;
  created_at: string;
}

const VendorEarnings = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEarnings, setSelectedEarnings] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: earnings, isLoading } = useQuery<VendorEarning[]>({
    queryKey: ['vendor-earnings', searchTerm, statusFilter],
    queryFn: async () => {
      const response = await adminAPI.getVendorEarnings({ 
        search: searchTerm, 
        status: statusFilter 
      });
      return response.data;
    },
  });

  const processPayoutMutation = useMutation({
    mutationFn: async ({ earningIds, action }: { earningIds: string[], action: 'approve' | 'reject' }) => {
      return adminAPI.processVendorPayouts(earningIds, action);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-earnings'] });
      setSelectedEarnings([]);
      toast({
        title: 'Success',
        description: 'Payouts Completed successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to process payouts',
        variant: 'destructive',
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalPendingAmount = earnings?.filter(e => e.status === 'pending')
    .reduce((sum, e) => sum + e.amount, 0) || 0;

  const totalProcessingAmount = earnings?.filter(e => e.status === 'processing')
    .reduce((sum, e) => sum + e.amount, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Vendor Earnings</h1>
          <p className="text-muted-foreground">Manage vendor payouts and earnings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="bg-gradient-to-br from-orange-600 to-red-600/95 backdrop-blur-sm text-white border-2 border-orange-500/40 shadow-2xl hover:shadow-3xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Pending Payouts</p>
                <p className="text-2xl font-bold">${totalPendingAmount.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700/95 backdrop-blur-sm text-white border-2 border-emerald-500/40 shadow-2xl hover:shadow-3xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Processing</p>
                <p className="text-2xl font-bold">${totalProcessingAmount.toFixed(2)}</p>
              </div>
              <Clock className="h-8 w-8 text-emerald-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-600 to-green-700/95 backdrop-blur-sm text-white border-2 border-green-500/40 shadow-2xl hover:shadow-3xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Vendors</p>
                <p className="text-2xl font-bold">{new Set(earnings?.map(e => e.vendor.id)).size || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-violet-600 to-purple-700/95 backdrop-blur-sm text-white border-2 border-violet-500/40 shadow-2xl hover:shadow-3xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-violet-100 text-sm font-medium">This Month</p>
                <p className="text-2xl font-bold">${earnings?.reduce((sum, e) => sum + e.amount, 0).toFixed(2) || '0.00'}</p>
              </div>
              <Calendar className="h-8 w-8 text-violet-200" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedEarnings.length > 0 && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => processPayoutMutation.mutate({ 
                    earningIds: selectedEarnings, 
                    action: 'approve' 
                  })}
                  disabled={processPayoutMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve ({selectedEarnings.length})
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => processPayoutMutation.mutate({ 
                    earningIds: selectedEarnings, 
                    action: 'reject' 
                  })}
                  disabled={processPayoutMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject ({selectedEarnings.length})
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Earnings List */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Earnings</CardTitle>
          <CardDescription>
            Manage and process vendor payouts
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : earnings?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No earnings found</p>
            </div>
          ) : (
            <div className="divide-y">
              {earnings?.map((earning) => (
                <div key={earning.id} className="p-4 hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selectedEarnings.includes(earning.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEarnings([...selectedEarnings, earning.id]);
                          } else {
                            setSelectedEarnings(selectedEarnings.filter(id => id !== earning.id));
                          }
                        }}
                        className="rounded"
                      />
                      <div>
                        <p className="font-medium">{earning.vendor.store_name || earning.vendor.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Order #{earning.order_item.order.id} • {earning.order_item.product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(earning.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">${earning.amount.toFixed(2)}</p>
                      <Badge className={getStatusColor(earning.status)}>
                        {earning.status}
                      </Badge>
                      {earning.payout_reference && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Ref: {earning.payout_reference}
                        </p>
                      )}
                    </div>
                  </div>
                  {earning.admin_note && (
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      <strong>Admin Note:</strong> {earning.admin_note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorEarnings;
