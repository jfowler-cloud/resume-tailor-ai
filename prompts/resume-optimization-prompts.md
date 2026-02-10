# Resume Optimization Prompts
# Incorporating Steering Document Guidelines

## Context Loading Prompt

```
You are an expert resume writer and career coach. You will be provided with:
1. Multiple resume versions from the candidate
2. A job description for a target position

Your task is to analyze the candidate's experience and tailor their resume to maximize fit for the specific role.

CRITICAL RULES:
- Keep all factual information accurate (no fabrication)
- Use strong, action-oriented language with measurable achievements
- Quantify results wherever possible (percentages, dollar amounts, time saved)
- Focus on impact and outcomes, not just responsibilities
- Ensure each bullet point demonstrates value delivered
- Incorporate keywords naturally for ATS optimization
- Maintain professional tone and formatting
```

---

## Prompt 1: Analyze Job Requirements

```
Analyze this job description and extract structured information for resume tailoring.

Job Description:
{job_description}

Extract and return as JSON:
{
  "required_skills": {
    "technical": ["skill1", "skill2", ...],
    "soft_skills": ["skill1", "skill2", ...],
    "certifications": ["cert1", "cert2", ...]
  },
  "desired_skills": {
    "technical": ["skill1", "skill2", ...],
    "soft_skills": ["skill1", "skill2", ...],
    "certifications": ["cert1", "cert2", ...]
  },
  "experience_requirements": {
    "years_required": "X+ years",
    "education_level": "Bachelor's/Master's/PhD",
    "specific_experience": ["exp1", "exp2", ...]
  },
  "key_responsibilities": ["resp1", "resp2", ...],
  "ats_keywords": ["keyword1", "keyword2", ...],
  "company_culture": {
    "values": ["value1", "value2", ...],
    "work_style": "description"
  },
  "compensation_indicators": {
    "level": "junior/mid/senior/principal",
    "likely_range": "estimate if possible"
  }
}
```

---

## Prompt 2: Evaluate Resume Fit

```
Compare this resume against the job requirements and provide a comprehensive fit analysis.

Resume:
{resume_text}

Job Requirements:
{requirements_json}

Analyze and return as JSON:
{
  "overall_fit_score": 85,  // 0-100%
  "fit_breakdown": {
    "technical_skills": {
      "score": 90,
      "matching": ["skill1: evidence from resume", ...],
      "missing": ["skill1", "skill2", ...]
    },
    "experience_level": {
      "score": 80,
      "matching": ["X years in domain Y", ...],
      "gaps": ["needs more experience in Z", ...]
    },
    "education": {
      "score": 100,
      "meets_requirements": true,
      "details": "Bachelor's degree in relevant field"
    },
    "certifications": {
      "score": 70,
      "matching": ["cert1", ...],
      "missing": ["cert2", ...]
    },
    "ats_optimization": {
      "keyword_match_percentage": 75,
      "matched_keywords": ["keyword1", ...],
      "missing_keywords": ["keyword2", ...]
    }
  },
  "strengths": [
    "Strong alignment in area X with Y years experience",
    "Quantifiable achievements in Z",
    ...
  ],
  "weaknesses": [
    "Limited experience in area A",
    "Missing keyword B",
    ...
  ],
  "recommendations": [
    "Emphasize experience with X in professional summary",
    "Add quantifiable metrics for Y",
    "Incorporate keyword Z naturally in skills section",
    ...
  ]
}
```

---

## Prompt 3: Professional Resume Rewrite (Approach 1)

**Based on Steering Doc: "Rewrite My Resume Like a Pro"**

```
You are a top recruiter reviewing resumes. Rewrite this resume for the specific job role using strong, measurable language that grabs attention.

Original Resume:
{best_resume}

Job Description:
{job_description}

Job Requirements Analysis:
{requirements_json}

Fit Analysis:
{fit_analysis}

INSTRUCTIONS:
1. Use strong, action-oriented language with measurable achievements
2. Quantify results wherever possible (percentages, dollar amounts, time saved)
3. Focus on impact and outcomes, not just responsibilities
4. Ensure each bullet point demonstrates value delivered
5. Lead with most impressive, relevant achievements
6. Use power verbs: architected, engineered, delivered, optimized, reduced, increased
7. Keep resume to 2 pages maximum
8. Maintain all factual accuracy

STRUCTURE:
- Professional Summary: 3-4 sentences highlighting most relevant experience
- Technical Skills: Organized by category, prioritizing job requirements
- Professional Experience: Reverse chronological, emphasizing relevant roles
- Education & Certifications: Include all relevant credentials
- Awards & Recognition: If space permits

Return the tailored resume in Markdown format.
```

