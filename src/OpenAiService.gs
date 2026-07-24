function getAiConfiguration_() {
  const properties = PropertiesService.getScriptProperties();
  const apiKey = properties.getProperty(APP_CONFIG.openAiApiKeyProperty);
  const model =
    properties.getProperty(APP_CONFIG.openAiModelProperty) ||
    APP_CONFIG.defaultOpenAiModel;

  return {
    configured: Boolean(apiKey),
    apiKey,
    model,
    provider: 'OpenAI',
  };
}

function getPublicAiStatus_() {
  const configuration = getAiConfiguration_();
  return {
    configured: configuration.configured,
    provider: configuration.provider,
    model: configuration.model,
  };
}

function testOpenAiConnection() {
  const configuration = getAiConfiguration_();
  if (!configuration.configured) {
    throw new Error('OpenAI is not configured.');
  }

  const response = UrlFetchApp.fetch(
    `https://api.openai.com/v1/models/${encodeURIComponent(configuration.model)}`,
    {
      method: 'get',
      headers: {
        Authorization: `Bearer ${configuration.apiKey}`,
      },
      muteHttpExceptions: true,
    },
  );

  if (response.getResponseCode() !== 200) {
    throw new Error(
      `OpenAI connection failed (${response.getResponseCode()}): ${safeOpenAiError_(response.getContentText())}`,
    );
  }

  return {
    connected: true,
    model: configuration.model,
  };
}

