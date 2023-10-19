import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';

@Injectable({
  providedIn: 'root'
})
export class EditVertexService {
  private canvas: HTMLCanvasElement | null = null;
  private scene: BABYLON.Scene | null = null;
  private selectedMesh: BABYLON.AbstractMesh | null = null;
  private pointerDown = false;

  constructor() { }

  public init(canvas: HTMLCanvasElement, scene: BABYLON.Scene) {
    this.canvas = canvas;
    this.scene = scene;
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
  }

  private onPointerDown = (evt: PointerEvent) => {
    if (evt.button === 0) { // Left click and a valid pick
      const pickInfo = this.scene?.pick(this.scene.pointerX, this.scene.pointerY);
      if (pickInfo && pickInfo.hit && pickInfo.pickedMesh) {
        const pickedMesh = pickInfo.pickedMesh;
        if (pickedMesh instanceof BABYLON.AbstractMesh && pickedMesh.name === "extrudedMesh") {
          this.selectMesh(pickedMesh);
        } else {
          this.deselectMesh();
        }
      }
    } else if (evt.button === 2) { // Right click
      this.deselectMesh();
    }
  }

  private onPointerUp = () => {
    this.pointerDown = false;
  }

  private onPointerMove = (evt: PointerEvent) => {
    if (this.pointerDown && this.selectedMesh) {
      const pickInfo = this.scene?.pick(this.scene.pointerX, this.scene.pointerY);
      if (pickInfo && pickInfo.hit && pickInfo.pickedPoint) {
        
      }
    }
  }

  private selectMesh(mesh: BABYLON.AbstractMesh) {
    this.deselectMesh();
    this.selectedMesh = mesh;
    this.pointerDown = true;
  }

  private deselectMesh() {
    this.selectedMesh = null;
  }

  public destroy() {
    if (this.canvas) {
      this.canvas.removeEventListener("pointerdown", this.onPointerDown);
      this.canvas.removeEventListener("pointerup", this.onPointerUp);
      this.canvas.removeEventListener("pointermove", this.onPointerMove);
      this.canvas = null;
    }

    this.deselectMesh();

    if (this.scene) {
      this.scene = null;
    }
  }
}
