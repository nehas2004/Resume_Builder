import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const openaiKey = process.env.OPENAI_API_KEY;
const openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!openaiKey || openaiKey === 'your_openai_api_key_here') {
  console.error('Missing or invalid OPENAI_API_KEY. Create a .env file from .env.example and set your real OpenAI key.');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: openaiKey });

const splitItems = (text) => {
  if (!text) return [];
  return text
    .split(/\r?\n|,|;/)
    .map((line) => line.trim())
    .filter(Boolean);
};

const formatList = (text) => {
  const items = splitItems(text);
  return items.length ? items : ['Add a strong point or two here to strengthen this section.'];
};

const createResumePrompt = (formData, templateStyle) => {
  const templateGuidelines = {
    classic: 'A classic resume with clean headings, structured sections, and a polished academic tone.',
    modern: 'A modern student resume with concise bullets, bold skill callouts, and a recruiter-friendly structure.',
    academic: 'An academic-style resume that emphasizes coursework, research, projects, and clear academic achievements.',
    placement: 'A placement-ready resume that highlights internships, technical skills, and practical results.',
    campus: 'A campus resume showcasing leadership, campus activities, technical skills, and quick achievements.',
  };

  const prompt = `Create a one-page resume with the following exact formatting and content structure. If the information provided already contains bullet points, phrases, or descriptions, do not discard or rewrite them from scratch — analyze the existing bullets, preserve their core meaning/technical details, and only refine wording, grammar, verb tense, and structure to match the required format below. Learn the style/pattern of any existing bullets and stay consistent with it while fixing formatting issues.

PAGE SETUP

- Page size: A4 or Letter, 1 page only (must fit without overflow)
- Margins: 0.5"–0.7" on all sides (narrow margins to maximize space)
- Font family: Calibri or Arial (clean sans-serif) throughout
- Base font size: 10–10.5pt for body text and bullets
- Line spacing: single (1.0), minimal paragraph spacing (2–4pt after)

HEADER

- Name: 16–18pt, Bold, ALL CAPS, centered
- Contact line: 9.5–10pt, centered, not bold — phone ⋄ email ⋄ GitHub ⋄ LinkedIn (⋄ as separator)

SECTION HEADERS (SUMMARY, EDUCATION, TECHNICAL SKILLS, INTERNSHIPS, PROJECTS, ACHIEVEMENTS, LANGUAGES KNOWN)

- 11–12pt, Bold, ALL CAPS, left-aligned
- Thin horizontal line/border below each heading (optional but recommended)
- Consistent spacing above each section (6–8pt)

SUMMARY

- 10pt, regular (not bold), justified alignment, one paragraph, 4–5 sentences, no bullets
- If a draft summary is already provided, refine grammar/flow and tighten it to 4–5 sentences rather than replacing it entirely

EDUCATION

- Institution name: 10.5pt Bold, left-aligned; City: regular, same line, left-aligned after institution
- Degree line: regular 10pt, left-aligned; CGPA/GPA: same line, right-aligned (use a table or tab-stop for clean right-alignment)

TECHNICAL SKILLS

- Bullet list, 10pt
- Category label in Bold followed by a colon, then comma-separated items in regular weight
- One category per bullet line
- If skills are given as a messy list or paragraph, categorize them correctly under Programming Languages, Frameworks/Libraries, Databases, Tools, Specialized Fields

INTERNSHIPS *(optional section — include only if applicable)*

- Company name + role: Bold, 10pt, left-aligned; Duration: regular, right-aligned same line
- 2–3 bullets below, regular 10pt, starting with strong past-tense action verbs
- If existing bullets are provided, keep their factual content intact — only fix verb tense, remove pronouns, and tighten to 2 lines max

PROJECTS

- Project name: Bold, ALL CAPS, 10.5pt, left-aligned; Month/Year: regular, right-aligned same line (use tab stop or table for alignment)
- Subtitle line (application type + tech stack): italic, 9.5–10pt, left-aligned
- 3 bullets per project: regular 10pt, start with strong past-tense action verb, max 2 lines each
- If project bullets are already written, keep the technical substance as-is — only correct grammar, verb consistency, and trim length to fit format; do not invent new technical claims not present in the original

ACHIEVEMENTS

- Bullet list, 10pt, regular weight
- Bold the award/event name within each bullet for emphasis, rest in regular weight
- If achievements are already listed, retain exact names/dates/awards and just standardize the sentence structure

LANGUAGES KNOWN

- Single line, 10pt, comma-separated (e.g., "English, Hindi, Malayalam"), optionally in parentheses proficiency level after each

GENERAL RULES

- Use bullet points (•) consistently, indented 0.15"–0.2"
- No personal pronouns anywhere
- Right-aligned dates/durations should use tab stops or a borderless table for clean alignment (not manual spacing)
- Keep total content tight enough to fit one page — trim bullet count or wording if it overflows
- Avoid excessive white space; keep section spacing uniform throughout
- Bold is reserved for: name, section headers, institution/company/project names, and key skill category labels only — do not bold entire sentences
- Never fabricate technical details, numbers, or claims that aren't present in the information provided — only reformat, reword, and restructure existing content

Use the data below when available. Do not invent fake experience.

Template style: ${templateStyle}
Guidelines: ${templateGuidelines[templateStyle] || templateGuidelines.classic}

Input data:
Full name: ${formData.fullName || 'N/A'}
Email: ${formData.email || 'N/A'}
Phone: ${formData.phone || 'N/A'}
Location: ${formData.location || 'N/A'}
LinkedIn: ${formData.linkedin || 'N/A'}
GitHub: ${formData.github || 'N/A'}
Summary: ${formData.summary || 'N/A'}
Education: ${formData.education || 'N/A'}
Skills: ${formData.skills || 'N/A'}
Languages: ${formData.languages || 'N/A'}
Internship: ${formData.internship || 'N/A'}
Projects: ${formData.projects || 'N/A'}
Achievements: ${formData.achievements || 'N/A'}

Return JSON only with these keys: summary, education, skills, languages, internship, projects, achievements, extras. Each of skills, languages, projects, achievements should be an array of short strings. Provide extras as a list of enhancement tips that improve the resume.
`;

  return prompt;
};