---

## Prompt 4: ATS Optimization (Approach 2)

**Based on Steering Doc: "Make It ATS-Friendly"**

```
Optimize this resume to be 100% compatible with Applicant Tracking Systems while maintaining readability.

Resume:
{tailored_resume_draft}

Job Description:
{job_description}

ATS Keywords:
{ats_keywords}

INSTRUCTIONS:
1. Use standard section headings: Professional Summary, Technical Skills, Professional Experience, Education, Certifications
2. Avoid tables, graphics, or complex formatting that ATS can't parse
3. Include both acronyms and full terms (e.g., "AI (Artificial Intelligence)")
4. Match job title variations and technical terms from the posting
5. Incorporate keywords naturally throughout (aim for 80%+ keyword match)
6. Use simple bullet points (•) not fancy symbols
7. Ensure dates are in standard format (Month Year - Month Year)
8. Keep font simple (no fancy fonts)
9. Use standard file format indicators in skills (Python, JavaScript, not 🐍 or fancy icons)

KEYWORD INTEGRATION STRATEGY:
- Professional Summary: 5-7 top keywords
- Technical Skills: All relevant technical keywords
- Professional Experience: Keywords woven into achievement descriptions
- Avoid keyword stuffing - maintain natural language

Return the ATS-optimized resume in Markdown format.
```

---

## Prompt 5: Honest Critical Review (Approach 3)

**Based on Steering Doc: "Brutally Honest Feedback"**

```
Give unfiltered, constructive feedback on this resume. Tell me what's weak, what's okay, and how to make it impossible to ignore.

Resume:
{tailored_resume_draft}

Job Description:
{job_description}

PROVIDE HONEST ASSESSMENT:

**What's Weak:**
- Vague language without metrics
- Missing key qualifications
- Formatting issues
- Unclear impact statements
- Keyword gaps
- Sections that don't add value

**What's Okay:**
- Elements that work but could be stronger
- Adequate but not compelling sections

**What's Strong:**
- Compelling achievements
- Clear value propositions
- Well-quantified results
- Strong keyword integration

**How to Make It Impossible to Ignore:**
- Specific, actionable improvements
- Examples of stronger phrasing
- Missing elements that would elevate the resume
- Strategic reordering recommendations

Be direct but constructive. Focus on making this resume stand out in a stack of 100+ applications.

Return as structured feedback with specific examples and recommendations.
```

---

## Prompt 6: Cover Letter Generation (Approach 4)

**Based on Steering Doc: "Write a Standout Cover Letter"**

```
Create a personalized cover letter that tells the candidate's story, shows passion, and makes them stand out.

Tailored Resume:
{final_resume}

Job Description:
{job_description}

Company Information:
{company_info}

INSTRUCTIONS:
1. Tell a cohesive story connecting past experience to the target role
2. Show genuine enthusiasm and understanding of the company/role
3. Highlight 2-3 key achievements that align with job requirements
4. Demonstrate cultural fit and unique value proposition
5. Keep it concise (3-4 paragraphs maximum)
6. End with a strong call to action
7. Use conversational but professional tone
8. Avoid clichés and generic statements

STRUCTURE:
**Opening Paragraph:**
- Hook that grabs attention
- Why this specific role at this specific company
- Brief statement of relevant expertise

**Body Paragraphs (1-2):**
- 2-3 specific achievements demonstrating fit
- Connect experience to job requirements
- Show understanding of company challenges/goals
- Demonstrate unique value you bring

**Closing Paragraph:**
- Reiterate enthusiasm
- Strong call to action
- Professional sign-off

Return the cover letter in professional format.
```

---

## Prompt 7: Job Description Alignment (Approach 5)

**Based on Steering Doc: "Match It to the Job Posting"**

```
Take this job description and adjust the resume to align with it point-by-point, using data-driven language.

Resume:
{tailored_resume_draft}

Job Description:
{job_description}

Requirements Analysis:
{requirements_json}

INSTRUCTIONS:
1. Analyze the job description for required skills, qualifications, and keywords
2. Restructure resume sections to mirror job posting priorities
3. Incorporate exact terminology and phrases from the posting
4. Quantify achievements that directly address job requirements
5. Reorder bullet points to lead with most relevant experience
6. Ensure every major requirement is addressed somewhere in the resume
7. Use data-driven language (percentages, metrics, outcomes)

ALIGNMENT STRATEGY:
- If job emphasizes "cloud architecture" → lead with cloud architecture experience
- If job requires "5+ years Python" → prominently feature "10+ years Python"
- If job mentions "CI/CD pipelines" → highlight pipeline development achievements
- If job values "team leadership" → quantify team size and outcomes

For each major job requirement, ensure there's a corresponding resume element that directly addresses it.

Return the aligned resume in Markdown format with a mapping document showing:
{
  "requirement": "job requirement text",
  "resume_section": "where it's addressed",
  "evidence": "specific resume text that addresses it"
}
```

