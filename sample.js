var delayCreateScene = function () {

    var scene = new BABYLON.Scene(engine);
    //Adding a light
    var light = new BABYLON.HemisphericLight("Hemi", new BABYLON.Vector3(0, 1, 0), scene);

    //Adding an Arc Rotate Camera
    var camera = new BABYLON.ArcRotateCamera("camera1", 0, 0, 0, new BABYLON.Vector3(0, 0, 0), scene);
    camera.setPosition(new BABYLON.Vector3(0, 5, -100));
    camera.attachControl(canvas, true);

    const man = new VerticesManipulator(scene);

    var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

    var panel = new BABYLON.GUI.StackPanel();
    panel.width = "220px";
    panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    advancedTexture.addControl(panel);

    var header = new BABYLON.GUI.TextBlock();
    header.text = "Radius";
    header.height = "30px";
    header.color = "white";
    panel.addControl(header);

    var slider = new BABYLON.GUI.Slider();
    slider.minimum = 0;
    slider.maximum = 20;
    slider.value = 5;
    slider.height = "20px";
    slider.width = "200px";
    slider.onValueChangedObservable.add(function (value) {
        man.radius = value;
        if (man.selectedHit) {
            man.selectVertices(man.selectedHit);
        }
    });
    panel.addControl(slider);

    const box = BABYLON.MeshBuilder.CreateBox("box", { height: 20, width: 20, depth: 20, updatable: true });
    box.isPickable = true;



    // BABYLON.SceneLoader.ImportMesh("", "/scenes/", "Rabbit.babylon", scene, function (meshes) {          
    //     const rabbit = meshes[1];
    //     rabbit.isPickable = true;
    //     const testMeshes = [rabbit];
    //     console.log(rabbit)

    //     const positions = rabbit.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    //     rabbit.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions, true);
    //     const normals = rabbit.getVerticesData(BABYLON.VertexBuffer.NormalKind);
    //     rabbit.setVerticesData(BABYLON.VertexBuffer.NormalKind, normals, true);
    // });
    scene.onPointerObservable.add((evt) => {
        switch (evt.type) {
            case BABYLON.PointerEventTypes.POINTERDOWN:
                if (evt.event.button === 2) {
                    var ray = scene.createPickingRay(scene.pointerX, scene.pointerY, BABYLON.Matrix.Identity(), camera);
                    var hit = scene.pickWithRay(ray);
                    if (hit.pickedMesh) {
                        man.selectVertices(hit);
                    }
                }
                break;

        }
    });

    return scene;
};


class VerticesManipulator {
    constructor(scene) {
        this.scene = scene;
        this.meshes = new Map();
        this.radius = 5;
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

        this.gizmoManager.attachableMeshes = [this.tranny];

        this.gizmoManager.gizmos.positionGizmo.onDragEndObservable.add((e) => {
            const transformMesh = this.gizmoManager.gizmos.positionGizmo.attachedMesh;
            if (!this.selectedVertices) {
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
            this.updateVertices(this.selectedMesh);
        })

    }

    addMesh(mesh) {
        mesh.isPickable = true;
        const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        const vertices = [];
        for (let i = 0; i < positions.length; i += 3) {
            vertices.push(new BABYLON.Vector3(positions[i], positions[i + 1], positions[i + 2]));
        }
        this.meshes.set(mesh, { mesh: mesh, vertices: vertices });
    }

    updateVertices(mesh) {
        //mesh.bakeCurrentTransformIntoVertices();
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
        mesh.bakeCurrentTransformIntoVertices();
    }

    selectVertices(hit) {

        for (let i = 0; i < this.spheres.length; ++i) {
            this.spheres[i].dispose();
        }
        this.spheres.length = 0;
        this.selectedVertices.length = 0;
        this.selectedMesh = null;
        this.selectedHit = null;

        if (!this.meshes.has(hit.pickedMesh)) {
            this.addMesh(hit.pickedMesh)
        }

        this.selectedMesh = hit.pickedMesh;
        this.selectedHit = hit;

        const mesh = this.meshes.get(hit.pickedMesh);
        for (let i = 0; i < mesh.vertices.length; ++i) {
            BABYLON.Vector3.TransformCoordinatesToRef(mesh.vertices[i], mesh.mesh.getWorldMatrix(), this.tmpVec);
            const distance = BABYLON.Vector3.Distance(this.tmpVec, hit.pickedPoint);
            if (distance < this.radius) {
                const instance = this.sphere.createInstance("spi" + i);
                instance.position.copyFrom(this.tmpVec)
                this.spheres.push(instance);
                this.selectedVertices.push(mesh.vertices[i]);
                console.log("Puuf")
            }
        }
        this.tranny.position.copyFrom(hit.pickedPoint);
        this.gizmoManager.attachToMesh(this.tranny);
        this.pickOrigin.copyFrom(hit.pickedPoint);
    }


}