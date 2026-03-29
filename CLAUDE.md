# Claude Code Rules — 13 Run League

## HARD RULES (never break these)

### Email and SMS
**NEVER send an email or SMS without Colby's explicit approval of every word of the content AND an explicit instruction to send.**

This means:
- Never call `/api/recap` or any send endpoint directly
- Never call Resend, Twilio, or any messaging API
- Build the preview tool. Hand it to Colby. He sends it.
- "Get the email out" means build the mechanism — NOT pull the trigger

This rule was violated on March 29, 2026. A Week 1 recap email went to 31 people with wrong content ($0 pot) and no commissioner review. It cannot be unsent.

### No pitchers
Never mention pitchers in any user-facing copy, blurbs, or emails. We don't care about pitchers.

### No unverified player claims
Never write that a specific player is on a specific team unless it is verified from a live data source in the current session. Rosters change. Juan Soto is on the Mets. Carlos Correa is in Houston. Nolan Arenado went to Arizona. We have been burned by stale knowledge.
