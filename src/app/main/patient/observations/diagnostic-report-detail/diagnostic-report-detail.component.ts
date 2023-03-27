import { Component, OnInit } from '@angular/core';
import {DiagnosticReport, Observation} from "fhir/r4";
import {LoadingMode, LoadingStrategy, LoadingType, TdLoadingService} from "@covalent/core/loading";
import {FhirService} from "../../../../services/fhir.service";
import {EprService} from "../../../../services/epr.service";
import {TdDialogService} from "@covalent/core/dialogs";
import {ActivatedRoute, Router} from "@angular/router";
import {MatDialog} from "@angular/material/dialog";

@Component({
  selector: 'app-diagnostic-report-detail',
  templateUrl: './diagnostic-report-detail.component.html',
  styleUrls: ['./diagnostic-report-detail.component.scss']
})
export class DiagnosticReportDetailComponent implements OnInit {

  observations: Observation[] = [];
  // @ts-ignore
  diagnosticReports: DiagnosticReport[] = [];

  patientid: string | null = null;
  loadingMode = LoadingMode;
  loadingStrategy = LoadingStrategy;
  loadingType = LoadingType;
  code: string = '';
  observationsHide = true;
  constructor(public fhirSrv: FhirService,
              private eprService: EprService,
              private dialogService: TdDialogService,
              private _loadingService: TdLoadingService,
              private router: Router,
              private route: ActivatedRoute,
              public dialog: MatDialog) { }

  ngOnInit(): void {
    const code= this.route.snapshot.paramMap.get('report');
    if (code != null) this.code = code
    console.log(this.code)
    if (this.eprService.patient !== undefined) {
      if (this.eprService.patient.id !== undefined) {
        this.patientid = this.eprService.patient.id;
        this.getRecords();
      }

    }
    this.eprService.patientChangeEvent.subscribe(patient => {
      if (patient.id !== undefined) this.patientid = patient.id
      this.getRecords();
    });
  }
  getRecords() {
    this.fhirSrv.getResource('/DiagnosticReport/'+ this.code).subscribe(report => {
          if (report !== undefined && report.resourceType === 'DiagnosticReport') {
            this.diagnosticReports.push(report as DiagnosticReport);

            if (report.result !== undefined) {
              let observationsTemp: Observation[] = [];
              let count = 0;
              for (const observation of report.result) {
                if (observation.reference !== undefined) {
                  this.fhirSrv.getResource('/' + observation.reference).subscribe(obs => {
                    if (obs !== undefined && obs.resourceType === 'Observation') {
                      observationsTemp.push(obs as Observation);
                      count++;
                      if (count == report.result.length) {
                        this.observations = observationsTemp
                      }
                    }
                  });
                }
              }
            }
          }
        }
    );
  }

}