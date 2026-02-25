import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, map, switchMap } from 'rxjs/operators';
import { AsvsService } from '../../services/asvs';
import {
  AsvsCategory, EnhancedRequirement, VerificationLevel, RequirementStatus, AssessmentMap
} from '../../models/asvs.model';
import { LevelFilterComponent } from '../../components/molecules/level-filter/level-filter.component';
import { AiHelpModalComponent } from '../../components/organisms/ai-help-modal/ai-help-modal.component';
import { ExportService } from '../../services/export';

@Component({
  selector: 'app-category-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, LevelFilterComponent, AiHelpModalComponent],
  template: `
    <!-- Header bar -->
    <div class="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-neutral-200 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          (click)="goBack()"
          class="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-primary-600 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          Back to Categories
        </button>
        <div class="hidden sm:block h-5 w-px bg-neutral-300"></div>
        <h1 class="text-xl font-bold text-neutral-900 flex-1">{{ categoryName }}</h1>
        <button
          (click)="exportCsv()"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          Export CSV
        </button>
        <!-- mini progress bar -->
        <div class="flex items-center gap-3 text-sm">
          <span class="text-success-600 font-semibold">✓ {{ progress.pass }}</span>
          <span class="text-danger-600 font-semibold">✗ {{ progress.fail }}</span>
          <span class="text-neutral-500 font-semibold">— {{ progress.notApplicable }}</span>
          <span class="text-neutral-400">/ {{ progress.total }}</span>
        </div>
      </div>
      <!-- Progress bar -->
      <div class="h-1 bg-neutral-100 flex overflow-hidden">
        <div class="bg-success-500 transition-all duration-500" [style.width.%]="progressPct(progress.pass)"></div>
        <div class="bg-danger-500 transition-all duration-500" [style.width.%]="progressPct(progress.fail)"></div>
        <div class="bg-neutral-300 transition-all duration-500" [style.width.%]="progressPct(progress.notApplicable)"></div>
      </div>
    </div>

    <main class="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        <!-- Level filter -->
        <div class="flex flex-col sm:flex-row sm:items-center gap-4">
          <span class="text-sm font-semibold text-neutral-600 uppercase tracking-wide">Filter by Level:</span>
          <app-level-filter
            [selectedLevel]="selectedLevel"
            (levelSelected)="onLevelChange($event)"
          ></app-level-filter>
          <span *ngIf="selectedLevel" class="text-xs text-neutral-500 italic">Showing {{ filtered.length }} of {{ allRequirements.length }}</span>
        </div>

        <!-- Loading -->
        <div *ngIf="loading" class="flex items-center justify-center py-24">
          <div class="flex flex-col items-center gap-3">
            <svg class="w-10 h-10 text-primary-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span class="text-neutral-600">Loading requirements…</span>
          </div>
        </div>

        <!-- Empty -->
        <div *ngIf="!loading && filtered.length === 0" class="text-center py-16 text-neutral-500">
          <svg class="mx-auto h-12 w-12 text-neutral-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-lg font-medium">No requirements match this level filter.</p>
        </div>

        <!-- Requirement cards -->
        <div *ngIf="!loading && filtered.length > 0" class="space-y-4">
          <div
            *ngFor="let req of filtered; trackBy: trackByReqId"
            class="bg-white rounded-xl border shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
            [class.border-success-400]="getStatus(req['#']) === 'pass'"
            [class.border-danger-400]="getStatus(req['#']) === 'fail'"
            [class.border-neutral-300]="getStatus(req['#']) === 'not-applicable'"
            [class.border-neutral-200]="getStatus(req['#']) === null"
          >
            <!-- Status stripe -->
            <div
              class="h-1"
              [class.bg-success-500]="getStatus(req['#']) === 'pass'"
              [class.bg-danger-500]="getStatus(req['#']) === 'fail'"
              [class.bg-neutral-300]="getStatus(req['#']) === 'not-applicable'"
              [class.bg-transparent]="getStatus(req['#']) === null"
            ></div>

            <div class="p-5">
              <div class="flex flex-col sm:flex-row sm:items-start gap-4">
                <!-- Requirement info -->
                <div class="flex-1 min-w-0">
                  <div class="flex flex-wrap items-center gap-2 mb-2">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-700">
                      {{ req['#'] }}
                    </span>
                    <span class="text-xs font-medium text-neutral-500 uppercase tracking-wide">{{ req['Area'] }}</span>
                    <!-- Level badges -->
                    <span
                      *ngFor="let lvl of req.levels"
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                      [class.bg-success-100]="lvl === 'L1'"
                      [class.text-success-700]="lvl === 'L1'"
                      [class.bg-warning-100]="lvl === 'L2'"
                      [class.text-warning-700]="lvl === 'L2'"
                      [class.bg-info-100]="lvl === 'L3'"
                      [class.text-info-700]="lvl === 'L3'"
                    >{{ lvl }}</span>
                    <span *ngIf="req['CWE']" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-600">
                      CWE-{{ req['CWE'] }}
                    </span>
                  </div>
                  <p class="text-sm text-neutral-700 leading-relaxed">{{ req['Verification Requirement'] }}</p>
                </div>

                <!-- Status buttons -->
                <div class="flex items-center gap-2 flex-shrink-0">
                  <button
                    (click)="setStatus(req['#'], 'pass')"
                    title="Pass"
                    class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-success-500"
                    [class.bg-success-500]="getStatus(req['#']) === 'pass'"
                    [class.text-white]="getStatus(req['#']) === 'pass'"
                    [class.border-success-500]="getStatus(req['#']) === 'pass'"
                    [class.bg-white]="getStatus(req['#']) !== 'pass'"
                    [class.text-success-600]="getStatus(req['#']) !== 'pass'"
                    [class.border-success-300]="getStatus(req['#']) !== 'pass'"
                    [class.hover:bg-success-50]="getStatus(req['#']) !== 'pass'"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                    </svg>
                    Pass
                  </button>

                  <button
                    (click)="setStatus(req['#'], 'fail')"
                    title="Fail"
                    class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-danger-500"
                    [class.bg-danger-500]="getStatus(req['#']) === 'fail'"
                    [class.text-white]="getStatus(req['#']) === 'fail'"
                    [class.border-danger-500]="getStatus(req['#']) === 'fail'"
                    [class.bg-white]="getStatus(req['#']) !== 'fail'"
                    [class.text-danger-600]="getStatus(req['#']) !== 'fail'"
                    [class.border-danger-300]="getStatus(req['#']) !== 'fail'"
                    [class.hover:bg-danger-50]="getStatus(req['#']) !== 'fail'"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    Fail
                  </button>

                  <button
                    (click)="setStatus(req['#'], 'not-applicable')"
                    title="Not Applicable"
                    class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-neutral-400"
                    [class.bg-neutral-400]="getStatus(req['#']) === 'not-applicable'"
                    [class.text-white]="getStatus(req['#']) === 'not-applicable'"
                    [class.border-neutral-400]="getStatus(req['#']) === 'not-applicable'"
                    [class.bg-white]="getStatus(req['#']) !== 'not-applicable'"
                    [class.text-neutral-500]="getStatus(req['#']) !== 'not-applicable'"
                    [class.border-neutral-300]="getStatus(req['#']) !== 'not-applicable'"
                    [class.hover:bg-neutral-50]="getStatus(req['#']) !== 'not-applicable'"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M18 12H6"/>
                    </svg>
                    N/A
                  </button>

                  <!-- Reset -->
                  <button
                    *ngIf="getStatus(req['#']) !== null"
                    (click)="setStatus(req['#'], null)"
                    title="Clear status"
                    class="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors focus:outline-none"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>

                  <!-- Ask AI -->
                  <button
                    (click)="openAiHelp(req)"
                    title="Ask AI for implementation help"
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border border-primary-300 text-primary-600 bg-white hover:bg-primary-50 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-400"
                  >
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                    </svg>
                    Ask AI
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>

    <!-- AI Help Modal -->
    <app-ai-help-modal
      *ngIf="activeHelpReq"
      [requirement]="activeHelpReq"
      (close)="closeAiHelp()"
    ></app-ai-help-modal>
  `,
})
export class CategoryDetailComponent implements OnInit, OnDestroy {
  category!: AsvsCategory;
  categoryName = '';
  allRequirements: EnhancedRequirement[] = [];
  filtered: EnhancedRequirement[] = [];
  selectedLevel: VerificationLevel | null = null;
  loading = true;
  assessments: AssessmentMap = {};
  progress = { pass: 0, fail: 0, notApplicable: 0, pending: 0, total: 0 };
  activeHelpReq: EnhancedRequirement | null = null;

