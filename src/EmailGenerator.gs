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

    const normalizedBody = normalizeGeneratedEmailBody_(content.body, program);

    return {
      draft_id: `DRAFT-${enrollment.enrollment_id}-${enrollment.date_status_changed}-D${day}`,
      event_key: eventKey,
      enrollment_id: enrollment.enrollment_id,
      partner_id: partner.partner_id,
      program_id: program.program_id,
      day: String(day),
      key_message: item.key_message,
      desired_outcome: item.desired_outcome,
      subject: String(content.subject || '').trim(),
      body: enforceRequiredOperationalLinks_(
        normalizedBody,
        day,
        context,
      ),
      generation_method: generation.method,
      generation_model: generation.model,
      generation_note: generation.note,
      review_status: REVIEW_STATUS.draft,
      generated_at: generatedAt,
      updated_at: generatedAt,
    };
  });
}

function normalizeGeneratedEmailBody_(body, program) {
  const signature = [
    'Best,',
    program.coordinator_name,
    `Partner Commerce | ${program.client_name} Partner Program`,
  ].join('\n');
  let normalized = String(body || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  normalized = normalized.replace(
    /\n{2,}(?:Best|Thanks|Thank you|Regards|Sincerely|Warm regards|—|-)[\s\S]*$/i,
    '',
  );
  normalized = normalized.replace(
    /^(Hi [^,\n]+,)[ \t]+(?=\S)/i,
    '$1\n\n',
  );

  return `${normalized.trim()}\n\n${signature}`;
}

function enforceRequiredOperationalLinks_(body, day, context) {
  const { enrollment, program, resources } = context;
  const requiredLines = [];
  const portal = findResourceUrl_(resources, 'PORTAL');
  const enablement = findResourceUrl_(resources, 'ENABLEMENT');
  const normalized = String(body || '');

  if (Number(day) === 0) {
    if (
      enrollment.tracking_link &&
      !normalized.includes(enrollment.tracking_link)
    ) {
      requiredLines.push(
        'Referral tracking link',
        enrollment.tracking_link,
      );
    }
    if (portal && !normalized.includes(portal)) {
      requiredLines.push('Partner portal', portal);
    }
  }

  if (Number(day) === 3) {
    if (enablement && !normalized.includes(enablement)) {
      requiredLines.push('Enablement deck & one-pagers', enablement);
    }
    if (portal && !normalized.includes(portal)) {
      requiredLines.push('Deal registration portal', portal);
    }
  }

  if (!requiredLines.length) {
    return normalized;
  }

  const signature = [
    'Best,',
    program.coordinator_name,
    `Partner Commerce | ${program.client_name} Partner Program`,
  ].join('\n');
  const resourceBlock = requiredLines.join('\n');
  const signatureMarker = `\n\n${signature}`;

  if (normalized.includes(signatureMarker)) {
    return normalized.replace(
      signatureMarker,
      `\n\n${resourceBlock}${signatureMarker}`,
    );
  }

  return `${normalized.trim()}\n\n${resourceBlock}`;
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
        '2. Identify one well-matched opportunity.',
        `3. Register the opportunity in the partner portal: ${portal}`,
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
      `One positioning tip: describe ${program.client_name} as accounting automation for mid-market finance teams, keeping the introduction practical and peer-to-peer rather than salesy.`,
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
