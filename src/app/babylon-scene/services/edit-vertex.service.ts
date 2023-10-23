import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import { SharedService } from './shared.service';

@Injectable({
  providedIn: 'root'
})
export class EditVertexService {
  private canvas: HTMLCanvasElement | null = null;
  private scene: BABYLON.Scene | null = null;
  private camera: BABYLON.FreeCamera | null = null;
  private selectedMesh: BABYLON.AbstractMesh | null = null;
  private manipulator: VerticesManipulator;

  constructor(private sharedService: SharedService) { }

  public init(canvas: HTMLCanvasElement, scene: BABYLON.Scene, camera: BABYLON.FreeCamera) {
    this.canvas = canvas;
    this.scene = scene;
    this.camera = camera;
    this.canvas.addEventListener("pointerdown", this.onPointerDownSelect);
    this.manipulator = new VerticesManipulator(this.scene);
  }

  private isCornerVertex = (vertex: BABYLON.Vector3, mesh: BABYLON.AbstractMesh) => {
    // Adjust this tolerance value to suit your needs
    var tolerance = 0.5 // You may need to adjust this value
    if (!mesh) return false;
    var halfSize = mesh.scaling.scale(0.5);
    var min = mesh.position.subtract(halfSize);
    var max = mesh.position.add(halfSize);
    return (
      (vertex._x <= min._x + tolerance ||
      vertex._x >= max._x - tolerance) &&
      (vertex._y <= min._y + tolerance ||
      vertex._y >= max._y - tolerance) &&
      (vertex._z <= min._z + tolerance ||
      vertex._z >= max._z - tolerance)
    );
  }

