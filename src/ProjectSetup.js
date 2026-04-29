import React, { useState } from 'react';
import { buildContext } from './contextUtils';

async function generateExampleBriefs(ctx, apiKey) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Based on this product context, write exactly 3 concrete example feature briefs that a product manager might submit to generate a user story. Make them specific and realistic for this product. Output one brief per line with no numbering, bullets, or labels.\n\n${buildContext(ctx)}`,
        }],
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.content[0].text.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 3);
  } catch {
    return [];
  }
}

function Field({ label, id, required, hint, error, children }) {
  return (
    <div className="field-group">
      <label className="field-label" htmlFor={id}>
        {label}
        {required && <span className="field-required"> *</span>}
        {hint && <span className="field-hint">{hint}</span>}
      </label>
      {children}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

export default function ProjectSetup({ onComplete, onCancel, initialValues }) {
  const [fields, setFields] = useState({
    projectName: initialValues?.projectName || '',
    platformOverview: initialValues?.platformOverview || '',
    keyWorkflows: initialValues?.keyWorkflows || '',
    personas: initialValues?.personas || '',
    phaseScope: initialValues?.phaseScope || '',
    phaseNames: initialValues?.phaseNames || '',
    complianceContext: initialValues?.complianceContext || '',
    terminology: initialValues?.terminology || '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (key, val) => setFields(prev => ({ ...prev, [key]: val }));

  const validate = () => {
    const errs = {};
    if (!fields.projectName.trim()) errs.projectName = 'Required';
    if (!fields.platformOverview.trim()) errs.platformOverview = 'Required';
    if (!fields.keyWorkflows.trim()) errs.keyWorkflows = 'Required';
    if (!fields.personas.trim()) errs.personas = 'Required';
    if (!fields.phaseScope.trim()) errs.phaseScope = 'Required';
    if (!fields.phaseNames.trim()) errs.phaseNames = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;
    const exampleBriefs = (apiKey && apiKey !== 'your_api_key_here')
      ? await generateExampleBriefs(fields, apiKey)
      : [];
    // Preserve the existing ID when editing so project history is retained
    onComplete({ ...fields, exampleBriefs, id: initialValues?.id || Date.now().toString() });
  };

  if (loading) {
    return (
      <div className="setup-page">
        <div className="setup-loading">
          <div className="setup-spinner" />
          <p>Setting up your project…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-page">
      <div className="setup-card">
        <div className="setup-header">
          <div className="logo">
            <span className="logo-mark">ST</span>
            <span className="logo-text">Storytime</span>
          </div>
          <h1 className="setup-title">Set up your project</h1>
          <p className="setup-subtitle">
            Describe your product once. The generator will use this context to write precise, relevant user stories every time.
          </p>
        </div>

        <form className="setup-form" onSubmit={handleSubmit}>
          <div className="setup-section">
            <Field label="Project name" id="projectName" required error={errors.projectName}>
              <input
                type="text"
                id="projectName"
                className={`field-input${errors.projectName ? ' field-input-error' : ''}`}
                value={fields.projectName}
                onChange={e => set('projectName', e.target.value)}
                placeholder="e.g. RoleMapper, Acme CRM, Payments Platform"
              />
            </Field>

            <Field label="Platform overview" id="platformOverview" required hint="2–3 sentences" error={errors.platformOverview}>
              <textarea
                id="platformOverview"
                className={`field-textarea${errors.platformOverview ? ' field-textarea-error' : ''}`}
                value={fields.platformOverview}
                onChange={e => set('platformOverview', e.target.value)}
                placeholder="What is your product and what does it do?"
                rows={3}
              />
            </Field>

            <Field label="Key workflows or modules" id="keyWorkflows" required hint="Comma- or newline-separated" error={errors.keyWorkflows}>
              <textarea
                id="keyWorkflows"
                className={`field-textarea${errors.keyWorkflows ? ' field-textarea-error' : ''}`}
                value={fields.keyWorkflows}
                onChange={e => set('keyWorkflows', e.target.value)}
                placeholder="e.g. Onboarding flow, Dashboard, Reporting module, Admin panel"
                rows={3}
              />
            </Field>

            <Field label="Primary personas" id="personas" required hint="One per line: Name — description" error={errors.personas}>
              <textarea
                id="personas"
                className={`field-textarea${errors.personas ? ' field-textarea-error' : ''}`}
                value={fields.personas}
                onChange={e => set('personas', e.target.value)}
                placeholder={'Account Manager — expert user who manages client relationships\nSupport Agent — handles inbound tickets'}
                rows={4}
              />
            </Field>

            <div className="setup-row">
              <Field label="Phase scope" id="phaseScope" required error={errors.phaseScope}>
                <textarea
                  id="phaseScope"
                  className={`field-textarea${errors.phaseScope ? ' field-textarea-error' : ''}`}
                  value={fields.phaseScope}
                  onChange={e => set('phaseScope', e.target.value)}
                  placeholder="What is in scope now, and what is explicitly out of scope"
                  rows={3}
                />
              </Field>

              <Field label="Phase names" id="phaseNames" required hint="Comma-separated" error={errors.phaseNames}>
                <input
                  type="text"
                  id="phaseNames"
                  className={`field-input${errors.phaseNames ? ' field-input-error' : ''}`}
                  value={fields.phaseNames}
                  onChange={e => set('phaseNames', e.target.value)}
                  placeholder="e.g. MVP, Phase 2, Backlog"
                />
              </Field>
            </div>
          </div>

          <div className="setup-section setup-section-optional">
            <div className="setup-section-label">Optional</div>

            <Field label="Compliance or regulatory context" id="complianceContext">
              <textarea
                id="complianceContext"
                className="field-textarea"
                value={fields.complianceContext}
                onChange={e => set('complianceContext', e.target.value)}
                placeholder="Any legal, audit, or regulatory requirements that should shape how stories are written"
                rows={2}
              />
            </Field>

            <Field label="Key terminology" id="terminology">
              <textarea
                id="terminology"
                className="field-textarea"
                value={fields.terminology}
                onChange={e => set('terminology', e.target.value)}
                placeholder="e.g. We call levels 'grades' — never use 'levels'"
                rows={2}
              />
            </Field>
          </div>

          <button type="submit" className="btn-generate">
            <span className="btn-inner">
              Set up project
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </button>
          {onCancel && (
            <button type="button" className="btn-cancel" onClick={onCancel}>
              Cancel
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
