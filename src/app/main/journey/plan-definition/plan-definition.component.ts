import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {animate, state, style, transition, trigger} from "@angular/animations";
import {PlanDefinition} from "fhir/r4";
import {MatTableDataSource} from "@angular/material/table";
import {MatSort} from "@angular/material/sort";
import {LoadingMode, LoadingStrategy, LoadingType, TdLoadingService} from "@covalent/core/loading";
import {MatDialog, MatDialogConfig, MatDialogRef} from "@angular/material/dialog";
import {FhirService} from "../../../services/fhir.service";
import {ResourceDialogComponent} from "../../../dialogs/resource-dialog/resource-dialog.component";

@Component({
  selector: 'app-plan-definition',
  templateUrl: './plan-definition.component.html',
  styleUrls: ['./plan-definition.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({height: '0px', minHeight: '0'})),
      state('expanded', style({height: '*'})),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class PlanDefinitionComponent implements OnInit {
  @Input() planDefinitions: PlanDefinition[] =[];

  expandedElement: null | PlanDefinition | undefined;


  // @ts-ignore
  dataSource: MatTableDataSource<PlanDefinition>;
  @ViewChild(MatSort) sort: MatSort | undefined;

  displayedColumns = [ 'status', 'title', 'type', 'description',  'resource'];

  columnsToDisplayWithExpand = [...this.displayedColumns, 'expand'];

  loadingMode = LoadingMode;
  loadingStrategy = LoadingStrategy;
  loadingType = LoadingType;

  constructor(
      private _loadingService: TdLoadingService,
      public dialog: MatDialog,
      public fhirService: FhirService) { }

  ngOnInit(): void {
    this.fhirService.getTIE('/PlanDefinition').subscribe(bundle => {
      this._loadingService.resolve('overlayStarSyntax');
      if (bundle.entry !== undefined) {
        for (const entry of bundle.entry) {
          if (entry.resource !== undefined && entry.resource.resourceType === 'PlanDefinition') {
            this.planDefinitions.push(entry.resource as PlanDefinition); }
        }
        this.dataSource = new MatTableDataSource<PlanDefinition>(this.planDefinitions);
      }
    });
  }

  select(resource: any): void {
    const dialogConfig = new MatDialogConfig();

    dialogConfig.disableClose = true;
    dialogConfig.autoFocus = true;
    dialogConfig.data = {
      id: 1,
      resource
    };
    const resourceDialog: MatDialogRef<ResourceDialogComponent> = this.dialog.open( ResourceDialogComponent, dialogConfig);
  }

}