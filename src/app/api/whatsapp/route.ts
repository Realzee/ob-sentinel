import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { alert, phoneNumbers } = await request.json()

    // Mock WhatsApp notification - in production, this would integrate with Twilio
    console.log('📱 WHATSAPP ALERT MOCK:')
    console.log('Alert:', alert)
    console.log('Recipients:', phoneNumbers)
    console.log('Message:', 
      `🚨 COMMUNITY ALERT - ${alert.suburb}\n` +
      `Plate: ${alert.number_plate}\n` +
      `Vehicle: ${alert.color} ${alert.make} ${alert.model}\n` +
      `Reason: ${alert.reason}\n` +
      `Time: ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}\n\n` +
      `Stay vigilant and report suspicious activity to SAPS.`
    )

    // Production path: Uncomment and configure Twilio for real WhatsApp messages
    /*
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    for (const phone of phoneNumbers) {
      await client.messages.create({
        body: `🚨 COMMUNITY ALERT - ${alert.suburb}\nPlate: ${alert.number_plate}\nVehicle: ${alert.color} ${alert.make} ${alert.model}\nReason: ${alert.reason}`,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${phone}`
      });
    }
    */

    return NextResponse.json({ 
      success: true, 
      message: 'WhatsApp alert mocked successfully',
      productionNote: 'To enable real WhatsApp alerts, configure Twilio WhatsApp Business API (~R0.10/message)'
    })
  } catch (error) {
    console.error('WhatsApp alert error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send WhatsApp alert' },
      { status: 500 }
    )
  }
}