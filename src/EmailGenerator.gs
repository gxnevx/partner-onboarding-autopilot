function generateDraftRecords_(context) {
  let generation;

  try {
    generation =
      typeof generateAiEmailContents_ === 'function'
        ? generateAiEmailContents_(context)
        : generateTemplateEmailContents_(context);
  } catch (error) {
    generation = generateTemplateEmailContents_(context);
    generation.method = 'TEMPLATE_FALLBACK';
    generation.note = `OpenAI was unavailable: ${error.message}`;
  }

  return buildDraftRecords_(context, generation);
}

function buildDraftRecords_(context, generation) {
  const {
    eventKey,
    enrollment,
    partner,
    program,
    sequence,
  } = context;
  const generatedAt = nowIso_();

  return sequence.map(item => {
    const day = Number(item.day);
    const content = generation.emails.find(
      email => Number(email.day) === day,
    );
    if (!content) {
      throw new Error(`No generated content returned for Day ${day}.`);
    }

    return {
      draft_id: `DRAFT-${enrollment.enrollment_id}-${enrollment.date_status_changed}-D${day}`,
      event_key: eventKey,
      enrollment_id: enrollment.enrollment_id,
      partner_id: partner.partner_id,
      program_id: program.program_id,
      day: String(day),
      key_message: item.key_message,
      desired_outcome: item.desired_outcome,
      subject: content.subject,
      body: content.body,
      generation_method: generation.method,
      generation_model: generation.model,
      generation_note: generation.note,
      review_status: REVIEW_STATUS.draft,
      generated_at: generatedAt,
      updated_at: generatedAt,
    };
  });
}

function generateTemplateEmailContents_(context) {
  const {
    enrollment,
    partner,
    program,
    tier,
    resources,
    sequence,
  } = context;
  const firstName = (partner.contact_name || partner.partner_name)
    .trim()
    .split(/\s+/)[0];
  const portal = findResourceUrl_(resources, 'PORTAL');
  const enablement = findResourceUrl_(resources, 'ENABLEMENT');
  const messaging = findResourceUrl_(resources, 'MESSAGING');
  const commission = [
    tier ? tier.commission_summary : '',
    tier ? tier.bonus_summary : '',
  ]
    .filter(Boolean)
    .join(', ');

  return {
    emails: sequence.map(item => {
      const day = Number(item.day);
      return {
        day,
        ...buildEmailContent_({
          day,
          firstName,
          partner,
          program,
          enrollment,
          commission,
          portal,
          enablement,
          messaging,
        }),
      };
    }),
    method: 'TEMPLATE',
    model: '',
    note: 'Deterministic template used because OpenAI is not configured.',
  };
}

function buildEmailContent_(context) {
  const {
    day,
    firstName,
    partner,
    program,
    enrollment,
    commission,
    portal,
    enablement,
    messaging,
  } = context;
  const signature = `${program.coordinator_name}\nPartner Commerce | ${program.client_name} Partner Program`;

  if (day === 0) {
    return {
      subject: `You're approved: welcome to the ${program.client_name} Partner Program`,
      body: [
        `Hi ${firstName},`,
        '',
        `Welcome to the ${program.client_name} Partner Program. ${partner.partner_name} is now approved as a ${enrollment.tier} partner.`,
        '',
        `Your referral link: ${enrollment.tracking_link}`,
        `Partner portal: ${portal}`,
        '',
        commission ? `Your ${enrollment.tier} commission is ${commission}.` : '',
        '',
        `Please save your referral link and sign in to the portal, where you can register deals and track commissions. If you need help, contact ${program.support_email}.`,
        '',
        'Best,',
        signature,
      ]
        .filter((line, index, lines) => {
          return !(line === '' && lines[index - 1] === '');
        })
        .join('\n'),
    };
  }

  if (day === 3) {
    return {
      subject: `A quick path to your first ${program.client_name} referral`,
      body: [
        `Hi ${firstName},`,
        '',
        `A practical first step is to identify one prospect that matches the ${program.client_name} program and register the opportunity before making the introduction.`,
        '',
        `1. Review the enablement materials: ${enablement}`,
        `2. Register the opportunity in the partner portal: ${portal}`,
        `3. Use your referral link: ${enrollment.tracking_link}`,
        '',
        'Quick-start tip: register the deal first so tracking and program support are in place from the beginning.',
        '',
        `Questions? Contact ${program.support_email}.`,
        '',
        'Best,',
        signature,
      ].join('\n'),
    };
  }

  return {
    subject: `How is your ${program.client_name} onboarding going?`,
    body: [
      `Hi ${firstName},`,
      '',
      `Checking in to see whether you have everything you need to introduce ${program.client_name} to the right prospects.`,
      '',
      `One positioning tip: start with the prospect's operational challenge, then explain where ${program.client_name} fits. Keep the conversation practical and peer-to-peer rather than leading with a product pitch.`,
      '',
      messaging ? `Messaging guidelines: ${messaging}` : '',
      '',
      `If you would like help thinking through a potential fit or introduction, contact ${program.support_email}.`,
      '',
      'Best,',
      signature,
    ]
      .filter((line, index, lines) => {
        return !(line === '' && lines[index - 1] === '');
      })
      .join('\n'),
  };
}

function findResourceUrl_(resources, type) {
  const resource = resources.find(item => item.resource_type === type);
  return resource ? resource.url : '';
}
