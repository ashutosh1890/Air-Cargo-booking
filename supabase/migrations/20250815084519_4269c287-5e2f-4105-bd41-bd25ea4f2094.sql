-- Fix security warnings by setting search_path for all functions
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';