import { Injectable, inject } from '@angular/core';
import { take } from 'rxjs/operators';
import { combineLatest } from 'rxjs';
import { AsvsService } from './asvs';
import { AsvsCategory, VerificationRequirement } from '../models/asvs.model';

@Injectable({ providedIn: 'root' })
export class ExportService {
  private asvsService = inject(AsvsService);

  exportToCsv(): void {
    combineLatest([
      this.asvsService.getAsvsData(),
      this.asvsService.getAssessments(),
    ])
      .pipe(take(1))
      .subscribe(([data, assessments]) => {
        const categories = Object.keys(data).filter(
          (k) => k !== 'ASVS Results'
        ) as AsvsCategory[];

        const header = [
          'ID',
          'Category',
          'Area',
          'ASVS Level',
          'CWE',
          'Verification Requirement',
          'Status',
        ];

        const rows: string[][] = [header];

        for (const category of categories) {
          const reqs = data[category] as VerificationRequirement[];
          for (const req of reqs) {
            const status = assessments[req['#']]?.status ?? 'pending';
            rows.push([
              req['#'],
              category,
              req['Area'],
              req['ASVS Level'],
              req['CWE'] ?? '',
              req['Verification Requirement'],
              status,
            ]);
          }
        }

        const csv = rows
          .map((row) =>
            row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
          )
          .join('\r\n');

        const blob = new Blob(['\uFEFF' + csv], {
          type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ASVS-Assessment-${this.dateStamp()}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      });
  }

  private dateStamp(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
