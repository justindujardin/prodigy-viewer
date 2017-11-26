import {DataSource} from '@angular/cdk/collections';
import {Observable} from 'rxjs/Observable';
import {MatPaginator, MatSort} from '@angular/material';
import 'rxjs/add/observable/combineLatest';
import 'rxjs/add/operator/map';
import {ProdigyExample} from '../prodigy.model';
import {SQLiteService} from '../sqlite.service';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';

/**
 * Data source for retrieving examples data from prodigy db.
 */
export class ProdigyExamplesDataSource extends DataSource<ProdigyExample> {

  constructor(
    private sql: SQLiteService,
    private _paginator: MatPaginator) {
    super();
  }

  count$: Observable<number> = new BehaviorSubject(0);

  /** Connect function called by the table to retrieve one stream containing the data to render. */
  connect(): Observable<ProdigyExample[]> {
    const items = this.sql.examples();
    return Observable.combineLatest(items, this._paginator.page).map((tuple) => {
      const data: ProdigyExample[] = tuple[0];
      (this.count$ as BehaviorSubject<number>).next(data.length);
      // Grab the page's slice of data.
      const startIndex = this._paginator.pageIndex * this._paginator.pageSize;
      return data.splice(startIndex, this._paginator.pageSize);
    });
  }

  disconnect() {
  }


}