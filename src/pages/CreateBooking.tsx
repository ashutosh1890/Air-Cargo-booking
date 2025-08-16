import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navigation } from "@/components/ui/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Package, MapPin, Weight, Hash } from "lucide-react";

const AIRPORTS = [
  { code: "DEL", name: "Delhi (Indira Gandhi International)" },
  { code: "BOM", name: "Mumbai (Chhatrapati Shivaji)" },
  { code: "BLR", name: "Bangalore (Kempegowda International)" },
  { code: "HYD", name: "Hyderabad (Rajiv Gandhi International)" },
  { code: "MAA", name: "Chennai (Anna International)" },
  { code: "CCU", name: "Kolkata (Netaji Subhash Chandra Bose)" },
  { code: "AMD", name: "Ahmedabad (Sardar Vallabhbhai Patel)" },
  { code: "COK", name: "Kochi (Cochin International)" },
];

interface Flight {
  id: string;
  flight_number: string;
  airline_name: string;
  departure_datetime: string;
  arrival_datetime: string;
  origin: string;
  destination: string;
}

interface RouteOption {
  type: 'direct' | 'transit';
  flights: Flight[];
  total_duration: string;
}

export default function CreateBooking() {
  const [formData, setFormData] = useState({
    origin: "",
    destination: "",
    pieces: "",
    weight_kg: "",
    departure_date: "",
  });
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchingRoutes, setSearchingRoutes] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const searchRoutes = async () => {
    if (!formData.origin || !formData.destination || !formData.departure_date) {
      toast({
        title: "Missing Information",
        description: "Please fill in origin, destination, and departure date to search routes.",
        variant: "destructive",
      });
      return;
    }

    setSearchingRoutes(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-routes', {
        body: {
          origin: formData.origin,
          destination: formData.destination,
          departure_date: formData.departure_date,
        },
      });

      if (error) throw error;
      setRoutes(data.routes || []);
      
      if (data.routes.length === 0) {
        toast({
          title: "No Routes Found",
          description: "No available routes found for the selected criteria.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to search routes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSearchingRoutes(false);
    }
  };

  const createBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.pieces || !formData.weight_kg) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('create-booking', {
        body: {
          origin: formData.origin,
          destination: formData.destination,
          pieces: parseInt(formData.pieces),
          weight_kg: parseInt(formData.weight_kg),
          user_id: user?.id,
          selected_route: selectedRoute,
        },
      });

      if (error) throw error;

      toast({
        title: "Booking Created!",
        description: `Your booking ${data.ref_id} has been created successfully.`,
      });

      navigate(`/booking/${data.ref_id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create booking",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Create New Booking</h1>
          <p className="text-muted-foreground">Book your air cargo shipment</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Booking Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Shipment Details</span>
              </CardTitle>
              <CardDescription>Enter your cargo shipment information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createBooking} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="origin">Origin</Label>
                    <Select value={formData.origin} onValueChange={(value) => setFormData({...formData, origin: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select origin" />
                      </SelectTrigger>
                      <SelectContent>
                        {AIRPORTS.map((airport) => (
                          <SelectItem key={airport.code} value={airport.code}>
                            {airport.code} - {airport.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="destination">Destination</Label>
                    <Select value={formData.destination} onValueChange={(value) => setFormData({...formData, destination: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination" />
                      </SelectTrigger>
                      <SelectContent>
                        {AIRPORTS.filter(a => a.code !== formData.origin).map((airport) => (
                          <SelectItem key={airport.code} value={airport.code}>
                            {airport.code} - {airport.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departure_date">Departure Date</Label>
                  <Input
                    id="departure_date"
                    type="date"
                    value={formData.departure_date}
                    onChange={(e) => setFormData({...formData, departure_date: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div className="flex space-x-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={searchRoutes}
                    disabled={searchingRoutes}
                    className="flex-1"
                  >
                    {searchingRoutes ? "Searching..." : "Search Routes"}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pieces" className="flex items-center space-x-1">
                      <Hash className="h-4 w-4" />
                      <span>Number of Pieces</span>
                    </Label>
                    <Input
                      id="pieces"
                      type="number"
                      min="1"
                      value={formData.pieces}
                      onChange={(e) => setFormData({...formData, pieces: e.target.value})}
                      placeholder="e.g., 5"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weight_kg" className="flex items-center space-x-1">
                      <Weight className="h-4 w-4" />
                      <span>Weight (KG)</span>
                    </Label>
                    <Input
                      id="weight_kg"
                      type="number"
                      min="1"
                      value={formData.weight_kg}
                      onChange={(e) => setFormData({...formData, weight_kg: e.target.value})}
                      placeholder="e.g., 150"
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !selectedRoute}
                >
                  {loading ? "Creating Booking..." : "Create Booking"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Route Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Available Routes</span>
              </CardTitle>
              <CardDescription>Select your preferred route</CardDescription>
            </CardHeader>
            <CardContent>
              {routes.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Search for routes to see available options</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {routes.map((route, index) => (
                    <div 
                      key={index}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedRoute === route 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedRoute(route)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            route.type === 'direct' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {route.type === 'direct' ? 'Direct' : 'Transit'}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {route.total_duration}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {route.flights.map((flight, flightIndex) => (
                          <div key={flight.id} className="flex justify-between items-center text-sm">
                            <div>
                              <span className="font-medium">{flight.flight_number}</span>
                              <span className="text-muted-foreground ml-2">{flight.airline_name}</span>
                            </div>
                            <div className="text-right">
                              <div>{flight.origin} → {flight.destination}</div>
                              <div className="text-muted-foreground">
                                {formatDateTime(flight.departure_datetime)} - {formatDateTime(flight.arrival_datetime)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}