# Codex AI Latency Test Results

Date: 2026-06-19

Command used:

```bash
npx ts-node --transpile-only -r tsconfig-paths/register --compiler-options '{"module":"commonjs","moduleResolution":"node"}' scripts/test-ai-latency-scenario.ts
```

Test bot:

- tenantId: `6a2587e497a2f9e19f1f1b81`
- botId: `6a2587e597a2f9e19f1f1b86`
- botName: `ChatZi Bot`

## Scenario Results

| Scenario | Message | Result | Trace summary |
| --- | --- | --- | --- |
| A - Greeting Fast Responder | `السلام عليكم` | Passed. Fast responder handled it, no knowledge search, no ticket/lead. | `totalMs=3435`, `fastResponderMs=948` |
| B - Business Knowledge | `ما هي خدماتكم؟` | Passed. Fast responder skipped it; Knowledge/Mastra path ran. Knowledge returned zero tenant KB results, so reply was safe/generic. | `totalMs=5326`, `fastResponderMs=875`, `knowledgeMs=593`, `modelMs=2228` |
| C - Ticket + Lead | `أريد حجز موعد لتنظيف الأسنان، رقمي 01012345678` | Passed. Fast responder skipped it; Knowledge/Mastra path ran; ticket created and lead created/updated without duplicate lead for same phone. | `totalMs=9769`, `fastResponderMs=805`, `knowledgeMs=589`, `modelMs=5843` |
| D - Out of Scope | `ما حالة الطقس اليوم؟` | Passed. Fast responder handled out-of-scope, no knowledge search, no ticket. | `totalMs=2344`, `fastResponderMs=1361` |

## CRM Objects

- Scenario C ticket: `6a351855a005dc8de8755e00`
- Scenario C lead: `6a3516568c6e02f2568b2f8b`
- Scenario C lead was reused/updated by duplicate-prevention logic because the same phone number was used in an earlier test run.

## Delivery/Realtimes

- Assistant messages were saved with `deliveryStatus: "queued"`.
- Realtime `message.created` was published immediately after assistant message save.
- Egress/outbound lifecycle now updates `queued -> sending -> sent`.

## Delay Notes

- Fast responder latency was about 0.8s to 1.4s for sampled messages.
- Business/model latency was higher, especially Scenario C (`modelMs=5843`) because it used full Knowledge/Mastra generation.
- The sampled bot had no matching KB results (`sourceCount=0`), so business replies were safe but generic.

## Verification Commands

```bash
npm install
npm run typecheck
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

Results:

- `npm install`: passed, packages already up to date. Existing audit warnings remain.
- `npm run typecheck`: passed.
- `npm run build`: one normal run compiled but was killed with exit `137`; retry with `NODE_OPTIONS=--max-old-space-size=4096` passed.

## Deployment Commands

```bash
cd /opt/chatzi/app/newchatziv1_tsx_prod
rm -rf .next next.config.compiled.js
npm install
NODE_OPTIONS=--max-old-space-size=4096 npm run build
mkdir -p logs
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 status
```

Do not use:

```bash
npm start ecosystem.config.js
```
