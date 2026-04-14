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
- [ ] Add `flow_templates` table: id, name, category (enum), body, isActive, createdAt, updatedAt
- [ ] Add `flow_rules` table: id, category (enum), templateId (FK), autoSend (bool), createdAt
- [ ] Run migration and apply SQL
- [ ] tRPC: flowTemplates.list / create / update / delete
- [ ] tRPC: flowRules.list / upsert (one rule per category)
- [ ] AI reply classification: invokeLLM to classify inbound SMS into category enum
- [ ] Auto-flow engine: on inbound SMS, classify reply → look up active rule → auto-send matching template
- [ ] Wire auto-flow into Twilio inbound webhook handler
- [ ] Template Library UI page with category tabs (Interested, Not Interested, More Info, Already a Customer, Unsubscribe, Other)
- [ ] Template card editor per category with body, variable hints, enable/disable toggle
- [ ] Flow Rules panel: per-category toggle for auto-send + template selector
- [ ] Add "Library" nav item to sidebar
- [ ] Show classification label on inbound messages in conversation thread
- [ ] Vitest: AI classification prompt structure test
- [ ] Vitest: flow rule lookup logic test
