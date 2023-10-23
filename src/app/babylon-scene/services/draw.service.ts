import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import * as BABYLON from '@babylonjs/core';

@Injectable({
  providedIn: 'root'
})
export class DrawService {
  private canvas: HTMLCanvasElement | null = null;
  private scene: BABYLON.Scene | null = null;
  private polygonVertices: BABYLON.Vector3[] = [];
  private temporaryLine: BABYLON.LinesMesh | null = null;
  private linesMesh: BABYLON.LinesMesh | null = null;

  constructor() { }

  private onPointerDown = (evt: PointerEvent) => {
    const pickInfo = this.scene?.pick(this.scene.pointerX, this.scene.pointerY);
    const worldPosition = pickInfo?.pickedPoint;

    if (evt.button === 0 && worldPosition) { // Left click and a valid pick
      this.addVertex(worldPosition);
      if (this.canvas)
        this.canvas.addEventListener("pointermove", this.onPointerMove);
    } else if (evt.button === 2) { // Right click
      this.closePolygon();
      if (this.canvas)
        this.canvas.removeEventListener("pointermove", this.onPointerDown);
    }
  }

  private onPointerMove = (evt: PointerEvent) => {
    const pickInfo = this.scene?.pick(this.scene.pointerX, this.scene.pointerY);
    const worldPosition = pickInfo?.pickedPoint;

    if (this.temporaryLine && worldPosition) {
      // Updating the temporary dashed line as the mouse moves
      const tempVertices: BABYLON.Vector3[] = [...this.polygonVertices, worldPosition];
      this.temporaryLine.dispose();
      this.temporaryLine = this.createDashedLine(tempVertices);
    }
  }


  public init(canvas: HTMLCanvasElement, scene: BABYLON.Scene) {
    this.scene = scene;
    this.canvas = canvas;

    this.canvas.addEventListener("pointerdown", this.onPointerDown);
  }

  private addVertex(position: BABYLON.Vector3) {
    this.polygonVertices.push(position);

    // Disposing of the existing temporary dashed line
    if (this.temporaryLine) {
      this.temporaryLine.dispose();
    }

    // Creating a new temporary dashed line
    this.temporaryLine = this.createDashedLine(this.polygonVertices);
  }

  private createDashedLine(vertices: BABYLON.Vector3[]): BABYLON.LinesMesh {
    const dashedLine = BABYLON.MeshBuilder.CreateDashedLines(
      'dashedLine',
      {
        points: vertices,
        dashSize: 2,
        gapSize: 2,
        dashNb: 20
      },
      this.scene
    );

    dashedLine.color = BABYLON.Color3.Black();
    return dashedLine;
  }

  private createSolidLine(vertices: BABYLON.Vector3[]): BABYLON.LinesMesh {
    const solidLine = BABYLON.MeshBuilder.CreateLines(
      'polygon',
      {
        points: vertices,
        updatable: true
      },
      this.scene
    );

    solidLine.color = BABYLON.Color3.Black();
    if (!solidLine.actionManager) {
      solidLine.actionManager = new BABYLON.ActionManager(this.scene);
    }

    // Registering the OnPointerOverTrigger action
    // Checking if the OnPointerOverTrigger action already exists
    if (!solidLine.actionManager.hasSpecificTrigger(BABYLON.ActionManager.OnPointerOverTrigger)) {
      solidLine.actionManager.registerAction(
        new BABYLON.SetValueAction(
          BABYLON.ActionManager.OnPointerOverTrigger,
          solidLine,
          "color",
          new BABYLON.Color3(1, 0, 0)
        )
      );
    }

    // Registering the OnPointerOutTrigger action
    // Checking if the OnPointerOutTrigger action already exists
    if (!solidLine.actionManager.hasSpecificTrigger(BABYLON.ActionManager.OnPointerOutTrigger)) {
      solidLine.actionManager.registerAction(
        new BABYLON.SetValueAction(
          BABYLON.ActionManager.OnPointerOutTrigger,
          solidLine,
          "color",
          BABYLON.Color3.Black()
        )
      );
    }
    solidLine.isNearPickable = true;

    return solidLine;
  }
  
  private closePolygon() {
    if (this.polygonVertices.length >= 3) {
      // Closing the polygon by connecting the last vertex to the first
      this.polygonVertices.push(this.polygonVertices[0]);
      this.linesMesh = this.createSolidLine(this.polygonVertices);
    }
    
    // Clearing the polygon vertices to start a new polygon
    this.polygonVertices = [];

    if (this.temporaryLine) {
      this.temporaryLine.dispose();
      this.temporaryLine = null;
    }
  }

  public destroy() {
    // Removing event listeners
    if (this.canvas) {
      this.canvas.removeEventListener("pointerdown", this.onPointerDown);
      this.canvas.removeEventListener("pointermove", this.onPointerMove);
      this.canvas = null;
    }
    if (this.scene)
      this.scene = null;

    // Disposing of mesh objects
    if (this.temporaryLine) {
      this.temporaryLine.dispose();
      this.temporaryLine = null;
    }

    if (this.linesMesh) {
      this.linesMesh = null;
    }

    // Clearing the polygon vertices
    this.polygonVertices = [];
  }
}
