const APP_CONFIG = Object.freeze({
  spreadsheetProperty: 'SPREADSHEET_ID',
  openAiApiKeyProperty: 'OPENAI_API_KEY',
  openAiModelProperty: 'OPENAI_MODEL',
  defaultOpenAiModel: 'gpt-5-mini',
  scanIntervalMinutes: 5,
  sheets: Object.freeze({
    programs: 'Programs',
    tiers: 'Program Tiers',
    resources: 'Program Resources',
    sequence: 'Sequence Goals',
    partners: 'Partners',
    enrollments: 'Enrollments',
    drafts: 'Email Drafts',
    log: 'Processing Log',
  }),
  headers: Object.freeze({
    programs: [
      'program_id',
      'client_name',
      'program_name',
      'overview',
      'brand_voice',
      'support_email',
      'tracking_link_template',
      'coordinator_name',
      'processing_mode',
      'status',
      'updated_at',
    ],
    tiers: [
      'program_id',
      'tier_name',
      'commission_summary',
      'bonus_summary',
    ],
    resources: [
      'resource_id',
      'program_id',
      'resource_type',
      'resource_name',
      'url',
      'ai_context',
    ],
    sequence: [
      'program_id',
      'day',
      'goal',
      'key_message',
      'desired_outcome',
    ],
    partners: [
      'partner_id',
      'partner_name',
      'contact_name',
      'contact_email',
      'record_status',
      'updated_at',
    ],
    enrollments: [
      'enrollment_id',
      'partner_id',
      'program_id',
      'approval_status',
      'tier',
      'date_status_changed',
      'tracking_link',
      'updated_at',
    ],
    drafts: [
      'draft_id',
      'event_key',
      'enrollment_id',
      'partner_id',
      'program_id',
      'day',
      'key_message',
      'desired_outcome',
      'subject',
      'body',
      'generation_method',
      'generation_model',
      'generation_note',
      'review_status',
      'sent_at',
      'generated_at',
      'updated_at',
    ],
    log: [
      'event_key',
      'enrollment_id',
      'program_id',
      'source',
      'result',
      'message',
      'processed_at',
    ],
  }),
});

const PROGRAM_STATUS = Object.freeze({
  active: 'ACTIVE',
  paused: 'PAUSED',
  archived: 'ARCHIVED',
});

const PROCESSING_MODE = Object.freeze({
  auto: 'AUTO',
  manual: 'MANUAL',
});

const APPROVAL_STATUS = Object.freeze({
  pending: 'PENDING',
  active: 'ACTIVE',
  rejected: 'REJECTED',
  removed: 'REMOVED',
});

const REVIEW_STATUS = Object.freeze({
  draft: 'DRAFT',
  approved: 'APPROVED',
  sent: 'SENT',
});
