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

  const strategicBrief = buildAiStrategicBrief_(context);
  strategicBrief.sequence_blueprint =
    strategicBrief.sequence_blueprint.filter(item => item.day === Number(day));
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

  return {
    email: generated.email,
    method: 'OPENAI',
    model: configuration.model,
    note: `Day ${day} regenerated from the human-authored strategic brief.`,
  };
}

function buildAiStrategicBrief_(context) {
  const {
    enrollment,
    partner,
    program,
    tier,
    resources,
    sequence,
  } = context;

  return {
    partner: {
      company: partner.partner_name,
      contact_name: partner.contact_name,
      contact_email: partner.contact_email,
      tier: enrollment.tier,
      commission: tier ? tier.commission_summary : '',
      bonus: tier ? tier.bonus_summary : '',
      referral_link: enrollment.tracking_link,
    },
    program: {
      client: program.client_name,
      overview: program.overview,
      brand_voice: program.brand_voice,
      support_email: program.support_email,
      coordinator_name: program.coordinator_name,
      required_signature: `Best,\n${program.coordinator_name}\nPartner Commerce | ${program.client_name} Partner Program`,
    },
    resources: resources.map(resource => ({
      type: resource.resource_type,
      name: resource.resource_name,
      url: resource.url,
    })),
    sequence_blueprint: sequence.map(item => ({
      day: Number(item.day),
      goal: item.goal,
      key_message: item.key_message,
      desired_outcome: item.desired_outcome,
    })),
  };
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
