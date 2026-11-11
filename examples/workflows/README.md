# Import-and-Run n8n Workflow Templates (`n8n-nodes-revclamp`)

Three production-ready n8n workflow templates built for [`n8n-nodes-revclamp`](https://www.npmjs.com/package/n8n-nodes-revclamp). Every template runs out-of-the-box in **Zero-Key Demo Mode** (`demoMode: true`, `demo: true`, and `slackWebhookUrl: ""`) with **zero required credentials**, so you can import the JSON and click **Test workflow** immediately before provisioning a free workspace key.

## 1-Click Importable Workflows

| # | Workflow Template | Raw Import URL (`Import from URL...` in n8n) | Core Signals & Endpoints |
|:---:|---|---|---|
| `01` | [01_daily_competitor_ats_hiring_and_google_ads_slack_alert.json](./01_daily_competitor_ats_hiring_and_google_ads_slack_alert.json) | `https://raw.githubusercontent.com/lhphong09t2/n8n-nodes-revclamp/main/examples/workflows/01_daily_competitor_ats_hiring_and_google_ads_slack_alert.json` | Multi-ATS career board diff (`Greenhouse`, `Ashby`, `Lever`, `SmartRecruiters`, `Workday`) + Google Ads Transparency (`AR...` active creatives) -> Slack Block Kit alert |
| `02` | [02_inbound_domain_dns_and_rfc9116_contact_enricher.json](./02_inbound_domain_dns_and_rfc9116_contact_enricher.json) | `https://raw.githubusercontent.com/lhphong09t2/n8n-nodes-revclamp/main/examples/workflows/02_inbound_domain_dns_and_rfc9116_contact_enricher.json` | Inbound B2B domain DNS (`MX` / `SPF` / `DMARC`) + RFC 9116 `/.well-known/security.txt` contacts + ATS hiring velocity -> AE Slack / CRM webhook |
| `03` | [03_stripe_dispute_ce3_and_eu_vies_guard.json](./03_stripe_dispute_ce3_and_eu_vies_guard.json) | `https://raw.githubusercontent.com/lhphong09t2/n8n-nodes-revclamp/main/examples/workflows/03_stripe_dispute_ce3_and_eu_vies_guard.json` | Parallel non-destructive Visa CE 3.0 (`120d-365d` + `18,000` UTF-16 char lint) + EU VAT VIES consultation proof + account career board check -> Finance Slack triage |

## Instant Zero-Key Test (Under 30 Seconds)

1. In n8n, open **Settings -> Community Nodes** and install `n8n-nodes-revclamp`.
2. Create a new workflow, click the `...` menu -> **Import from URL...** (or **Import from File...**), and paste any Raw Import URL from the table above.
3. Click **Test workflow**.
   - **Zero credentials required on first run:** `RevClamp Hiring Watchlist` runs with `demoMode: true`, HTTP nodes run with `demo: true`, and when `slackWebhookUrl` is empty (`""`), the workflow routes cleanly to its `Zero-Key Demo Output (... Preview)` node so n8n's pre-flight validator never blocks execution.

## Switching from Demo Mode to Live 24/7 Production

1. Open the keyless sandbox at `https://revclamp.com/tools/ats-hiring-watchlist` and click **Watch This Company Free** to provision a free workspace key (`rg_live_YOUR_WORKSPACE_KEY`).
2. Add a **RevClamp API** credential in n8n using that workspace key.
3. Update the workflow configuration node:
   - Set `demoMode` to `false` on `RevClamp Hiring Watchlist` (or add the `RevClamp TalentPulse Watchlist Trigger` node for scheduled event-driven polling).
   - Set `demo` to `false` and add header `Authorization: Bearer rg_live_YOUR_WORKSPACE_KEY` on HTTP Request nodes when querying custom domains or live Stripe disputes.
   - Set `slackWebhookUrl` to your live Slack Incoming Webhook URL (`https://hooks.slack.com/services/<TEAM_ID>/<BOT_ID>/<WEBHOOK_KEY>`).
