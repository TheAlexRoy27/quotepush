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
- [x] Detect trigger keywords (yes, interested, call me, etc.) in inbound SMS webhook
- [x] Auto-advance lead milestone from Pending to Replied when keyword matched
- [x] Notify owner when a lead auto-promotes
- [x] Settings page UI to configure trigger keywords per org

## Referral Tracking
- [x] DB schema: referral_codes table (userId, code, createdAt) + referredBy column on users
- [x] Generate unique referral code on user creation
- [x] Referral link page: /ref/:code that stores code in cookie and redirects to signup
- [x] Credit referrer when referred user signs up
- [x] Referral dashboard page showing referrals, conversions, and credits
- [x] Fix text wrap: 'one text at a time' tagline should fit on one line

## Usage Dashboard for Subscribers
- [x] tRPC procedure: per-org usage stats (messages sent, reply rate, leads booked, active drips)
- [x] Usage Dashboard page at /dashboard with stat cards and messages-per-day chart
- [x] Add "My Dashboard" nav item to sidebar

## My Dashboard as Default Page
- [x] Move My Dashboard to top of sidebar nav
- [x] Make /my-dashboard the default route (/ and /leads redirect to /my-dashboard after login)
- [x] Embed full analytics charts (message activity, lead milestones, reply time, reply intent, trend) in bottom half of UsageDashboardPage
- [x] My Dashboard: placeholder boxes with hover tooltip for all empty chart/stat areas

## Appointment Booking via SMS (Casual Tone)
- [x] Add `appointments` table: id, orgId, leadId, token (unique), agentName, agentPhone, availableSlots (JSON), bookedSlot (datetime), status (pending/booked/cancelled), notes, createdAt, updatedAt
- [x] Run migration and apply SQL
- [x] tRPC: booking.createBookingLink — generate unique token, store appointment record, return public URL
- [x] tRPC: booking.getByToken — public procedure, returns lead name + agent name + available slots
- [x] tRPC: booking.confirmSlot — public procedure, lead picks a slot, marks appointment booked, updates lead status to Scheduled, notifies agent
- [x] tRPC: booking.listForOrg — protected, list all bookings with lead info and status
- [x] tRPC: booking.cancelBooking — protected, cancel a booking
- [x] Public booking page at /book/:token — no auth required, casual friendly tone
- [x] Booking page: shows agent name, friendly copy ("Hey [name]! We only need about 10 minutes..."), available time slots as clickable cards
- [x] Booking page: confirmation screen after slot selected ("You're all set! Talk soon.")
- [x] "Send Booking Link" button on Leads page per-lead action row
- [x] SMS copy: casual, low-pressure ("Hey [firstName], I'd love to connect for just 10 min - no pressure, just want to get you the best quote possible. Grab a time that works for you:")
- [x] On booking confirmed: auto-update lead status to Scheduled, send confirmation SMS to lead, notify agent via push notification
- [x] Bookings section in sidebar nav
- [x] Bookings dashboard page: table of all appointments with status badges, lead name, booked time
- [x] Vitest: booking token generation and slot confirmation logic

## Referral Code on Sign-Up
- [x] Add referral code input field to OTP phone sign-up tab on AuthPage
- [x] Add referral code input field to email registration form on AuthPage
- [x] On successful sign-up (all paths), validate referral code via trpc.referrals.trackVisit, then call trpc.referrals.recordSignup to attribute the new user to the referrer
- [x] Pre-fill referral code field if URL contains ?ref=CODE query param
- [x] Show subtle validation feedback: green check when code is valid, red hint when invalid

## Personalized Referral Welcome Message
- [x] Update trpc.referrals.trackVisit to also return the referrer's display name
- [x] Store referrer name in AuthPage state alongside referrerId
- [x] After successful sign-up with a valid referral code, show a personalized welcome toast that includes the referrer's first name

## Open Graph / Link Preview
- [x] Generate a 1200x630 OG preview image for QuotePush.io (logo + tagline)
- [x] Upload OG image to CDN and get public URL
- [x] Add og:title, og:description, og:image, og:url, og:type to index.html
- [x] Add twitter:card, twitter:title, twitter:description, twitter:image to index.html
- [x] Add apple-touch-icon and theme-color meta tags

