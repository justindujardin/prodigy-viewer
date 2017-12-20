import {AfterViewInit, ChangeDetectorRef, Component, Input, ViewChild, ViewEncapsulation} from '@angular/core';
import {MatPaginator, MatSnackBar, MatSnackBarRef, MatSort, SimpleSnackBar} from '@angular/material';
import {ProdigyExamplesDataSource} from '../data-source/examples';
import {SQLiteService} from '../sqlite.service';
import {ProdigyAnswer, ProdigyDataset, ProdigyExample} from '../prodigy.model';
import {Observable} from 'rxjs/Observable';

/** return a verb representation of the given answer value */
export function verbify(answer: string = '', capitalize = true): string {
  answer = answer.toLowerCase();
  const isIgnore = answer === 'ignore';
  if (capitalize) {
    answer = answer[0].toUpperCase() + answer.slice(1);
  }
  return `${answer}${isIgnore ? 'd' : 'ed'}`;
}

/**
 * @title Table with pagination
 */
@Component({
  moduleId: module.id,
  selector: 'pv-examples-table',
  styleUrls: ['./examples-table.component.css'],
  templateUrl: './examples-table.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class ExamplesTableComponent implements AfterViewInit {
  displayedColumns = ['text', 'answer'];
  public dataSource: ProdigyExamplesDataSource | null;

  constructor(
    private sql: SQLiteService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef) {
  }

  @ViewChild(MatSort) sort: MatSort;

  @Input() paginator: MatPaginator;
  @Input() filter: HTMLInputElement;
  private _dataset: ProdigyDataset;
  @Input() set dataset(value: ProdigyDataset) {
    if (value && this._dataset && value.id === this._dataset.id) {
      return;
    }
    this._dataset = value;

    // HACK: change after check exception workaround...
    setTimeout(() => {
      this.dataSource = new ProdigyExamplesDataSource(this._dataset, this.sql, this.paginator, this.sort);
      this.cdr.detectChanges();
    }, 0);
  }

  ngAfterViewInit() {
    Observable.fromEvent(this.filter, 'keyup')
      .debounceTime(150)
      .distinctUntilChanged()
      .subscribe(() => {
        if (!this.dataSource) {
          return;
        }
        this.dataSource.filter = this.filter.value;
      });
    this.cdr.detectChanges();
  }

  clearSearch() {
    if (this.dataSource) {
      this.dataSource.filter = '';
    }
    if (this.filter) {
      this.filter.value = '';
      this.filter.blur();
    }
  }

  updateAnswer(row: ProdigyExample, event: { source: any, value: string }) {
    if (!row || !row.content) {
      return;
    }
    // console.log('set row => ' + JSON.stringify(row, null, 2));
    // console.log('        => ' + JSON.stringify(Object.keys(event), null, 2));
    const to = verbify(event.value);
    const from = verbify(row.content.answer);
    const snackRef: MatSnackBarRef<SimpleSnackBar> = this.snackBar.open(
      `CHANGED "${row.content.text}" from "${from}" to "${to}"`,
      'UNDO',
      {duration: 7000}
    );

    snackRef.onAction().subscribe(() => {
      const revert: ProdigyExample = JSON.parse(JSON.stringify(row));
      revert.content.answer = event.value as ProdigyAnswer;

      this.sql.updateExample(revert)
        .then(() => {
          this.snackBar.open(
            `REVERTED change to "${row.content.text}" from "${to}" to "${from}"`,
            undefined,
            {duration: 2000}
          );
        })
        .catch((e) => {
          this.snackBar.open(
            `FAILED to revert change with error: ${e}`,
            undefined,
            {duration: 2000}
          );
          console.error(e);
        });
    });

    const clone: ProdigyExample = JSON.parse(JSON.stringify(row));
    clone.content.answer = event.value as ProdigyAnswer;
    this.sql.updateExample(clone).catch((e) => {
      console.error(e);
    });
  }
}
