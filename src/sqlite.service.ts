import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/do';
import * as sqlite3 from 'sqlite3';
import {Injectable, NgZone} from '@angular/core';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import {ProdigyDataset, ProdigyDatasetRaw, ProdigyExample, ProdigyExampleRaw} from './prodigy.model';
import {Subscriber} from 'rxjs/Subscriber';
import {Subject} from 'rxjs/Subject';

function qbDatasetFromExampleId(id: string): string {
  return `
  SELECT
    dataset.name as Dataset,
    example.content as Content
  FROM dataset 
  INNER JOIN link ON link.dataset_id = dataset.id
  INNER JOIN example ON example.id = link.example_id
    WHERE example.id = ${id};
  `;
}

function qbDatasetIdFromName(datasetName: string): string {
  return `SELECT dataset.id FROM dataset WHERE dataset.name = '${datasetName}';`;
}

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
    return this.queryAll(`SELECT * FROM dataset ${sessions ? '' : 'WHERE session=0'}`)
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

    return this.queryAll(datasetId === -1 ? 'SELECT * FROM example;' : query)
      .map((items: ProdigyExampleRaw[]) => {
        return items.map((item: ProdigyExampleRaw) => {
          return {
            ...item,
            content: JSON.parse('' + item.content)
          };
        });
      });
  }

  private queryOne<T>(query: string): Observable<T> {
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

  private queryEach<T>(query: string): Observable<T> {
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

  private queryAll<T>(query: string): Observable<T[]> {
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

  updateExample(content: ProdigyExample): Promise<void> {
    const json = JSON.stringify(content.content);
    const query = `UPDATE example SET content = '${json}' WHERE id = ${content.id};`;
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
}