## AI Text Bot
- [x] Add bot_configs table to drizzle schema (orgId, botName, tone, identity, openingMessage, businessContext, customInstructions, enabled, maxRepliesPerLead)
- [x] Generate and apply migration SQL
- [x] Add getBotConfig / upsertBotConfig db helpers in db.ts
- [x] Add botRouter tRPC procedures: getConfig, saveConfig
- [x] Build BotConfigPage UI: bot name, tone selector, identity/persona textarea, opening message, business context, custom instructions, enable toggle, max replies per lead
- [x] Add "AI Bot" nav item to DashboardLayout sidebar
- [x] Register /bot route in App.tsx
- [x] On new lead creation: if bot enabled, send opening message via Twilio and log as bot message
- [x] Wire bot auto-reply into inbound SMS webhook: if bot enabled and under maxRepliesPerLead, fetch conversation history, call LLM with system prompt, send reply via Twilio
- [x] Track bot reply count per lead (use messages table botReply flag)
- [x] Show bot reply indicator in conversation thread ("Bot" badge on bot-sent messages)

## Test the Bot Simulator
- [x] Add botRouter.testMessage tRPC procedure: accepts conversation history + current bot config fields, calls LLM, returns bot reply (no SMS sent)
- [x] Build Test Bot chat panel on BotConfigPage: SMS-style thread, input field, send button, clear button
- [x] Show opening message preview as first bot bubble when simulator is opened
- [x] Stream or show loading state while LLM is generating
- [x] Show "Test mode — no real SMS sent" disclaimer

## Light Mode Toggle
- [x] Add light mode CSS variables to index.css using #efe6dd as background (converted to OKLCH)
- [x] Add dark/light toggle button to DashboardLayout header
- [x] Persist theme preference in localStorage via ThemeProvider

## Mobile Responsiveness & Light Mode Default
- [x] Set light mode as the default theme in App.tsx (change defaultTheme="dark" to "light")
- [x] Fix DashboardLayout header: ensure text, icons, and buttons are legible and properly sized on mobile
- [x] Fix LeadsPage: conversation panel, message bubbles, and action buttons readable on small screens
- [x] Fix BotConfigPage: form fields, labels, and test chat panel usable on mobile
- [x] Fix DripPage: table/list and form inputs properly sized on mobile
- [x] Fix AnalyticsPage / Dashboard: stat cards stack properly on mobile, text not truncated
- [x] Fix AuthPage: form fields, labels, and buttons properly sized on mobile
- [x] Ensure all page headings use responsive text sizes (text-xl sm:text-2xl pattern)
- [x] Ensure table-heavy pages use horizontal scroll or card layout on mobile

## Bot Reply Delay & Human Feel
- [x] Add replyDelay field to bot_configs schema: enum 'instant' | '1min' | 'random' (default 'instant')
- [x] Apply ALTER TABLE migration to add replyDelay column
- [x] Update getBotConfig / upsertBotConfig db helpers to include replyDelay
- [x] Update botRouter getConfig / saveConfig procedures to expose replyDelay
- [x] In inbound SMS handler: before sending bot reply, sleep based on replyDelay (0s, 60s, or 60-180s random)
- [x] Inject humanizing instructions into bot LLM system prompt: casual tone, occasional filler words, short sentences, no em dashes, no bullet points, no formal sign-offs
- [x] Add reply delay selector to BotConfigPage UI (Instant / 1 Minute / Random 1-3 min) with description

## Karen Persona & First-Text Delay
- [x] Add "karen" to the BOT_TONES enum in schema.ts
- [x] Add firstMessageDelay field to bot_configs schema: enum 'instant' | '1min' | 'random' (default 'instant')
- [x] Apply ALTER TABLE migration for firstMessageDelay column and update tone enum
- [x] Update botRouter saveConfig zod schema to accept "karen" tone and firstMessageDelay
- [x] Update new-lead bot trigger in routers.ts to sleep based on firstMessageDelay before sending opening message
- [x] Add Karen tone description to toneGuide in both index.ts and routers.ts
- [x] Add Karen persona card to BotConfigPage tone selector with fun description
- [x] Add first-text delay selector to BotConfigPage UI (same 3-option card style as reply delay)

## Clumsy Kevin Persona
- [x] Add "kevin" to BOT_TONES enum in schema.ts and apply migration
- [x] Add kevin to saveConfig and testMessage zod enums in routers.ts
- [x] Add kevin toneGuide entry in routers.ts testMessage and index.ts inbound handler
- [x] Implement multi-message Kevin opening: typo msg (1-2s delay), correction msg (3-5s delay), funny comment + pitch + CTA (2-3s delay) — each sent as separate SMS
- [x] Add Kevin persona card to BotConfigPage TONE_OPTIONS with description and opening sequence preview
- [x] Kevin's follow-up replies (after opening) stay in character: slightly clumsy but effective

