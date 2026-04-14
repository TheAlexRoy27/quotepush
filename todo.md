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
