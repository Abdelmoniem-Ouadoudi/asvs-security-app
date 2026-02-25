import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface GeminiResponse {
  candidates: Array<{
    content: { parts: Array<{ text: string }> };
    finishReason: string;
  }>;
}

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private readonly apiUrl =
    'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';

  constructor(private http: HttpClient) {}

  askAboutRequirement(
    requirementId: string,
    requirementText: string,
    area: string,
    category: string
  ): Observable<string> {
    const prompt = `You are a security expert specializing in OWASP ASVS (Application Security Verification Standard).

A developer needs help implementing the following ASVS requirement:

**Requirement ID:** ${requirementId}
**Category:** ${category}
**Area:** ${area}
**Requirement:** ${requirementText}

Please provide a practical, developer-focused answer including:
1. **What it means** – a plain-language explanation
2. **Why it matters** – the security risk if not implemented
3. **How to implement it** – concrete code examples or steps (use the most common web stack)
4. **How to verify it** – how to test or confirm compliance

Use Markdown formatting with headers, bullet points, and code blocks where appropriate.`;

    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1500,
      },
    };

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http
      .post<GeminiResponse>(`${this.apiUrl}?key=${environment.geminiApiKey}`, body, { headers })
      .pipe(
        map((res) => {
          const text = res?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) throw new Error('Empty response from Gemini');
          return text;
        }),
        catchError((err) => {
          const msg =
            err?.error?.error?.message ||
            err?.message ||
            'Failed to get a response from Gemini.';
          return throwError(() => new Error(msg));
        })
      );
  }
}
