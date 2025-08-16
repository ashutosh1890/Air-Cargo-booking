-- Create flights table
CREATE TABLE public.flights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flight_number TEXT NOT NULL,
  airline_name TEXT NOT NULL,
  departure_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  arrival_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ref_id TEXT NOT NULL UNIQUE,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  pieces INTEGER NOT NULL CHECK (pieces > 0),
  weight_kg INTEGER NOT NULL CHECK (weight_kg > 0),
  status TEXT NOT NULL DEFAULT 'BOOKED' CHECK (status IN ('BOOKED', 'DEPARTED', 'ARRIVED', 'DELIVERED', 'CANCELLED')),
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create booking events table for timeline tracking
CREATE TABLE public.booking_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('CREATED', 'DEPARTED', 'ARRIVED', 'DELIVERED', 'CANCELLED')),
  location TEXT,
  flight_id UUID REFERENCES public.flights(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for flights (public read access for route searching)
CREATE POLICY "Flights are viewable by everyone" 
ON public.flights 
FOR SELECT 
USING (true);

-- RLS Policies for bookings (users can only see their own bookings)
CREATE POLICY "Users can view their own bookings" 
ON public.bookings 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create bookings" 
ON public.bookings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own bookings" 
ON public.bookings 
FOR UPDATE 
USING (auth.uid() = user_id OR user_id IS NULL);

-- RLS Policies for booking events
CREATE POLICY "Users can view events for their bookings" 
ON public.booking_events 
FOR SELECT 
USING (
  booking_id IN (
    SELECT id FROM public.bookings 
    WHERE auth.uid() = user_id OR user_id IS NULL
  )
);

CREATE POLICY "Users can create events for their bookings" 
ON public.booking_events 
FOR INSERT 
WITH CHECK (
  booking_id IN (
    SELECT id FROM public.bookings 
    WHERE auth.uid() = user_id OR user_id IS NULL
  )
);

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by owner" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create indexes for performance optimization
CREATE INDEX idx_flights_route_date ON public.flights(origin, destination, departure_datetime);
CREATE INDEX idx_flights_departure ON public.flights(departure_datetime);
CREATE INDEX idx_flights_arrival ON public.flights(arrival_datetime);
CREATE INDEX idx_bookings_ref_id ON public.bookings(ref_id);
CREATE INDEX idx_bookings_user_status ON public.bookings(user_id, status);
CREATE INDEX idx_bookings_origin_dest ON public.bookings(origin, destination);
CREATE INDEX idx_booking_events_booking_id ON public.booking_events(booking_id);
CREATE INDEX idx_booking_events_created_at ON public.booking_events(created_at);

-- Create function to generate human-friendly booking reference IDs
CREATE OR REPLACE FUNCTION generate_ref_id() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := 'ACB';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function to auto-generate ref_id if not provided
CREATE OR REPLACE FUNCTION auto_generate_ref_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ref_id IS NULL OR NEW.ref_id = '' THEN
    LOOP
      NEW.ref_id := generate_ref_id();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.bookings WHERE ref_id = NEW.ref_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating ref_id
CREATE TRIGGER trigger_auto_generate_ref_id
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_ref_id();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_flights_updated_at
  BEFORE UPDATE ON public.flights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create booking events
CREATE OR REPLACE FUNCTION create_booking_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert event for new booking
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.booking_events (booking_id, event_type, location)
    VALUES (NEW.id, 'CREATED', NEW.origin);
    RETURN NEW;
  END IF;
  
  -- Insert event for status changes
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO public.booking_events (booking_id, event_type, location)
    VALUES (NEW.id, NEW.status, 
      CASE 
        WHEN NEW.status = 'DEPARTED' THEN NEW.origin
        WHEN NEW.status = 'ARRIVED' THEN NEW.destination
        WHEN NEW.status = 'DELIVERED' THEN NEW.destination
        ELSE NULL
      END
    );
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic event creation
CREATE TRIGGER trigger_create_booking_event
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_booking_event();

-- Insert sample flights data for testing
INSERT INTO public.flights (flight_number, airline_name, departure_datetime, arrival_datetime, origin, destination) VALUES
-- Delhi to Mumbai routes
('AI101', 'Air India', '2024-08-16 06:00:00+00', '2024-08-16 08:30:00+00', 'DEL', 'BOM'),
('6E202', 'IndiGo', '2024-08-16 09:15:00+00', '2024-08-16 11:45:00+00', 'DEL', 'BOM'),
('SG303', 'SpiceJet', '2024-08-16 14:30:00+00', '2024-08-16 17:00:00+00', 'DEL', 'BOM'),
-- Mumbai to Bangalore routes
('AI401', 'Air India', '2024-08-16 10:00:00+00', '2024-08-16 11:45:00+00', 'BOM', 'BLR'),
('6E502', 'IndiGo', '2024-08-16 13:30:00+00', '2024-08-16 15:15:00+00', 'BOM', 'BLR'),
('SG603', 'SpiceJet', '2024-08-16 18:45:00+00', '2024-08-16 20:30:00+00', 'BOM', 'BLR'),
-- Delhi to Bangalore direct
('AI701', 'Air India', '2024-08-16 07:30:00+00', '2024-08-16 10:15:00+00', 'DEL', 'BLR'),
('6E802', 'IndiGo', '2024-08-16 16:00:00+00', '2024-08-16 18:45:00+00', 'DEL', 'BLR'),
-- Hyderabad connections
('AI901', 'Air India', '2024-08-16 08:00:00+00', '2024-08-16 10:30:00+00', 'DEL', 'HYD'),
('6E902', 'IndiGo', '2024-08-16 12:00:00+00', '2024-08-16 15:00:00+00', 'HYD', 'BLR');