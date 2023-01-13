import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { TableInputComponent } from './table-input/table-input.component';
import {MatCardModule} from '@angular/material/card';

@NgModule({
  imports: [BrowserModule, FormsModule, ReactiveFormsModule, MatCardModule],
  declarations: [AppComponent, TableInputComponent],
  bootstrap: [AppComponent],
})
export class AppModule {}
