import { useRef, useState } from 'react';
import html2pdf from 'html2pdf.js';

const templates = [
  {
    id: 1,
    name: 'Student Classic',
    description: 'Structured single-page layout for academic achievement.',
    fileName: 'FlowCV_Resume_2026-07-09 (1).pdf',
    style: 'classic',
  },
  {
    id: 2,
    name: 'Modern Student',
    description: 'Minimal design with strong section hierarchy.',
    fileName: 'FlowCV_Resume_2026-07-09 (2).pdf',
    style: 'modern',
  },
  {
    id: 3,
    name: 'Academic Focus',
    description: 'Clear and bold format for coursework and projects.',
    fileName: 'FlowCV_Resume_2026-07-09 (3).pdf',
    style: 'academic',
  },
  {
    id: 4,
    name: 'Placement Ready',
    description: 'Professional student style optimized for recruiters.',
    fileName: 'FlowCV_Resume_2026-07-09 (4).pdf',
    style: 'placement',
  },
  {
    id: 5,
    name: 'Campus Resume',
    description: 'Fresh student-driven layout with photo and quick links.',
    fileName: 'FlowCV_Resume_2026-07-09.pdf',
    style: 'campus',
  },
];

const initialData = {
  fullName: '',
  email: '',
  github: '',
  linkedin: '',
  phone: '',
  location: '',
  summary: '',
  education: '',
  skills: '',
  internship: '',
  projects: '',
  achievements: '',
  languages: '',
  photo: null,
};

const splitItems = (text) => {
  if (!text) return [];
  return text
    .split(/\r?\n|,|;/)
    .map((line) => line.trim())
    .filter(Boolean);
};

const aiTemplateHints = {
  classic: 'Organize achievements clearly and keep the summary professional.',
  modern: 'Use concise impact statements with a polished modern tone.',
  academic: 'Highlight coursework, projects, and research clearly.',
  placement: 'Focus on placement-ready skills and internship outcomes.',
  campus: 'Showcase student leadership, campus activities, and technical skills.',
};

const buildAiSummary = (summary, style, name, location) => {
  const base = summary ? summary.trim() : `${name || 'A motivated student'} seeking placement opportunities from ${location || 'your institution'}.`;
  const hint = aiTemplateHints[style] || aiTemplateHints.classic;
  if (summary) {
    return `${base} ${hint}`;
  }
  return `${base} ${hint}`;
};

const buildListByLength = (text) => {
  const items = splitItems(text);
  return items.length ? items : ['Add a strong point or two here to strengthen this section.'];
};

const generateAiPreviewData = (data, style) => {
  const languages = splitItems(data.languages);
  const skills = buildListByLength(data.skills);
  const projects = buildListByLength(data.projects);
  const achievements = buildListByLength(data.achievements);
  const extras = [];

  if (data.summary) {
    extras.push('Summary refined for better alignment with the selected template tone.');
  } else {
    extras.push('Add a short summary sentence to introduce your placement goals quickly.');
  }

  if (languages.length) {
    extras.push(`Mention proficiency in ${languages.slice(0, 3).join(', ')} to strengthen technical fit.`);
  }

  if (!data.internship) {
    extras.push('If you have internship experience, include the company name, role, and impact.');
  }

  extras.push('Use consistent, action-oriented language across skills, projects, and achievements.');

  return {
    ...data,
    summary: buildAiSummary(data.summary, style, data.fullName, data.location),
    skills,
    languages,
    projects,
    achievements,
    extras,
  };
};

