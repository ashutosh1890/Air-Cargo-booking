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

    const { ref_id, status, location, notes, flight_id } = await req.json();

    if (!ref_id || !status) {
      return new Response(
        JSON.stringify({ error: 'Booking reference and status are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate status
    const validStatuses = ['BOOKED', 'DEPARTED', 'ARRIVED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: 'Invalid status' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get current booking
    const { data: currentBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('ref_id', ref_id)
      .single();

    if (fetchError || !currentBooking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      'BOOKED': ['DEPARTED', 'CANCELLED'],
      'DEPARTED': ['ARRIVED'],
      'ARRIVED': ['DELIVERED'],
      'DELIVERED': [],
      'CANCELLED': [],
    };

    if (!validTransitions[currentBooking.status]?.includes(status)) {
      return new Response(
        JSON.stringify({ 
          error: `Cannot change status from ${currentBooking.status} to ${status}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Special validation: cannot cancel if already arrived
    if (status === 'CANCELLED' && ['ARRIVED', 'DELIVERED'].includes(currentBooking.status)) {
      return new Response(
        JSON.stringify({ 
          error: 'Cannot cancel booking that has already arrived' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Update booking status (this will trigger the event creation via database trigger)
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({ status })
      .eq('ref_id', ref_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating booking:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update booking status' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // If additional notes or flight info provided, update the latest event
    if (notes || flight_id) {
      // Get the latest event for this booking
      const { data: latestEvent } = await supabase
        .from('booking_events')
        .select('*')
        .eq('booking_id', updatedBooking.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestEvent) {
        await supabase
          .from('booking_events')
          .update({
            notes: notes || latestEvent.notes,
            flight_id: flight_id || latestEvent.flight_id
          })
          .eq('id', latestEvent.id);
      }
    }

    console.log(`Updated booking ${ref_id} status to ${status}`);

    return new Response(
      JSON.stringify({ 
        message: 'Booking status updated successfully',
        booking: updatedBooking
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in update-booking-status function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});