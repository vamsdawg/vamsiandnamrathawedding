import nodemailer from 'nodemailer'

// Create reusable transporter
let transporter = null

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      }
    })
  }
  return transporter
}

// Email templates
const createRsvpConfirmationEmail = (guestName, rsvpDetails) => {
  const { adultsAttending, attendingWedding, attendingReception, usingHotelBlock, message } = rsvpDetails
  
  // Use fallback values if env vars aren't set
  const coupleNames = process.env.COUPLE_NAMES || 'Namratha & Vamsi'
  const weddingDate = process.env.WEDDING_DATE || 'February 28, 2026'
  
  // Google Calendar links with specific locations
  const weddingCalendarLink = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Namratha+%26+Vamsi+Wedding+Ceremony&dates=20260228T080000/20260228T140000&details=Join+us+for+the+wedding+ceremony+of+Namratha+and+Vamsi&location=460+Rockbridge+Rd+NW%2C+Lilburn%2C+GA+30047&sf=true&output=xml'
  const receptionCalendarLink = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Namratha+%26+Vamsi+Wedding+Reception&dates=20260228T183000/20260301T000000&details=Join+us+for+the+wedding+reception+of+Namratha+and+Vamsi&location=6050+Peachtree+Industrial+Blvd%2C+Norcross%2C+GA+30071&sf=true&output=xml'
  
  return {
    subject: `RSVP Confirmation - ${coupleNames} Wedding`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Georgia, serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8b9f87 0%, #7a8d76 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
          .details { background: #f9f9f9; padding: 20px; margin: 20px 0; border-left: 4px solid #8b9f87; }
          .detail-row { margin: 10px 0; }
          .label { font-weight: bold; color: #666; }
          .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 0.9em; color: #666; border-radius: 0 0 10px 10px; }
          .calendar-buttons { margin: 25px 0; text-align: center; }
          .calendar-btn { display: inline-block; margin: 10px 5px; padding: 12px 24px; background: #8b9f87; color: white !important; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .calendar-btn:hover { background: #7a8d76; }
          .calendar-btn span { color: white !important; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 2em;">${coupleNames}</h1>
            <p style="margin: 10px 0 0 0; font-size: 1.1em;">Wedding Celebration</p>
          </div>
          
          <div class="content">
            <h2 style="color: #8b9f87;">Thank You for Your RSVP!</h2>
            <p>Dear ${guestName},</p>
            <p>We're delighted to confirm your RSVP for our wedding celebration on <strong>${weddingDate}</strong>!</p>
            
            <div class="details">
              <h3 style="margin-top: 0; color: #8b9f87;">Your RSVP Details:</h3>
              <div class="detail-row">
                <span class="label">Number of Guests:</span> ${adultsAttending || 0}
              </div>
              <div class="detail-row">
                <span class="label">Wedding Ceremony:</span> ${attendingWedding ? '✓ Yes' : '✗ Not Attending'}
              </div>
              <div class="detail-row">
                <span class="label">Reception:</span> ${attendingReception ? '✓ Yes' : '✗ Not Attending'}
              </div>
              <div class="detail-row">
                <span class="label">Hotel Block:</span> ${usingHotelBlock ? '✓ Yes, I plan to use it' : 'No'}
              </div>
              ${message ? `<div class="detail-row" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
                <span class="label">Your Message:</span><br>
                <em>"${message}"</em>
              </div>` : ''}
            </div>
            
            <div class="calendar-buttons">
              <h3 style="color: #8b9f87; margin-bottom: 15px;">📅 Add to Your Calendar</h3>
              ${attendingWedding ? `<a href="${weddingCalendarLink}" class="calendar-btn" style="color: white !important;" target="_blank">Add Wedding Ceremony<br><span style="font-size: 0.85em; font-weight: normal; color: white !important;">8:00 AM - 2:00 PM</span></a>` : ''}
              ${attendingReception ? `<a href="${receptionCalendarLink}" class="calendar-btn" style="color: white !important;" target="_blank">Add Reception<br><span style="font-size: 0.85em; font-weight: normal; color: white !important;">6:30 PM - Midnight</span></a>` : ''}
            </div>
            
            <p>If you need to update your RSVP, you can always visit our website and submit a new response.</p>
            
            <p style="margin-top: 30px;">We can't wait to celebrate with you!</p>
            <p style="margin-top: 20px;">With love,<br><strong>${coupleNames}</strong></p>
          </div>
          
          <div class="footer">
            <p>Wedding Date: ${weddingDate}</p>
            <p style="font-size: 0.85em; margin-top: 10px;">This is an automated confirmation. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Dear ${guestName},

Thank you for your RSVP!

We're delighted to confirm your response for our wedding celebration on ${weddingDate}.

Your RSVP Details:
- Number of Guests: ${adultsAttending || 0}
- Wedding Ceremony: ${attendingWedding ? 'Yes' : 'Not Attending'}
- Reception: ${attendingReception ? 'Yes' : 'Not Attending'}
- Hotel Block: ${usingHotelBlock ? 'Yes, I plan to use it' : 'No'}
${message ? `- Your Message: "${message}"` : ''}

If you need to update your RSVP, you can always visit our website and submit a new response.

We can't wait to celebrate with you!

With love,
${coupleNames}
    `
  }
}

const createBulkEmail = (subject, message) => {
  const coupleNames = process.env.COUPLE_NAMES || 'Namratha & Vamsi'
  const weddingDate = process.env.WEDDING_DATE || 'February 28, 2026'
  
  // Convert plain text newlines to HTML line breaks
  const htmlMessage = message.replace(/\n/g, '<br>')
  
  // Always use HTML formatting
  return {
    subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Georgia, serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8b9f87 0%, #7a8d76 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
          .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 0.9em; color: #666; border-radius: 0 0 10px 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 2em;">${coupleNames}</h1>
            <p style="margin: 10px 0 0 0; font-size: 1.1em;">Wedding Celebration</p>
          </div>
          
          <div class="content">
            ${htmlMessage}
          </div>
          
          <div class="footer">
            <p>Wedding Date: ${weddingDate}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: message.replace(/<[^>]*>/g, '') // Strip HTML tags for plain text version
  }
}

// Send RSVP confirmation email
export const sendRsvpConfirmation = async (recipientEmail, guestName, rsvpDetails) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
      console.log('Email service not configured. Skipping email send.')
      return { success: false, error: 'Email not configured' }
    }

    if (!recipientEmail) {
      console.log('No recipient email provided. Skipping email send.')
      return { success: false, error: 'No recipient email' }
    }

    const emailContent = createRsvpConfirmationEmail(guestName, rsvpDetails)
    const transporter = getTransporter()

    const mailOptions = {
      from: `"${process.env.COUPLE_NAMES} Wedding" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('RSVP confirmation email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error sending RSVP confirmation email:', error)
    return { success: false, error: error.message }
  }
}

// Send bulk email to multiple recipients
export const sendBulkEmail = async (recipients, subject, message) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
      throw new Error('Email service not configured')
    }

    if (!recipients || recipients.length === 0) {
      throw new Error('No recipients provided')
    }

    const emailContent = createBulkEmail(subject, message)
    const transporter = getTransporter()

    const results = []
    
    // Send emails one at a time to avoid rate limits and personalize each email
    for (const recipient of recipients) {
      try {
        const mailOptions = {
          from: `"${process.env.COUPLE_NAMES} Wedding" <${process.env.EMAIL_USER}>`,
          to: recipient.email,
          subject: emailContent.subject,
          text: emailContent.text.replace('{{name}}', recipient.name || 'Guest'),
          html: emailContent.html.replace('{{name}}', recipient.name || 'Guest')
        }

        const info = await transporter.sendMail(mailOptions)
        results.push({ 
          email: recipient.email, 
          name: recipient.name,
          success: true, 
          messageId: info.messageId 
        })
        
        // Small delay to avoid hitting rate limits (Gmail allows 500/day)
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`Error sending to ${recipient.email}:`, error)
        results.push({ 
          email: recipient.email,
          name: recipient.name, 
          success: false, 
          error: error.message 
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return { 
      success: true, 
      results,
      summary: {
        total: recipients.length,
        sent: successCount,
        failed: failCount
      }
    }
  } catch (error) {
    console.error('Error in bulk email send:', error)
    throw error
  }
}

// Send test email
export const sendTestEmail = async (recipientEmail) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
      throw new Error('Email service not configured')
    }

    const transporter = getTransporter()

    const mailOptions = {
      from: `"${process.env.COUPLE_NAMES} Wedding" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: 'Test Email - Wedding Website Email System',
      html: `
        <h2>Test Email Successful! 🎉</h2>
        <p>Your email system is working correctly.</p>
        <p>From: ${process.env.COUPLE_NAMES} Wedding</p>
        <p>Date: ${new Date().toLocaleString()}</p>
      `,
      text: `Test Email Successful! Your email system is working correctly. From: ${process.env.COUPLE_NAMES} Wedding. Date: ${new Date().toLocaleString()}`
    }

    const info = await transporter.sendMail(mailOptions)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error sending test email:', error)
    throw error
  }
}
