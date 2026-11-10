# n8n-nodes-revclamp: TalentPulse Career Page & Hiring Alerts for n8n

Track company career pages across **Greenhouse, Ashby, Lever, SmartRecruiters, and Workday** and trigger automated **n8n** workflows whenever a target company opens a new role, updates published salary ranges, or closes a job listing.

Built for **Recruiting Agencies, Outbound SDR Teams, and RevOps Builders** who want real-time hiring intent signals without brittle web scrapers.

---

## What You Can Build in 60 Seconds

- **Outbound SDR Buying Triggers:** When a target account posts a new *Staff Security Engineer* or *VP of Revenue Operations* role, automatically enrich the hiring manager and post a warm outbound brief in Slack or HubSpot.
- **Executive Recruiting Alerts:** Track up to 500 client and prospect career pages daily and alert your recruiting desk the morning a high-priority role opens or increases its compensation band.
- **Portfolio & Competitor Hiring Tracker:** Log every new engineering, AI, or GTM opening across your watchlist directly into Google Sheets, Airtable, or Notion.

---

## Included Nodes

| Node | Type | What It Does |
| --- | --- | --- |
| **RevClamp TalentPulse Watchlist** | Action & AI Agent Tool (`usableAsTool: true`) | Preview daily hiring changes (including **Zero-Key Instant Demo Mode**), add a company career page to your watchlist, list watched companies, or trigger an immediate check. |
| **RevClamp TalentPulse Watchlist Trigger** | Polling Trigger | Polls your watched companies on your schedule and triggers your workflow once per unique hiring change (`JOB_OPENED`, `JOB_COMP_CHANGED` / `COMPENSATION_UPDATED`, `JOB_CLOSED`). |

---

## 60-Second Quickstart

### 1. Install in n8n

1. Open your n8n instance and go to **Settings -> Community Nodes**.
2. Click **Install a community node** and enter:
   ```text
   n8n-nodes-revclamp
   ```
3. Click **Install**.

### 2. Try Instant Demo Mode (Zero API Key Needed)

1. Add the **RevClamp TalentPulse Watchlist** node to any workflow.
2. Keep **Operation** set to **Preview Daily Hiring Changes** and **Try Instant Demo Mode** enabled.
3. Click **Test step**: you will immediately see structured `JOB_OPENED`, `JOB_COMP_CHANGED`, and `JOB_CLOSED` hiring events ready to map into Slack, HubSpot, or Clay.

### 3. Monitor Your First 10 Companies Free

1. Grab a free workspace key (`10` monitored company boards included) at [https://revclamp.com/tools/ats-hiring-watchlist](https://revclamp.com/tools/ats-hiring-watchlist).
2. In n8n, create a **RevClamp TalentPulse API** credential and paste your `rg_live_...` workspace key.
3. Use **Add Company Career Page to Watchlist** with any company domain (`stripe.com`, `ramp.com`, `openai.com`, `datadoghq.com`, `cloudflare.com`) or direct ATS link.

---

## Standalone Repository & npm Provenance Release

This package is mirrored to the standalone public repository [`lhphong09t2/n8n-nodes-revclamp`](https://github.com/lhphong09t2/n8n-nodes-revclamp), where `.github/workflows/release-npm-provenance.yml` runs at the repository root to verify `@n8n/scan-community-package` compliance and publish to npm with cryptographic provenance (`npm publish --provenance --access public`).

---

## Support & Documentation

- **Interactive Sandbox & Live Preview:** [https://revclamp.com/tools/ats-hiring-watchlist](https://revclamp.com/tools/ats-hiring-watchlist)
- **Watchlist Console:** [https://revclamp.com/dashboard?tab=watchlist](https://revclamp.com/dashboard?tab=watchlist)
- **Plans & Board Caps:** [https://revclamp.com/pricing?product=watchlist](https://revclamp.com/pricing?product=watchlist)
- **Questions or Help:** [support@revclamp.com](mailto:support@revclamp.com)
