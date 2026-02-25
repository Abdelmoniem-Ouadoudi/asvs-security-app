import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AsvsCategory } from '../../../models/asvs.model';

/**
 * CategoryCard Molecule Component
 * Displays a category with count; entire card navigates to the detail page.
 */
@Component({
  selector: 'app-category-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <a
      [routerLink]="['/category', category]"
      class="block group bg-white border border-neutral-200 rounded-xl p-6 shadow-sm
             hover:shadow-md hover:border-primary-300 transition-all duration-200 cursor-pointer
             focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
    >
      <div class="flex items-start justify-between mb-3">
        <h3 class="text-lg font-bold text-neutral-900 group-hover:text-primary-700 transition-colors leading-tight">
          {{ categoryName }}
        </h3>
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-700 ml-2 flex-shrink-0">
          {{ count }}
        </span>
      </div>
      <p class="text-neutral-500 text-sm mb-5 leading-relaxed">{{ description }}</p>
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold text-primary-600 group-hover:text-primary-700">
          View Requirements →
        </span>
        <span class="text-xs text-neutral-400">{{ count }} items</span>
      </div>
    </a>
  `,
})
export class CategoryCardComponent {
  @Input() category!: AsvsCategory;
  @Input() categoryName!: string;
  @Input() count!: number;
  @Input() description = '';

  @Output() viewRequirements = new EventEmitter<AsvsCategory>();
  @Output() moreInfo = new EventEmitter<AsvsCategory>();
}