---

## Prompt 8: Work History Gap Management (Approach 6)

**Based on Steering Doc: "Fill the Gaps"**

```
This resume has work history gaps. Rewrite it to emphasize transferable skills and growth, not inconsistency.

Resume:
{resume_with_gaps}

Job Description:
{job_description}

INSTRUCTIONS:
1. Use functional or hybrid resume format if gaps are significant
2. Highlight continuous skill development during gap periods
3. Emphasize transferable skills applicable across roles
4. Focus on achievements and capabilities rather than timeline
5. Include relevant projects, volunteer work, or professional development during gaps
6. Frame career progression as intentional growth, not inconsistency
7. Use year-only dates if monthly gaps are problematic
8. Group related experience under skill categories if appropriate

GAP MANAGEMENT STRATEGIES:
- "Career Development Period" for skill-building gaps
- "Independent Consulting" for freelance/contract work
- "Professional Development" for training/certification periods
- Emphasize continuous learning and skill acquisition
- Focus on "what you can do" not "when you did it"

Return the gap-managed resume in Markdown format.
```

---

## Prompt 9: Final Quality Check

```
Perform a final quality check on this resume before delivery.

Resume:
{final_resume}

Job Description:
{job_description}

CHECK FOR:
1. **Grammar & Spelling:**
   - Zero errors
   - Consistent tense (past for previous roles, present for current)
   - Proper punctuation

2. **Formatting:**
   - Consistent bullet point style
   - Proper spacing and alignment
   - Professional font usage
   - Appropriate length (1-2 pages)

3. **Content Quality:**
   - No personal pronouns (I, me, my)
   - No clichés or generic statements
   - Active voice throughout
   - Strong action verbs

4. **ATS Compatibility:**
   - Standard section headings
   - No tables or complex formatting
   - Keywords naturally integrated
   - Proper date formatting

5. **Value Proposition:**
   - Clear value in first third of document
   - Quantified achievements throughout
   - Relevant skills prominently featured
   - Strong professional summary

6. **Job Alignment:**
   - Addresses all major requirements
   - Keywords from job description present
   - Experience prioritized by relevance

Return:
{
  "quality_score": 95,  // 0-100
  "issues_found": [
    {"severity": "high/medium/low", "issue": "description", "location": "section", "fix": "recommendation"},
    ...
  ],
  "strengths": ["strength1", "strength2", ...],
  "final_recommendations": ["rec1", "rec2", ...],
  "ready_for_submission": true/false
}
```

---

## Prompt 10: Generate Interview Preparation Guide

```
Based on the tailored resume and job description, generate an interview preparation guide.

Tailored Resume:
{final_resume}

Job Description:
{job_description}

GENERATE:
1. **Likely Interview Questions:**
   - Technical questions based on required skills
   - Behavioral questions based on job responsibilities
   - Situational questions based on company challenges

2. **STAR Method Responses:**
   - For each major achievement on resume
   - Situation, Task, Action, Result format
   - Quantified outcomes

3. **Questions to Ask Interviewer:**
   - About role responsibilities
   - About team structure
   - About company culture
   - About growth opportunities

4. **Key Talking Points:**
   - 3-5 main strengths to emphasize
   - How your experience aligns with role
   - Unique value you bring

5. **Potential Concerns to Address:**
   - Any gaps or weaknesses
   - How to frame them positively
   - Evidence of capability despite concerns

Return as structured interview prep document.
```

---

## Usage in Step Functions Workflow

These prompts will be used in the following sequence:

1. **Parse Resumes** → Extract text from all uploaded resumes
2. **Analyze Job Requirements** → Prompt 1
3. **Evaluate Fit** → Prompt 2 (for each resume)
4. **Select Best Base Resume** → Highest fit score
5. **Tailor Resume** → Prompts 3, 4, 5, 7 (combined approach)
6. **Generate Cover Letter** → Prompt 6
7. **Final Quality Check** → Prompt 9
8. **Generate Interview Prep** → Prompt 10
9. **Store Results** → Save to DynamoDB + S3

Each prompt is designed to be modular and can be used independently or in combination.
