import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Mode } from "../shared/mode.enum";

@Injectable({
  providedIn: 'root'
})
export class ModeService {
  private modeSubject = new Subject<Mode>();
  mode$: Observable<Mode> = this.modeSubject.asObservable();

  setMode(mode: Mode) {
    this.modeSubject.next(mode);
  }
}
