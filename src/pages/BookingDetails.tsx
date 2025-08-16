import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/ui/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  MapPin, 
  Weight, 
  Hash, 
  Clock, 
  CheckCircle, 
  Plane, 
  AlertCircle,
  Truck
} from "lucide-react";

interface Booking {
  id: string;
  ref_id: string;
  origin: string;
  destination: string;
  pieces: number;
  weight_kg: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface BookingEvent {
  id: string;
  event_type: string;
  location: string;
  notes: string;
  created_at: string;
  flight_id: string;
}

export default function BookingDetails() {
  const { refId } = useParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [events, setEvents] = useState<BookingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (refId) {
      fetchBookingDetails();
    }
  }, [refId]);

  const fetchBookingDetails = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-booking-history', {
        body: { ref_id: refId },
      });

      if (error) throw error;

      setBooking(data.booking);
      setEvents(data.events || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch booking details",
        variant: "destructive",
      });
      navigate('/search');
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (newStatus: string, location?: string, notes?: string) => {
    if (!booking) return;

    setUpdating(true);
    try {
      const { error } = await supabase.functions.invoke('update-booking-status', {
        body: {
          ref_id: booking.ref_id,
          status: newStatus,
          location,
          notes,
        },
      });

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Booking status updated to ${newStatus}`,
      });

      fetchBookingDetails(); // Refresh data
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update booking status",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
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

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'CREATED': return <Package className="h-4 w-4" />;
      case 'DEPARTED': return <Plane className="h-4 w-4" />;
      case 'ARRIVED': return <MapPin className="h-4 w-4" />;
      case 'DELIVERED': return <CheckCircle className="h-4 w-4" />;
      case 'CANCELLED': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canUpdateTo = (status: string) => {
    if (!booking) return false;
    
    const currentStatus = booking.status;
    const validTransitions: Record<string, string[]> = {
      'BOOKED': ['DEPARTED', 'CANCELLED'],
      'DEPARTED': ['ARRIVED'],
      'ARRIVED': ['DELIVERED'],
      'DELIVERED': [],
      'CANCELLED': [],
    };
    
    return validTransitions[currentStatus]?.includes(status) || false;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading booking details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="text-center py-16">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Booking Not Found</h2>
          <p className="text-muted-foreground">The booking reference you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Booking Details</h1>
          <p className="text-muted-foreground">Track your cargo shipment progress</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <Package className="h-6 w-6" />
                    <span>Booking {booking.ref_id}</span>
                  </span>
                  <Badge className={getStatusColor(booking.status)}>
                    {booking.status}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Created on {formatDateTime(booking.created_at)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Route</p>
                        <p className="text-sm text-muted-foreground">
                          {booking.origin} → {booking.destination}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Hash className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Pieces</p>
                        <p className="text-sm text-muted-foreground">{booking.pieces} pieces</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Weight className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Weight</p>
                        <p className="text-sm text-muted-foreground">{booking.weight_kg} kg</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Last Updated</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDateTime(booking.updated_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Shipment Timeline</span>
                </CardTitle>
                <CardDescription>Track your cargo's journey</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {events.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No events recorded yet</p>
                  ) : (
                    events.map((event, index) => (
                      <div key={event.id} className="flex items-start space-x-4">
                        <div className={`p-2 rounded-full ${
                          index === 0 ? 'bg-primary' : 'bg-muted'
                        }`}>
                          {getEventIcon(event.event_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{event.event_type}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDateTime(event.created_at)}
                            </p>
                          </div>
                          {event.location && (
                            <p className="text-sm text-muted-foreground">
                              Location: {event.location}
                            </p>
                          )}
                          {event.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {event.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions Panel */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Update booking status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {canUpdateTo('DEPARTED') && (
                  <Button 
                    className="w-full" 
                    onClick={() => updateBookingStatus('DEPARTED', booking.origin)}
                    disabled={updating}
                  >
                    <Plane className="h-4 w-4 mr-2" />
                    Mark as Departed
                  </Button>
                )}
                
                {canUpdateTo('ARRIVED') && (
                  <Button 
                    className="w-full" 
                    onClick={() => updateBookingStatus('ARRIVED', booking.destination)}
                    disabled={updating}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Mark as Arrived
                  </Button>
                )}
                
                {canUpdateTo('DELIVERED') && (
                  <Button 
                    className="w-full" 
                    onClick={() => updateBookingStatus('DELIVERED', booking.destination)}
                    disabled={updating}
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Mark as Delivered
                  </Button>
                )}
                
                {canUpdateTo('CANCELLED') && (
                  <Button 
                    variant="destructive" 
                    className="w-full" 
                    onClick={() => updateBookingStatus('CANCELLED')}
                    disabled={updating}
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Cancel Booking
                  </Button>
                )}
                
                {booking.status === 'DELIVERED' && (
                  <div className="text-center py-4">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Booking completed successfully</p>
                  </div>
                )}
                
                {booking.status === 'CANCELLED' && (
                  <div className="text-center py-4">
                    <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Booking has been cancelled</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}