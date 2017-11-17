import Renderer from 'qtek/src/Renderer';
import Camera from 'qtek/src/camera/Perspective';
import Scene from 'qtek/src/Scene';
import TextureCube from 'qtek/src/TextureCube';
import Texture2D from 'qtek/src/Texture2D';
import OrbitControl from 'qtek/src/plugin/OrbitControl';
import DeviceOrientationControl from './DeviceOrientationControl';
import ParticleRenderable from 'qtek/src/particle/ParticleRenderable';
import Emitter from 'qtek/src/particle/Emitter';
import Value from 'qtek/src/math/Value';
import Vector3 from 'qtek/src/math/Vector3';

import Skybox from './Skybox';

var requestAnimationFrame = window.requestAnimationFrame
    || window.msRequestAnimationFrame
    || window.mozRequestAnimationFrame
    || window.webkitRequestAnimationFrame
    || function (func){ setTimeout(func, 16); };

function Environment(dom, opts) {
    opts = opts || {};
    var devicePixelRatio = opts.devicePixelRatio || window.devicePixelRatio;
    /**
     * @type {qtek.Renderer}
     * @private
     */
    this._renderer = new Renderer({
        devicePixelRatio: devicePixelRatio
    });
    /**
     * @type {HTMLDivElement}
     * @private
     */
    this._root = dom;
    /**
     * @type {qtek.Scene}
     * @private
     */
    this._scene = new Scene();
    /**
     * @type {qtek.plugin.Skybox}
     * @private
     */
    this._skybox = new Skybox({
        scene: this._scene
    });
    /**
     * @type {qtek.camera.Perspective}
     * @private
     */
    this._camera = new Camera();

    /**
     * @type {qtek.TextureCube}
     * @private
     */
    this._cubemap = null;

    var ControlCtor = (typeof window.orientation !== 'undefined' || opts.mobile) ? DeviceOrientationControl : OrbitControl;
    /**
     * @type {qtek.plugin.OrbitControl}
     * @private
     */
    this._control = new ControlCtor({
        target: this._camera,
        domElement: this._root
    });

    dom.appendChild(this._renderer.canvas);
    this.resize();
}

Environment.prototype = {

    constructor: Environment,

    /**
     * 
     * @param {Object} cubemaps
     * @param {string} cubemaps.nx
     * @param {string} cubemaps.px
     * @param {string} cubemaps.ny
     * @param {string} cubemaps.py
     * @param {string} cubemaps.nz
     * @param {string} cubemaps.pz
     * @param {Function} [onsuccess]
     * @param {Function} [onerror]
     */
    loadCubemap: function (cubemaps, onsuccess, onerror) {
        if (this._cubemap) {
            this._cubemap.dispose(this._renderer);
        }
        var cubemap = this._cubemap = new TextureCube({
            flipY: false
        });
        this._skybox.setEnvironmentMap(cubemap);
        cubemap.load(cubemaps);
        cubemap.success(function () {
            if (cubemap.image.py) {
                // Flip X and Y
                var canvas = document.createElement('canvas');
                canvas.width = cubemap.image.py.width;
                canvas.height = cubemap.image.py.height;
                var ctx = canvas.getContext('2d');
                ctx.translate(canvas.width, canvas.height);
                ctx.scale(-1, -1);
                ctx.drawImage(cubemap.image.py, 0, 0, canvas.width, canvas.height);
                cubemap.image.py = canvas;
            }

            onsuccess && onsuccess();
        });
        cubemap.error(function () {
            onerror && onerror();
        });
    },
    /**
     * Init particle effects.
     * @param {string} sprite
     * @param {number} [amount=5]
     * @param {number} [max=1000]
     * @param {Array.<number>} [life=[5, 8]]
     * @param {Array.<number>} [size=[20, 100]]
     * @param {Array.<Array>} [speed=[[-0.1, -2, -0.1], [0.1, -1, 0.1]]
     */
    initParticleEffect: function (opts) {
        if (this._particleRendeable) {
            return;
        }
        opts = opts || {};
        var speed = opts.speed || [[-0.1, -2, -0.1], [0.1, -1, 0.1]];
        var speedMin = new Vector3();
        var speedMax = new Vector3();
        speedMin.setArray(speed[0]);
        speedMin.setArray(speed[1]);

        var spriteSize = opts.size || [20, 100];
        var life = opts.life || [5, 8];
        this._particleRendeable = new ParticleRenderable();
        this._emitter = new Emitter({
            amount: opts.amount || 5,
            max: opts.max || 1000,
            position: Value.random3D(new Vector3(-10, -10, -10), new Vector3(10, 10, 10)),
            velocity: Value.random3D(speedMin, speedMax),
            spriteSize: Value.random1D(spriteSize[0], spriteSize[1]),
            life: Value.random1D(life[0], life[1])
        });
        this._particleRendeable.addEmitter(this._emitter);

        // Init material
        var spriteTexture = new Texture2D();
        spriteTexture.load(opts.sprite).success(function () {
            this._scene.add(this._particleRendeable);
        }, this);
        this._particleRendeable.material.shader.enableTexture('sprite');
        this._particleRendeable.material.set('sprite', spriteTexture);
    },

    _doRender: function () {
         this._renderer.render(this._scene, this._camera);
    },

    /**
     * Start running.
     */
    start: function () {
        if (this._running) {
            return;
        }
        this._running = true;
        var self = this;

        function frame() {
            if (!self._running) {
                return;
            }

            self._control.update(16);

            if (self._particleRendeable) {
                self._particleRendeable.updateParticles(16);
            }

            self._doRender();

            requestAnimationFrame(frame);
        }
        
        requestAnimationFrame(frame);
    },

    stop: function () {
        this._running = false;
    },

    resize: function () {
        this._renderer.resize(this._root.clientWidth, this._root.clientHeight);
        this._camera.aspect = this._renderer.getViewportAspect();
    },

    dispose: function () {
        this.stop();
        this._control.dispose();
        this._skybox.dispose(this._renderer);
        this._cubemap.dispose(this._renderer);
        this._renderer.disposeScene(this._scene);
        this._renderer.dispose();
        this._root.innerHTML = '';
    }
};

export default Environment;