import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/do';
import {Injectable, NgZone} from '@angular/core';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import {ProdigyDataset, ProdigyDatasetRaw, ProdigyExample, ProdigyExampleRaw} from './prodigy.model';
import {Subscriber} from 'rxjs/Subscriber';
import {Subject} from 'rxjs/Subject';
import * as sqlite3 from 'sqlite3';

@Injectable()
export class SQLiteService {

  constructor(private zone: NgZone) {
  }

  get db(): sqlite3.Database {
    return this.db$.value;
  }

  db$: BehaviorSubject<sqlite3.Database> = new BehaviorSubject(null);

  /** Emits when a table's data has been invalidated by an update */
  tableUpdated$: Subject<string> = new Subject<string>();

  connect(file: string = './example/prodigy.db') {
    // sqlite3.verbose();

    // // For debug. Turn off to ship something?
    // this.db$.do((db: sqlite3.Database) => {
    //   if (db) {
    //     db.on('profile', (sqlQuery: string) => {
    //       console.log(`DEBUG SQL: ${sqlQuery}`);
    //     });
    //   }
    // }).subscribe();

    // make sure to close out any existing DB before releasing its reference
    if (this.db) {
      this.db.close();
    }
    const db = new sqlite3.Database(file);
    this.db$.next(db);
  }

  disconnect() {
    if (this.db) {
      this.db.close();
    }
    this.db$.next(null);
  }

  /**
   * Retrieve an observable of the datasets for Prodigy
   * @param sessions Include datasets that are created for each session using the app
   * @returns {Observable<R>}
   */
  datasets(sessions = false): Observable<ProdigyDataset[]> {
    return this._queryAll(`SELECT * FROM dataset ${sessions ? '' : 'WHERE session=0'}`)
      .map((items: ProdigyDatasetRaw[]) => items.map((set: ProdigyDatasetRaw) => {
        return {
          ...set,
          meta: JSON.parse(set.meta || '{}')
        };
      }));
  }

  /**
   * Get annotation examples for one or all datasets
   * @param datasetId A specific dataset to filter examples to
   */
  examples(datasetId: number = -1): Observable<ProdigyExample[]> {
    const query = `SELECT example.* FROM dataset 
  INNER JOIN link ON link.dataset_id = dataset.id
  INNER JOIN example ON example.id = link.example_id
WHERE dataset.id = '${datasetId}';`;

    return this._queryAll(datasetId === -1 ? 'SELECT * FROM example;' : query)
      .map((items: ProdigyExampleRaw[]) => {
        return items.map((item: ProdigyExampleRaw) => {
          return {
            ...item,
            content: JSON.parse('' + item.content)
          };
        });
      });
  }

  /**
   * Update an example item in Prodigy.
   * @param example The example data to update.
   * @returns {Promise<void>} a promise that resolves when the query has run, and rejects if there is an error.
   */
  updateExample(example: ProdigyExample): Promise<void> {
    const json = JSON.stringify(example.content);
    const query = `UPDATE example SET content = '${json}' WHERE id = ${example.id};`;
    return new Promise<void>((resolve, reject) => {
      this.db.run(query, (err: Error) => {
        this.zone.run(() => {
          if (err) {
            reject(`queryAll failed: \n   ${query}\mWith error:\n   ${err}`);
            return;
          }
          resolve();
          // The example table was changed.
          this.tableUpdated$.next('example');
        });
      });
    });
  }

  private _queryOne<T>(query: string): Observable<T> {
    return new Observable<T>((subscriber: Subscriber<T>) => {
      this.db.get(query, (err: Error, row: T) => {
        this.zone.run(() => {
          if (err) {
            subscriber.error(`queryOne failed: \n   ${query}\mWith error:\n   ${err}`);
            subscriber.complete();
            return;
          }
          subscriber.next(row);
          subscriber.complete();
        });
      });
      return () => {
        // nada
      };
    });
  }

  private _queryEach<T>(query: string): Observable<T> {
    return new Observable<T>((subscriber: Subscriber<T>) => {
      this.db.each(query, (err: Error, row: T) => {
        this.zone.run(() => {
          if (err) {
            subscriber.error(`queryEach failed: \n   ${query}\mWith error:\n   ${err}`);
            subscriber.complete();
            return;
          }
          subscriber.next(row);
          subscriber.complete();
        });
      });
      return () => {
        // nada
      };
    });
  }

  private _queryAll<T>(query: string): Observable<T[]> {
    return new Observable<T[]>((subscriber: Subscriber<T[]>) => {
      const queryAndEmit = () => {
        this.db.all(query, (err: Error, rows: T[]) => {
          this.zone.run(() => {
            if (err) {
              subscriber.error(`queryAll failed: \n   ${query}\mWith error:\n   ${err}`);
              subscriber.complete();
              return;
            }
            subscriber.next(rows);

          });
        });
      };
      const subscription = this.tableUpdated$.subscribe(() => {
        // TODO: This is the hammer approach. Whenever any table changes we invalidate queries.
        console.log(`TABLE CHANGED: ExecQuery = ${query}`);
        queryAndEmit();
      });
      queryAndEmit();
      return () => {
        subscription.unsubscribe();
      };
    });
  }
}
