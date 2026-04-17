import React, { useState, useRef, useEffect } from 'react';
import SYSTEM_PROMPT from './systemPrompt';
import { WORKFLOW_AREAS, PERSONAS, MVP_PHASES, STORY_TYPES } from './config';
import './App.css';

const HISTORY_KEY = 'rm_story_history';

function extractTitle(output) {
  const match = output.match(/^#{1,3} (.+)$/m);
  return match ? match[1].trim() : 'Untitled story';
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

// --- Simple markdown renderer (bold, italic, blockquote, bullets, headings) ---
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // H3
    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="md-h3">{line.slice(4)}</h3>);
    }
    // H2
    else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="md-h2">{line.slice(3)}</h2>);
    }
    // H1
    else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="md-h1">{line.slice(2)}</h1>);
    }
    // Blockquote
    else if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={i} className="md-blockquote">
          {inlineFormat(line.slice(2))}
        </blockquote>
      );
    }
    // Horizontal rule
    else if (line.match(/^---+$/)) {
      elements.push(<hr key={i} className="md-hr" />);
    }
    // Bullet
    else if (line.match(/^[-*–—] /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[-*–—] /)) {
        items.push(<li key={i}>{inlineFormat(lines[i].slice(2))}</li>);
        i++;
      }
      elements.push(<ul key={`ul-${i}`} className="md-ul">{items}</ul>);
      continue;
    }
    // Numbered list
    else if (line.match(/^\d+\. /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(<li key={i}>{inlineFormat(lines[i].replace(/^\d+\. /, ''))}</li>);
        i++;
      }
      elements.push(<ol key={`ol-${i}`} className="md-ol">{items}</ol>);
      continue;
    }
    // Empty line
    else if (line.trim() === '') {
      elements.push(<div key={i} className="md-spacer" />);
    }
    // Paragraph
    else {
      elements.push(<p key={i} className="md-p">{inlineFormat(line)}</p>);
    }
    i++;
  }
  return elements;
}

function inlineFormat(text) {
  // Bold+italic, bold, italic, inline code
  const parts = [];
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[2]) parts.push(<strong key={key++}><em>{match[2]}</em></strong>);
    else if (match[3]) parts.push(<strong key={key++}>{match[3]}</strong>);
    else if (match[4]) parts.push(<em key={key++}>{match[4]}</em>);
    else if (match[5]) parts.push(<code key={key++} className="md-code">{match[5]}</code>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
}

// --- Markdown to HTML (for clipboard) ---
function inlineToHtml(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

function markdownToHtml(text) {
  if (!text) return '';
  const lines = text.split('\n');
  const html = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('### '))       { html.push(`<h3>${inlineToHtml(line.slice(4))}</h3>`); }
    else if (line.startsWith('## '))   { html.push(`<h2>${inlineToHtml(line.slice(3))}</h2>`); }
    else if (line.startsWith('# '))    { html.push(`<h1>${inlineToHtml(line.slice(2))}</h1>`); }
    else if (line.startsWith('> '))    { html.push(`<blockquote>${inlineToHtml(line.slice(2))}</blockquote>`); }
    else if (line.match(/^---+$/))     { html.push('<hr/>'); }
    else if (line.match(/^[-*–—] /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[-*–—] /)) { items.push(`<li>${inlineToHtml(lines[i].slice(2))}</li>`); i++; }
      html.push(`<ul>${items.join('')}</ul>`); continue;
    } else if (line.match(/^\d+\. /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) { items.push(`<li>${inlineToHtml(lines[i].replace(/^\d+\. /, ''))}</li>`); i++; }
      html.push(`<ol>${items.join('')}</ol>`); continue;
    } else if (line.trim() !== '') {
      html.push(`<p>${inlineToHtml(line)}</p>`);
    }
    i++;
  }
  return `<div style="font-family: Aptos, 'Aptos Body', Calibri, sans-serif; font-size: 11pt;">${html.join('')}</div>`;
}

// --- Select component ---
function Select({ label, value, onChange, options }) {
  return (
    <div className="field-group">
      <label className="field-label">{label}</label>
      <select className="field-select" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// --- Copy button ---
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const html = markdownToHtml(text);
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      }),
    ]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button className="btn-generate btn-copy" onClick={copy}>
      {copied ? '✓ Copied' : 'Copy for Word'}
    </button>
  );
}

