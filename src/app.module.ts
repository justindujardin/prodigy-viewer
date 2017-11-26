import {AppComponent} from './app.component';
import {SQLiteService} from './sqlite.service';
import {
  MatButtonModule,
  MatIconModule,
  MatPaginatorModule, MatSelectModule,
  MatSidenavModule, MatSnackBarModule, MatSortModule,
  MatTableModule,
  MatToolbarModule
} from '@angular/material';
import {BrowserModule} from '@angular/platform-browser';
import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {FlexLayoutModule} from '@angular/flex-layout';
import {ExamplesTableComponent} from './components/examples-table.component';
@NgModule({
  imports: [
    CommonModule,
    BrowserModule,
    BrowserAnimationsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSelectModule,
    MatButtonModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatIconModule,
    MatSortModule,
    MatToolbarModule,
    FlexLayoutModule

  ],
  declarations: [AppComponent, ExamplesTableComponent],
  providers: [SQLiteService],
  bootstrap: [AppComponent]
})
export class AppModule {
}