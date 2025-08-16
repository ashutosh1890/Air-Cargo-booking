import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { origin, destination, pieces, weight_kg, user_id, selected_route } = await req.json();

    // Validate required fields
    if (!origin || !destination || !pieces || !weight_kg) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (pieces <= 0 || weight_kg <= 0) {
      return new Response(
        JSON.stringify({ error: 'Pieces and weight must be positive numbers' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create the booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        origin,
        destination,
        pieces: parseInt(pieces),
        weight_kg: parseInt(weight_kg),
        user_id: user_id || null,
        status: 'BOOKED'
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Failed to create booking' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Log the route selection if provided
    if (selected_route) {
      const routeInfo = `Selected ${selected_route.type} route with ${selected_route.flights.length} flight(s)`;
      console.log(`Booking ${booking.ref_id}: ${routeInfo}`);
      
      // Could store route information in a separate table if needed
      // For now, we'll just log it
    }

    console.log(`Created booking ${booking.ref_id} for ${origin} to ${destination}`);

    return new Response(
      JSON.stringify({ 
        ref_id: booking.ref_id,
        id: booking.id,
        status: booking.status,
        message: 'Booking created successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in create-booking function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});