const App = () => {
  const [view, setView] = useState('home');
  const [activeTemplate, setActiveTemplate] = useState(1);
  const [formData, setFormData] = useState(initialData);
  const [previewData, setPreviewData] = useState(generateAiPreviewData(initialData, 'classic'));
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backendError, setBackendError] = useState('');
  const previewRef = useRef(null);

  const selectedTemplate = templates.find((template) => template.id === activeTemplate);

  const fetchBackendPreview = async (data) => {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ formData: data, templateStyle: selectedTemplate?.style || 'classic' }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || 'Unable to generate backend preview');
    }

    const payload = await response.json();
    return payload.previewData;
  };

  const handleAiEnhance = async () => {
    setBackendError('');
    setIsLoading(true);

    try {
      const data = await fetchBackendPreview(formData);
      setPreviewData(data);
      setAiSuggestions(data.extras || []);
    } catch (error) {
      setBackendError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (key) => (event) => {
    const value = event.target.type === 'file' ? event.target.files?.[0] ?? null : event.target.value;
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBackendError('');
    setIsLoading(true);

    const localPreview = generateAiPreviewData(formData, selectedTemplate?.style || 'classic');
    setPreviewData(localPreview);
    setView('preview');

    try {
      const data = await fetchBackendPreview(formData);
      setPreviewData(data);
      setAiSuggestions(data.extras || []);
    } catch (error) {
      setBackendError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!previewRef.current) return;
    html2pdf()
      .set({ margin: 0.4, filename: `${formData.fullName || 'resume'}.pdf`, html2canvas: { scale: 2 } })
      .from(previewRef.current)
      .save();
  };

  return (
    <main className="page-shell">
      {view === 'home' && (
        <section className="hero-card">
          <div className="hero-content">
            <p className="eyebrow">Placement-ready resumes in minutes</p>
            <h1>Welcome to Neha&apos;s Resume Builder</h1>
            <p className="tagline">Make your resume perfect</p>
            <button type="button" className="cta-button" onClick={() => setView('templates')}>
              Create Resume
            </button>
          </div>
        </section>
      )}

      {view === 'templates' && (
        <section className="template-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Student Resume Templates</p>
              <h2>Choose the best single-page layout</h2>
              <p className="panel-copy">
                These templates are tailored for students and freshers, with strong academic, skills, projects, and achievements sections.
              </p>
            </div>
            <button type="button" className="secondary-button" onClick={() => setView('home')}>
              Back
            </button>
          </div>

          <div className="template-grid">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`template-card ${activeTemplate === template.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveTemplate(template.id);
                  setView('editor');
                }}
              >
                <div className="pdf-card">
                  <object
                    data={`/templates/${encodeURIComponent(template.fileName)}#page=1`}
                    type="application/pdf"
                    className="pdf-frame"
                  >
                    <div className="pdf-fallback">Preview unavailable</div>
                  </object>
                </div>
                <div className="template-meta">
                  <h3>{template.name}</h3>
                  <p>{template.description}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {view === 'editor' && (
        <section className="editor-panel">
          <div className="editor-header">
            <div>
              <p className="eyebrow">Fill student resume details</p>
              <h2>{selectedTemplate?.name}</h2>
              <p className="panel-copy">
                Complete the fields below and preview your resume in a realistic page layout.
              </p>
            </div>
            <button type="button" className="secondary-button" onClick={() => setView('templates')}>
              Templates
            </button>
          </div>

          <div className="editor-grid">
            <form className="resume-form" onSubmit={handleSubmit}>
              {backendError && <p className="error-message">{backendError}</p>}
              <div className="form-section">
                <h3>Contact</h3>
                <div className="field-row">
                  <label>
                    Full Name
                    <input value={formData.fullName} onChange={handleChange('fullName')} placeholder="Neha Sharma" />
                  </label>
                  <label>
                    Email
                    <input type="email" value={formData.email} onChange={handleChange('email')} placeholder="neha@example.com" />
                  </label>
                </div>
                <div className="field-row">
                  <label>
                    GitHub URL
                    <input value={formData.github} onChange={handleChange('github')} placeholder="https://github.com/neha" />
                  </label>
                  <label>
                    LinkedIn URL
                    <input value={formData.linkedin} onChange={handleChange('linkedin')} placeholder="https://linkedin.com/in/neha" />
                  </label>
                </div>
                <div className="field-row">
                  <label>
                    Phone
                    <input value={formData.phone} onChange={handleChange('phone')} placeholder="+91 98765 43210" />
                  </label>
                  <label>
                    Location
                    <input value={formData.location} onChange={handleChange('location')} placeholder="Delhi, India" />
                  </label>
                </div>
              </div>

              <div className="form-section">
                <h3>Summary</h3>
                <textarea value={formData.summary} onChange={handleChange('summary')} placeholder="Write a brief summary of your strengths, academic goals, and placement ambitions." rows={4} />
              </div>

              <div className="form-section">
                <h3>Education</h3>
                <textarea value={formData.education} onChange={handleChange('education')} placeholder="College, degree, year, GPA or key coursework." rows={4} />
              </div>

              <div className="form-section">
                <h3>Skills</h3>
                <textarea value={formData.skills} onChange={handleChange('skills')} placeholder="List programming languages, tools, and technical skills." rows={3} />
              </div>

              <div className="form-section">
                <h3>Languages Known</h3>
                <textarea value={formData.languages} onChange={handleChange('languages')} placeholder="List languages you know, e.g. English, Hindi, Python, C++." rows={2} />
              </div>

              <div className="form-section">
                <h3>Internship (Optional)</h3>
                <textarea value={formData.internship} onChange={handleChange('internship')} placeholder="Describe any internship, role, company, and impact." rows={3} />
              </div>

              <div className="form-section">
                <h3>Projects</h3>
                <textarea value={formData.projects} onChange={handleChange('projects')} placeholder="Add project title and short description for each project." rows={4} />
              </div>

              <div className="form-section">
                <h3>Achievements</h3>
                <textarea value={formData.achievements} onChange={handleChange('achievements')} placeholder="List awards, certifications, or competitions." rows={3} />
              </div>

              <div className="form-section">
                <h3>Photo</h3>
                <input type="file" accept="image/*" onChange={handleChange('photo')} />
              </div>

              <button type="submit" className="cta-button">
                Preview Resume
              </button>
            </form>

            <aside className="resume-preview-card resume-preview-panel">
              <div className="preview-topbar">
                <div className="preview-title">Live Template Preview</div>
                <div className="preview-badge">Selected layout</div>
              </div>

              <div className="preview-actions ai-panel-actions">
                <button type="button" className="secondary-button" onClick={handleAiEnhance}>
                  {isLoading ? 'Generating...' : 'Suggest Enhancements'}
                </button>
              </div>

              <div className="preview-content preview-content-grid">
                <div className="preview-page">
                  <div className="resume-preview-header">
                    <div>
                      <h3>{previewData.fullName || 'Your Name'}</h3>
                      <p>{previewData.location || 'City, Country'}</p>
                    </div>
                    <div className={`preview-photo ${previewData.photo ? 'filled' : 'placeholder'}`}>
                      {previewData.photo ? 'Photo' : 'Photo'}
                    </div>
                  </div>
                  <div className="preview-row">
                    <div>
                      <section>
                        <h4>Summary</h4>
                        <p>{previewData.summary || 'Summarize your placement-ready strengths in one sentence.'}</p>
                      </section>
                      <section>
                        <h4>Education</h4>
                        <p>{previewData.education || 'College, program, year and notable academic achievements.'}</p>
                      </section>
                    </div>
                    <div>
                      <section>
                        <h4>Skills</h4>
                        {previewData.skills.length ? (
                          <div className="skill-list">
                            {previewData.skills.map((item) => (
                              <span key={item}>{item}</span>
                            ))}
                          </div>
                        ) : (
                          <p>List technical skills, tools, and languages.</p>
                        )}
                      </section>
                      <section>
                        <h4>Languages</h4>
                        {previewData.languages.length ? (
                          <div className="skill-list language-list">
                            {previewData.languages.map((item) => (
                              <span key={item}>{item}</span>
                            ))}
                          </div>
                        ) : (
                          <p>Include spoken and technical languages.</p>
                        )}
                      </section>
                      {previewData.internship && (
                        <section>
                          <h4>Internship</h4>
                          <p>{previewData.internship}</p>
                        </section>
                      )}
                    </div>
                  </div>
                </div>

                <div className="preview-details">
                  <section>
                    <h4>Projects</h4>
                    {previewData.projects.length ? (
                      <ul>
                        {previewData.projects.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>Include 2–3 projects that showcase your strongest work.</p>
                    )}
                  </section>
                  <section>
                    <h4>Achievements</h4>
                    {previewData.achievements.length ? (
                      <ul>
                        {previewData.achievements.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>Highlight awards, certificates, or leadership roles.</p>
                    )}
                  </section>
                  {aiSuggestions && (
                    <section className="ai-suggestion-card">
                      <h4>AI Enhancement Notes</h4>
                      <ul className="suggestion-list">
                        {previewData.extras.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                      <p className="suggestion-caption">These suggestions are for guidance only and do not change your entered resume fields.</p>
                    </section>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </section>
      )}

      {view === 'preview' && (
        <section className="preview-panel">
          <div className="preview-header-panel">
            <div>
              <p className="eyebrow">Resume Ready</p>
              <h2>{selectedTemplate?.name} Preview</h2>
              <p className="panel-copy">Your resume is styled to look like a real page preview. Edit fields or download the PDF.</p>
              {backendError && <p className="error-message">{backendError}</p>}
            </div>
          </div>

          <div className="preview-layout">
            <div className="preview-left" ref={previewRef}>
              <div className="preview-document">
                <div className="preview-document-label">Selected template preview</div>
                <article className={`resume-final resume-${selectedTemplate?.style}`}>
                  <header className="resume-final-header">
                    <div>
                      <h1>{previewData.fullName || 'Your Name'}</h1>
                      <p>{previewData.location || 'Your City, Country'}</p>
                    </div>
                    <div className={`resume-photo ${previewData.photo ? 'filled' : 'placeholder'}`}>
                      Photo
                    </div>
                  </header>
                  <div className="resume-contact">
                    {previewData.email && <a href={`mailto:${previewData.email}`}>{previewData.email}</a>}
                    {previewData.phone && <span>{previewData.phone}</span>}
                    {previewData.github && (
                      <a href={previewData.github} target="_blank" rel="noreferrer">
                        GitHub
                      </a>
                    )}
                    {previewData.linkedin && (
                      <a href={previewData.linkedin} target="_blank" rel="noreferrer">
                        LinkedIn
                      </a>
                    )}
                  </div>
                  <div className="resume-columns">
                    <div className="resume-column">
                      <section>
                        <h3>Summary</h3>
                        <p>{previewData.summary || 'A concise summary of your strengths and academic goals.'}</p>
                      </section>
                      <section>
                        <h3>Education</h3>
                        <p>{previewData.education || 'College, degree, year, GPA, and key coursework.'}</p>
                      </section>
                      <section>
                        <h3>Achievements</h3>
                        {previewData.achievements.length ? (
                          <ul>
                            {previewData.achievements.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p>Awards, certifications, or other recognitions.</p>
                        )}
                      </section>
                    </div>
                    <div className="resume-column">
                      <section>
                        <h3>Skills</h3>
                        {previewData.skills.length ? (
                          <div className="skill-list">
                            {previewData.skills.map((item) => (
                              <span key={item}>{item}</span>
                            ))}
                          </div>
                        ) : (
                          <p>Technical skills and tools.</p>
                        )}
                      </section>
                      <section>
                        <h3>Languages</h3>
                        {previewData.languages.length ? (
                          <div className="skill-list language-list">
                            {previewData.languages.map((item) => (
                              <span key={item}>{item}</span>
                            ))}
                          </div>
                        ) : (
                          <p>Spoken and programming languages.</p>
                        )}
                      </section>
                      {previewData.internship && (
                        <section>
                          <h3>Internship</h3>
                          <p>{previewData.internship}</p>
                        </section>
                      )}
                      <section>
                        <h3>Projects</h3>
                        {previewData.projects.length ? (
                          <ul>
                            {previewData.projects.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p>Project titles and brief achievements.</p>
                        )}
                      </section>
                    </div>
                  </div>
                </article>
              </div>
            </div>

            <aside className="preview-sidebar">
              <div className="sidebar-card">
                <p className="eyebrow">Ready to export</p>
                <h3>What to do next</h3>
                <p className="panel-copy">Review the resume page on the left. Use the buttons below to edit information or download the finished PDF.</p>
              </div>

              <div className="preview-actions">
                <button type="button" className="secondary-button" onClick={() => setView('editor')}>
                  Edit Information
                </button>
                <button type="button" className="cta-button" onClick={handleDownload}>
                  Download as PDF
                </button>
              </div>

              <div className="sidebar-card sidebar-template-card">
                <p className="eyebrow">Template</p>
                <h3>{selectedTemplate?.name}</h3>
                <p>{selectedTemplate?.description}</p>
                <div className="template-label">{selectedTemplate?.style?.replace(/\b\w/g, (c) => c.toUpperCase())} layout</div>
              </div>
            </aside>
          </div>
        </section>
      )}
    </main>
  );
};

export default App;
