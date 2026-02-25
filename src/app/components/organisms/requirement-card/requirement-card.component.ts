import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CardComponent } from '../../atoms/card/card.component';
import { BadgeComponent } from '../../atoms/badge/badge.component';
import { TagComponent } from '../../atoms/tag/tag.component';
import { EnhancedRequirement } from '../../../models/asvs.model';

/**
 * RequirementCard Organism Component
 * Displays a single ASVS verification requirement with all details
 */
@Component({
  selector: 'app-requirement-card',
  standalone: true,
  imports: [CommonModule, RouterModule, CardComponent, BadgeComponent, TagComponent],
  template: `
    <app-card variant="outlined" [hoverable]="true">
      <!-- Header with ID, Name, and Category -->
      <div class="mb-4">
        <div class="flex items-start justify-between mb-2">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <app-badge variant="primary" size="sm">{{ requirement['#'] }}</app-badge>
              <span class="text-xs font-medium text-neutral-500 uppercase">{{ requirement.category }}</span>
            </div>
            <h3 class="text-lg font-semibold text-neutral-900 leading-tight">
              {{ requirement['Area'] }}
            </h3>
          </div>
        </div>
      </div>

      <!-- Verification Requirement -->
      <div class="mb-4">
        <p class="text-sm text-neutral-600 line-clamp-3">{{ requirement['Verification Requirement'] }}</p>
      </div>

      <!-- Level Badge -->
      <div class="mb-4">
        <p class="text-xs font-semibold text-neutral-500 uppercase mb-2">Compliance Levels</p>
        <div class="flex gap-2">
          <app-tag
            *ngFor="let level of requirement.levels"
            [variant]="getLevelColor(level)"
            [icon]="'checkmark'"
          >
            {{ level }}
          </app-tag>
          <app-tag
            *ngIf="requirement.levels.length === 0"
            variant="default"
          >
            No Levels
          </app-tag>
        </div>
      </div>

      <!-- CWE Reference -->
      <div *ngIf="requirement['CWE']" class="bg-neutral-50 p-3 rounded-md mb-4">
        <p class="text-xs font-semibold text-neutral-600 uppercase mb-1">CWE Reference</p>
        <p class="text-sm text-neutral-700">CWE-{{ requirement['CWE'] }}</p>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between pt-3 border-t border-neutral-200">
        <span class="text-xs text-neutral-500">Category: <span class="font-medium">{{ requirement.category }}</span></span>
        <a
          [routerLink]="['/category', requirement.category]"
          class="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
        >
          View Details →
        </a>
      </div>
    </app-card>
  `,
})
export class RequirementCardComponent {
  @Input() requirement!: EnhancedRequirement;

  getLevelColor(level: string): 'success' | 'warning' | 'info' {
    if (level === 'L1') return 'success';
    if (level === 'L2') return 'warning';
    return 'info';
  }
}
