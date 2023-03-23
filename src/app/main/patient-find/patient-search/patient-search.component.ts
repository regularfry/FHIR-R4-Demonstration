

import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';

import { Observable, Subject, of, throwError  } from 'rxjs';
import {
  catchError,
  debounceTime, distinctUntilChanged, map, switchMap
} from 'rxjs/operators';

import {HttpErrorResponse} from '@angular/common/http';
import {NEVER} from 'rxjs/internal/observable/never';
import {Bundle, Patient} from 'fhir/r4';
import {EprService} from '../../../services/epr.service';
import {FhirService} from '../../../services/fhir.service';



@Component({
  selector: 'app-patient-search',
  templateUrl: './patient-search.component.html',
  styleUrls: [ './patient-search.component.css' ]
})
export class PatientSearchComponent implements OnInit {


  patients$: Observable<Patient[]> | undefined;
  private searchTerms = new Subject<string>();

  @Output() patientSelected : EventEmitter<Patient> = new EventEmitter();

  constructor(private patientChange : EprService, private fhirService: FhirService

  ) {}



  // Push a search term into the observable stream.
  search(term: string): void {
    if (term.length>3) {
      this.searchTerms.next(term);
    }
  }



  ngOnInit(): void {
    this.patients$ = this.searchTerms.pipe(
      // wait 300ms after each keystroke before considering the term
      debounceTime(300),

      // ignore new term if same as previous term
      distinctUntilChanged(),

      // switch to new search observable each time the term changes
      switchMap((term: string) => {
         return this.fhirService.searchPatients(term); }

      ),

      map(resource    => {
          const bundle = resource as Bundle;
          const pat$: Patient[] = [];
          let i;
          if (bundle !== undefined && bundle.hasOwnProperty("entry")) {
            // @ts-ignore
            for (i = 0; i < bundle.entry.length && i < 10; i++) {pat$[i] = (bundle.entry[i].resource as Patient);
            }
          }
          return pat$; }
        )
    ), catchError(this.handleError('getPatients', []));

  }

  private handleError<T> (operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {

      console.log('patient search ERROR');

      // TODO: send the error to remote logging infrastructure
      console.error(error); // log to console instead

      // TODO: better job of transforming error for user consumption
      console.log(`${operation} failed: ${error.message}`);

      // Let the app keep running by returning an empty result.
      return of(result as T);
    };
  }

  selectPatient(patient: Patient): void {

    this.patientChange.setPatient(patient);
    this.patientSelected.emit(patient);
  }



  logError(title: string): (message: any) => Observable<never> {
      return (message: any) => {
        if(message instanceof HttpErrorResponse) {
          if (message.status === 401) {
            // this.authService.logout();
            // this.messageService.add(title + ": 401 Unauthorised");
          }
          if (message.status === 403) {
            // this.messageService.add(title + ": 403 Forbidden (insufficient scope)");
          }
        }
        console.log('Patient Search error handling ' + message);

        return NEVER;

    }
  }
}