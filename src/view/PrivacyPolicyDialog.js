import React from 'react';
import PropTypes from 'prop-types';
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
Published: February 22, 2026
Last Updated: February 22, 2026

1. INTRODUCTION
This Privacy Policy describes how Conway's Game of Life ("we," "us," or "the App") collects, uses, and protects your information when you use our web application.

2. INFORMATION WE COLLECT

2.1 Account Information
When you create an account, we collect:
- Email address
- Password (stored only as a salted bcrypt hash; raw password is not retained)
- Display name (optional)

2.2 User-Generated Content
- Shapes, grids, and scripts you create or save
- Names, descriptions, metadata, and public/private visibility choices

2.3 Support Purchase Information
- One-time lifetime support membership purchase amount ($10 USD) and date
- PayPal transaction identifiers and payer email confirmation
- We do not store full credit card or bank account details

2.4 Usage and Device Data
- Patterns and grids you run or load
- Settings preferences (for example FPS, color scheme, ADA compliance)
- Device and browser information from standard server logs

2.5 Cookies & Storage
- Browser localStorage stores your settings and preferences locally
- Session tokens for authentication
- No third-party advertising cookies

3. HOW WE USE YOUR INFORMATION

3.1 Core App Functions
- To provide and maintain the application
- To create and authenticate your account
- To store your saved grids, shapes, and scripts
- To process one-time PayPal support membership payments and send confirmations

3.2 Community Features
- To display your published shapes in the community gallery
- To attribute shapes to your account (if you choose to publish)

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
- PayPal (payment processing): Payment transaction details required to complete checkout
- Web hosting provider: Standard server logs (IP, browser type)
- Legal authorities: Only if required by law

4.3 Published Content
- Shapes you choose to publish are visible to all users
- Published shapes include your attribution (account name)
- You control what you publish; unpublished content is private

5. USER CONTROLS AVAILABLE IN THE APPS
- Open the Privacy Policy from the account/about menus at any time
- Create, save, and delete grids, shapes, and scripts through in-app dialogs
- Choose public/private visibility when saving content and change visibility later
- Download your account data (including shapes, grids, and scripts) from Account & Privacy
- Schedule account deletion with a 30-day grace period and cancel during that period
- Use the Support actions (heart icon/menu) to open the PayPal checkout flow

6. DATA RETENTION

6.1 How Long We Keep Your Data
- Account information: As long as your account exists
- Saved grids, shapes, and scripts: Until you delete them
- Published community shapes: Until you unpublish or delete
- Payment records: Up to 7 years for accounting and legal compliance
- Usage logs: 30 days (for troubleshooting)
- Backup copies: Up to 90 days after deletion

6.2 Content Deletion
- You can delete individual saved grids, shapes, and scripts in the app
- Public content can be switched back to private or removed from your account
- You can schedule full account deletion in-app and cancel during the grace period

7. SECURITY

7.1 Protection Measures
- HTTPS encryption for all data in transit
- Hashed passwords (bcrypt with salt)
- Environment-scoped access controls for application databases
- Regular security updates and patching
- Access controls and authentication required

7.2 Limitations
- No security system is 100% secure
- We cannot guarantee absolute protection against all attacks
- We will notify you of any confirmed data breaches affecting your account

8. YOUR RIGHTS
- You can request access, correction, export, or deletion of your personal data
- You can request account-level privacy support through the in-app Support Request form at /requestsupport
- You can use the Support Access purchase form at /support for one-time lifetime support membership payments
- We respond to verified privacy requests within 30 days

9. INTERNATIONAL USERS

9.1 GDPR (Europe)
If you are in the EU, you have rights under GDPR including:
- Right to access your data
- Right to correction
- Right to deletion ("right to be forgotten")
- Right to data portability
- Right to restrict processing
- Right to object to processing
- Right to lodge a complaint with your data protection authority

9.2 CCPA (California)
California residents have the right to:
- Know what personal information is collected (see Section 2)
- Know whether personal information is shared or sold (we do not sell data)
- Access and delete personal information through supported in-app controls or by request
- Opt-out of any future sales or sharing (we do not sell data)
- Non-discrimination for exercising CCPA rights

9.3 Other Jurisdictions
We comply with data protection laws in your jurisdiction. If you believe your rights are violated, contact us.

10. CHANGES TO THIS POLICY

- We may update this policy periodically
- Material changes will be announced in-app
- Continued use after updates constitutes acceptance
- We will maintain a version history accessible upon request

11. CONTACT US

If you have questions about this privacy policy or our practices:

Support Request URL: /requestsupport
Support Purchase URL: /support
Open either support form from the support actions in the app

We will respond to privacy inquiries within 30 days.

---

This privacy policy was published on February 22, 2026, is effective as of February 22, 2026, and applies to all users of the Game of Life application.
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

PrivacyPolicyDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
