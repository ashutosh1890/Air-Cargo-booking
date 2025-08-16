import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { origin, destination, departure_date } = await req.json();

    if (!origin || !destination || !departure_date) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const routes: RouteOption[] = [];
    const departureStart = new Date(departure_date);
    const departureEnd = new Date(departure_date);
    departureEnd.setDate(departureEnd.getDate() + 1);

    // Search for direct flights
    const { data: directFlights } = await supabase
      .from('flights')
      .select('*')
      .eq('origin', origin)
      .eq('destination', destination)
      .gte('departure_datetime', departureStart.toISOString())
      .lt('departure_datetime', departureEnd.toISOString())
      .order('departure_datetime');

    if (directFlights && directFlights.length > 0) {
      directFlights.forEach((flight: Flight) => {
        const duration = calculateDuration(flight.departure_datetime, flight.arrival_datetime);
        routes.push({
          type: 'direct',
          flights: [flight],
          total_duration: duration
        });
      });
    }

    // Search for transit routes (one stop)
    const { data: firstHopFlights } = await supabase
      .from('flights')
      .select('*')
      .eq('origin', origin)
      .neq('destination', destination)
      .gte('departure_datetime', departureStart.toISOString())
      .lt('departure_datetime', departureEnd.toISOString())
      .order('departure_datetime');

    if (firstHopFlights && firstHopFlights.length > 0) {
      for (const firstFlight of firstHopFlights) {
        const transitDate = new Date(firstFlight.arrival_datetime);
        const nextDayEnd = new Date(transitDate);
        nextDayEnd.setDate(nextDayEnd.getDate() + 2); // Allow same day or next day

        const { data: secondHopFlights } = await supabase
          .from('flights')
          .select('*')
          .eq('origin', firstFlight.destination)
          .eq('destination', destination)
          .gte('departure_datetime', firstFlight.arrival_datetime)
          .lt('departure_datetime', nextDayEnd.toISOString())
          .order('departure_datetime')
          .limit(3); // Limit to prevent too many options

        if (secondHopFlights && secondHopFlights.length > 0) {
          secondHopFlights.forEach((secondFlight: Flight) => {
            // Ensure minimum 2-hour layover
            const layoverHours = (new Date(secondFlight.departure_datetime).getTime() - 
                                new Date(firstFlight.arrival_datetime).getTime()) / (1000 * 60 * 60);
            
            if (layoverHours >= 2) {
              const totalDuration = calculateDuration(
                firstFlight.departure_datetime, 
                secondFlight.arrival_datetime
              );
              
              routes.push({
                type: 'transit',
                flights: [firstFlight, secondFlight],
                total_duration: totalDuration
              });
            }
          });
        }
      }
    }

    // Sort routes by duration
    routes.sort((a, b) => {
      const durationA = parseDuration(a.total_duration);
      const durationB = parseDuration(b.total_duration);
      return durationA - durationB;
    });

    console.log(`Found ${routes.length} routes for ${origin} to ${destination}`);

    return new Response(
      JSON.stringify({ routes }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-routes function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function calculateDuration(start: string, end: string): string {
  const startTime = new Date(start);
  const endTime = new Date(end);
  const diffMs = endTime.getTime() - startTime.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

function parseDuration(duration: string): number {
  const match = duration.match(/(\d+)h\s*(\d+)m/);
  if (match) {
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  }
  return 0;
}