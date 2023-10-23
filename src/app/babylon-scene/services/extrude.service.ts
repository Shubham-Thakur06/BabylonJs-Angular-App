import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import * as EARCUT from 'earcut';
import { SharedService } from './shared.service';

@Injectable({
  providedIn: 'root'
})
export class ExtrudeService {
  private canvas: HTMLCanvasElement | null = null;
  private scene: BABYLON.Scene | null = null;

  constructor(private sharedService: SharedService) { }

  public init(canvas: HTMLCanvasElement, scene: BABYLON.Scene) {
    this.scene = scene;
    this.canvas = canvas;
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
  }

  private onPointerDown = (evt: PointerEvent) => {
    const pickInfo = this.scene?.pick(this.scene.pointerX, this.scene.pointerY);
    if (pickInfo && pickInfo.hit && pickInfo.pickedMesh) {
      const pickedMesh = pickInfo.pickedMesh;
      if (pickedMesh instanceof BABYLON.LinesMesh && pickedMesh.name === "polygon") {
        // The user clicked on a LinesMesh (polygon)
        this.extrudePolygon(pickedMesh);
      }
    }
  }

  private extrudePolygon(polygonMesh: BABYLON.LinesMesh) {
    // Getting the vertices data as a FloatArray
    const verticesData = polygonMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);

    // Ensuring verticesData is not null
    if (!verticesData) return;
    // Converting the FloatArray to Vector3[]
    const vertices: BABYLON.Vector3[] = [];
    for (let i = 0; i < verticesData.length; i += 3) {
      vertices.push(new BABYLON.Vector3(verticesData[i], 5, verticesData[i + 2]));
    }

    const extrudedPolygon = BABYLON.MeshBuilder.ExtrudePolygon("extrudedMesh", {
      shape: vertices,
      depth: 5,
      sideOrientation: BABYLON.Mesh.DOUBLESIDE,
      updatable: true
    }, this.scene, EARCUT);

    // Creating a new material for the extruded polygon
    if (!this.scene) return;

    const material = new BABYLON.StandardMaterial("extrudedMaterial", this.scene);

    // Setting the diffuse color to the color you want (e.g., red)
    material.diffuseColor = new BABYLON.Color3(0.75, 0.75, 0.75);

    // Setting the emissive color to black to create black edges
    material.emissiveColor = new BABYLON.Color3(0, 0, 0);

    // Applying the material to the extruded polygon
    extrudedPolygon.material = material;
    if (!extrudedPolygon.actionManager)
      extrudedPolygon.actionManager = new BABYLON.ActionManager(this.scene);

    // Registering the OnPointerOverTrigger action
    if (!extrudedPolygon.actionManager.hasSpecificTrigger(BABYLON.ActionManager.OnPointerOverTrigger)) {
      let action = new BABYLON.SetValueAction(
        BABYLON.ActionManager.OnPointerOverTrigger,
        extrudedPolygon.material,
        "diffuseColor",
        new BABYLON.Color3(0, 0, 0.5)
      );
      extrudedPolygon.actionManager.registerAction(action);
      this.sharedService.addToPointerOverMap(extrudedPolygon, action);
    }
    if (!extrudedPolygon.actionManager.hasSpecificTrigger(BABYLON.ActionManager.OnPointerOutTrigger)) {
      let action = new BABYLON.SetValueAction(
        BABYLON.ActionManager.OnPointerOutTrigger,
        extrudedPolygon.material,
        "diffuseColor",
        new BABYLON.Color3(0.75, 0.75, 0.75)
      );
      extrudedPolygon.actionManager.registerAction(action);
      this.sharedService.addToPointerOutMap(extrudedPolygon, action);
    }

    extrudedPolygon.position.y = 5;

    // Disposing of the original polygonMesh
    polygonMesh.dispose();
  }


  public destroy() {
    // Removing event listeners
    if (this.canvas) {
      this.canvas.removeEventListener("pointerdown", this.onPointerDown);
      this.canvas = null;
    }
  }
}
