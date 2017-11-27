import {AppComponent} from './app.component';
import {SQLiteService} from './sqlite.service';
import {
  MatButtonModule,
  MatIconModule, MatInputModule,
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
import {FormsModule} from '@angular/forms';
@NgModule({
  imports: [
    CommonModule,
    BrowserModule,
    FormsModule,
    BrowserAnimationsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSelectModule,
    MatInputModule,
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