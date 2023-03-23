import {Component, Inject, OnInit} from '@angular/core';
import { Observable, Subject, of, throwError  } from 'rxjs';
import {
  catchError,
  debounceTime, distinctUntilChanged, map, switchMap
} from 'rxjs/operators';
import {
  CareTeam,
  Coding,
  MedicationRequest,
  Organization,
  Practitioner,
  Resource, ServiceRequest,
  Task,
  ValueSetExpansionContains
} from 'fhir/r4';
import {FhirService} from '../../../../services/fhir.service';
import {MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from '@angular/material/dialog';
import * as uuid from 'uuid';
import {DialogService} from '../../../../dialogs/dialog.service';

@Component({
  selector: 'app-task-create',
  templateUrl: './task-create.component.html',
  styleUrls: ['./task-create.component.scss']
})
export class TaskCreateComponent implements OnInit {

  code$: Observable<ValueSetExpansionContains[]> | undefined;

  reason$: Observable<ValueSetExpansionContains[]> | undefined;

  intents: ValueSetExpansionContains[] | undefined;
  priority: ValueSetExpansionContains[] | undefined;

  private searchReasons = new Subject<string>();

  organisation$: Observable<Organization[]> | undefined;
  careTeams: CareTeam[] = [];
  foci: Resource[] = [];
  practitioner$: Observable<Practitioner[]> | undefined;
  status: ValueSetExpansionContains[] | undefined;
  private searchTerms = new Subject<string>();
  private searchTermsOrg = new Subject<string>();
  private searchTermsDoc = new Subject<string>();
  private taskStatus: Coding | undefined;
  private organisation: Organization | undefined;
  private practitioner: Practitioner | undefined;
  private taskCode: Coding | undefined;
  private taskPriority: Coding | undefined;
  private reasonCode: Coding | undefined;
  selectedValues: any;
  disabled: boolean = true;
  patientId = undefined;
  nhsNumber = undefined;
  notes: string | undefined;
  private careIntent: Coding | undefined;
  planTeams: CareTeam | undefined;
  planFocus: Resource | undefined;

  constructor(public dialog: MatDialog,
              @Inject(MAT_DIALOG_DATA) data: any,
              public fhirService: FhirService,
              public dlgSrv: DialogService,
              private diaglogRef: MatDialogRef<TaskCreateComponent>) {
    this.patientId = data.patientId;
    this.nhsNumber = data.nhsNumber;
  }

  ngOnInit(): void {

    this.fhirService.getConf('/ValueSet/$expand?url=http://hl7.org/fhir/ValueSet/task-status').subscribe(
      resource  => {
        this.status = this.dlgSrv.getContainsExpansion(resource);
      }
    );
    this.fhirService.getConf('/ValueSet/$expand?url=http://hl7.org/fhir/ValueSet/task-intent').subscribe(
      resource  => {
        this.intents = this.dlgSrv.getContainsExpansion(resource);
      }
    );
    this.fhirService.getConf('/ValueSet/$expand?url=http://hl7.org/fhir/ValueSet/request-priority').subscribe(
      resource  => {
        this.priority = this.dlgSrv.getContainsExpansion(resource);
      }
    );
    this.fhirService.get('/MedicationRequest?patient=' + this.patientId).subscribe(bundle => {
        if (bundle.entry !== undefined) {
          for (const entry of bundle.entry) {
            if (entry.resource !== undefined && entry.resource.resourceType === 'MedicationRequest') { this.foci.push(entry.resource); }
          }
        }
      }
    );
    this.fhirService.get('/ServiceRequest?status=active,on-hold,draft&patient=' + this.patientId).subscribe(bundle => {
        if (bundle.entry !== undefined) {
          for (const entry of bundle.entry) {
            if (entry.resource !== undefined && entry.resource.resourceType === 'ServiceRequest') { this.foci.push(entry.resource); }
          }
        }
      }
    );
    this.fhirService.getTIE('/CareTeam?patient=' + this.patientId).subscribe(bundle => {
        if (bundle.entry !== undefined) {
          for (const entry of bundle.entry) {
            if (entry.resource !== undefined && entry.resource.resourceType === 'CareTeam') { this.careTeams.push(entry.resource as CareTeam); }
          }
        }
      }
    );

    this.code$ = this.searchTerms.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term: string) => {
          return this.fhirService.searchConcepts(term, 'https://fhir.nhs.uk/ValueSet/NHSDigital-action-code');
        }
      ),
      map(resource    => {
          return this.dlgSrv.getContainsExpansion(resource);
      }
      )
    ), catchError(this.dlgSrv.handleError('getPatients', []));

    this.reason$ = this.searchReasons.pipe(
      // wait 300ms after each keystroke before considering the term
      debounceTime(300),
      // ignore new term if same as previous term
      distinctUntilChanged(),

      // switch to new search observable each time the term changes
      switchMap((term: string) => {
          console.log(term);
          return this.fhirService.searchConcepts(term, 'https://fhir.hl7.org.uk/ValueSet/UKCore-ServiceRequestReasonCode');
        }
      ),
      map(resource    => {
        return this.dlgSrv.getContainsExpansion(resource);
        }
      )
    ), catchError(this.dlgSrv.handleError('getReasons', []));


    this.practitioner$ = this.searchTermsDoc.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term: string) => {
          console.log(term);
          return this.fhirService.getDirectory('/Practitioner?name=' + term);
        }
      ),
      map(resource    => {
          return this.dlgSrv.getContainsPractitoner(resource);
        }
      )
    ), catchError(this.dlgSrv.handleError('getPractitioner', []));

    this.organisation$ = this.searchTermsOrg.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term: string) => {
          return this.fhirService.getDirectory('/Organization?name=' + term);
        }
      ),
      map(resource    => {
          return this.dlgSrv.getContainsOrganisation(resource);
        }
      )
    ), catchError(this.dlgSrv.handleError('getPractitioner', []));
  }

  search(term: string): void {
    if (term.length > 3) {
      this.searchTerms.next(term);
    }
  }
  searchDoc(term: string): void {
    if (term.length > 3) {
      this.searchTermsDoc.next(term);
    }
  }
  searchOrg(term: string): void {
    if (term.length > 3) {
      this.searchTermsOrg.next(term);
    }
  }

  searchReason(term: string): void {
    if (term.length > 3) {
      this.searchReasons.next(term);
    }
  }


  selectedTask(event: MatAutocompleteSelectedEvent): void {
    this.taskCode = {
      system: event.option.value.system,
      code: event.option.value.code,
      display: event.option.value.display,
    };
    console.log(this.taskCode);
    this.checkSubmit();
  }
  selectedPriority(status: any): void {
    console.log(status);
    this.taskPriority = status.value;
    this.checkSubmit();
  }
  selectedReason(event: MatAutocompleteSelectedEvent): void {
    this.reasonCode = {
      system: event.option.value.system,
      code: event.option.value.code,
      display: event.option.value.display,
    };
    this.checkSubmit();
  }
  selectedIntent(intent: any): void {
    this.careIntent = intent.value;
    this.checkSubmit();
  }


  selectedOrg(event: MatAutocompleteSelectedEvent): void {
    console.log(event.option.value);
    this.organisation = event.option.value;
    this.checkSubmit();
  }

  selectedDr(event: MatAutocompleteSelectedEvent): void {
    console.log(event.option.value);
    this.practitioner = event.option.value;
    this.checkSubmit();
  }

  selectedStatus(status: any): void {
    console.log(status);
    this.taskStatus = status.value;
    this.checkSubmit();
  }

  checkSubmit(): void {
    this.disabled = true;
    if (this.taskCode !== undefined &&
      (this.practitioner !== undefined || this.organisation !== undefined || (this.careTeams !== undefined && this.careTeams.length > 0)) &&
      this.taskStatus !== undefined) {
      this.disabled = false;
    }
  }

  submit(): void {
    const task: Task = {
      intent: 'order',
      identifier: [{
        system: 'https://tools.ietf.org/html/rfc4122',
        value: uuid.v4()
      }],
      resourceType: 'Task',
      status: 'requested'
    };
    if (this.taskCode !== undefined) {
      task.code = {
        coding: [
          this.taskCode
        ]
      }
    }
    if (this.organisation !== undefined) {
      task.owner = {
        reference: 'Organization/' + this.organisation.id
      };
      if (this.organisation.identifier !== undefined && this.organisation.identifier.length > 0) {
        task.owner.identifier = this.organisation.identifier[0];
      }
    }
    if (this.practitioner !== undefined) {
      task.owner = {
        reference: 'Practitioner/' + this.practitioner.id
      };
      if (this.practitioner.identifier !== undefined && this.practitioner.identifier.length > 0) {
        task.owner.identifier = this.practitioner.identifier[0];
      }
    }
    if (this.planTeams !== undefined) {
      task.owner = {
        reference: 'CareTeam/' + this.planTeams.id,
        display: this.planTeams.name
      };
    }
    if (this.reasonCode !== undefined) {
      task.reasonCode = {
        coding: [
          this.reasonCode
        ]
      };
    }
    if (this.taskPriority !== undefined) {
      switch (this.taskPriority.code) {
        case 'routine': {
          task.priority = 'routine';
          break;
        }
        case 'urgent': {
          task.priority = 'urgent';
          break;
        }
        case 'asap': {
          task.priority = 'asap';
          break;
        }
        case 'stat': {
          task.priority = 'stat';
          break;
        }
      }
    }
    if (this.careIntent !== undefined) {
      switch (this.careIntent.code) {
        case 'proposal': {
          task.intent = 'proposal';
          break;
        }
        case 'plan': {
          task.intent = 'plan';
          break;
        }
        case 'order': {
          task.intent = 'order';
          break;
        }
        case 'option': {
          task.intent = 'option';
          break;
        }
        case 'instance-order': {
          task.intent = 'instance-order';
          break;
        }
        case 'filler-order': {
          task.intent = 'filler-order';
          break;
        }
        case 'reflex-order': {
          task.intent = 'reflex-order';
          break;
        }
        case 'original-order': {
          task.intent = 'original-order';
          break;
        }
        case 'unknown': {
          task.intent = 'unknown';
          break;
        }
      }
    }
    if (this.taskStatus !== undefined) {
      switch (this.taskStatus.code) {
        case 'requested' : {
          task.status = 'requested';
          break;
        }
        case 'completed' : {
          task.status = 'completed';
          break;
        }
        case 'accepted' : {
          task.status = 'accepted';
          break;
        }
        case 'on-hold' : {
          task.status = 'on-hold';
          break;
        }
        case 'failed' : {
          task.status = 'failed';
          break;
        }
        case 'ready' : {
          task.status = 'ready';
          break;
        }
        case 'in-progress' : {
          task.status = 'in-progress';
          break;
        }
        case 'entered-in-error' : {
          task.status = 'entered-in-error';
          break;
        }
        case 'draft' : {
          task.status = 'draft';
          break;
        }
        case 'completed' : {
          task.status = 'completed';
          break;
        }
        case 'rejected' : {
          task.status = 'rejected';
          break;
        }
        case 'cancelled' : {
          task.status = 'cancelled';
          break;
        }
      }
    }
    task.for = {
      reference: 'Patient/' + this.patientId,
      identifier: {
        system: 'https://fhir.nhs.uk/Id/nhs-number',
        value: this.nhsNumber
      }
    };
    if (this.notes !== undefined) {
      task.note = [
        {
          text: this.notes.trim()
        }
      ];
    }
    if (this.planFocus !== undefined) {
      task.focus = {
        reference: this.planFocus.resourceType + '/' + this.planFocus.id,
      };
      if (this.planFocus.resourceType === 'MedicationRequest') {
        task.focus.display = this.fhirService.getCodeableConceptValue((this.planFocus as MedicationRequest).medicationCodeableConcept);
      }
      if (this.planFocus.resourceType === 'ServiceRequest') {
        task.focus.display = this.fhirService.getCodeableConceptValue((this.planFocus as ServiceRequest).code);
      }
    }

    console.log(task);
    task.authoredOn = new Date().toISOString();
    this.fhirService.postTIE('/Task', task).subscribe(result => {
      this.diaglogRef.close();
      this.dialog.closeAll();
    });
  }


}