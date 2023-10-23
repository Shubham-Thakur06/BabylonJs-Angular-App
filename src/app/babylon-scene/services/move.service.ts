import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import { SharedService } from './shared.service';

@Injectable({
  providedIn: 'root'
})
export class MoveService {
  private canvas: HTMLCanvasElement | null = null;
  private scene: BABYLON.Scene | null = null;
  private selectedMesh: BABYLON.Mesh | null = null;
  private utilLayer: BABYLON.UtilityLayerRenderer | null = null;
  private positionGizmo: BABYLON.PositionGizmo | null = null;
  private pickedPoint:BABYLON.Vector3 | null;

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
          this.selectMesh(pickedMesh as BABYLON.Mesh);
        }
      }
    } else if (evt.button === 2) { // Right click
      this.deselectMesh();
    }
  }

  private selectMesh(mesh: BABYLON.Mesh) {
    if (this.selectedMesh !== mesh) this.deselectMesh();
    if (!this.scene) return;
    this.selectedMesh = mesh;
    let action = this.sharedService.removeFromPointerOutMap(this.selectedMesh);
    if (this.selectedMesh.actionManager?.hasSpecificTrigger(BABYLON.ActionManager.OnPointerOverTrigger) && action)
      this.selectedMesh.actionManager.unregisterAction(action);

    this.utilLayer = new BABYLON.UtilityLayerRenderer(this.scene);
    this.positionGizmo = new BABYLON.PositionGizmo(this.utilLayer);
    this.positionGizmo.attachedMesh = this.selectedMesh;
    this.pickedPoint = this.selectedMesh.position.clone();
    this.positionGizmo.onDragEndObservable.add(this.onGizmoDragEndObservable.bind(this));
  }

  private onGizmoDragEndObservable (eventData: unknown, eventState: BABYLON.EventState) {
    const transformMesh = this.positionGizmo?.attachedMesh;
    if (!this.pickedPoint || !transformMesh) return;
    const delta = transformMesh.position.subtract(this.pickedPoint);
    const verticesData = transformMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    if (!verticesData) return;
    const vertices = [];
    for (let i = 0; i < verticesData.length; i += 3) {
      let vertex = new BABYLON.Vector3(verticesData[i], verticesData[i + 1], verticesData[i + 2]);
      vertex.addInPlace(delta);
      vertices.push(vertex);
    }
    const positions = [];
    for (let i = 0; i < vertices.length; ++i) {
      const vert = vertices[i];
      positions.push(vert.x, vert.y, vert.z);
    }
    // this.pickedPoint.addInPlace(delta);
    this.selectedMesh?.bakeCurrentTransformIntoVertices(true);
    this.selectedMesh?.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
    this.selectedMesh?.bakeCurrentTransformIntoVertices(true);
  }
  private deselectMesh() {
    if (this.selectedMesh) {
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
    this.pickedPoint = null;
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
