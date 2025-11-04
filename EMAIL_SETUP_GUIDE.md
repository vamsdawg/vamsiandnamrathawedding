# Email System Setup Guide

## 📧 Nodemailer + Gmail Email System

Your wedding website now has a complete email system integrated! Here's how to set it up and use it.

## 🔧 Setup Steps

### Step 1: Enable Gmail App Passwords

1. **Go to your Google Account**: https://myaccount.google.com/
2. **Enable 2-Factor Authentication** (required for App Passwords):
   - Go to Security → 2-Step Verification
   - Follow the steps to enable it
3. **Create an App Password**:
   - Go to Security → 2-Step Verification → App passwords
   - Or directly: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer"
   - Click "Generate"
   - Copy the 16-character password (no spaces)

### Step 2: Update Your .env File

Open your `.env` file and update these values:

```env
EMAIL_USER=your.wedding.email@gmail.com
EMAIL_APP_PASSWORD=abcdefghijklmnop
```

Replace:
- `your.wedding.email@gmail.com` with your actual Gmail address
- `abcdefghijklmnop` with the 16-character App Password from Step 1

### Step 3: Update Vercel Environment Variables (for production)

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add these variables:
   - `EMAIL_USER` = your.wedding.email@gmail.com
   - `EMAIL_APP_PASSWORD` = your-16-char-app-password
5. Redeploy your site

## ✨ Features Implemented

### 1. Automatic RSVP Confirmation Emails
- **When it happens**: Automatically sent when a guest submits their RSVP
- **Only if**: Guest provides an email address
- **Contains**:
  - Beautiful HTML template with your wedding branding
  - Confirmation of their RSVP details (number of guests, events attending)
  - Their optional message
  - Wedding date reminder

### 2. Admin Email Dashboard
- **Access**: Click "📧 Email Guests" in the admin dashboard
- **Features**:
  - Send emails to all guests or filtered groups
  - Preview emails before sending
  - Send test emails to yourself
  - Track how many emails were sent/failed
  - Personalize with {{name}} placeholder

### 3. Recipient Filtering
Send emails to:
- All guests with email addresses
- Only guests who RSVP'd Yes
- Only guests who RSVP'd No
- Guests who haven't responded yet
- Guests attending wedding ceremony
- Guests attending reception
- Guests using hotel block

## 📨 How to Use

### Sending Your First Email

1. **Login to Admin Dashboard**
   - Go to `/admin/login`
   - Use your admin password

2. **Click "📧 Email Guests"**
   - You'll see the email composer

3. **Select Recipients**
   - Choose from the dropdown (e.g., "All guests with email addresses")
   - See real-time count of how many people will receive it

4. **Compose Your Message**
   - Enter subject line
   - Write your message
   - Use {{name}} to personalize (e.g., "Dear {{name}},")
   - Keep "Use HTML formatting" checked for better appearance

5. **Preview & Test**
   - Click "Preview Email" to see how it looks
   - Send a test email to yourself first
   - Verify everything looks good

6. **Send!**
   - Click "Send Email to X Guests"
   - Confirm the send
   - Wait for confirmation (may take a minute for many recipients)

### Example Email Use Cases

**Reminder Email**:
```
Subject: Don't Forget to RSVP - Wedding on February 28, 2026!

Dear {{name}},

We're so excited to celebrate our special day with you! 

If you haven't already, please RSVP by visiting our wedding website. We need your response to finalize our guest count with the venue.

Can't wait to see you there!

With love,
Namratha & Vamsi
```

**Event Update**:
```
Subject: Important Update: Venue Change

Dear {{name}},

We wanted to let you know about an important change to our wedding plans...

[Details]

Thank you for your understanding!

Namratha & Vamsi
```

**Post-Wedding Thank You**:
```
Subject: Thank You for Celebrating With Us!

Dear {{name}},

Thank you so much for joining us on our special day! Your presence meant the world to us...

[Personal message]

With gratitude,
Namratha & Vamsi
```

## 🎯 Best Practices

1. **Always Send a Test First**: Send to your own email before sending to everyone
2. **Preview Your Email**: Use the preview feature to check formatting
3. **Personalize**: Use {{name}} to make emails feel personal
4. **Keep It Short**: Guests are more likely to read shorter emails
5. **Clear Subject Lines**: Make it obvious what the email is about
6. **Check Spam**: Tell guests to check spam if they don't see your email

## 📊 Email Limits

- **Gmail Free**: 500 emails per day
- **Your guest list**: 181 guests
- **You can send**: Multiple emails per day without hitting limits
- **Delay between sends**: 100ms (built-in to avoid rate limits)

## 🔍 Troubleshooting

### "Email service not configured" error
- Check that EMAIL_USER and EMAIL_APP_PASSWORD are set in .env
- Make sure you're using an App Password, not your regular Gmail password
- Restart your development server after updating .env

### Emails not sending
- Verify 2FA is enabled on your Gmail account
- Double-check the App Password is correct (16 characters, no spaces)
- Check Gmail's sent folder to see if emails went through
- Look at terminal logs for error messages

### Emails going to spam
- Ask recipients to add your email to contacts
- Send from a professional-looking email address
- Avoid spam trigger words in subject/body
- Keep a good text-to-image ratio

### Test email not received
- Check spam folder
- Verify the email address is correct
- Wait a few minutes (sometimes there's a delay)
- Try a different email provider (Gmail, Outlook, etc.)

## 🚀 Advanced Features (Already Implemented)

- ✅ Beautiful HTML email templates
- ✅ Plain text fallback for email clients that don't support HTML
- ✅ Automatic retry logic (built into Nodemailer)
- ✅ Error handling (emails won't fail RSVPs)
- ✅ Personalization with {{name}}
- ✅ Bulk sending with rate limiting
- ✅ Connection caching for performance

## 📝 Files Added/Modified

### New Files:
- `src/utils/emailService.js` - Email sending logic and templates
- `views/admin-emails.ejs` - Admin email interface

### Modified Files:
- `.env` - Added EMAIL_USER and EMAIL_APP_PASSWORD
- `src/tabs/rsvp.js` - Added automatic confirmation emails
- `api/index.js` - Added email routes
- `views/admin-dashboard.ejs` - Added "Email Guests" button
- `package.json` - Added nodemailer dependency

## 🎉 You're All Set!

Once you complete Step 1 and Step 2 above, your email system will be fully functional. Test it out by:

1. Submitting a test RSVP with your email address
2. Check if you receive the automatic confirmation
3. Go to Admin → Email Guests
4. Send yourself a test email
5. Send your first bulk email!

Need help? Check the console logs for detailed error messages.