app.use(cors());
app.use(express.json());

app.post('/api/generate', async (req, res) => {
  const { formData = {}, templateStyle = 'classic' } = req.body;

  if (!formData) {
    return res.status(400).json({ message: 'formData is required' });
  }

  const prompt = createResumePrompt(formData, templateStyle);

  try {
    const completion = await openai.responses.create({
      model: openaiModel,
      input: prompt,
      max_output_tokens: 600,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'resume_preview',
          schema: {
            type: 'object',
            properties: {
              summary: { type: 'string' },
              education: { type: 'string' },
              skills: { type: 'array', items: { type: 'string' } },
              languages: { type: 'array', items: { type: 'string' } },
              internship: { type: 'string' },
              projects: { type: 'array', items: { type: 'string' } },
              achievements: { type: 'array', items: { type: 'string' } },
              extras: { type: 'array', items: { type: 'string' } },
            },
            required: ['summary', 'education', 'skills', 'languages', 'internship', 'projects', 'achievements', 'extras'],
          },
        },
      },
    });

    const outputItems = Array.isArray(completion.output) ? completion.output : [];
    const structuredTextItem = outputItems
      .flatMap((item) => item.content || [])
      .find((item) => item.type === 'structured_text');
    const jsonSchemaItem = outputItems
      .flatMap((item) => item.content || [])
      .find((item) => item.type === 'json_schema');

    let parsed = null;
    if (jsonSchemaItem?.json) {
      parsed = jsonSchemaItem.json;
    } else if (structuredTextItem?.text) {
      try {
        parsed = JSON.parse(structuredTextItem.text);
      } catch (parseError) {
        throw new Error('Unable to parse structured JSON output from OpenAI');
      }
    }

    if (!parsed) {
      throw new Error('Invalid OpenAI response format');
    }

    const previewData = {
      ...formData,
      summary: parsed.summary || formData.summary || '',
      education: parsed.education || formData.education || '',
      skills: parsed.skills?.length ? parsed.skills : formatList(formData.skills),
      languages: parsed.languages?.length ? parsed.languages : formatList(formData.languages),
      internship: parsed.internship || formData.internship || '',
      projects: parsed.projects?.length ? parsed.projects : formatList(formData.projects),
      achievements: parsed.achievements?.length ? parsed.achievements : formatList(formData.achievements),
      extras: parsed.extras || ['Review the generated points and tailor them to your own resume.'],
    };

    return res.json({ previewData });
  } catch (error) {
    const errorMessage =
      error?.response?.data?.error?.message ||
      error?.message ||
      'Failed to generate resume preview with OpenAI.';

    console.error('OpenAI API error:', errorMessage, error);
    return res.status(500).json({ message: `OpenAI error: ${errorMessage}` });
  }
});

const distPath = path.resolve(__dirname, 'dist');

app.use(express.static(distPath));
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});
app.get('/', (req, res) => {
  return res.sendFile(path.join(distPath, 'index.html'));
});
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'API route not found' });
  }
  return res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`AI resume backend running on http://localhost:${port}`);
});