// --- Main App ---
export default function App() {
  const [workflow, setWorkflow] = useState(WORKFLOW_AREAS[0].value);
  const [persona, setPersona] = useState(PERSONAS[0].value);
  const [phase, setPhase] = useState(MVP_PHASES[0].value);
  const [storyType, setStoryType] = useState(STORY_TYPES[0].value);
  const [brief, setBrief] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasGenerated, setHasGenerated] = useState(false);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
    catch { return []; }
  });
  const [activeHistoryId, setActiveHistoryId] = useState(null);
  const outputRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (output && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const saveToHistory = (fullOutput) => {
    const entry = {
      id: Date.now().toString(),
      title: extractTitle(fullOutput),
      brief,
      workflow,
      persona,
      phase,
      storyType,
      output: fullOutput,
      createdAt: Date.now(),
    };
    setHistory(prev => {
      const updated = [entry, ...prev];
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
    setActiveHistoryId(entry.id);
  };

  const loadHistoryItem = (item) => {
    setWorkflow(item.workflow);
    setPersona(item.persona);
    setPhase(item.phase);
    setStoryType(item.storyType);
    setBrief(item.brief);
    setOutput(item.output);
    setHasGenerated(true);
    setError('');
    setActiveHistoryId(item.id);
  };

  const deleteHistoryItem = (id, e) => {
    e.stopPropagation();
    setHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
    if (activeHistoryId === id) setActiveHistoryId(null);
  };

  const generate = async () => {
    if (!brief.trim()) return;

    const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'your_api_key_here') {
      setError('API key not configured. Add REACT_APP_ANTHROPIC_API_KEY to your .env.local file.');
      return;
    }

    setLoading(true);
    setError('');
    setOutput('');
    setHasGenerated(true);
    setActiveHistoryId(null);

    const userPrompt = `Generate a complete RoleMapper user story for the following feature brief.

Feature brief: ${brief}

Parameters:
- Workflow area: ${workflow}
- Primary persona: ${persona}
- MVP phase: ${phase}
- Story type: ${storyType}

Follow the full user story format exactly as specified: Feature Description, Purpose, Outcome, User Story (blockquote), What Happens (bullets), Critical Elements (bullets), Acceptance Criteria (Given/When/Then), and Product Notes with all four subsections (Technical dependencies, Phase scoping, Compliance and integrity risks, Open questions).`;

    try {
      abortRef.current = new AbortController();

      const response = await fetch('/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 8096,
          stream: true,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userPrompt }],
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || `API error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullOutput = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                fullOutput += parsed.delta.text;
                setOutput(prev => prev + parsed.delta.text);
              }
            } catch {}
          }
        }
      }

      if (fullOutput) saveToHistory(fullOutput);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') generate();
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-mark">RM</span>
            <span className="logo-text">RoleMapper</span>
          </div>
          <p className="sidebar-tagline">User story generator</p>
        </div>

        <div className="sidebar-body">
          <Select label="Workflow area" value={workflow} onChange={setWorkflow} options={WORKFLOW_AREAS} />
          <Select label="Primary persona" value={persona} onChange={setPersona} options={PERSONAS} />
          <Select label="MVP phase" value={phase} onChange={setPhase} options={MVP_PHASES} />
          <Select label="Story type" value={storyType} onChange={setStoryType} options={STORY_TYPES} />

          <div className="field-group brief-group">
            <label className="field-label">
              Feature brief
              <span className="field-hint">Cmd+Enter to generate</span>
            </label>
            <textarea
              className="field-textarea"
              value={brief}
              onChange={e => setBrief(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the feature in 1–3 sentences. E.g. 'A bulk upload screen where comp analysts can upload a CSV of roles for mass evaluation, with error flagging for any that need manual review.'"
              rows={6}
            />
            <div className="char-count">{brief.length} characters</div>
          </div>

          <button
            className="btn-generate"
            onClick={generate}
            disabled={loading || !brief.trim()}
          >
            {loading ? (
              <span className="btn-inner">
                <span className="spinner" />
                Generating…
              </span>
            ) : (
              <span className="btn-inner">
                Generate user story
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            )}
          </button>

          {loading && (
            <button
              className="btn-cancel"
              onClick={() => abortRef.current?.abort()}
            >
              Cancel
            </button>
          )}
        </div>

        {history.length > 0 && (
          <div className="history-section">
            <div className="history-header">Recent stories</div>
            <div className="history-list">
              {history.map(item => (
                <div
                  key={item.id}
                  className={`history-item${activeHistoryId === item.id ? ' active' : ''}`}
                  onClick={() => loadHistoryItem(item)}
                >
                  <div className="history-item-info">
                    <div className="history-item-title">{item.title}</div>
                    <div className="history-item-meta">{timeAgo(item.createdAt)}</div>
                  </div>
                  <button
                    className="history-item-delete"
                    onClick={(e) => deleteHistoryItem(item.id, e)}
                    title="Delete"
                  >×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="sidebar-footer">
          <p className="footer-note">
            Intelligence is defined in <code>systemPrompt.js</code>.<br />
            Add dropdowns in <code>config.js</code>.
          </p>
        </div>
      </aside>

      <main className="main">
        {error && (
          <div className="error-banner">
            <strong>Error:</strong> {error}
          </div>
        )}

        {!hasGenerated && !error && (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect x="4" y="6" width="24" height="3" rx="1.5" fill="currentColor" opacity="0.2"/>
                <rect x="4" y="13" width="18" height="3" rx="1.5" fill="currentColor" opacity="0.2"/>
                <rect x="4" y="20" width="21" height="3" rx="1.5" fill="currentColor" opacity="0.2"/>
              </svg>
            </div>
            <h2 className="empty-title">Ready to generate</h2>
            <p className="empty-body">
              Fill in the form and describe your feature.<br />
              Stories include Product Notes flagging dependencies,<br />scope risks, and open questions.
            </p>
            <div className="examples">
              <p className="examples-label">Example briefs</p>
              {[
                'A bulk upload screen for uploading a CSV of roles for mass evaluation, with error flagging for roles needing manual review',
                'A pay equity heatmap showing gender pay gaps by job family and level, filterable by business area',
                'An admin screen for configuring which job families and tracks are active in the framework',
              ].map((ex, idx) => (
                <button
                  key={idx}
                  className="example-chip"
                  onClick={() => setBrief(ex)}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {hasGenerated && (
          <div className="output-wrapper">
            <div className="output-toolbar">
              <span className="output-label">
                {loading ? (
                  <span className="generating-label">
                    <span className="dot-pulse" />
                    Generating…
                  </span>
                ) : (
                  'User story'
                )}
              </span>
              {!loading && output && <CopyButton text={output} />}
            </div>
            <div className="output-body" ref={outputRef}>
              <div className="output-content">
                {renderMarkdown(output)}
                {loading && <span className="cursor-blink" />}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
