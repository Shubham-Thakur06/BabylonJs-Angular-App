import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { BabylonSceneComponent } from './babylon-scene/babylon-scene.component';
import { ModeButtonsComponent } from './mode-buttons/mode-buttons.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    AppComponent,
    BabylonSceneComponent,
    ModeButtonsComponent
  ],
  imports: [
    BrowserModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
