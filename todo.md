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
