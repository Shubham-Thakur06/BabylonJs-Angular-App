import { Component, ElementRef, NgZone, AfterViewInit, OnDestroy, ViewChild } from '@angular/core';
import { Mode } from '../shared/mode.enum';

// Babylon
import * as BABYLON from '@babylonjs/core';

// Services
import { ModeService } from '../services/mode.service';

import { DrawService } from './services/draw.service';
import { ExtrudeService } from './services/extrude.service';
import { MoveService } from './services/move.service';
import { EditVertexService } from './services/edit-vertex.service';

@Component({
  selector: 'app-babylon-scene',
  templateUrl: './babylon-scene.component.html',
  styleUrls: ['./babylon-scene.component.css']
})
export class BabylonSceneComponent implements AfterViewInit, OnDestroy {
  @ViewChild('renderCanvas') renderCanvas: ElementRef;

  private canvas: HTMLCanvasElement;
  private engine: BABYLON.Engine;
  private scene: BABYLON.Scene;
  private camera: BABYLON.FreeCamera;
  private hemisphericLight: BABYLON.HemisphericLight;
  private workPlane: BABYLON.Mesh;
  public planeWidth: number = 20;
  public planeHeight: number = 20;
  public currentMode: Mode = Mode.View;
  public boundaryShadowColor: string = 'gray';
  private currentService: any

