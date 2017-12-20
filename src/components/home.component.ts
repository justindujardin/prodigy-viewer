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
    this.db.connect();
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

  removeIgnored() {
    if (this.active) {
      this.db.removeExamples(this.active.id, 'ignore');
      // this.db.replaceLabel(this.active.id, '"HARASSMENT"', 'HARASSMENT');
    }
  }
}
