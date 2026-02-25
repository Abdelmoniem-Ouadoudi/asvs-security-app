import {
  Component, Input, Output, EventEmitter,
  OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { marked } from 'marked';
import { GeminiService } from '../../../services/gemini';
import { EnhancedRequirement } from '../../../models/asvs.model';

@Component({
  selector: 'app-ai-help-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <!-- Backdrop -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      (click)="onBackdropClick($event)"
    >
      <!-- Modal panel -->
      <div
        class="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-in-up"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="flex items-start justify-between px-6 py-4 border-b border-neutral-200 bg-gradient-to-r from-primary-50 to-white flex-shrink-0">
          <div class="flex-1 min-w-0 pr-4">
            <div class="flex items-center gap-2 mb-1">
              <!-- Gemini spark icon -->
              <svg class="w-5 h-5 text-primary-600 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z"/>
              </svg>
              <span class="text-xs font-bold text-primary-600 uppercase tracking-wider">AI Help · Gemini</span>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-700">
                {{ requirement['#'] }}
              </span>
            </div>
            <h2 class="text-base font-bold text-neutral-900 leading-snug truncate">{{ requirement['Area'] }}</h2>
          </div>
          <button
            (click)="close.emit()"
            class="p-2 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Requirement summary pill -->
        <div class="px-6 py-3 bg-neutral-50 border-b border-neutral-100 flex-shrink-0">
          <p class="text-xs text-neutral-600 line-clamp-2">{{ requirement['Verification Requirement'] }}</p>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto px-6 py-5">

          <!-- Loading state -->
          <div *ngIf="loading" class="flex flex-col items-center justify-center py-12 gap-4">
            <div class="relative w-12 h-12">
              <div class="absolute inset-0 rounded-full border-4 border-primary-200"></div>
              <div class="absolute inset-0 rounded-full border-4 border-primary-600 border-t-transparent animate-spin"></div>
            </div>
            <div class="text-center">
              <p class="text-sm font-semibold text-neutral-700">Asking Gemini…</p>
              <p class="text-xs text-neutral-400 mt-1">Generating implementation guidance</p>
            </div>
          </div>

          <!-- Error state -->
          <div *ngIf="error && !loading" class="rounded-xl bg-danger-50 border border-danger-200 p-5">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-danger-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div>
                <p class="text-sm font-semibold text-danger-800 mb-1">Failed to get a response</p>
                <p class="text-xs text-danger-700">{{ error }}</p>
              </div>
            </div>
            <button
              (click)="load()"
              class="mt-4 px-4 py-2 text-sm font-semibold bg-danger-600 text-white rounded-lg hover:bg-danger-700 transition-colors"
            >
              Retry
            </button>
          </div>

          <!-- Markdown response -->
          <div
            *ngIf="renderedHtml && !loading && !error"
            class="prose prose-sm prose-neutral max-w-none
                   prose-headings:font-bold prose-headings:text-neutral-900
                   prose-h2:text-base prose-h3:text-sm
                   prose-code:bg-neutral-100 prose-code:text-primary-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                   prose-pre:bg-neutral-900 prose-pre:text-neutral-100
                   prose-a:text-primary-600 prose-strong:text-neutral-900"
            [innerHTML]="renderedHtml"
          ></div>

        </div>

        <!-- Footer -->
        <div class="px-6 py-3 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between flex-shrink-0">
          <span class="text-xs text-neutral-400">Powered by Google Gemini · Verify all advice before use</span>
          <button
            *ngIf="renderedHtml && !loading"
            (click)="load()"
            class="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Regenerate
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: contents; }

    .prose :deep(pre) {
      overflow-x: auto;
      border-radius: 0.5rem;
      padding: 1rem;
      font-size: 0.8rem;
      line-height: 1.6;
    }
    .prose :deep(code) {
      font-size: 0.8rem;
    }
    .prose :deep(h2) { margin-top: 1.25rem; margin-bottom: 0.5rem; }
    .prose :deep(h3) { margin-top: 1rem; margin-bottom: 0.4rem; }
    .prose :deep(ul), .prose :deep(ol) { padding-left: 1.25rem; }
    .prose :deep(li) { margin-bottom: 0.25rem; }
    .prose :deep(p) { margin-bottom: 0.75rem; }
  `]
})
export class AiHelpModalComponent implements OnInit, OnDestroy {
  @Input() requirement!: EnhancedRequirement;
  @Output() close = new EventEmitter<void>();

  loading = false;
  error: string | null = null;
  renderedHtml: string | null = null;

  private destroy$ = new Subject<void>();
  private gemini = inject(GeminiService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.renderedHtml = null;
    this.cdr.markForCheck();

    this.gemini
      .askAboutRequirement(
        this.requirement['#'],
        this.requirement['Verification Requirement'],
        this.requirement['Area'],
        this.requirement.category
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (markdown) => {
          this.renderedHtml = marked(markdown) as string;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err: Error) => {
          this.error = err.message;
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement) === event.currentTarget) {
      this.close.emit();
    }
  }
}
