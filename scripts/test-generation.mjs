import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const source = filename =>
  fs.readFileSync(path.join(root, 'src', filename), 'utf8');

const sandbox = {
  console,
  Date,
};
vm.createContext(sandbox);
vm.runInContext(source('Config.gs'), sandbox);
vm.runInContext('function nowIso_() { return "2026-07-24T18:30:00.000Z"; }', sandbox);
vm.runInContext(source('EmailGenerator.gs'), sandbox);
vm.runInContext(source('OnboardingService.gs'), sandbox);

const drafts = sandbox.generateDraftRecords_({
  eventKey: 'ENR-LEDGERLY-P-1044|2026-07-23',
  enrollment: {
    enrollment_id: 'ENR-LEDGERLY-P-1044',
    partner_id: 'P-1044',
    program_id: 'LEDGERLY',
    tier: 'Premium',
    date_status_changed: '2026-07-23',
    tracking_link: 'https://ledgerly.io/ref/P-1044',
  },
  partner: {
    partner_id: 'P-1044',
    partner_name: 'Verve Systems Group',
    contact_name: 'Priya Nair',
  },
  program: {
    program_id: 'LEDGERLY',
    client_name: 'Ledgerly',
    coordinator_name: 'Vitor Carro',
    support_email: 'partners@ledgerly.io',
  },
  tier: {
    commission_summary: '25% of first-year contract value on referred deals',
    bonus_summary: '$500 bonus after 3 referred deals close in a quarter',
  },
  resources: [
    { resource_type: 'PORTAL', url: 'https://www.example3.com' },
    { resource_type: 'ENABLEMENT', url: 'https://www.example1.com' },
    { resource_type: 'MESSAGING', url: 'https://www.example2.com' },
  ],
  sequence: [
    {
      day: '0',
      key_message: 'You are approved and have everything you need to begin.',
      desired_outcome: 'Open the portal.',
    },
    {
      day: '3',
      key_message: 'Start with one opportunity.',
      desired_outcome: 'Register a deal.',
    },
    {
      day: '7',
      key_message: 'Lead with the workflow challenge.',
      desired_outcome: 'Position Ledgerly credibly.',
    },
  ],
});

assert.equal(drafts.length, 3);
assert.deepEqual(
  drafts.map(draft => draft.day),
  ['0', '3', '7'],
);
assert.match(drafts[0].body, /Hi Priya/);
assert.match(drafts[0].body, /Premium/);
assert.match(drafts[0].body, /25%/);
assert.match(drafts[0].body, /\$500 bonus/);
assert.match(drafts[0].body, /https:\/\/ledgerly\.io\/ref\/P-1044/);
assert.match(drafts[1].body, /https:\/\/www\.example1\.com/);
assert.match(drafts[1].body, /https:\/\/www\.example3\.com/);
assert.doesNotMatch(drafts[1].body, /https:\/\/ledgerly\.io\/ref\/P-1044/);
assert.doesNotMatch(drafts[1].body, /commission/i);
assert.match(drafts[2].body, /accounting automation/i);
assert.match(drafts[2].body, /partners@ledgerly\.io/);
assert.doesNotMatch(drafts[2].body, /https:\/\/www\.example3\.com/);
assert.doesNotMatch(drafts[2].body, /commission/i);

const hydratedDay0 = sandbox.enforceRequiredOperationalLinks_(
  'Hi Priya,\\n\\nWelcome.\\n\\nBest,\\nVitor Carro\\nPartner Commerce | Ledgerly Partner Program',
  0,
  {
    enrollment: {
      tracking_link: 'https://ledgerly.io/ref/P-1044',
    },
    program: {
      client_name: 'Ledgerly',
      coordinator_name: 'Vitor Carro',
    },
    resources: [
      { resource_type: 'PORTAL', url: 'https://www.example3.com' },
    ],
  },
);
assert.match(hydratedDay0, /Referral tracking link\nhttps:\/\/ledgerly\.io\/ref\/P-1044/);
assert.match(hydratedDay0, /Partner portal\nhttps:\/\/www\.example3\.com/);
assert.ok(drafts.every(draft => draft.review_status === 'DRAFT'));
assert.equal(
  sandbox.buildEventKey_({
    enrollment_id: 'ENR-LEDGERLY-P-1044',
    date_status_changed: '2026-07-23',
  }),
  'ENR-LEDGERLY-P-1044|2026-07-23',
);

console.log('Email generation and activation-key assertions passed.');
