import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';

@Injectable({
  providedIn: 'root'
})
export class SharedService {
  private OnPointerOverextrudedMeshMap: Map<BABYLON.AbstractMesh, BABYLON.IAction> = new Map<BABYLON.Mesh, BABYLON.IAction>();
  private OnPointerOutextrudedMeshMap: Map<BABYLON.AbstractMesh, BABYLON.IAction> = new Map<BABYLON.Mesh, BABYLON.IAction>();
  constructor() { }
  public addToPointerOverMap(mesh: BABYLON.AbstractMesh, action: BABYLON.IAction) {
    this.OnPointerOverextrudedMeshMap.set(mesh, action);
  }

  public addToPointerOutMap(mesh: BABYLON.AbstractMesh, action: BABYLON.IAction) {
    this.OnPointerOutextrudedMeshMap.set(mesh, action);
  }

  public removeFromPointerOverMap(mesh: BABYLON.AbstractMesh): BABYLON.IAction | undefined {
    let action = this.OnPointerOverextrudedMeshMap.get(mesh);
    this.OnPointerOverextrudedMeshMap.delete(mesh);
    return action;
  }

  public removeFromPointerOutMap(mesh: BABYLON.AbstractMesh): BABYLON.IAction | undefined {
    let action = this.OnPointerOutextrudedMeshMap.get(mesh);
    this.OnPointerOutextrudedMeshMap.delete(mesh);
    return action;
  }
}