  private onPointerDownSelect = (evt: PointerEvent) => {
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

  private onPointerDownModify = (evt: PointerEvent) => {
    if (evt.button === 0) { // Left click and a valid pick
      var ray = this.scene?.createPickingRay(this.scene.pointerX, this.scene.pointerY, BABYLON.Matrix.Identity(), this.camera);
      if (!ray) return;
      var hit = this.scene?.pickWithRay(ray);
      if (hit && hit.pickedMesh && hit.pickedMesh.name === "extrudedMesh" && this.isCornerVertex(hit.pickedPoint as BABYLON.Vector3, hit.pickedMesh)) {
        this.manipulator.selectVertices(hit);
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
    this.canvas?.addEventListener("pointerdown", this.onPointerDownModify);
    this.manipulator.init();
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
    this.canvas?.removeEventListener("pointerdown", this.onPointerDownModify);
    this.canvas?.addEventListener("pointerdown", this.onPointerDownSelect);
    this.manipulator.reset();
  }

  public destroy() {
    // Removing gizmo and listeners
    if (this.selectedMesh) {
      this.deselectMesh();
    }

    if (this.canvas) {
      this.canvas.removeEventListener("pointerdown", this.onPointerDownSelect);
      this.canvas = null;
    }

    if (this.scene) {
      this.scene = null;
    }
  }
}

class VerticesManipulator {
  private scene: BABYLON.Scene;
  private meshes: Map<BABYLON.Mesh, { mesh: BABYLON.Mesh, vertices: BABYLON.Vector3[] }>;
  private radius: number;
  private pickOrigin: BABYLON.Vector3;
  private tmpVec: BABYLON.Vector3;
  private spheres: BABYLON.InstancedMesh[];
  private sphere: BABYLON.Mesh;
  private tranny: BABYLON.TransformNode;
  private selectedVertices: BABYLON.Vector3[];
  private selectedMesh: BABYLON.Mesh | null;
  private gizmoManager: BABYLON.GizmoManager;
  private selectedHit: BABYLON.PickingInfo | null;
  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
    this.meshes = new Map();
    this.radius = 0.5;
    this.pickOrigin = new BABYLON.Vector3();

    this.tmpVec = new BABYLON.Vector3();
    this.spheres = [];
    this.sphere = BABYLON.MeshBuilder.CreateSphere("sp", { diameter: 0.2 }, this.scene);
    this.tranny = new BABYLON.TransformNode("tranny", this.scene);
    this.selectedVertices = [];
    this.selectedMesh = null;
    this.gizmoManager = new BABYLON.GizmoManager(this.scene);

    this.gizmoManager.positionGizmoEnabled = true;
    this.gizmoManager.rotationGizmoEnabled = false;
    this.gizmoManager.scaleGizmoEnabled = false;
    this.gizmoManager.boundingBoxGizmoEnabled = false;

    this.gizmoManager.attachableMeshes = [this.tranny as BABYLON.AbstractMesh];
  }

  init() {
    this.gizmoManager.gizmos.positionGizmo?.onDragEndObservable.add((e) => {
      const transformMesh = this.gizmoManager.gizmos.positionGizmo?.attachedMesh;
      if (!this.selectedVertices || !transformMesh) {
        return;
      }
      const delta = transformMesh.position.subtract(this.pickOrigin);
      for (let i = 0; i < this.selectedVertices.length; ++i) {
        this.selectedVertices[i].addInPlace(delta);
        if (this.spheres[i]) {
          this.spheres[i].position.copyFrom(this.selectedVertices[i])
        }
      }
      this.pickOrigin.addInPlace(delta);
      this.updateVertices(this.selectedMesh as BABYLON.Mesh);
    });
  }

  addMesh(mesh: BABYLON.Mesh) {
    mesh.isPickable = true;
    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    if (!positions) return;
    const vertices = [];
    for (let i = 0; i < positions.length; i += 3) {
      vertices.push(new BABYLON.Vector3(positions[i], positions[i + 1], positions[i + 2]));
    }
    this.meshes.set(mesh, { mesh: mesh, vertices: vertices });
  }

  updateVertices(mesh: BABYLON.Mesh) {
    mesh.bakeCurrentTransformIntoVertices();
    const mesh2 = this.meshes.get(mesh);
    if (!mesh2) {
      return;
    }
    const positions = [];
    for (let i = 0; i < mesh2.vertices.length; ++i) {
      const vert = mesh2.vertices[i];
      positions.push(vert.x, vert.y, vert.z);
    }
    mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
    mesh.bakeCurrentTransformIntoVertices(true);
  }

  selectVertices(hit: BABYLON.PickingInfo) {

    for (let i = 0; i < this.spheres.length; ++i) {
      this.spheres[i].dispose();
    }
    this.spheres.length = 0;
    this.selectedVertices.length = 0;
    this.selectedMesh = null;
    this.selectedHit = null;

    if (!this.meshes.has(hit.pickedMesh as BABYLON.Mesh)) {
      this.addMesh(hit.pickedMesh as BABYLON.Mesh)
    }

    this.selectedMesh = hit.pickedMesh as BABYLON.Mesh;
    this.selectedHit = hit;

    const mesh = this.meshes.get(hit.pickedMesh as BABYLON.Mesh);
    if (!mesh) return;
    for (let i = 0; i < mesh.vertices.length; ++i) {
      BABYLON.Vector3.TransformCoordinatesToRef(mesh.vertices[i], mesh.mesh.getWorldMatrix(), this.tmpVec);
      const distance = BABYLON.Vector3.Distance(this.tmpVec, hit.pickedPoint as BABYLON.Vector3);
      if (distance < this.radius) {
        const instance = this.sphere.createInstance("spi" + i);
        instance.position.copyFrom(this.tmpVec)
        this.spheres.push(instance);
        this.selectedVertices.push(mesh.vertices[i]);
      }
    }
    this.tranny.position.copyFrom(hit.pickedPoint as BABYLON.Vector3);
    this.gizmoManager.attachToMesh(this.tranny as BABYLON.AbstractMesh);
    this.pickOrigin.copyFrom(hit.pickedPoint as BABYLON.Vector3);
  }

  reset() {
    this.meshes.clear();
    this.pickOrigin = BABYLON.Vector3.Zero();

    this.tmpVec = new BABYLON.Vector3();
    for (let i = 0; i < this.spheres.length; ++i) {
      this.spheres[i].dispose();
    }
    this.spheres = [];
    this.selectedVertices = [];
    this.selectedMesh = null;
    this.tranny.position = BABYLON.Vector3.Zero();
    this.gizmoManager.attachToMesh(null);
    this.gizmoManager.gizmos.positionGizmo?.onDragEndObservable.clear();
  }
}