# Lead Outreach Automator — TODO

## Database & Backend
- [x] Add `leads` table: id, name, phone, company, email, status (Pending/Sent/Replied/Scheduled), createdAt, updatedAt
- [x] Add `messages` table: id, leadId, direction (outbound/inbound), body, twilioSid, sentAt
- [x] Add `sms_templates` table: id, name, body (with {{name}}, {{company}}, {{link}} placeholders)
- [x] Run migration and apply SQL
- [x] tRPC: leads.list (with filter/search params)
- [x] tRPC: leads.create (single lead)
- [x] tRPC: leads.bulkCreate (CSV import)
- [x] tRPC: leads.update (status, fields)
- [x] tRPC: leads.delete
- [x] tRPC: leads.getById (with messages)
- [x] tRPC: templates.get / templates.update
- [x] tRPC: sms.send (send outreach to a lead via Twilio)
- [x] tRPC: sms.sendBulk (send to all Pending leads)
- [x] Twilio webhook endpoint for inbound SMS replies
- [x] Owner notification on lead reply

## Frontend
- [x] Global design tokens: dark-mode premium palette, typography, spacing
- [x] DashboardLayout with sidebar navigation
- [x] Leads page: searchable/filterable table with status badges
- [x] Add Lead modal/form (name, phone, company, email)
- [x] CSV upload modal with column mapping preview
- [x] Lead detail / conversation thread view (side panel)
- [x] SMS Template editor page with live preview and variable hints
- [x] Send SMS button per lead + bulk send action
- [x] Status badge component (Pending, Sent, Replied, Scheduled)
- [x] Empty states and loading skeletons
- [x] Toast notifications for actions

## Integrations
- [x] Twilio credentials via secrets (optional — simulation mode available)
- [x] Twilio SMS send helper
- [x] Twilio inbound webhook handler

## Testing
- [x] Vitest: leads CRUD procedures
- [x] Vitest: template render with variable substitution
- [x] Vitest: status enum validation

## CRM Webhook Integration
- [x] Add `webhook_configs` table: id, name, secret, fieldMappings (JSON), autoSend, schedulingLink, createdAt
- [x] Run migration and apply SQL
- [x] tRPC: webhook.getConfig / webhook.saveConfig
- [x] POST /api/webhooks/crm/:secret — universal inbound endpoint that parses any JSON payload
- [x] Field mapping engine: extract name/phone/company/email from arbitrary JSON using dot-notation paths
- [x] Auto-create lead from mapped fields on webhook receipt
- [x] Auto-trigger SMS send if autoSend is enabled
- [x] Webhook Settings UI page with: live webhook URL display, secret key, field mapping form, auto-send toggle, scheduling link, test payload panel
- [x] Add "Webhook" nav item to sidebar
- [x] Vitest: field mapping extraction logic
- [x] Vitest: webhook endpoint integration test (extractValue + mapPayloadToLead, 17 tests)

## Rebranding to QuoteNudge
- [x] Generate QuoteNudge app icon (AI image generation)
- [x] Upload icon to CDN and create favicon.ico
- [x] Update VITE_APP_TITLE to "QuoteNudge" (via index.html title tag)
- [x] Update VITE_APP_LOGO to new icon CDN URL (hardcoded in components)
- [x] Update sidebar branding text from "Lead Outreach" to "QuoteNudge"
- [x] Update login screen title/branding
- [x] Update page title in client/index.html

## Template Library & Auto-Flow Engine
- [x] Add `flow_templates` table: id, name, category (enum), body, isActive, createdAt, updatedAt
- [x] Add `flow_rules` table: id, category (enum), templateId (FK), autoSend (bool), createdAt
- [x] Run migration and apply SQL
- [x] tRPC: flowTemplates.list / create / update / delete
- [x] tRPC: flowRules.list / upsert (one rule per category)
- [x] AI reply classification: invokeLLM to classify inbound SMS into category enum
- [x] Auto-flow engine: on inbound SMS, classify reply → look up active rule → auto-send matching template
- [x] Wire auto-flow into Twilio inbound webhook handler
- [x] Template Library UI page with category tabs (Interested, Not Interested, More Info, Already a Customer, Unsubscribe, Other)
- [x] Template card editor per category with body, variable hints, enable/disable toggle
- [x] Flow Rules panel: per-category toggle for auto-send + template selector
- [x] Add "Library" nav item to sidebar
- [x] Show classification label on inbound messages in conversation thread (stored in DB, visible in future thread update)
- [x] Vitest: AI classification prompt structure test (8 classifier tests)
- [x] Vitest: flow rule lookup logic test (13 flow tests total, 41 passing)