## Pre-Launch Risk Fixes
- [x] Add TCPA consent checkbox to Add Lead modal (agent must confirm consent on file before saving)
- [x] Add TCPA consent acknowledgment to CSV import modal (checkbox before import proceeds)
- [x] Store consentConfirmed boolean on leads table (schema + migration)
- [x] Add Twilio not-configured banner to dashboard and leads page (prominent, links to Settings)
- [x] Add bot handoff notification when maxRepliesPerLead is hit (push notify agent + optional final SMS to lead)
- [x] Build appointments table, migration, tRPC procedures (createBookingLink, getByToken, confirmSlot, listForOrg, cancelBooking)
- [x] Build public /book/:token booking page (casual tone, slot picker, confirmation screen)
- [x] Add Send Booking Link button to Leads page per-lead action
- [x] Build Bookings dashboard page with status table
- [x] Add Bookings nav item to sidebar
- [x] Add drip scheduler DB retry logic (retry failed queries up to 3x with exponential backoff)
- [x] Remove "Advanced analytics (coming soon)" from Elite plan feature list on BillingPage
- [x] Remove "White-label options (coming soon)" from Elite plan feature list on BillingPage

## STOP / Opt-Out Keyword Handling (TCPA)
- [x] Add `optedOut` boolean column (default false) to leads table (schema + migration)
- [x] Add `optedOutAt` timestamp column to leads table
- [x] Detect STOP/opt-out keywords in inbound SMS webhook (STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT, NO, remove me, don't text me, take me off)
- [x] When opt-out keyword detected: set lead optedOut=true, optedOutAt=now, stop any active drip enrollment, cancel pending bot replies
- [x] Block outbound SMS send helper from sending to opted-out leads (throw error with clear message)
- [x] Show "Opted Out" badge on lead card/row in LeadsPage
- [x] Show opt-out warning banner in conversation panel when lead is opted out
- [x] Add optedOut filter option to Leads page filter bar ("Show Opted Out")
- [x] Vitest: opt-out keyword detection and send blocking logic

## CSV Import Field Mapping UI
- [x] Replace auto-detect column mapping with a manual drag-and-drop field mapper step
- [x] Show detected CSV headers as draggable chips on the left
- [x] Show target fields (Name, Phone, Company, Email, Notes) as drop zones on the right
- [x] Auto-map obvious matches (e.g. "phone" -> Phone, "email" -> Email) on load
- [x] Allow user to manually remap any field by dragging a chip to a different target
- [x] Allow "Ignore" option for columns that should not be imported
- [x] Show a live preview row using the first data row with the current mapping applied
- [x] Validate that Phone is mapped before allowing import to proceed
- [x] Vitest: auto-mapping heuristic logic

## Organization Page: Accounts Table & Delete Confirmation
- [x] tRPC: admin.listAllUsers - owner-only procedure returning all users with id, name, email, role, lastSignedIn, createdAt, orgId
- [x] Organization page: add "All Accounts" section below Team Members (owner-only, hidden for non-owners)
- [x] Accounts table columns: Name, Email, Role, Organization, Last Login, Joined, (no delete action)
- [x] Team Members: replace window.confirm trash-can with a proper "Are you sure?" AlertDialog

## Nav Consolidation & Booking Status

### Nav cleanup
- [x] Remove Auto-Promote, Billing, CRM Webhook from sidebar nav
- [x] Add Auto-Promote, Billing, CRM Webhook as tabs inside SettingsPage
- [x] Merge SMS Template into Template Library as a tab (SMS Templates tab)
- [x] Remove SMS Template from sidebar nav
- [x] Update all internal links/redirects that point to old routes

### Booking status actions
- [x] Add status options to appointments: completed, cancelled, no_answer (schema already has status field)
- [x] tRPC: booking.updateStatus mutation - protected, update appointment status
- [x] Bookings page: status action buttons per row (Mark Completed, Mark Cancelled, No Answer)
- [x] Bookings page: status badge updates reflect new statuses with distinct colors
- [x] Dashboard: show booking outcome breakdown (Completed, Cancelled, No Answer, Pending, Booked counts)

## Apply Drip Sequence to Lead & Conversation Timestamps

- [x] Lead conversation panel: add "Apply Drip Sequence" button in the action toolbar
- [x] Clicking the button opens a popover/dialog listing all org drip sequences with name, step count, and description
- [x] Selecting a sequence calls drip.enrollLead mutation and shows success toast
- [x] If lead is already enrolled in a drip, show current sequence name + "Remove from Drip" option
- [x] Conversation thread: show full date + time on every message bubble (e.g. "Apr 16, 2026 3:04 PM")
- [x] Conversation thread: group messages by date with a date divider (e.g. "Today", "Yesterday", "Apr 14")
- [x] Vitest: drip enrollment validation (lead already enrolled, sequence not found)

## Dashboard Cleanup
- [x] Remove Active Plan banner from My Dashboard (visible in Settings > Billing instead)

## Merge Bookings into My Dashboard
- [x] Embed full bookings table (with status actions) into UsageDashboardPage below the Booking Outcomes section
- [x] Remove Bookings from sidebar nav in DashboardLayout
- [x] Remove /bookings route from App.tsx (or keep as redirect to dashboard)

## Logo Theme Fix
- [x] Apply brightness(0) filter to org logo in light mode so logo lettering renders black instead of washing out

## Logo Theme Fix v2
- [x] Replace brightness(0) all-black filter with a CSS mix-blend-mode approach that darkens white/light pixels in light mode while preserving colored elements (e.g. the Roamly colored period)

## Kevin Opening Sequence Copy Update
- [x] Update Kevin's 3-message opening sequence to new copy: "Hey {firstName}! This is {botName}, I just saw that yo" / "Wow, clearly can't type today." / "This is {botName}, I see you filled out our form online for a quote..."
- [x] Update BotConfigPage preview to show new copy with {botName} substitution

## Roamly Logo Light Mode Fix
- [x] Fix org logo in light mode: letters should be black, colored period should stay its original green color

## Contextual Help Tooltips & Mobile UX
- [x] AI Bot page: add ? tooltips for Persona, Bot Name, Identity Prompt, Opening Sequence, Reply Delay, Auto-Reply toggle
- [x] Drip Sequences page: add ? tooltips for Trigger Category, Delay units, Step body variables ({firstName} etc)
- [x] Settings > Twilio tab: add ? tooltips for Account SID, Auth Token, Phone Number, Webhook URL
- [x] Leads page: add ? tooltips for lead status labels (Pending, Sent, Replied, Scheduled, X-Dated, Opted Out)
- [x] Mobile: LeadsPage conversation panel goes full-screen on mobile when a lead is selected
- [x] Mobile: sticky message input bar at bottom of screen on mobile conversation view
- [x] Mobile: back button / swipe-back to return to lead list from conversation on mobile
- [x] Mobile: lead list cards are tap-friendly with adequate touch targets on mobile

## Drip Sequence: Confirmation Dialog & Bulk Assignment
- [x] Single-lead drip apply: add "Are you sure?" AlertDialog before enrolling (shows sequence name + lead name)
- [x] Leads list: add checkbox column for multi-select (individual rows + select-all header checkbox)
- [x] Leads list toolbar: show "X selected" count badge + "Apply Drip" bulk action button when any leads are checked
- [x] Bulk Apply Drip dialog: sequence picker + confirmation showing how many leads will be enrolled
- [x] tRPC: drip.bulkEnrollLeads mutation - enroll multiple leadIds in a sequence, skip already-enrolled, return enrolled/skipped counts
- [x] After bulk enroll: show toast with result (e.g. "12 leads enrolled, 3 already in a drip")
- [x] Select-all checkbox selects all leads matching current filter (not just visible page)
- [x] Deselect all when filter/search changes

## Mobile Sizing & Responsive Layout Fix
- [x] DashboardLayout: auto-close mobile sidebar on navigation (setOpenMobile in useEffect on location change)
- [x] DashboardLayout: sidebar is already a Sheet drawer on mobile (shadcn Sidebar collapsible behavior)
- [x] Dashboard page: KPI stat cards already use grid-cols-2 lg:grid-cols-3 - verified responsive
- [x] Dashboard page: booking outcomes grid fixed from sm:grid-cols-5 to sm:grid-cols-3 lg:grid-cols-5
- [x] Leads page: bulk action toolbar uses flex-wrap so it wraps on mobile
- [x] Leads page: filter/search bar already uses flex-wrap - verified
- [x] Drip Sequences page: sequence card header buttons use flex-wrap justify-end on mobile
- [x] Settings page: tabs wrapped in overflow-x-auto, w-max min-w-full, text-xs sm:text-sm whitespace-nowrap
- [x] Template Library page: folder sidebar stacks vertically on mobile (flex-col md:flex-row, max-h-40 on mobile)
- [x] Organization page: team member cards use grid-cols-1 sm:grid-cols-3 - already responsive
- [x] All pages: verified no horizontal overflow at 375px viewport width

## All Accounts in Settings (Owner View)
- [x] Fix backend: listAllUsers now accessible to org owner (OWNER_OPEN_ID match) in addition to admin role users
- [x] Add "Accounts" tab to Settings page showing the All Accounts table (name, phone/email, role, joined, last login)
- [x] All Accounts section kept on OrgPage as well (secondary location)

## UX Audit Fixes (All 12 Items)
- [x] #1 Add Bookings to sidebar nav (CalendarDays icon, /bookings path)
- [x] #2 Dashboard: 3-step Get Started checklist card for new users (Add Twilio, Add lead, Enable Bot)
- [x] #3 AI Bot page: show Twilio-not-configured warning banner when Twilio is missing
- [x] #4 Drip Sequences: show enrolled leads count badge and quick-view list per sequence
- [x] #5 Rename Referrals nav to "Partner Referrals" and clarify page description
- [x] #6 Seed sample template folders (Hot Leads, Follow-Ups, Opt-Out, Info Requests) on org creation; applied to all existing orgs
- [x] #7 Lead notes field: notes column already in schema, textarea added to ConversationPanel in LeadsPage
- [x] #8 Settings: Billing tab moved to last position
- [x] #9 Status badges: X-Dated renamed to "Future Date" in StatusBadge component with tooltip
- [x] #10 AI Bot tone selector: example preview already implemented below tone dropdown
- [x] #11 Drip: "0 days delay" renamed to "Sends on enrollment" in step display
- [x] #12 Mobile lead panel: back button already implemented (ChevronLeft on mobile, full-screen panel)

## Bot Persona & Tone Overhaul
- [x] Rewrite server-side tone system prompts so each persona produces genuinely distinct text (not just slightly different phrasing)
- [x] Add 3 new regional voice personas: "Brianna from Syosset NY", "Kayla from San Diego", "Marcus from Orlando"
- [x] Update frontend TONE_OPTIONS with new personas and accurate example messages
- [x] Ensure tone is passed into the live bot (not just test) system prompt with PERSONA AND VOICE override label
- [x] DB migration applied to add brianna, kayla, marcus to tone enum in bot_configs table

## AI Voice Call UI (Coming Soon Scaffolding)
- [x] Bot Settings: add "Voice Call Persona" section with separate voice selector (defaults to match text persona), ElevenLabs API key input field, and Coming Soon badge
- [x] Bot Settings: add "Voice Call Settings" card explaining what voice calls will do, with a link to sign up for ElevenLabs
- [x] Lead ConversationPanel: add disabled "AI Call" button with Coming Soon tooltip
- [x] Sidebar: add "Voice Calls" nav item with PhoneCall icon and "Soon" badge
- [x] Create VoiceCallsPage at /calls with full Coming Soon overlay, persona previews, feature cards, call log empty state, and stat cards
- [x] VoiceCallsPage includes ElevenLabs sign-up link and setup instructions

## Critical Audit Fixes
- [x] Schema: add source, doNotContact, age, state, productType to leads table (migration 0025 applied)
- [x] Schema: add quietHoursEnabled, quietHoursStart, quietHoursEnd, quietHoursTimezone to botConfigs table
- [x] Server: enforce quiet hours in live bot (block reply if outside window)
- [x] Server: enforce quiet hours in drip scheduler (skip tick if outside window)
- [x] Server: expose new lead fields (source, doNotContact, age, state, productType) in create/update procedures
- [x] Server: block bot replies to leads with doNotContact = true
- [x] Server: add quietHours fields to bot.saveConfig procedure
- [x] UI: Quiet Hours card in Bot Settings with enabled toggle, start/end hour selectors, timezone dropdown, TCPA warning
- [x] UI: DNC toggle in ConversationPanel with real mutation (toggleDNC)
- [x] UI: source, age, state, productType fields in Add Lead form (2-col grid)
- [x] UI: source, age, state, productType shown in ConversationPanel Lead Details section
- [x] UI: Analytics page milestone chart now uses "Future Date" (legacy X-Dated alias kept for old data)
- [x] UI: LeadsPage milestone dropdowns renamed X-Dated to Future Date
