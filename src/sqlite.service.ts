import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/do';
import {Injectable, NgZone} from '@angular/core';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import {ProdigyAnswer, ProdigyDataset, ProdigyDatasetRaw, ProdigyExample, ProdigyExampleRaw} from './prodigy.model';
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

  connect(file: string = 'prodigy.db') {
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

  /**
   * Update an example item in Prodigy.
   * @param example The example data to update.
   * @returns {Promise<void>} a promise that resolves when the query has run, and rejects if there is an error.
   */
  updateExample(example: ProdigyExample): Promise<ProdigyExample> {
    // SQLite wants single quotes escaped by doubling them up.
    // See: https://stackoverflow.com/questions/603572/how-to-properly-escape-a-single-quote-for-a-sqlite-database
    example.content.text = example.content.text.replace(/'/g, '\'\'');
    const arg: any = example.content;
    // Ugh, metadata with single quotes can fuck stuff up. May need to iterate the whole example and escape all found
    // strings before update.
    if (arg.hasOwnProperty('html')) {
      delete arg['html'];
    }
    const json = JSON.stringify(example.content);
    return this.promiseRun(`UPDATE example SET content = '${json}' WHERE id = ${example.id};`)
      .then(() => {
        // The example table was changed.
        this.tableUpdated$.next('example');
        return example;
      });
  }

  promiseRun(query: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      this.db.run(query, (err: Error) => {
        this.zone.run(() => {
          if (err) {
            reject(`promiseRun failed: \n   ${query}\mWith error:\n   ${err}`);
            return;
          }
          resolve();
        });
      });
    });
  }

  /**
   * Remove all examples that are matched by the given matcher function
   * @param datasetId The dataset to operate on by ID
   * @param matcher A function that takes in an example and returns true if it should be removed.
   * @returns A promise that resolves with the examples that were removed.
   */
  removeExamples(datasetId: number, matcher: (example: ProdigyExample) => boolean): Promise<ProdigyExample[]> {
    return new Promise<ProdigyExample[]>((resolve, reject) => {
      this.examples(datasetId)
        .first()
        .subscribe((examples: ProdigyExample[]) => {
          const toRemove = examples.filter(matcher);
          const promises = toRemove.map((example: ProdigyExample) => {
            return Promise.all([
              this.promiseRun(`DELETE FROM example WHERE id=${example.id}`),
              this.promiseRun(`DELETE FROM link WHERE example_id=${example.id} and dataset_id=${datasetId}`),
            ]);
          });
          Promise.all(promises).then(() => resolve(toRemove)).catch(reject);
        });
    });
  }

  /**
   * Remove all examples with the given answer from a dataset
   * @param datasetId The dataset to operate on by ID
   * @param answer one of "accept", "reject" or "ignore"
   * @returns A promise that resolves with the examples that were removed.
   */
  removeExamplesByAnswer(datasetId: number, answer: ProdigyAnswer = 'ignore'): Promise<ProdigyExample[]> {
    return this.removeExamples(datasetId, (example) => example.content.answer === answer);
  }

  /**
   * Remove all examples with the given answer from a dataset
   * @param datasetId The dataset to operate on by ID
   * @param label the string label to match
   * @returns A promise that resolves with the examples that were removed.
   */
  removeExamplesByLabel(datasetId: number, label: string): Promise<ProdigyExample[]> {
    return this.removeExamples(datasetId, (example) => example.content.label === label);
  }

  /**
   * Replace all labels that match "from" with "to"
   * @param datasetId The dataset to operate on by ID
   * @param from The label to find
   * @param to What to replace it with
   */
  replaceLabel(datasetId: number, from: string, to: string): Promise<ProdigyExample[]> {
    return new Promise<ProdigyExample[]>((resolve, reject) => {
      this.examples(datasetId)
        .first()
        .subscribe((examples: ProdigyExample[]) => {
          const toRemove = examples.filter((example) => example.content.label === from);
          const promises = toRemove.map((example: ProdigyExample) => {
            example.content.label = to;
            return this.updateExample(example);
          });
          Promise.all(promises).then(resolve).catch(reject);
        });
    });
  }

  queryAll<T>(query: string): Observable<T[]> {
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
