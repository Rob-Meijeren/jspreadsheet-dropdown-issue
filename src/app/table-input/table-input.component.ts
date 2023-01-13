import {
  Component,
  forwardRef,
  Input,
  OnInit,
  Output,
  EventEmitter,
  ViewEncapsulation,
  OnChanges,
  SimpleChanges,
  ElementRef,
  AfterViewInit,
  ViewChildren,
  QueryList,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { get, isArray, isNil, isEmpty, isEqual } from 'lodash';
import { BehaviorSubject, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import * as jspreadsheet from 'jspreadsheet';
import jss_autoWidth from '@jspreadsheet/autowidth';

export interface ColumnDataGetterSetterFunction {
  (row: any): any;
  (row: any | any[], value: any): void;
}
export interface ITableColumn extends jspreadsheet.Column {
  defaultValue?: number | string;
  key: string;
  translation_key: string;
}

export interface ITableChangeEvent {
  parent?: number;
  line: number;
  key: string;
  value: any;
  prev: any;
}

@Component({
  selector: 'table-input',
  templateUrl: './table-input.component.html',
  styleUrls: ['./table-input.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TableInputComponent),
      multi: true,
    },
  ],
  encapsulation: ViewEncapsulation.None,
})
export class TableInputComponent
  implements OnInit, OnChanges, AfterViewInit, ControlValueAccessor
{
  @Input()
  public readOnly?: boolean;

  @Input()
  public contained?: boolean = true;

  @Input()
  public headerClass?: string;

  @Input()
  public title?: string;

  @Input()
  public columns: ITableColumn[];

  @Input()
  public hasNestedRows: boolean = false;

  @Input()
  public rerenderTrigger$?: Subject<void>;

  @Input()
  public withTotals?: boolean = false;

  @Output()
  public onLineChange: EventEmitter<ITableChangeEvent> = new EventEmitter<ITableChangeEvent>();

  @ViewChildren('wrapper') spreadsheet: QueryList<ElementRef>;
  public value;

  private parsedColumns: ITableColumn[] = [];
  private data$: BehaviorSubject<any[][]> = new BehaviorSubject<any[][]>([]);
  private worksheet$ = new BehaviorSubject<jspreadsheet.Worksheet | null>(null);
  private workbook$ = new BehaviorSubject<
    jspreadsheet.worksheetInstance[] | null
  >(null);
  onChange: any = () => {};
  onTouched: any = () => {};
  onValidate: any = () => {};

  private stop$ = new Subject<void>();

  private rowGroups: Record<number, jspreadsheet.Row> = {};
  private rowGroupOpened: Record<number, boolean> = {};

  constructor() {}

  ngOnInit() {
    this.onTouched();

    this.worksheet$
      .pipe(
        takeUntil(this.stop$),
        filter((value) => !isNil(value))
      )
      .subscribe((worksheet) => {
        const currentWorkbook = this.workbook$.value;

        let selectedCell: string;

        if (!isNil(currentWorkbook)) {
          const selectedCells = currentWorkbook[0].getSelected(true, false);
          if (selectedCells?.length > 0) {
            selectedCell = selectedCells[0];
          }
          for (const worksheetInstance of currentWorkbook) {
            worksheetInstance.deleteWorksheet(0);
          }
        }

        const workbook = jspreadsheet(this.spreadsheet.first.nativeElement, {
          worksheets: [worksheet],
          tabs: false,
          allowExport: false,
          allowDeleteWorksheet: false,
          allowMoveWorksheet: false,
          allowRenameWorksheet: false,
          wordWrap: true,
          loadingSpin: true,
          onbeforepaste: () => {
            return false;
          },
          contextMenu: () => {
            return false;
          },
          onbeforedeletecolumn: () => {
            return false;
          },
          onbeforedeleterow: () => {
            return false;
          },
          onbeforechange: (worksheet, cell, x, y, value) => {
            const column = this.columns[x];
            console.log('on before change', value);
            if (value === '' && column.type !== 'dropdown') {
              const oldValue = this.data$.value[y][x];
              return oldValue;
            }
          },
          onafterchanges: (worksheet, records) =>
            this.onTableChange(worksheet, records),
          onselection: (worksheet, px, py, ux, uy, origin) => {
            const cell: any = worksheet.getCellFromCoords(px, py);
            const column = this.columns[px];
            if (!isNil(cell) && column.type !== 'dropdown') {
              worksheet.openEditor(cell, true);
            } else if (!isNil(cell) && column.type === 'dropdown') {
              // worksheet.openEditor(cell, false);
            }
          },
          onopenrowgroup: (worksheet, row) => {
            this.rowGroupOpened[row] = true;
          },
          oncloserowgroup: (worksheet, row) => {
            this.rowGroupOpened[row] = false;
          },
          plugins: {
            autoWidth: jss_autoWidth,
          },
          parseFormulas: true,
        });

        this.workbook$.next(workbook);
      });
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (!isNil(this.spreadsheet?.first?.nativeElement)) {
      if (
        this.data$.value &&
        changes.columns) {
        this.parseColumns(changes.columns.currentValue);
        await this.parseData(this.value);
        this.setWorksheet();
      }

      if (changes.readOnly && !changes.readOnly.isFirstChange) {
        this.setWorksheet();
      }
    }
  }

  ngAfterViewInit(): void {
    jspreadsheet.setLicense('YjliMzQzZjUzM2M2N2JlNzI3Nzg2Njg3ZGFjNjUyODE2NzEzNGI1Yjc3YjA5YmRmMTFhMTQwMDk4ZmI1MjA1ZGQ1OGEwNGRmYzRhMzAxYjdiYzI3ZGMyOTBlMGRlNmFlNDM5MGFkMTljZDQ4MDk3Y2ViYmVhYmFkMzZkNmNjZjcsZXlKdVlXMWxJam9pU25Od2NtVmhaSE5vWldWMElpd2laR0YwWlNJNk1UWTNNelkxT1RFd01Td2laRzl0WVdsdUlqcGJJbXB6Y0hKbFlXUnphR1ZsZEM1amIyMGlMQ0pqYjJSbGMyRnVaR0p2ZUM1cGJ5SXNJbXB6YUdWc2JDNXVaWFFpTENKamMySXVZWEJ3SWl3aWJHOWpZV3hvYjNOMElsMHNJbkJzWVc0aU9pSXpJaXdpYzJOdmNHVWlPbHNpZGpjaUxDSjJPQ0lzSW5ZNUlpd2lZMmhoY25Seklpd2labTl5YlhNaUxDSm1iM0p0ZFd4aElpd2ljR0Z5YzJWeUlpd2ljbVZ1WkdWeUlpd2lZMjl0YldWdWRITWlMQ0pwYlhCdmNuUWlMQ0ppWVhJaUxDSjJZV3hwWkdGMGFXOXVjeUlzSW5ObFlYSmphQ0pkTENKa1pXMXZJanAwY25WbGZRPT0=');

    this.spreadsheet.changes.subscribe(() => {
      this.setWorksheet();
    });
  }

  ngOnDestroy() {
    this.stop$.next();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  registerOnValidatorChange?(fn: () => void): void {
    this.onValidate = fn;
  }

  setDisabledState(isDisabled: boolean): void {}

  setWorksheet() {
    const newWorksheet: jspreadsheet.Worksheet = {
      data: this.data$.value,
      columns: this.parsedColumns,
      allowInsertColumn: false,
      allowInsertRow: false,
      allowDeleteColumn: false,
      allowDeleteRow: false,
      allowDeletingAllRows: false,
      rowDrag: false,
      allowManualInsertColumn: false,
      allowManualInsertRow: false,
      allowRenameColumn: false,
      columnDrag: false,
      columnResize: false,
      allowComments: false,
      columnSorting: false,
      columnSortingOnDblClick: false,
      applyMaskOnFooters: true,
      filters: false,
      selectionCopy: false,
      resize: 'both',
      minDimensions: [this.parsedColumns.length, 1],
      tableOverflow: false,
      tableWidth: this.spreadsheet.first.nativeElement.clientWidth,
      tableHeight: this.spreadsheet.first.nativeElement.clientHeight,
    };

    if (!isEmpty(this.rowGroups)) {
      newWorksheet.rows = this.rowGroups;
    }

    this.worksheet$.next(newWorksheet);
  }

  async writeValue(obj: any) {
    this.value = obj;

    await this.parseData(this.value);

    if (
      !isNil(this.spreadsheet) &&
      !isNil(this.spreadsheet?.first?.nativeElement)
    ) {
      this.setWorksheet();
    }
  }

  async parseData(data: any[], columns?: ITableColumn[]) {
    let columnsToUse = columns ?? this.parsedColumns;
    const newRowGroups: Record<number, jspreadsheet.Row> = {};

    if (isEmpty(columnsToUse)) {
      this.parseColumns(this.columns);
      columnsToUse = this.parsedColumns;
    }

    if (!columnsToUse) {
      this.data$.next([]);
    }

    const parsedDataRows: any[] = [];
    let rowIndex = 0;

    for (const dataRow of data) {
      const parsedDataRow = [];

      for (const column of columnsToUse ?? []) {
        const value = await this.getRowValue(dataRow, column);

        if (typeof value === 'boolean') {
          parsedDataRow.push(`${value}`);
        } else {
          parsedDataRow.push(value);
        }
      }

      parsedDataRows.push(parsedDataRow);

      if (dataRow.children && isArray(dataRow.children)) {
        let parentRowIndex = rowIndex;
        let childIndexes: number[] = [];
        for (const child of dataRow.children) {
          const parsedChildDataRow = [];

          for (const column of columnsToUse ?? []) {
            const value = await this.getRowValue(child, column);

            parsedChildDataRow.push(value);
          }

          parsedDataRows.push(parsedChildDataRow);

          rowIndex += 1;
          childIndexes.push(rowIndex);
        }

        newRowGroups[parentRowIndex] = {
          group: childIndexes,
          title: dataRow.title,
          state: true,
        };
      }

      rowIndex += 1;
    }

    this.rowGroups = newRowGroups;

    this.data$.next(parsedDataRows);
  }

  parseColumns(columns: ITableColumn[]) {
    const newColumns: ITableColumn[] = [];
    (columns ?? []).forEach((column) => {
      column.title = column.translation_key;

      newColumns.push(column);
    });

    this.parsedColumns = newColumns;
  }

  async getRowValue(row: any, column: ITableColumn) {
    let value;
    if (column.key) {
      value = get(row, column.key);

      const defaultValue = get(column, 'defaultValue');
      if (isNil(value) && !isNil(defaultValue)) {
        value = defaultValue;
      }
    }

    return value ?? '';
  }

  onTableChange(
    worksheet: jspreadsheet.worksheetInstance,
    recordsThatChanged: { x: string; y: string; oldValue: any; value: any }[]
  ) {
    if (recordsThatChanged === null) {
      return;
    }

    for (let i = 0; i < recordsThatChanged.length; i += 1) {
      const record = recordsThatChanged[i];
      const columnIndex = parseInt(record?.x, 10);
      const rowIndex = parseInt(record?.y, 10);
      const column = this.columns[columnIndex];

      if (isEqual(record.oldValue, record.value)) {
        return;
      }

      if (!this.hasNestedRows) {
        this.onLineChange.emit({
          line: rowIndex,
          key: column.key,
          value: record.value,
          prev: record.oldValue,
        });
        return;
      }
    }
  }
}