function generateAiEmailContents_(context) {
  const configuration = getAiConfiguration_();
  if (!configuration.configured) {
    throw new Error('OpenAI is not configured.');
  }

  const strategicBrief = buildAiStrategicBrief_(context);
  const response = UrlFetchApp.fetch('https://api.openai.com/v1/responses', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: `Bearer ${configuration.apiKey}`,
    },
    muteHttpExceptions: true,
    payload: JSON.stringify({
      model: configuration.model,
      store: false,
      reasoning: {
        effort: 'low',
      },
      max_output_tokens: 2600,
      instructions: [
        'You are a senior partner-marketing writer.',
        'Write a concise three-email onboarding sequence for a newly approved B2B partner.',
        'The human-authored key message and desired outcome for each day are strategic constraints, not copy to repeat verbatim.',
        'Use only facts, commercial terms, contacts, and URLs supplied in the brief.',
        'Each day has its own content_contract. Treat approved_facts as a strict allowlist for that email and satisfy every required_content item.',
        'Never carry a fact, resource, commercial term, or CTA from one day into another day unless it also appears in that day\'s approved_facts.',
        'Obey prohibited_content literally. Never invent example pain points, workflows, features, metrics, proof points, or customer outcomes.',
        'Preserve every supplied URL exactly. Never invent a link, feature, claim, or customer result.',
        'Match the supplied brand voice. Keep each email practical, credible, and between 90 and 140 words.',
        'Format every body as: greeting on its own line; blank line; two to four short content blocks; blank line; the exact supplied signature.',
        'Separate every content block with a blank line. Never return one large paragraph.',
        'For Day 3, put each recommended action on its own numbered line using 1., 2., and 3.',
        'Put important URLs on their own labeled lines and never attach punctuation to a URL.',
        'Use the supplied signature exactly. Do not invent another team name, sender, or sign-off.',
        'Return plain text only. Do not use Markdown, HTML, headings, or emoji.',
      ].join(' '),
      input: JSON.stringify(strategicBrief),
      text: {
        format: {
          type: 'json_schema',
          name: 'partner_onboarding_email_series',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              emails: {
                type: 'array',
                minItems: 3,
                maxItems: 3,
                items: {
                  type: 'object',
                  properties: {
                    day: {
                      type: 'integer',
                      enum: [0, 3, 7],
                    },
                    subject: {
                      type: 'string',
                    },
                    body: {
                      type: 'string',
                    },
                  },
                  required: ['day', 'subject', 'body'],
                  additionalProperties: false,
                },
              },
            },
            required: ['emails'],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  const statusCode = response.getResponseCode();
  const responseBody = response.getContentText();
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(
      `OpenAI request failed (${statusCode}): ${safeOpenAiError_(responseBody)}`,
    );
  }

  const parsedResponse = JSON.parse(responseBody);
  const outputText = extractOpenAiOutputText_(parsedResponse);
  if (!outputText) {
    throw new Error('OpenAI returned no structured email content.');
  }

  const generated = JSON.parse(outputText);
  validateAiEmailSeries_(generated);
  validateAiEmailGrounding_(generated.emails, context);

  return {
    emails: generated.emails,
    method: 'OPENAI',
    model: configuration.model,
    note: 'Draft copy generated from the human-authored sequence brief.',
  };
}

function generateAiEmailForDay_(context, day) {
  const configuration = getAiConfiguration_();
  if (!configuration.configured) {
    throw new Error('OpenAI is not configured.');
  }

  const strategicBrief = buildAiStrategicBrief_(context, Number(day));
  if (strategicBrief.sequence_blueprint.length !== 1) {
    throw new Error(`Missing strategic brief for Day ${day}.`);
  }

  const response = UrlFetchApp.fetch('https://api.openai.com/v1/responses', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: `Bearer ${configuration.apiKey}`,
    },
    muteHttpExceptions: true,
    payload: JSON.stringify({
      model: configuration.model,
      store: false,
      reasoning: {
        effort: 'low',
      },
      max_output_tokens: 1000,
      instructions: [
        'You are a senior partner-marketing writer.',
        `Rewrite only the Day ${day} email for a newly approved B2B partner.`,
        'The human-authored key message and desired outcome are fixed strategic constraints.',
        'Use only facts, commercial terms, contacts, and URLs supplied in the brief.',
        'The content_contract is a strict allowlist. Satisfy every required_content item and obey prohibited_content literally.',
        'Never invent example pain points, workflows, features, metrics, proof points, or customer outcomes.',
        'Preserve every supplied URL exactly. Never invent a link, feature, claim, or customer result.',
        'Match the supplied brand voice. Keep the email practical, credible, and between 90 and 140 words.',
        'Format the body as: greeting on its own line; blank line; two to four short content blocks; blank line; the exact supplied signature.',
        'Separate every content block with a blank line. Never return one large paragraph.',
        'For Day 3, put each recommended action on its own numbered line using 1., 2., and 3.',
        'Put important URLs on their own labeled lines and never attach punctuation to a URL.',
        'Use the supplied signature exactly. Do not invent another team name, sender, or sign-off.',
        'Return plain text only. Do not use Markdown, HTML, headings, or emoji.',
      ].join(' '),
      input: JSON.stringify(strategicBrief),
      text: {
        format: {
          type: 'json_schema',
          name: 'partner_onboarding_single_email',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              email: {
                type: 'object',
                properties: {
                  day: {
                    type: 'integer',
                    enum: [Number(day)],
                  },
                  subject: {
                    type: 'string',
                  },
                  body: {
                    type: 'string',
                  },
                },
                required: ['day', 'subject', 'body'],
                additionalProperties: false,
              },
            },
            required: ['email'],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  const statusCode = response.getResponseCode();
  const responseBody = response.getContentText();
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(
      `OpenAI request failed (${statusCode}): ${safeOpenAiError_(responseBody)}`,
    );
  }

  const parsedResponse = JSON.parse(responseBody);
  const outputText = extractOpenAiOutputText_(parsedResponse);
  if (!outputText) {
    throw new Error('OpenAI returned no structured email content.');
  }

  const generated = JSON.parse(outputText);
  if (
    !generated.email ||
    Number(generated.email.day) !== Number(day) ||
    !String(generated.email.subject || '').trim() ||
    !String(generated.email.body || '').trim()
  ) {
    throw new Error(`OpenAI returned an incomplete Day ${day} email.`);
  }
  validateAiEmailGrounding_([generated.email], context);

  return {
    email: generated.email,
    method: 'OPENAI',
    model: configuration.model,
    note: `Day ${day} regenerated from the human-authored strategic brief.`,
  };
}

function buildAiStrategicBrief_(context, onlyDay) {
  const {
    enrollment,
    partner,
    program,
    tier,
    resources,
    sequence,
  } = context;

  const selectedSequence = sequence.filter(item => {
    return onlyDay === undefined || Number(item.day) === Number(onlyDay);
  });

  return {
    partner: {
      company: partner.partner_name,
      contact_name: partner.contact_name,
      contact_email: partner.contact_email,
    },
    program: {
      client: program.client_name,
      overview: program.overview,
      brand_voice: program.brand_voice,
      support_email: program.support_email,
      coordinator_name: program.coordinator_name,
      required_signature: `Best,\n${program.coordinator_name}\nPartner Commerce | ${program.client_name} Partner Program`,
    },
    sequence_blueprint: selectedSequence.map(item => ({
      day: Number(item.day),
      goal: item.goal,
      key_message: item.key_message,
      desired_outcome: item.desired_outcome,
      content_contract: buildAiContentContract_(
        Number(item.day),
        { enrollment, partner, program, tier, resources },
      ),
    })),
  };
}

function buildAiContentContract_(day, context) {
  const { enrollment, partner, program, tier, resources } = context;
  const resourceByType = type => {
    const resource = resources.find(item => item.resource_type === type);
    if (!resource) return null;
    return {
      name: resource.resource_name,
      url: resource.url,
      approved_ai_context: resource.ai_context || '',
    };
  };
  const portal = resourceByType('PORTAL');
  const enablement = resourceByType('ENABLEMENT');
  const messaging = resourceByType('MESSAGING');

  if (day === 0) {
    return {
      approved_facts: {
        approval_status: enrollment.approval_status,
        approved_company: partner.partner_name,
        tier: enrollment.tier,
        commission: tier ? tier.commission_summary : '',
        bonus: tier ? tier.bonus_summary : '',
        referral_link: enrollment.tracking_link,
        portal,
      },
      required_content: [
        'Warmly welcome the partner and confirm that the company is approved.',
        'State the exact tier and exact commission. Mention the bonus only when one is supplied.',
        'Include the exact referral link and exact partner portal URL on labeled lines.',
        'Ask the partner to save the referral link and access the portal.',
      ],
      prohibited_content: [
        'Do not discuss enablement materials, deal activation steps, positioning advice, or invented product claims.',
      ],
    };
  }

  if (day === 3) {
    return {
      approved_facts: {
        enablement,
        portal,
        support_email: program.support_email,
      },
      required_content: [
        'Nudge the partner toward a first activation.',
        'Point to the exact enablement resource and explain that deals are registered in the exact portal URL.',
        'After the numbered list, include exactly one separate sentence beginning "Quick-start tip:" and tell the partner to register one well-matched opportunity before the introduction.',
        'Present the action path as a three-item numbered list.',
      ],
      prohibited_content: [
        'Do not mention tier, commission, bonus, referral link, positioning advice, or invented qualification criteria.',
      ],
    };
  }

  return {
    approved_facts: {
      product_positioning:
        'Ledgerly is B2B SaaS accounting automation for mid-market finance teams.',
      messaging_guidance: messaging ? messaging.approved_ai_context : '',
      support_email: program.support_email,
    },
    required_content: [
      'Write a friendly check-in.',
      'Offer help and include the exact support email.',
      'Share exactly one positioning tip: describe Ledgerly as accounting automation for mid-market finance teams in a practical, peer-to-peer, not-salesy way.',
    ],
    prohibited_content: [
      'Do not mention tier, commission, bonus, referral link, portal, deal registration, or activation.',
      'Do not invent finance pain points or examples such as close speed, reconciliation, headcount, ROI, savings, or product capabilities.',
      'Do not provide more than one positioning tip.',
    ],
  };
}

function validateAiEmailGrounding_(emails, context) {
  const { enrollment, program, tier, resources } = context;
  const resourceUrl = type => {
    const resource = resources.find(item => item.resource_type === type);
    return resource ? String(resource.url || '').trim() : '';
  };
  const requireText = (body, expected, message) => {
    if (expected && !body.includes(String(expected).toLowerCase())) {
      throw new Error(message);
    }
  };

  emails.forEach(email => {
    const day = Number(email.day);
    const body = String(email.body || '').toLowerCase();

    if (day === 0) {
      requireText(
        body,
        enrollment.tier,
        'Day 0 must include the exact partner tier.',
      );
      requireText(
        body,
        tier ? tier.commission_summary : '',
        'Day 0 must include the exact commission.',
      );
      requireText(
        body,
        enrollment.tracking_link,
        'Day 0 must include the exact referral link.',
      );
      requireText(
        body,
        resourceUrl('PORTAL'),
        'Day 0 must include the exact partner portal URL.',
      );
      [resourceUrl('ENABLEMENT'), resourceUrl('MESSAGING')]
        .filter(Boolean)
        .forEach(forbidden => {
          if (body.includes(forbidden.toLowerCase())) {
            throw new Error(`Day 0 contains a resource assigned to another day: ${forbidden}`);
          }
        });
      return;
    }

    if (day === 3) {
      requireText(
        body,
        resourceUrl('ENABLEMENT'),
        'Day 3 must include the exact enablement resource URL.',
      );
      requireText(
        body,
        resourceUrl('PORTAL'),
        'Day 3 must include the exact deal-registration portal URL.',
      );
      if (!body.includes('register')) {
        throw new Error('Day 3 must explain how to register a deal.');
      }
      if (!body.includes('quick-start tip:')) {
        throw new Error(
          'Day 3 must include one explicit Quick-start tip.',
        );
      }
      [
        enrollment.tracking_link,
        resourceUrl('MESSAGING'),
        tier ? tier.commission_summary : '',
        tier ? tier.bonus_summary : '',
      ].filter(Boolean).forEach(forbidden => {
        if (body.includes(String(forbidden).toLowerCase())) {
          throw new Error(`Day 3 contains content assigned to another day: ${forbidden}`);
        }
      });
      return;
    }

    requireText(
      body,
      program.support_email,
      'Day 7 must include the exact support email.',
    );
    if (!body.includes('accounting automation') || !body.includes('finance')) {
      throw new Error(
        'Day 7 must ground its single tip in the supplied Ledgerly positioning.',
      );
    }

    [
      enrollment.tracking_link,
      resourceUrl('PORTAL'),
      tier ? tier.commission_summary : '',
      tier ? tier.bonus_summary : '',
      'close speed',
      'reconciliation',
      'headcount',
    ].filter(Boolean).forEach(forbidden => {
      if (body.includes(String(forbidden).toLowerCase())) {
        throw new Error(`Day 7 contains off-brief content: ${forbidden}`);
      }
    });
  });
}

function extractOpenAiOutputText_(response) {
  const output = Array.isArray(response.output) ? response.output : [];
  for (let index = 0; index < output.length; index += 1) {
    const content = Array.isArray(output[index].content)
      ? output[index].content
      : [];
    for (let contentIndex = 0; contentIndex < content.length; contentIndex += 1) {
      if (
        content[contentIndex].type === 'output_text' &&
        content[contentIndex].text
      ) {
        return content[contentIndex].text;
      }
    }
  }
  return '';
}

function validateAiEmailSeries_(series) {
  if (!series || !Array.isArray(series.emails) || series.emails.length !== 3) {
    throw new Error('OpenAI must return exactly three emails.');
  }

  const days = series.emails
    .map(email => Number(email.day))
    .sort((left, right) => left - right);
  if (days.join(',') !== '0,3,7') {
    throw new Error('OpenAI email days must be 0, 3, and 7.');
  }

  series.emails.forEach(email => {
    if (!String(email.subject || '').trim() || !String(email.body || '').trim()) {
      throw new Error(`OpenAI returned an incomplete Day ${email.day} email.`);
    }
  });
}

function safeOpenAiError_(responseBody) {
  try {
    const parsed = JSON.parse(responseBody);
    return parsed.error && parsed.error.message
      ? parsed.error.message
      : 'Unknown API error';
  } catch (error) {
    return 'Unparseable API error';
  }
}
