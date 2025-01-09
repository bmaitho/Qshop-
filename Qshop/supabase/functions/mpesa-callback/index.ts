// supabase/functions/mpesa-callback/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the M-Pesa callback data
    const mpesaCallback = await req.json()

    // Log the callback for debugging
    console.log('M-Pesa Callback:', mpesaCallback)

    // Extract relevant information
    const {
      Body: {
        stkCallback: {
          MerchantRequestID,
          CheckoutRequestID,
          ResultCode,
          ResultDesc,
          CallbackMetadata
        }
      }
    } = mpesaCallback

    // Check if payment was successful
    if (ResultCode === 0) {
      // Extract payment details from CallbackMetadata
      const getMetadataItem = (name) => {
        const item = CallbackMetadata.Item.find(item => item.Name === name)
        return item ? item.Value : null
      }

      const mpesaReceipt = getMetadataItem('MpesaReceiptNumber')
      const amount = getMetadataItem('Amount')
      const phoneNumber = getMetadataItem('PhoneNumber')

      // Update the order in the database
      const { data, error } = await supabase
        .from('orders')
        .update({
          payment_status: 'completed',
          mpesa_receipt: mpesaReceipt,
          updated_at: new Date().toISOString()
        })
        .eq('id', MerchantRequestID) // Using order ID as MerchantRequestID
        .select()

      if (error) throw error

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment processed successfully',
          data
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    } else {
      // Payment failed
      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', MerchantRequestID)

      if (error) throw error

      return new Response(
        JSON.stringify({
          success: false,
          message: ResultDesc
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }
  } catch (error) {
    console.error('Error processing M-Pesa callback:', error)

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Error processing payment callback',
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})