import {AfterViewInit, ChangeDetectorRef, Component, Input, ViewChild} from '@angular/core';
import {MatPaginator, MatSnackBar, MatSort} from '@angular/material';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/map';
import {ProdigyExamplesDataSource} from '../data-source/examples';
import {SQLiteService} from '../sqlite.service';
import {ProdigyExample} from '../prodigy.model';


/** return a verb representation of the given answer value */
export function verbify(answer: string, capitalize = true): string {
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
})
export class ExamplesTableComponent implements AfterViewInit {
  displayedColumns = ['id', 'text', 'answer'];
  public dataSource: ProdigyExamplesDataSource | null;

  constructor(
    private sql: SQLiteService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef) {
  }

  @ViewChild(MatSort) sort: MatSort;

  @Input() paginator: MatPaginator;

  ngAfterViewInit() {
    this.dataSource = new ProdigyExamplesDataSource(this.sql, this.paginator);
    this.cdr.detectChanges();
  }

  updateAnswer(row: ProdigyExample, event: { source: any, value: string }) {
    if (!row || !row.content) {
      return;
    }
    console.log('set row => ' + JSON.stringify(row, null, 2));
    console.log('        => ' + JSON.stringify(Object.keys(event), null, 2));
    const to = verbify(event.value);
    const from = verbify(row.content.answer);
    this.snackBar.open(
      `Changed "${row.content.text}" from "${from}" to "${to}"`,
      'UNDO',
      {duration: 7000}
    );
  }
}
