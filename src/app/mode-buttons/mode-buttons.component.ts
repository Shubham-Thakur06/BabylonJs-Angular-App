import { Component, Output, EventEmitter } from '@angular/core';
import { Mode } from '..//shared/mode.enum';
import { ModeService } from '../services/mode.service';

@Component({
  selector: 'app-mode-buttons',
  templateUrl: './mode-buttons.component.html',
  styleUrls: ['./mode-buttons.component.css']
})
export class ModeButtonsComponent {
  Mode = Mode;

  constructor(private modeService: ModeService) {}

  setMode(mode: Mode) {
    this.modeService.setMode(mode);
  }
}
