import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Import Organisms and Services
import { HeaderComponent } from '../../components/organisms/header/header.component';
import { CategoryGridComponent } from '../../components/organisms/category-grid/category-grid.component';
import { RequirementListComponent } from '../../components/organisms/requirement-list/requirement-list.component';

import { AsvsService } from '../../services/asvs';
import { ExportService } from '../../services/export';
import { AsvsCategory, AsvsData, EnhancedRequirement, VerificationLevel } from '../../models/asvs.model';

/**
 * Dashboard Page Component
 * Main page showing ASVS overview, categories, and search
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    CategoryGridComponent,
    RequirementListComponent,
  ],
  template: `
    <!-- Header -->
    <app-header
      [totalRequirements]="totalRequirements"
      [selectedLevel]="selectedLevel"
      (search)="onSearch($event)"
      (levelFilterChange)="onLevelFilterChange($event)"
      (resetFilters)="onResetFilters()"
      (export)="onExport()"
    ></app-header>

    <!-- Main Content -->
    <main class="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <!-- Loading State -->
        <div *ngIf="loading" class="flex items-center justify-center py-16">
          <div class="text-center">
            <div class="inline-flex flex-col items-center">
              <svg class="w-12 h-12 text-primary-600 animate-spin" fill="none" stroke="currentColor">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p class="text-neutral-600 mt-4">Loading ASVS data...</p>
            </div>
          </div>
        </div>

        <!-- Error State -->
        <div *ngIf="error" class="bg-danger-50 border border-danger-300 rounded-lg p-6 mb-8">
          <div class="flex items-center gap-3">
            <svg class="w-6 h-6 text-danger-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            <div>
              <p class="font-semibold text-danger-900">Error Loading Data</p>
              <p class="text-sm text-danger-700">{{ error }}</p>
            </div>
          </div>
        </div>

        <!-- Content -->
        <ng-container *ngIf="!loading && !error">
          <!-- Show search results if searching -->
          <div *ngIf="searchTerm; else categoriesView" class="animate-fade-in">
            <div class="mb-8">
              <h2 class="text-3xl font-bold text-neutral-900 mb-2">
                Search Results
              </h2>
              <p class="text-neutral-600">
                Found {{ filteredRequirements.length }} requirement<span *ngIf="filteredRequirements.length !== 1">s</span> for "<strong>{{ searchTerm }}</strong>"
              </p>
            </div>
            <app-requirement-list
              [requirements]="filteredRequirements"
              [totalCount]="totalRequirements"
            ></app-requirement-list>
          </div>

          <!-- Default: Show categories -->
          <ng-template #categoriesView>
            <app-category-grid
              [categories]="categoryList"
              [totalRequirements]="totalRequirements"
              (viewRequirements)="onViewCategory($event)"
              (moreInfo)="onCategoryInfo($event)"
            ></app-category-grid>
          </ng-template>
        </ng-container>
      </div>
    </main>
  `,
})
export class DashboardComponent implements OnInit, OnDestroy {
  loading = true;
  error: string | null = null;
  searchTerm = '';
  selectedLevel: VerificationLevel | null = null;

  totalRequirements = 0;
  categoryList: Array<{
    category: AsvsCategory;
    name: string;
    count: number;
    description: string;
  }> = [];

  filteredRequirements: EnhancedRequirement[] = [];

  private destroy$ = new Subject<void>();
  private asvsService = inject(AsvsService);
  private exportService = inject(ExportService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData(): void {
    this.loading = true;

    // Fetch from service (uses localStorage cache for instant load)
    this.asvsService
      .getAsvsData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: AsvsData) => {
          // Calculate totals
          this.totalRequirements = 0;
          this.categoryList = [];

          const categoryDescriptions: Record<AsvsCategory, string> = {
            'Architecture': 'System design and architectural security controls',
            'Authentication': 'User identity verification and credential management',
            'Session Management': 'User session handling and token management',
            'Access Control': 'Authorization and permission management',
            'Input Validation': 'Data validation and sanitization',
            'Cryptography at Rest': 'Data encryption and protection',
            'Error Handling and Logging': 'Error handling and security logging',
            'Data Protection': 'Personal and sensitive data protection',
            'Communication Security': 'Secure transport and communication',
            'Malicious Code': 'Software supply chain and dependency security',
            'Business Logic': 'Business process security',
            'Files and Resources': 'File upload and resource management',
            'API and Web Service': 'API security',
            'Configuration': 'Secure configuration management',
          };

          // Build category list
          const categories = Object.keys(data).filter((k) => k !== 'ASVS Results') as AsvsCategory[];
          for (const category of categories) {
            const requirements = data[category];
            const count = requirements.length;
            this.totalRequirements += count;

            this.categoryList.push({
              category,
              name: category,
              count,
              description: categoryDescriptions[category] || 'ASVS verification requirements',
            });
          }

          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.error = 'Failed to load ASVS data. Please try again later.';
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    if (term.trim()) {
      this.asvsService
        .searchRequirements(term)
        .pipe(takeUntil(this.destroy$))
        .subscribe((results: EnhancedRequirement[]) => {
          this.filteredRequirements = results;
        });
    }
  }

  onLevelFilterChange(level: VerificationLevel | null): void {
    this.selectedLevel = level;
    if (this.searchTerm && level) {
      this.asvsService
        .filterRequirements({ searchTerm: this.searchTerm, level })
        .pipe(takeUntil(this.destroy$))
        .subscribe((results: EnhancedRequirement[]) => {
          this.filteredRequirements = results;
        });
    }
  }

  onResetFilters(): void {
    this.searchTerm = '';
    this.selectedLevel = null;
    this.filteredRequirements = [];
  }

  onExport(): void {
    this.exportService.exportToCsv();
  }

  onViewCategory(category: AsvsCategory): void {
    this.router.navigate(['/category', category]);
  }

  onCategoryInfo(category: AsvsCategory): void {
    this.router.navigate(['/category', category]);
  }
}
