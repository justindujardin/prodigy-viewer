import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/do';
import * as sqlite3 from 'sqlite3';
import {Injectable, NgZone} from '@angular/core';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import {ProdigyDataset, ProdigyDatasetRaw, ProdigyExample, ProdigyExampleRaw} from './prodigy.model';
import {Subscriber} from 'rxjs/Subscriber';

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

  connect() {
    sqlite3.verbose();

    // For debug. Turn off to ship something?
    this.db$.do((db: sqlite3.Database) => {
      if (db) {
        db.on('profile', (sqlQuery: string) => {
          console.log(`DEBUG SQL: ${sqlQuery}`);
        });
      }
    }).subscribe();

    // make sure to close out any existing DB before releasing its reference
    if (this.db) {
      this.db.close();
    }
    const db = new sqlite3.Database('/Users/justindujardin/Source/ml-dojo/model/prodigy.db');
    this.db$.next(db);
  }

  disconnect() {
    if (this.db) {
      this.db.close();
    }
    this.db$.next(null);
  }

  datasets(): Observable<ProdigyDataset[]> {
    return this.queryAll('SELECT * FROM dataset WHERE session=0').map((items: ProdigyDatasetRaw[]) => {
      return items.map((set: ProdigyDatasetRaw) => {
        return {
          ...set,
          meta: JSON.parse(set.meta)
        };
      });
    });
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
      this.db.all(query, (err: Error, rows: T[]) => {
        this.zone.run(() => {
          if (err) {
            subscriber.error(`queryAll failed: \n   ${query}\mWith error:\n   ${err}`);
            subscriber.complete();
            return;
          }
          subscriber.next(rows);
          subscriber.complete();
        });
      });
      return () => {
        // nada
      };
    });
  }
}
