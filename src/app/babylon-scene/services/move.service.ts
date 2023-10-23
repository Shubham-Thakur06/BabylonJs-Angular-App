import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import { SharedService } from './shared.service';

@Injectable({
  providedIn: 'root'
})
export class MoveService {
  private canvas: HTMLCanvasElement | null = null;
  private scene: BABYLON.Scene | null = null;
  private selectedMesh: BABYLON.AbstractMesh | null = null;
  private utilLayer: BABYLON.UtilityLayerRenderer | null = null;
  private positionGizmo: BABYLON.PositionGizmo | null = null;

  constructor(private sharedService: SharedService) { }

  public init(canvas: HTMLCanvasElement, scene: BABYLON.Scene) {
    this.canvas = canvas;
    this.scene = scene;
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
  }

  private onPointerDown = (evt: PointerEvent) => {
    if (evt.button === 0) { // Left click and a valid pick
      const pickInfo = this.scene?.pick(this.scene.pointerX, this.scene.pointerY);
      if (pickInfo && pickInfo.hit && pickInfo.pickedMesh) {
        const pickedMesh = pickInfo.pickedMesh;
        if (pickedMesh instanceof BABYLON.AbstractMesh && pickedMesh.name === "extrudedMesh") {
          this.selectMesh(pickedMesh);
        }
      }
    } else if (evt.button === 2) { // Right click
      this.deselectMesh();
    }
  }

  private selectMesh(mesh: BABYLON.AbstractMesh) {
    if (this.selectedMesh !== mesh) this.deselectMesh();
    if (!this.scene) return;
    this.selectedMesh = mesh;
    let action = this.sharedService.removeFromPointerOutMap(this.selectedMesh);
    if (this.selectedMesh.actionManager?.hasSpecificTrigger(BABYLON.ActionManager.OnPointerOverTrigger) && action)
      this.selectedMesh.actionManager.unregisterAction(action);

    this.utilLayer = new BABYLON.UtilityLayerRenderer(this.scene);
    this.positionGizmo = new BABYLON.PositionGizmo(this.utilLayer);
    this.positionGizmo.attachedMesh = this.selectedMesh;
  }

  private deselectMesh() {
    if(this.selectedMesh) {
      if (!this.selectedMesh.actionManager?.hasSpecificTrigger(BABYLON.ActionManager.OnPointerOutTrigger)) {
        let action = new BABYLON.SetValueAction(
          BABYLON.ActionManager.OnPointerOutTrigger,
          this.selectedMesh.material,
          "diffuseColor",
          new BABYLON.Color3(0.75, 0.75, 0.75)
        );
        this.selectedMesh?.actionManager?.registerAction(action);
        this.sharedService.addToPointerOutMap(this.selectedMesh, action);
      }
      let material = this.selectedMesh.material as BABYLON.StandardMaterial;
      material.diffuseColor = new BABYLON.Color3(0.75, 0.75, 0.75);
    }
    this.selectedMesh = null;
    this.positionGizmo?.dispose();
    this.utilLayer?.dispose();
  }

  public destroy() {
    // Removing gizmo and listeners
    if (this.canvas) {
      this.canvas.removeEventListener("pointerdown", this.onPointerDown);
      this.canvas = null;
    }
    if (this.selectedMesh) {
      this.deselectMesh();
    }

    if (this.scene) {
      this.scene = null;
    }
  }
}
