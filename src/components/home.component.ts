import {ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {SQLiteService} from '../sqlite.service';
import {Observable} from 'rxjs/Observable';
import {ProdigyDataset} from '../prodigy.model';
import {MediaChange, ObservableMedia} from '@angular/flex-layout';
import {Subscription} from 'rxjs/Subscription';

@Component({
  moduleId: module.id,
  selector: 'pv-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {

  constructor(
    private db: SQLiteService,
    private cdr: ChangeDetectorRef,
    private media: ObservableMedia) {
    this.db.connect('example/prodigy.db');
    this.datasets$ = this.db.datasets();
  }

  public datasets$: Observable<ProdigyDataset[]>;

  public active: ProdigyDataset | null = null;

  compact = false;

  private _mediaSubscription: Subscription;

  ngOnInit(): void {
    this.compact = (this.media.isActive('xs') || this.media.isActive('sm') || this.media.isActive('md'));
    this._mediaSubscription = this.media.subscribe((change: MediaChange) => {
      this.compact = (change.mqAlias === 'xs' || change.mqAlias === 'sm' || change.mqAlias === 'sm');
    });

    this.datasets$.take(1).subscribe((val: ProdigyDataset[]) => {
      this.active = val[0];
      console.log(val);
    });

    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    if (this._mediaSubscription) {
      this._mediaSubscription.unsubscribe();
    }
  }

  updateExamples(dataSet: ProdigyDataset) {
    this.active = dataSet;
  }

  customAction() {
    if (this.active) {
      alert('this button is for hacking: home.component.ts -> customAction()');
      console.log('custom action on dataset', this.active);
      // Example: Oops, I put quotes around my label and now my dataset has some
      //          examples with "HARASSMENT" and others with "'HARASSMENT'"
      //
      // this.db.replaceLabel(this.active.id, '"HARASSMENT"', 'HARASSMENT');

      // Replace one label with another, and remove a third label from a failed expriment
      // that somehow ended up in your dataset.
      //
      // Promise.all([
      //   this.db.replaceLabel(this.active.id, '"HARASSMENT"', 'HARASSMENT'),
      //   this.db.removeExamplesByLabel(this.active.id, 'GROUP_HARASSMENT')
      // ]);

      // Example: remove all the ignore items from your dataset.
      //
      // this.db.removeExamplesByAnswer(this.active.id, 'ignore');

      // Example: You need to do something custom with the items in your set. Maybe transform them
      //          and print them to the console for easy copy/paste to another context.
      //
      // this.db.examples(this.active.id)
      //   .first()
      //   .subscribe((examples: ProdigyExample[]) => {
      //     const accept: string[] = [];
      //     const reject: string[] = [];
      //     examples.forEach((e: ProdigyExample) => {
      //       // Don't export hash, that should be generated during db-in
      //       delete e.content._task_hash;
      //       delete e.content._input_hash;
      //       switch (e.content.answer) {
      //         case 'accept':
      //           accept.push(JSON.stringify(e));
      //           break;
      //         case 'reject':
      //           reject.push(JSON.stringify(e));
      //           break;
      //       }
      //       return e.content.toString();
      //     });
      //
      //     console.log(`Accepted\n\n${accept.join('\n')}\n\nRejected\n\n${reject.join('\n')}`);
      //   });
    }
  }
}