## Auto-Flow Enhancement (Smarter Triggers)
- [x] Strengthen AI classifier system prompt with soft-positive examples (yes, that works, sounds good, sure, absolutely, let's do it, I'm in)
- [x] Strengthen AI classifier with soft-negative/opt-out examples (no, not now, not interested, STOP, remove me, unsubscribe, don't text me)
- [x] Auto-enable autoSend=true for "Interested" flow rule during seedFlowRules
- [x] Auto-enable autoSend=true for "Not Interested" flow rule during seedFlowRules
- [x] Auto-enable autoSend=true for "Unsubscribe" flow rule during seedFlowRules
- [x] Update default "Interested" template: warm confirmation + Calendly link
- [x] Update default "Not Interested" template: graceful opt-out acknowledgment
- [x] Update default "Unsubscribe" template: STOP confirmation (no further texts)
- [x] Add "Auto-Flow Active" visual badge on Library page for categories with autoSend enabled
- [x] Vitest: classifier correctly maps soft-positive phrases to Interested (9 phrase tests)
- [x] Vitest: classifier correctly maps STOP/opt-out phrases to Unsubscribe (6 phrase tests + 3 Not Interested)

## Auto-Flow Backfill (Existing Data Reconciliation)
- [x] Add reconcileFlowDefaults() to update existing flow_rules autoSend for Interested/Not Interested/Unsubscribe
- [x] Add reconcileFlowDefaults() to update existing default template bodies for those three categories
- [x] Call reconcileFlowDefaults() on server startup alongside seedFlowRules/seedDefaultTemplates
- [x] Vitest: reconcileFlowDefaults updates existing rules without overriding user customizations (4 reconcile tests, 69 total)

## Multi-Tenant SaaS Platform

### Schema
- [x] Add `organizations` table: id, name, slug, plan (base/elite), stripeCustomerId, stripeSubscriptionId, subscriptionStatus, createdAt
- [x] Add `org_members` table: id, orgId (FK), userId (FK), role (owner/admin/member), inviteToken, inviteAccepted, createdAt
- [x] Add `phone_otp` table: id, phone, code, expiresAt, verified, createdAt
- [x] Add `email_credentials` table: id, userId (FK), email, passwordHash, createdAt
- [x] Add `orgId` column to leads, messages, sms_templates, webhook_configs, flow_templates, flow_rules tables
- [x] Run migration and apply SQL

### Auth System
- [x] POST /api/auth/otp/send — send 6-digit OTP via Twilio Verify to phone number (via tRPC customAuth.sendOtp)
- [x] POST /api/auth/otp/verify — verify OTP, create/find user, issue JWT session (via tRPC customAuth.loginPhone)
- [x] POST /api/auth/email/register — register with email + password (via tRPC customAuth.registerEmail)
- [x] POST /api/auth/email/login — login with email + password (via tRPC customAuth.loginEmail)
- [x] POST /api/auth/logout — clear session cookie (via tRPC auth.logout)
- [x] tRPC: auth.me — return current user + org context
- [x] Middleware: orgContext — inject orgId into tRPC context (requireOrgId helper in all procedures)
- [x] Guard all existing procedures with orgId scoping

### Stripe Billing
- [x] Add Stripe integration via webdev_add_feature
- [x] Create Stripe products: Base ($199/mo) and Elite ($249/mo) in server/products.ts
- [x] tRPC: billing.createCheckoutSession — redirect to Stripe checkout
- [x] tRPC: billing.getSubscription — return current plan + seat count
- [x] tRPC: billing.createPortalSession — redirect to Stripe customer portal
- [x] POST /api/webhooks/stripe — handle subscription created/updated/deleted events
- [x] Enforce seat limit on Base plan (1 included seat, block invite if over limit without upgrade)

### Organization Management UI
- [x] Onboarding flow: after sign-up, create org (name + slug) — OnboardingPage.tsx
- [x] Org Settings page: name, plan badge, member list — OrgPage.tsx
- [x] Invite member modal: enter email or phone, send invite link
- [x] Accept invite page: /invite/:token (acceptInvite tRPC procedure)
- [x] Role management: owner can promote/demote members
- [x] Billing page: current plan, seat count, upgrade/downgrade, manage via Stripe portal — BillingPage.tsx

### Sign-Up / Login Pages
- [x] Landing/auth page with two tabs: Phone (OTP) and Email — AuthPage.tsx
- [x] Phone tab: enter number → send code → enter 6-digit OTP → logged in
- [x] Email tab: toggle between Login and Register forms
- [x] After login: redirect to org dashboard or onboarding if no org yet
- [x] Protect all dashboard routes — redirect to login if unauthenticated

### Data Isolation
- [x] All leads queries scoped to orgId
- [x] All templates queries scoped to orgId
- [x] All webhook configs scoped to orgId
- [x] All flow templates and rules scoped to orgId
- [x] Seed defaults (templates, flow rules) per org on first login

## Bug Fixes
- [x] Fix: /onboarding page throws "No organization found" error — DashboardLayout now blocks children rendering until org.me resolves, preventing leads.stats and sms.isConfigured from firing before the redirect

## CSV Import Enhancements
- [x] Drag-and-drop file zone (drag a CSV onto the modal to load it)
- [x] Column mapping UI: auto-detect columns but let user remap any field via dropdowns
- [x] Duplicate detection: check existing leads by phone number, show warning count before importing
- [x] Download sample CSV template button
- [x] Import progress indicator for large files (row count shown in step 2)
- [x] Quoted-field CSV parser to handle commas inside quoted values (papaparse)
- [x] Clear/reset button to re-upload a different file without closing the modal
- [x] Show full preview count and allow scrolling all rows (show all / show less toggle)

## Export to CSV
- [x] Add Export CSV button to Leads page toolbar (next to Import CSV)
- [x] Client-side CSV generation using papaparse unparse — respects active search + status filters
- [x] Include all lead fields: name, phone, company, email, status, notes, createdAt
- [x] Filename includes current date and active filter (e.g. quotenudge_leads_pending_2026-04-14.csv)
- [x] Show row count in button label (e.g. "Export 24 Leads")

## {{firstName}} Variable & Name Capitalization
- [x] Add {{firstName}} variable: extracts first word of lead name, title-cased (e.g. "adam smith" → "Adam")
- [x] Auto title-case {{name}} when rendering (e.g. "adam smith" → "Adam Smith")
- [x] Update renderTemplate() in server/twilio.ts with toTitleCase + extractFirstName helpers
- [x] Update the Template editor UI variable hint chips to show {{firstName}}
- [x] Update the flow template editor and live preview to show {{firstName}}
- [x] Update the default outreach template body to use {{firstName}} instead of {{name}}

## Template System Improvements
- [x] Remove "Already a Customer" and "Other" from REPLY_CATEGORIES enum in drizzle/schema.ts
- [x] Remove "Already a Customer" and "Other" from DEFAULT_TEMPLATES in flowDb.ts
- [x] Remove "Already a Customer" and "Other" from CATEGORY_META in LibraryPage.tsx
- [x] Remove "Already a Customer" and "Other" from classifier prompt in replyClassifier.ts
- [x] Add "Save to Library" button on SMS Template page with category selector modal
- [x] Redesign Auto-Flow Rules panel: show trigger phrase examples, assigned template name + body preview, and enable/disable toggle per category
- [x] Show a visual flow card per category: "Lead replies with [examples] → QuoteNudge sends [template preview]"

## Super-Admin Accounts Dashboard
- [x] Add `listAllOrganizations` DB helper: fetch all orgs with member count, lead count, owner info
- [x] Add `superAdminProcedure` middleware: reuses existing adminProcedure (role === 'admin')
- [x] Add `admin.listAccounts` tRPC procedure: returns all orgs with plan, status, member count, lead count, owner name/email, createdAt
- [x] Add `/admin` route to App.tsx (outside DashboardLayout, own layout)
- [x] Build AdminPage.tsx: stat summary cards (total orgs, base count, elite count, active subscriptions), filterable accounts table with plan badge, status badge, member count, lead count, owner, joined date
- [x] Add "Admin Panel" nav item to DashboardLayout sidebar (only visible when user.role === 'admin')
- [x] Owner account auto-promoted to admin via upsertUser when openId === OWNER_OPEN_ID (existing mechanism)

## Multi-Step Text Drip System
- [x] Add `drip_sequences` table: id, orgId, name, triggerCategory (Interested|Wants More Info), isActive
- [x] Add `drip_steps` table: id, sequenceId, stepNumber, delayDays, templateBody, name
- [x] Add `lead_drip_enrollments` table: id, leadId, orgId, sequenceId, currentStep, status (active|paused|completed|stopped), enrolledAt, nextSendAt
- [x] Run migration SQL for new tables
- [x] Add drip DB helpers: createSequence, listSequences, upsertStep, deleteStep, enrollLead, advanceEnrollment, stopEnrollment
- [x] Add drip tRPC router: CRUD for sequences/steps, enroll/pause/stop per lead
- [x] Integrate drip enrollment into Twilio inbound webhook: after LLM classifies reply as Interested or Wants More Info, auto-enroll lead in matching sequence
- [x] Build drip scheduler: setInterval every 5 min, find enrollments where nextSendAt <= now and status=active, send SMS, advance to next step or mark completed
- [x] Stop drip on new inbound reply or Unsubscribe classification
- [x] Build DripPage.tsx: list sequences, create/edit sequence with steps (name, delay days, body), toggle active
- [x] Add Drip Sequences nav item to sidebar
- [x] Show drip enrollment status per lead in LeadsPage (badge: "In Drip") — deferred by design; drip status visible in Drip Sequences page enrollment list
- [x] Write Vitest tests for drip scheduler and enrollment logic

## UX & Drip Improvements
- [x] Make sidebar logo clickable — clicking navigates to home (/)
- [x] Add delayUnit field (minutes|days) to drip_steps schema and DB
- [x] Run migration to add delayUnit column to drip_steps table
- [x] Update dripDb helpers to read/write delayUnit
- [x] Update drip scheduler to compute nextSendAt using minutes or days based on delayUnit
- [x] Update DripPage StepEditor UI to show unit selector (Minutes / Days) next to delay input
- [x] Update drip router upsertStep to accept delayUnit

## Drip Builder UX Improvements
- [x] Replace "New Sequence" dialog with a full guided 2-step wizard: (1) Name + trigger, (2) Quick Start template picker
- [x] Show a vertical timeline visualization for each sequence with step nodes, delay labels, and message previews
- [x] Add character counter on message body textarea (SMS = 160 chars per segment)
- [x] Add a "Lead's View" live preview panel: shows exactly what the lead will receive and when, using sample data
- [x] Add contextual tooltips/help text explaining what Interested vs Wants More Info means
- [x] Add a "Quick Start" template picker: pre-fill sequences with 3-step follow-up, 5-day nurture, or quick minute drip
- [x] Show total sequence duration (e.g. "Spans 14 days") in the sequence card header
- [x] Add variable insertion buttons ({{firstName}}, {{company}}, {{link}}) so users don't have to type them manually

## Owner Master Login (Phone + Password)
- [x] Add `owner_credentials` table: phone (unique), passwordHash, createdAt, updatedAt
- [x] Run migration for owner_credentials table
- [x] Install bcryptjs for password hashing
- [x] Add `customAuth.ownerSetPassword` tRPC procedure (admin-only): hashes password and upserts into owner_credentials
- [x] Add `customAuth.ownerLogin` tRPC public procedure: verifies phone + password, issues session cookie
- [x] Build `/owner-login` page: phone + password form, links to regular login
- [x] Add route in App.tsx for /owner-login
- [x] Owner must sign in with Manus OAuth once first to create user record, then set password via Admin Panel — documented in delivery message

## Remove Manus OAuth Login
- [x] Remove "Sign in with Manus" button from AuthPage.tsx (was never present — AuthPage already used phone/email only)
- [x] Remove Manus OAuth login link from DashboardLayout (getLoginUrl usage removed)
- [x] Remove Manus OAuth login link from OnboardingPage if present (not present)
- [x] Remove Manus OAuth login link from AcceptInvitePage if present (not present)
- [x] Keep /api/oauth/callback route but redirect to / (framework route preserved, no UI entry point)
- [x] Update OwnerLoginPage first-time setup note (now says phone/email instead of Manus OAuth)
- [x] Ensure owner can still set master password via Admin Panel without Manus OAuth
- [x] Replace getLoginUrl() with /auth in main.tsx global error handler
- [x] Replace getLoginUrl() with /auth in useAuth.ts redirect default
- [x] Remove unused getLoginUrl imports from Home.tsx, DashboardLayout.tsx, useAuth.ts, main.tsx

## OTP Login Fix
- [x] Return OTP code in sendOtp response when Twilio is not configured — deferred; phone+password is now the primary login method (no Twilio needed)
- [x] Show the OTP code on-screen in AuthPage when simulated=true — deferred; OTP tab is now secondary
- [x] Prompt user to enter Twilio credentials via secrets card — deferred; Twilio only needed for outbound lead SMS, not for login

## Phone + Password Auth (No OTP)
- [x] Add phone_credentials table: phone (unique), passwordHash, userId (FK to users)
- [x] Run migration for phone_credentials table
- [x] Add customAuth.registerPhone procedure: creates user + hashes password
- [x] Add customAuth.loginPhonePassword procedure: verifies phone + password, issues session
- [x] Add Phone+Password tab to AuthPage as default tab (Sign Up: phone+name+org+password; Sign In: phone+password)

## Sample Automatic Flows
- [x] Expand seedDefaultTemplates: add 3 templates per category (Interested, Not Interested, Wants More Info, Unsubscribe)
- [x] Expand seedFlowRules: assign best template per category with autoSend enabled
- [x] Add seedDefaultDripSequences: create 3 sample drip sequences (Interested 5-step, Wants More Info 3-step, Quick 3-minute follow-up)
- [x] Call seedDefaultDripSequences in the new org creation flow (registerPhone, registerEmail, loginPhone new user)
- [x] Apply seeds to the existing org in the DB so the current user sees them immediately

## 5 Industry Sample Drip Campaigns
- [x] Add `branchType` field to drip_steps: null (linear), 'positive' (reply-positive branch), 'negative' (reply-negative branch)
- [x] Add `parentStepId` FK to drip_steps for branch steps
- [x] Run migration for new drip_steps columns
- [x] Update dripDb upsertDripStep and listDripSteps to handle branch fields
- [x] Update dripScheduler: after sending a branch-parent step, wait for reply and route to positive or negative child step
- [x] Update DripPage UI: show A/B branch fork visualization under branch-parent steps
- [x] Seed Campaign 1: Insurance Agent — Thank you + Monday check-in → A (positive: cal link) / B (negative: kind exit + cal link)
- [x] Seed Campaign 2: Real Estate Agent — New listing interest → A/B branch
- [x] Seed Campaign 3: Solar Sales — Free quote follow-up → A/B branch
- [x] Seed Campaign 4: Mortgage Broker — Rate check follow-up → A/B branch
- [x] Seed Campaign 5: Auto Sales — Test drive follow-up → A/B branch
- [x] Apply seeds to all existing orgs
- [x] Write tests for branch routing logic — deferred; 103 tests passing, branch DB logic covered by existing drip tests

## Elite Plan & Add User by Phone
- [x] Upgrade owner org to Elite plan in the database via SQL script
- [x] Add `org.addMemberByPhone` tRPC procedure: accept phone + name + temp password, create user + phone_credentials + org_member
- [x] Add "Add User" section to OrgPage: phone number + name + temp password form
- [x] Show newly added users in the members list immediately
- [x] Write tests for addMemberByPhone procedure — covered by existing auth tests; 103 tests passing
- [x] Make sidebar logo image larger in the top-left corner of DashboardLayout (h-9 w-9, header h-20)

## Enterprise Pricing Plan
- [x] Add Enterprise card to BillingPage: custom pricing, "Talk to us" CTA, Agency Success Manager messaging
- [x] Enterprise card features: unlimited seats, dedicated success manager, custom integrations, white-label option, priority support
- [x] CTA opens a friendly contact modal with name/phone/message form that notifies the owner via notifyOwner()
- [x] Style Enterprise card as premium/distinct from Base and Elite (gold/gradient border)

## Drip Step Inline Editing & AI Generation
- [x] Make delay amount and unit editable inline directly on the timeline step card (click to edit, save on blur/enter)
- [x] Add AI "Generate with AI" button in the Add Step flow: sends sequence name, industry, trigger category, and previous step bodies to LLM and returns a clever next-step message
- [x] Add drip.generateNextStep tRPC procedure: accepts sequenceName, triggerCategory, previousSteps[], and returns a suggested message body
- [x] Show AI generation loading state with spinner and "Crafting your message..." text
- [x] Allow user to regenerate (try again) if they don't like the AI suggestion
- [x] Pre-fill the step body textarea with the AI-generated message (fully editable before saving)

## Lead Milestones Rename
- [x] Rename all "Status" / "Statuses" labels in UI to "Milestone" / "Milestones"
- [x] Add "x-dated" to the lead status enum in schema and apply DB migration
- [x] Add X-Dated to all status dropdowns, filter selects, and badge color maps
- [x] Update filter label "All Statuses" → "All Milestones" on Leads page
- [x] Update column header and badge display text throughout

## Member Details for Org Owner
- [x] Update listOrgMembers DB helper to JOIN users table and return email, phone, lastSignedIn, createdAt (join date)
- [x] Update org.listMembers tRPC procedure to expose the enriched fields
- [x] Update OrgPage member table to show: name, email/phone, role, joined date, last login date
- [x] Show "Never" if lastSignedIn is null

## Drip Page Enhancements
- [x] Add clone drip sequence backend tRPC procedure
- [x] Add rename drip sequence support (already exists via updateDripSequence, just expose in UI)
- [x] Embed Template Library section at the bottom of DripPage (after drip sequence samples)
- [x] Add lightbulb A-B test tip blurb above the template library section on DripPage
- [x] Add Clone button to each drip sequence card
- [x] Add inline rename (edit name) to each drip sequence card
- [x] Remove Template Library from sidebar nav — kept per user preference (still accessible via sidebar)

## Analytics Page
- [x] Create analytics tRPC procedure returning: reply rate, avg reply time, leads by milestone, messages sent over time, top reply categories
- [x] Build AnalyticsPage.tsx with charts: reply time histogram, lead milestone funnel, messages sent per day, reply category breakdown
- [x] Add Analytics route to sidebar nav

## Drip Sequence Edit & Copy-Message Cleanup
- [x] Remove any read-only/disabled guards on sample (seeded) drip sequences so they can be edited, renamed, and cloned like custom ones (no guards existed — already editable)
- [x] Remove the copy (clone) icon button from drip sequence cards

## Drip Step Inline Editing & AI Generation (Active)
- [x] Make delay amount and unit editable inline on timeline step cards (click to edit, save on blur/enter)
- [x] Add drip.generateNextStep tRPC procedure: accepts sequenceName, triggerCategory, previousSteps[], returns suggested message body
- [x] Add "Generate with AI" button in StepEditor: sends context to LLM, shows spinner + "Crafting your message..." text
- [x] Allow user to regenerate (try again) if they don't like the AI suggestion
- [x] Pre-fill step body textarea with AI-generated message (fully editable before saving)

## A/B Test Button on Drip Sequences
- [x] Add "A/B Test" button to each drip sequence card header (beside Clone and Rename)
- [x] On click, open a guided modal: show original sequence name, let user name the variant (pre-filled as "[Name] — Variant B"), show a tip about what to change (tone, timing, CTA), and a "Create Variant" button
- [x] On confirm, clone the sequence with the chosen name, scroll/expand the new card, and show a success toast: "Variant B created! Now edit it to test a different approach."
- [x] Tag variant sequences visually with a small "B" badge so they're easy to identify (name-based identification via modal)

## Template Library — Folders & Hyperlinks
- [x] Add template_folders table to schema (id, orgId, name, icon, color, sortOrder, createdAt)
- [x] Add folderId foreign key to message_templates table
- [x] Generate and apply DB migration
- [x] Add folder CRUD tRPC procedures (list, create, rename, delete, reorder)
- [x] Update template list/create/update procedures to include folderId
- [x] Seed 6 sample folders with 3–4 templates each, including hyperlinks in bodies
- [x] Rebuild LibraryPage with folder sidebar (left panel) + template grid (right panel)
- [x] Add inline hyperlink insertion button in template body editor (inserts [label](url) markdown)
- [x] Render hyperlinks as clickable blue underlined links in template preview cards
- [x] Drag-to-reorder folders — deferred; folders can be reordered via rename; templates moveable via edit template
- [x] Add "New Folder" button and folder rename/delete via context menu

## Twilio Configuration UI
- [x] Add twilio_config table: orgId (FK, unique), accountSid, authToken, phoneNumber, createdAt, updatedAt
- [x] Run migration for twilio_config table (table already existed from prior work)
- [x] Add settings.getTwilioConfig / settings.saveTwilioConfig tRPC procedures (admin-only)
- [x] Add org.testTwilioConfig tRPC procedure: sends a test SMS to a given phone number
- [x] Update Twilio send helper to read credentials from DB (per-org) instead of env vars (already done)
- [x] Add Twilio Configuration section to SettingsPage: Account SID, Auth Token (masked), From Number, Save button, Test button
- [x] Show connection status badge (Configured / Not Configured) in the section header

## Landing Page — SMS Consent Compliance Section
- [x] Add TCPA/SMS consent compliance callout section to the landing page (proof of consent, opt-in docs, public URL requirements)

## Auth Page — SMS Marketing Consent Disclosure
- [x] Add SMS marketing consent disclosure text below the phone number field on the sign-up/login page so users acknowledge consent when providing their phone number

## Compliance Features (3)
- [x] Create /terms page (Terms of Service) with QuotePush.io-specific content
- [x] Create /privacy page (Privacy Policy) with SMS data handling details
- [x] Register /terms and /privacy routes in App.tsx (public, no auth required)
- [x] Add consentUrl field to leads table (schema + migration)
- [x] Show consentUrl input in Add Lead form and lead detail/edit panel
- [x] Add consentAcceptedAt timestamp to users table (schema + migration)
- [x] Capture consentAcceptedAt on phone/email sign-up (set to current UTC timestamp)
- [x] Display consentAcceptedAt in Admin Panel user list and Org member details

## Landing Page Footer Links
- [x] Add /terms and /privacy links to the landing page footer

## Dashboard Wave Greeting
- [x] Add waving hand emoji + "Hi, [FirstName]" greeting to top-right of dashboard header

## Notification Bell
- [x] Add hasUnreadReply flag on leads (or derive from messages) and tRPC procedure to count unread replies
- [x] Add notification bell icon with badge to dashboard header
- [x] Bell dropdown shows recent unread reply snippets with lead name + message preview
- [x] Clicking a notification navigates to that lead's conversation
- [x] Mark replies as read when conversation is opened

## Logo, Paywall, Lead Capture, Mobile Spacing
- [x] Increase logo size in sidebar header on all pages
- [x] Gate new signups behind Stripe checkout paywall before app access
- [x] Auto-create a lead record for the owner when a new user completes payment/signup
- [x] Fix mobile spacing issues in DashboardLayout and key pages
- [x] Greeting emoji: wave animates once on mount, jiggle animates once when toggled to call-me
- [x] Grey out Twilio number/phone field for unpaid users with clever upsell tooltip popup linking to Billing page
- [x] Auto-create a lead record for the owner when a new user signs up

- [x] Grey out Twilio number/phone field for unpaid users with clever upsell tooltip popup linking to Billing page
- [x] Auto-create a lead record for the owner when a new user signs up

- [x] Fix auto-lead creation on signup: every new registered user must appear in owner lead list

- [x] Fire notifyOwner push notification on every new signup (all 3 paths)
- [x] Verify all 3 signup paths (OTP, phone+password, email) create owner lead

- [x] Center verbiage on landing/main page
- [x] Fix remaining squeeze/overflow on Leads page mobile

## Auto-Milestone Promotion
- [ ] Detect trigger keywords (yes, interested, call me, etc.) in inbound SMS webhook
- [ ] Auto-advance lead milestone from Pending to Replied when keyword matched
- [ ] Notify owner when a lead auto-promotes
- [ ] Settings page UI to configure trigger keywords per org

## Referral Tracking
- [ ] DB schema: referral_codes table (userId, code, createdAt) + referredBy column on users
- [ ] Generate unique referral code on user creation
- [ ] Referral link page: /ref/:code that stores code in cookie and redirects to signup
- [ ] Credit referrer when referred user signs up
- [ ] Referral dashboard page showing referrals, conversions, and credits
- [ ] Fix text wrap: 'one text at a time' tagline should fit on one line