  constructor(
    private ngZone: NgZone,
    private modeService: ModeService,
    private drawService: DrawService,
    private extrudeService: ExtrudeService,
    private moveService: MoveService,
    private editVertexService: EditVertexService
  ) {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        // Setting the mode to "View"
        this.modeService.setMode(Mode.View);
      }
    });
  }

  ngAfterViewInit() {
    this.canvas = this.renderCanvas.nativeElement;
    this.engine = new BABYLON.Engine(this.canvas, true);
    this.scene = new BABYLON.Scene(this.engine);


    
    // Creating a HemisphericLight for general scene lighting
    this.hemisphericLight = new BABYLON.HemisphericLight('HemisphericLight', new BABYLON.Vector3(0, 1, 0), this.scene);
    this.hemisphericLight.intensity = 1; // Adjust the intensity as needed
    
    // Creating the ground plane
    this.workPlane = BABYLON.Mesh.CreateGround("WorkPlane", 20, 20, 50, this.scene);
    const material = new BABYLON.StandardMaterial("groundMaterial", this.scene);
    material.diffuseColor = new BABYLON.Color3(1, 0, 0);
    this.workPlane.material = material;
    
    // Creating a FreeCamera and set its position and target
    this.camera = new BABYLON.FreeCamera('camera1', new BABYLON.Vector3(this.workPlane.getBoundingInfo().maximum.x, 10, -20), this.scene);
    // Positioning the camera to focus on the ground plane
    const groundCenter = new BABYLON.Vector3(this.workPlane.getBoundingInfo().maximum.x,this.workPlane.getBoundingInfo().maximum.y,this.workPlane.getBoundingInfo().maximum.z);
    // Attaching the camera to the canvas for controls
    this.camera.attachControl(this.canvas, false);

    // Setting the camera's target to the center of the ground
    this.camera.setTarget(groundCenter);

    // Running the scene inside Angular's zone
    this.ngZone.run(() => {
      this.engine.runRenderLoop(() => {
        this.scene.render();
      });
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.engine.resize();
    });

    this.showWorldAxis(8);
    this.createWorkPlane();
    this.modeService.mode$.subscribe((mode: Mode) => {
      this.currentMode = mode;
      // Handle mode-specific logic based on the currentMode property
      this.handleModeChanges();
      this.handleService();
    });
  }

  ngOnDestroy() {
    this.engine.dispose();
  }

  public showWorldAxis(size: number): void {
    const makeTextPlane = (text: string, color: string, textSize: number) => {
      const dynamicTexture = new BABYLON.DynamicTexture('DynamicTexture', 50, this.scene, true);
      dynamicTexture.hasAlpha = true;
      dynamicTexture.drawText(text, 5, 40, 'bold 36px Arial', color, 'transparent', true);
      const plane = BABYLON.Mesh.CreatePlane('TextPlane', textSize, this.scene, true);
      const material = new BABYLON.StandardMaterial('TextPlaneMaterial', this.scene);
      material.backFaceCulling = false;
      material.specularColor = new BABYLON.Color3(0, 0, 0);
      material.diffuseTexture = dynamicTexture;
      plane.material = material;

      return plane;
    };

    const axisX = BABYLON.Mesh.CreateLines(
      'axisX',
      [
        BABYLON.Vector3.Zero(),
        new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, 0.05 * size, 0),
        new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, -0.05 * size, 0)
      ],
      this.scene,
      true
    );

    axisX.color = new BABYLON.Color3(1, 0, 0);
    const xChar = makeTextPlane('X', 'red', size / 10);
    xChar.position = new BABYLON.Vector3(0.9 * size, -0.05 * size, 0);

    const axisY = BABYLON.Mesh.CreateLines(
      'axisY',
      [
        BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3(-0.05 * size, size * 0.95, 0),
        new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3(0.05 * size, size * 0.95, 0)
      ],
      this.scene,
      true
    );

    axisY.color = new BABYLON.Color3(0, 1, 0);
    const yChar = makeTextPlane('Y', 'green', size / 10);
    yChar.position = new BABYLON.Vector3(0, 0.9 * size, -0.05 * size);

    const axisZ = BABYLON.Mesh.CreateLines(
      'axisZ',
      [
        BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3(0, -0.05 * size, size * 0.95),
        new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3(0, 0.05 * size, size * 0.95)
      ],
      this.scene,
      true
    );

    axisZ.color = new BABYLON.Color3(0, 0, 1);
    const zChar = makeTextPlane('Z', 'blue', size / 10);
    zChar.position = new BABYLON.Vector3(0, 0.05 * size, 0.9 * size);
  }

  public createWorkPlane(): void {
    if (this.workPlane) {
      this.workPlane.dispose();
    }

    this.workPlane = BABYLON.Mesh.CreateGround(
      'WorkPlane',
      this.planeWidth,
      this.planeHeight,
      50,
      this.scene
    );
    this.workPlane.position = new BABYLON.Vector3(this.planeWidth / 2, 0, this.planeHeight / 2);
  }

  public updateWorkPlaneDimensions(): void {
    this.createWorkPlane();
  }

  private handleModeChanges(): void {
    switch (this.currentMode) {
      case Mode.View:
        this.boundaryShadowColor = 'gray';
        break;
      case Mode.Draw:
        this.boundaryShadowColor = 'red';
        break;
      case Mode.Extrude:
        this.boundaryShadowColor = 'blue';
        break;
      case Mode.Move:
        this.boundaryShadowColor = 'green';
        break;
      case Mode.EditVertex:
        this.boundaryShadowColor = 'orange';
        break;
    }
  }

  private handleService() {
    if (this.currentService) {
      this.currentService.destroy(); // Destroying the current service if it exists
    }

    // Creating and setting the new service based on the selected mode
    switch (this.currentMode) {
      case Mode.Draw:
        this.currentService = this.drawService;
        this.currentService.init(this.canvas, this.scene);
        break;
      case Mode.Extrude:
        this.currentService = this.extrudeService;
        this.currentService.init(this.canvas, this.scene);
        break;
        case Mode.Move:
          this.currentService = this.moveService;
          this.currentService.init(this.canvas, this.scene);
          break;
          case Mode.EditVertex:
            this.currentService = this.editVertexService;
            this.currentService.init(this.canvas, this.scene, this.camera);
        break;
      default:
        this.currentService = null;
        break;
    }
  }
}
