import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/ui/navigation";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Search, Package, Eye } from "lucide-react";

interface Booking {
  id: string;
  ref_id: string;
  origin: string;
  destination: string;
  pieces: number;
  weight_kg: number;
  status: string;
  created_at: string;
}

export default function SearchBooking() {
  const [searchTerm, setSearchTerm] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchAllBookings();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const fetchAllBookings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const searchBookings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      fetchAllBookings();
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .or(`ref_id.ilike.%${searchTerm}%,origin.ilike.%${searchTerm}%,destination.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
      
      if (data?.length === 0) {
        toast({
          title: "No Results",
          description: "No bookings found matching your search criteria.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to search bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BOOKED': return 'bg-blue-500';
      case 'DEPARTED': return 'bg-yellow-500';
      case 'ARRIVED': return 'bg-orange-500';
      case 'DELIVERED': return 'bg-green-500';
      case 'CANCELLED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Search Bookings</h1>
          <p className="text-muted-foreground">Find and track your cargo shipments</p>
        </div>

        {/* Search Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Search Bookings</span>
            </CardTitle>
            <CardDescription>
              Search by booking reference, origin, or destination
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={searchBookings} className="flex space-x-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="search">Search Term</Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="Enter booking ref, origin, or destination..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-end space-x-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Searching..." : "Search"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    setSearched(false);
                    fetchAllBookings();
                  }}
                >
                  Clear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{searched ? "Search Results" : "All Bookings"}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Searching...</p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searched ? "No bookings found" : "No bookings yet"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searched 
                    ? "Try adjusting your search criteria" 
                    : "Create your first booking to get started"
                  }
                </p>
                {!searched && (
                  <Button asChild>
                    <Link to="/create-booking">Create Booking</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-6">
                      <div>
                        <p className="font-semibold text-lg">{booking.ref_id}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(booking.created_at)}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="text-center">
                          <p className="font-medium">{booking.origin}</p>
                          <p className="text-muted-foreground">Origin</p>
                        </div>
                        <div className="text-muted-foreground">→</div>
                        <div className="text-center">
                          <p className="font-medium">{booking.destination}</p>
                          <p className="text-muted-foreground">Destination</p>
                        </div>
                      </div>
                      
                      <div className="text-sm">
                        <p className="font-medium">{booking.pieces} pieces</p>
                        <p className="text-muted-foreground">{booking.weight_kg} kg</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/booking/${booking.ref_id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}