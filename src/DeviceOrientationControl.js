// Port from https://github.com/mrdoob/three.js/blob/master/examples/js/controls/DeviceOrientationControls.js
import Base from 'qtek/src/core/Base';
import Vector3 from 'qtek/src/math/Vector3';
import Quaternion from 'qtek/src/math/Quaternion';

function degToRad(deg) {
    return deg / 180 * Math.PI;
}

var q1 = new Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // - PI/2 around the x-axis
var q0 = new Quaternion();
var zee = new Vector3(0, 0, 1);

var DeviceOrientationControl = Base.extend({
    /**
     * @type {HTMLElement}
     */
    domElement: null,
    /**
     * @type {qtek.Node}
     */
    target: null,

    alphaOffset: 0
}, function () {
    this.init();
}, {
    init: function () {
        if (!this.domElement) {
            return;
        }

        this._orientataionChange = this._orientataionChange.bind(this);
        this._deviceOrientationChange = this._deviceOrientationChange.bind(this);

        window.addEventListener('orientationchange', this._orientataionChange);
        window.addEventListener('deviceorientation', this._deviceOrientationChange);

        this._screenOrientation = window.orientation || 0;
    },

    update: function () {
        var target = this.target;
        if (!target) {
            return;
        }
        if (!this._deviceOrientation) {
            return;
        }

		var alpha = degToRad(this._deviceOrientation.alpha || 0) + this.alphaOffset; // Z
		var beta = degToRad(this._deviceOrientation.beta || 0); // X'
		var gamma = degToRad(this._deviceOrientation.gamma || 0); // Y''
		var orient = degToRad(this._screenOrientation || 0); // O

        var euler = new Vector3(beta, alpha, -gamma);

        target.rotation.fromEuler(euler, 'YXZ'); // 'ZXY' for the device, but 'YXZ' for us
        target.rotation.multiply(q1);  // camera looks out the back of the device, not the top
        target.rotation.multiply(q0.setAxisAngle(zee, -orient)); // adjust for screen orientation
    },

    _orientataionChange: function (e) {
        this._screenOrientation = window.orientation || 0;
    },

    _deviceOrientationChange: function (e) {
        this._deviceOrientation = e;
    },

    dispose: function () {
        window.removeEventListener('orientationchange', this._orientataionChange);
        window.removeEventListener('deviceorientation', this._deviceOrientationChange);
    }
});

export default DeviceOrientationControl;