import {DataSource} from '@angular/cdk/collections';
import {Observable} from 'rxjs/Observable';
import {MatPaginator, MatSort} from '@angular/material';
import 'rxjs/add/observable/merge';
import 'rxjs/add/observable/combineLatest';
import 'rxjs/add/operator/map';
import {ProdigyDataset, ProdigyExample} from '../prodigy.model';
import {SQLiteService} from '../sqlite.service';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/empty';
import 'rxjs/add/operator/first';
import {Subscription} from 'rxjs/Subscription';

/**
 * Data source for retrieving examples data from prodigy db.
 */
export class ProdigyExamplesDataSource extends DataSource<ProdigyExample> {
  _filterChange = new BehaviorSubject('');

  get filter(): string {
    return this._filterChange.value;
  }

  set filter(filter: string) {
    this._filterChange.next(filter);
  }

  filteredData: ProdigyExample[] = [];
  renderedData: ProdigyExample[] = [];

  constructor(
    private dataset: ProdigyDataset,
    private sql: SQLiteService,
    private _paginator: MatPaginator,
    private _sort: MatSort) {
    super();
  }

  count$: Observable<number> = new BehaviorSubject(0);

  private subscription: Subscription;

  /** Connect function called by the table to retrieve one stream containing the data to render. */
  connect(): Observable<ProdigyExample[]> {
    // Reset to the first page when the user changes the filter.
    this.subscription = this._filterChange.subscribe(() => this._paginator.pageIndex = 0);

    const items = this.sql.examples(this.dataset ? this.dataset.id : -1);

    // Take the size once. This may not work great if there are datasources that change
    // size over time. If so, move this block into the combineLatest call below.
    items.first().subscribe((value: ProdigyExample[]) => {
      if (value) {
        (this.count$ as BehaviorSubject<number>).next(value.length);
      }
    });
    const sort$ = this._sort ? this._sort.sortChange : Observable.empty();
    const page$ = Observable.merge(Observable.of(0), this._paginator ? this._paginator.page : Observable.empty());

    // Listen for any changes in the base data, sorting, filtering, or pagination
    const userChanges = Observable.merge(
      sort$,
      this._filterChange,
      page$,
    );

    return Observable.combineLatest(items, userChanges).map((tuple) => {
      const data: ProdigyExample[] = tuple[0].slice();

      // Filter data
      this.filteredData = data.slice().filter((item: ProdigyExample) => {
        let searchStr = (item.content.text).toLowerCase();
        return searchStr.indexOf(this.filter.toLowerCase()) != -1;
      });

      // Sort filtered data
      const sortedData = this.sortData(this.filteredData.slice());

      // Grab the page's slice of the filtered sorted data.
      const size = this._paginator ? this._paginator.pageSize : -1;
      const start = this._paginator ? (this._paginator.pageIndex * this._paginator.pageSize) : 0;
      this.renderedData = sortedData.splice(start, size);
      return this.renderedData;
    });
  }

  disconnect() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  /** Returns a sorted copy of the examples data. */
  sortData(data: ProdigyExample[]): ProdigyExample[] {
    if (!this._sort.active || this._sort.direction == '') {
      return data;
    }

    return data.sort((a, b) => {
      let propertyA: number | string = '';
      let propertyB: number | string = '';

      switch (this._sort.active) {
        case 'id':
          [propertyA, propertyB] = [a.id, b.id];
          break;
        case 'text':
          [propertyA, propertyB] = [a.content.text, b.content.text];
          break;
        case 'answer':
          [propertyA, propertyB] = [a.content.answer, b.content.answer];
          break;
      }

      let valueA = isNaN(+propertyA) ? propertyA : +propertyA;
      let valueB = isNaN(+propertyB) ? propertyB : +propertyB;

      return (valueA < valueB ? -1 : 1) * (this._sort.direction == 'asc' ? 1 : -1);
    });
  }

}