  private destroy$ = new Subject<void>();
  private asvsService = inject(AsvsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private exportService = inject(ExportService);

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.category = (params.get('category') as AsvsCategory) || '' as AsvsCategory;
      this.categoryName = this.category;
      this.loadRequirements();
    });

    this.asvsService.getAssessments().pipe(takeUntil(this.destroy$)).subscribe(map => {
      this.assessments = map;
      this.recalcProgress();
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private loadRequirements(): void {
    this.loading = true;
    this.asvsService.getRequirementsByCategory(this.category).pipe(takeUntil(this.destroy$)).subscribe({
      next: reqs => {
        this.allRequirements = reqs.map(req => ({
          ...req,
          category: this.category,
          levels: this.getApplicableLevels(req['ASVS Level']),
        }));
        this.applyLevelFilter();
        this.loading = false;
        this.recalcProgress();
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  private getApplicableLevels(asvsLevel: string): VerificationLevel[] {
    const level = parseInt(asvsLevel, 10);
    const levels: VerificationLevel[] = [];
    if (level <= 1) levels.push(VerificationLevel.LEVEL_1);
    if (level <= 2) levels.push(VerificationLevel.LEVEL_2);
    if (level <= 3) levels.push(VerificationLevel.LEVEL_3);
    return levels;
  }

  onLevelChange(level: VerificationLevel | null): void {
    this.selectedLevel = level;
    this.applyLevelFilter();
  }

  private applyLevelFilter(): void {
    if (!this.selectedLevel) {
      this.filtered = [...this.allRequirements];
    } else {
      this.filtered = this.allRequirements.filter(r => r.levels.includes(this.selectedLevel!));
    }
    this.cdr.markForCheck();
  }

  getStatus(id: string): RequirementStatus {
    return this.assessments[id]?.status ?? null;
  }

  setStatus(id: string, status: RequirementStatus): void {
    // Toggle off if same status clicked again
    const current = this.getStatus(id);
    this.asvsService.setRequirementStatus(id, current === status ? null : status);
  }

  private recalcProgress(): void {
    let pass = 0, fail = 0, notApplicable = 0;
    for (const req of this.allRequirements) {
      const s = this.assessments[req['#']]?.status;
      if (s === 'pass') pass++;
      else if (s === 'fail') fail++;
      else if (s === 'not-applicable') notApplicable++;
    }
    this.progress = {
      pass, fail, notApplicable,
      pending: this.allRequirements.length - pass - fail - notApplicable,
      total: this.allRequirements.length,
    };
  }

  progressPct(count: number): number {
    if (!this.progress.total) return 0;
    return (count / this.progress.total) * 100;
  }

  goBack(): void { this.router.navigate(['/']); }
  trackByReqId(_: number, req: EnhancedRequirement): string { return req['#']; }
  exportCsv(): void { this.exportService.exportToCsv(); }

  openAiHelp(req: EnhancedRequirement): void {
    this.activeHelpReq = req;
    this.cdr.markForCheck();
  }

  closeAiHelp(): void {
    this.activeHelpReq = null;
    this.cdr.markForCheck();
  }
}
