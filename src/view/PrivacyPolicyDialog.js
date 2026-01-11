import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

/**
 * Privacy Policy Dialog
 * Explains data collection, usage, and user rights
 */
export default function PrivacyPolicyDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold', bgcolor: 'var(--surface-modal)', color: 'var(--text-primary)' }}>
        Privacy Policy
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
{`PRIVACY POLICY
Last Updated: January 8, 2026

1. INTRODUCTION
This Privacy Policy describes how Conway's Game of Life ("we," "us," or "the App") collects, uses, and protects your information when you use our web application.

2. INFORMATION WE COLLECT

2.1 Account Information
When you create an account, we collect:
- Email address
- Password (hashed and encrypted)
- Display name (optional)

2.2 User-Generated Content
- Shapes and patterns you create or save
- Grids and simulations you store
- Shape names, descriptions, and metadata

2.3 Donation Information
- Donation amount and date
- Stripe payment information (processed by Stripe, we do not store card details)
- Email confirmation of donation

2.4 Usage Data
- Patterns you run or load
- Settings preferences (FPS, color scheme, ADA compliance)
- Telemetry about app performance (optional, opt-in via settings)
- Device type and browser information (standard web logs)

2.5 Cookies & Storage
- Browser localStorage stores your settings and preferences locally
- Session tokens for authentication
- No third-party tracking cookies

3. HOW WE USE YOUR INFORMATION

3.1 Essential Functions
- To provide and maintain the application
- To create and authenticate your account
- To store your saved grids and shapes
- To process donations and send confirmations

3.2 Community Features
- To display your published shapes in the community gallery
- To attribute shapes to your account (if you choose to publish)
- To notify you of interactions with your shared content

3.3 Improvement & Support
- To debug technical issues
- To improve app performance and features
- To respond to your support requests

3.4 Legal Compliance
- To comply with applicable laws and regulations
- To enforce our terms of service
- To protect against fraud or abuse

4. DATA SHARING & DISCLOSURE

4.1 We Do NOT Share Your Data
- We do not sell your personal information
- We do not share your data with advertisers or marketing companies
- We do not share your email with third parties (except as required below)

4.2 Limited Sharing
- Stripe (payment processing): Only donation amount and email
- Web hosting provider: Standard server logs (IP, browser type)
- Legal authorities: Only if required by law

4.3 Published Content
- Shapes you choose to publish are visible to all users
- Published shapes include your attribution (account name)
- You control what you publish; unpublished content is private

5. DATA RETENTION

5.1 How Long We Keep Your Data
- Account information: As long as your account exists
- Saved grids and shapes: Until you delete them
- Published community shapes: Until you unpublish or delete
- Donation records: Required by tax law (7 years)
- Usage logs: 30 days (for troubleshooting)
- Backup copies: Up to 90 days after deletion

5.2 Right to Deletion
- You can delete your account anytime from the Account Management dialog (User Profile → Account Management)
- You can delete individual saved grids or shapes
- You can request export of all your data
- Account deletion has a 30-day grace period (you can cancel during this time)
- After grace period: private content permanently deleted, public content anonymized but preserved
- Donation records retained for 7 years (tax law compliance)

6. SECURITY

6.1 Protection Measures
- HTTPS encryption for all data in transit
- Hashed passwords (bcrypt with salt)
- Database encryption at rest
- Regular security updates and patching
- Access controls and authentication required

6.2 Limitations
- No security system is 100% secure
- We cannot guarantee absolute protection against all attacks
- We will notify you of any confirmed data breaches affecting your account

7. YOUR RIGHTS

7.1 Access & Portability (GDPR Article 20)
- You can view all your account information
- You can export your saved grids and shapes as files
- You can download a complete data export from Account Management (includes all shapes, grids, scripts, and profile data in JSON format)

7.2 Correction & Deletion (GDPR Article 17)
- You can update your account email and settings anytime
- You can delete your account from Account Management with a 30-day grace period
- You can cancel deletion during the grace period
- After grace period: private content deleted, public content anonymized

7.3 Opt-Out Rights
- You can disable telemetry data collection in Settings
- You can make your profile private (unpublish all shapes)
- You can unsubscribe from email notifications

7.4 Do Not Track
- We respect browser DNT (Do Not Track) signals
- We do not track you across other websites

8. INTERNATIONAL USERS

8.1 GDPR (Europe)
If you are in the EU, you have rights under GDPR including:
- Right to access your data
- Right to correction
- Right to deletion ("right to be forgotten")
- Right to data portability
- Right to restrict processing
- Right to object to processing
- Right to lodge a complaint with your data protection authority

8.2 CCPA (California)
California residents have the right to:
- Know what personal information is collected (see Section 2)
- Know whether personal information is shared or sold (we do not sell data)
- Access your personal information (Account Management → Download My Data)
- Delete personal information (Account Management → Delete My Account)
- Opt-out of any future sales or sharing (we don't sell or share for profit)
- Non-discrimination for exercising CCPA rights

8.3 Other Jurisdictions
We comply with data protection laws in your jurisdiction. If you believe your rights are violated, contact us.

9. CHANGES TO THIS POLICY

- We may update this policy periodically
- Material changes will be announced in-app
- Continued use after updates constitutes acceptance
- We will maintain a version history accessible upon request

10. CONTACT US

If you have questions about this privacy policy or our practices:

Email: privacy@gol-conway.hopto.org
Or use the Help dialog (?) in the app to contact support

We will respond to privacy inquiries within 30 days.

---

This privacy policy is effective as of January 8, 2026 and applies to all users of the Game of Life application.
`}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2, bgcolor: 'var(--surface-modal)' }}>
        <Button onClick={onClose} variant="contained" color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
