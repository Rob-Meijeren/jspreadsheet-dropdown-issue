import {
  Component,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewEncapsulation,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { get, isNil } from 'lodash';
import { Subject } from 'rxjs';
import { ITableColumn } from './table-input/table-input.component';
import jspreadsheet from 'jspreadsheet';

export interface ICatch {
  reason_discard: string;
  juvenile: string; // this is a string instead of a boolean becasuse jspreadsheet can't handle booleans as options
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class AppComponent implements OnInit, OnChanges, OnDestroy {
  private stop$ = new Subject<void>();

  public value: ICatch[] = [
    { reason_discard: '', juvenile: 'false' },
    { reason_discard: '', juvenile: 'true' },
  ];
  public disabled: boolean;
  public discardTableFields: ITableColumn[];

  public innerControl: FormControl = new FormControl(this.value);
  public readOnly: boolean = false;

  constructor() {}

  async ngOnInit() {
    console.log('starting app');
    await this.setDiscardColumns();
  }

  ngOnChanges(changes: SimpleChanges) {}

  ngOnDestroy() {
    this.stop$.next();
  }

  private async setDiscardColumns(readOnly: boolean = false) {
    const discardReasonOptions: jspreadsheet.DropdownItem[] = [
      { id: 'A', name: 'Reason A', title: 'Reason A' },
      { id: 'B', name: 'Reason B', title: 'Reason B' },
      { id: 'C', name: 'Reason C', title: 'Reason C' },
      { id: 'D', name: 'Reason D', title: 'Reason D' },
    ];

    const tmpDiscardTableFields: ITableColumn[] = [
      {
        translation_key: 'juvenile',
        defaultValue: 'false',
        key: 'juvenile',
        type: 'dropdown',
        readOnly,
        source: [
          {
            id: 'true',
            name: 'yes',
          },
          {
            id: 'false',
            name: 'no',
          },
        ],
        format: '1',
        render: (td, value, x, y, worksheet, column) => {
          let translatedValue = '';
          console.log('render value', value);
          if (value === 'true') {
            translatedValue = 'yes';
          } else {
            translatedValue = 'no';
          }
          td.innerHTML = translatedValue;
          return value;
        },
        multiple: false,
        options: { newOptions: false },
        width: 'auto' as any,
      },
      {
        translation_key: 'Discard reason',
        defaultValue: '',
        type: 'dropdown',
        key: 'reason_discard',
        source: discardReasonOptions,
        format: '1',
        render: (td, value, x, y, worksheet, column) => {
          let translatedValue = '';
          console.log('render value', value);
          const foundReason = discardReasonOptions.find(
            (reasonOption) => reasonOption.id === value
          );
          if (!isNil(foundReason)) {
            translatedValue = foundReason.name;
          }
          td.innerHTML = translatedValue;
          return value;
        },
        multiple: false,
        options: { newOptions: false },
        width: 'auto' as any,
      },
    ];

    this.discardTableFields = tmpDiscardTableFields;
  }
}
