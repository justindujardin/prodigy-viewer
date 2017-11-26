import {DataSource} from '@angular/cdk/collections';
import {Observable} from 'rxjs/Observable';
import {MatPaginator} from '@angular/material';
import 'rxjs/add/observable/merge';
import 'rxjs/add/observable/combineLatest';
import 'rxjs/add/operator/map';
import {ProdigyDataset, ProdigyExample} from '../prodigy.model';
import {SQLiteService} from '../sqlite.service';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/empty';
import 'rxjs/add/operator/first';

/**
 * Data source for retrieving examples data from prodigy db.
 */
export class ProdigyExamplesDataSource extends DataSource<ProdigyExample> {

  constructor(
    private dataset: ProdigyDataset,
    private sql: SQLiteService,
    private _paginator: MatPaginator) {
    super();
  }

  count$: Observable<number> = new BehaviorSubject(0);

  /** Connect function called by the table to retrieve one stream containing the data to render. */
  connect(): Observable<ProdigyExample[]> {
    const items = this.sql.examples(this.dataset ? this.dataset.id : -1);

    let countSet = false;
    const pagination$ = this._paginator ? this._paginator.page : Observable.empty();
    const page = Observable.merge(Observable.of(0), pagination$);
    return Observable.combineLatest(items, page).map((tuple) => {
      const data: ProdigyExample[] = tuple[0].slice();
      console.log(`setting data for ${data.length} items`);
      // Take the size once. This may not work great if there are datasources that change
      // size over time. If so, move this block into the combineLatest call below.
      if (countSet === false) {
        console.log(`setting count to ${data.length}`);
        (this.count$ as BehaviorSubject<number>).next(data.length);
        countSet = true;
      }

      // Grab the page's slice of data.
      const size = this._paginator ? this._paginator.pageSize : -1;
      const start = this._paginator ? (this._paginator.pageIndex * this._paginator.pageSize) : 0;
      console.log(`slicing data at (${start},${size})`);
      const result = data.splice(start, size);
      console.log(`result is (${result.length})`);
      return result;
    });
  }

  disconnect() {
  }


}