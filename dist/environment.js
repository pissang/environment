(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.Environment = factory());
}(this, (function () { 'use strict';

/**
 * Extend a sub class from base class
 * @param {object|Function} makeDefaultOpt default option of this sub class, method of the sub can use this.xxx to access this option
 * @param {Function} [initialize] Initialize after the sub class is instantiated
 * @param {Object} [proto] Prototype methods/properties of the sub class
 * @memberOf qtek.core.mixin.extend
 * @return {Function}
 */
function derive(makeDefaultOpt, initialize/*optional*/, proto/*optional*/) {

    if (typeof initialize == 'object') {
        proto = initialize;
        initialize = null;
    }

    var _super = this;

    var propList;
    if (!(makeDefaultOpt instanceof Function)) {
        // Optimize the property iterate if it have been fixed
        propList = [];
        for (var propName in makeDefaultOpt) {
            if (makeDefaultOpt.hasOwnProperty(propName)) {
                propList.push(propName);
            }
        }
    }

    var sub = function(options) {

        // call super constructor
        _super.apply(this, arguments);

        if (makeDefaultOpt instanceof Function) {
            // Invoke makeDefaultOpt each time if it is a function, So we can make sure each
            // property in the object will not be shared by mutiple instances
            extend(this, makeDefaultOpt.call(this, options));
        }
        else {
            extendWithPropList(this, makeDefaultOpt, propList);
        }

        if (this.constructor === sub) {
            // Initialize function will be called in the order of inherit
            var initializers = sub.__initializers__;
            for (var i = 0; i < initializers.length; i++) {
                initializers[i].apply(this, arguments);
            }
        }
    };
    // save super constructor
    sub.__super__ = _super;
    // Initialize function will be called after all the super constructor is called
    if (!_super.__initializers__) {
        sub.__initializers__ = [];
    } else {
        sub.__initializers__ = _super.__initializers__.slice();
    }
    if (initialize) {
        sub.__initializers__.push(initialize);
    }

    var Ctor = function() {};
    Ctor.prototype = _super.prototype;
    sub.prototype = new Ctor();
    sub.prototype.constructor = sub;
    extend(sub.prototype, proto);

    // extend the derive method as a static method;
    sub.extend = _super.extend;

    // DEPCRATED
    sub.derive = _super.extend;

    return sub;
}

function extend(target, source) {
    if (!source) {
        return;
    }
    for (var name in source) {
        if (source.hasOwnProperty(name)) {
            target[name] = source[name];
        }
    }
}

function extendWithPropList(target, source, propList) {
    for (var i = 0; i < propList.length; i++) {
        var propName = propList[i];
        target[propName] = source[propName];
    }
}

/**
 * @alias qtek.core.mixin.extend
 * @mixin
 */
var extendMixin = {

    extend: derive,

    // DEPCRATED
    derive: derive
};

function Handler(action, context) {
    this.action = action;
    this.context = context;
}
/**
 * @mixin
 * @alias qtek.core.mixin.notifier
 */
var notifier = {
    /**
     * Trigger event
     * @param  {string} name
     */
    trigger: function(name) {
        if (!this.hasOwnProperty('__handlers__')) {
            return;
        }
        if (!this.__handlers__.hasOwnProperty(name)) {
            return;
        }

        var hdls = this.__handlers__[name];
        var l = hdls.length, i = -1, args = arguments;
        // Optimize advise from backbone
        switch (args.length) {
            case 1:
                while (++i < l) {
                    hdls[i].action.call(hdls[i].context);
                }
                return;
            case 2:
                while (++i < l) {
                    hdls[i].action.call(hdls[i].context, args[1]);
                }
                return;
            case 3:
                while (++i < l) {
                    hdls[i].action.call(hdls[i].context, args[1], args[2]);
                }
                return;
            case 4:
                while (++i < l) {
                    hdls[i].action.call(hdls[i].context, args[1], args[2], args[3]);
                }
                return;
            case 5:
                while (++i < l) {
                    hdls[i].action.call(hdls[i].context, args[1], args[2], args[3], args[4]);
                }
                return;
            default:
                while (++i < l) {
                    hdls[i].action.apply(hdls[i].context, Array.prototype.slice.call(args, 1));
                }
                return;
        }
    },
    /**
     * Register event handler
     * @param  {string} name
     * @param  {Function} action
     * @param  {Object} [context]
     * @chainable
     */
    on: function(name, action, context) {
        if (!name || !action) {
            return;
        }
        var handlers = this.__handlers__ || (this.__handlers__={});
        if (!handlers[name]) {
            handlers[name] = [];
        }
        else {
            if (this.has(name, action)) {
                return;
            }
        }
        var handler = new Handler(action, context || this);
        handlers[name].push(handler);

        return this;
    },

    /**
     * Register event, event will only be triggered once and then removed
     * @param  {string} name
     * @param  {Function} action
     * @param  {Object} [context]
     * @chainable
     */
    once: function(name, action, context) {
        if (!name || !action) {
            return;
        }
        var self = this;
        function wrapper() {
            self.off(name, wrapper);
            action.apply(this, arguments);
        }
        return this.on(name, wrapper, context);
    },

    /**
     * Alias of once('before' + name)
     * @param  {string} name
     * @param  {Function} action
     * @param  {Object} [context]
     * @chainable
     */
    before: function(name, action, context) {
        if (!name || !action) {
            return;
        }
        name = 'before' + name;
        return this.on(name, action, context);
    },

    /**
     * Alias of once('after' + name)
     * @param  {string} name
     * @param  {Function} action
     * @param  {Object} [context]
     * @chainable
     */
    after: function(name, action, context) {
        if (!name || !action) {
            return;
        }
        name = 'after' + name;
        return this.on(name, action, context);
    },

    /**
     * Alias of on('success')
     * @param  {Function} action
     * @param  {Object} [context]
     * @chainable
     */
    success: function(action, context) {
        return this.once('success', action, context);
    },

    /**
     * Alias of on('error')
     * @param  {Function} action
     * @param  {Object} [context]
     * @chainable
     */
    error: function(action, context) {
        return this.once('error', action, context);
    },

    /**
     * Remove event listener
     * @param  {Function} action
     * @param  {Object} [context]
     * @chainable
     */
    off: function(name, action) {

        var handlers = this.__handlers__ || (this.__handlers__={});

        if (!action) {
            handlers[name] = [];
            return;
        }
        if (handlers[name]) {
            var hdls = handlers[name];
            var retains = [];
            for (var i = 0; i < hdls.length; i++) {
                if (action && hdls[i].action !== action) {
                    retains.push(hdls[i]);
                }
            }
            handlers[name] = retains;
        }

        return this;
    },

    /**
     * If registered the event handler
     * @param  {string}  name
     * @param  {Function}  action
     * @return {boolean}
     */
    has: function(name, action) {
        var handlers = this.__handlers__;

        if (! handlers ||
            ! handlers[name]) {
            return false;
        }
        var hdls = handlers[name];
        for (var i = 0; i < hdls.length; i++) {
            if (hdls[i].action === action) {
                return true;
            }
        }
    }
};

var guid = 0;

var ArrayProto = Array.prototype;
var nativeForEach = ArrayProto.forEach;

/**
 * Util functions
 * @namespace qtek.core.util
 */
var util = {

    /**
     * Generate GUID
     * @return {number}
     * @memberOf qtek.core.util
     */
    genGUID: function() {
        return ++guid;
    },
    /**
     * Relative path to absolute path
     * @param  {string} path
     * @param  {string} basePath
     * @return {string}
     * @memberOf qtek.core.util
     */
    relative2absolute: function(path, basePath) {
        if (!basePath || path.match(/^\//)) {
            return path;
        }
        var pathParts = path.split('/');
        var basePathParts = basePath.split('/');

        var item = pathParts[0];
        while(item === '.' || item === '..') {
            if (item === '..') {
                basePathParts.pop();
            }
            pathParts.shift();
            item = pathParts[0];
        }
        return basePathParts.join('/') + '/' + pathParts.join('/');
    },

    /**
     * Extend target with source
     * @param  {Object} target
     * @param  {Object} source
     * @return {Object}
     * @memberOf qtek.core.util
     */
    extend: function(target, source) {
        if (source) {
            for (var name in source) {
                if (source.hasOwnProperty(name)) {
                    target[name] = source[name];
                }
            }
        }
        return target;
    },

    /**
     * Extend properties to target if not exist.
     * @param  {Object} target
     * @param  {Object} source
     * @return {Object}
     * @memberOf qtek.core.util
     */
    defaults: function(target, source) {
        if (source) {
            for (var propName in source) {
                if (target[propName] === undefined) {
                    target[propName] = source[propName];
                }
            }
        }
        return target;
    },
    /**
     * Extend properties with a given property list to avoid for..in.. iteration.
     * @param  {Object} target
     * @param  {Object} source
     * @param  {Array.<string>} propList
     * @return {Object}
     * @memberOf qtek.core.util
     */
    extendWithPropList: function(target, source, propList) {
        if (source) {
            for (var i = 0; i < propList.length; i++) {
                var propName = propList[i];
                target[propName] = source[propName];
            }
        }
        return target;
    },
    /**
     * Extend properties to target if not exist. With a given property list avoid for..in.. iteration.
     * @param  {Object} target
     * @param  {Object} source
     * @param  {Array.<string>} propList
     * @return {Object}
     * @memberOf qtek.core.util
     */
    defaultsWithPropList: function(target, source, propList) {
        if (source) {
            for (var i = 0; i < propList.length; i++) {
                var propName = propList[i];
                if (target[propName] == null) {
                    target[propName] = source[propName];
                }
            }
        }
        return target;
    },
    /**
     * @param  {Object|Array} obj
     * @param  {Function} iterator
     * @param  {Object} [context]
     * @memberOf qtek.core.util
     */
    each: function(obj, iterator, context) {
        if (!(obj && iterator)) {
            return;
        }
        if (obj.forEach && obj.forEach === nativeForEach) {
            obj.forEach(iterator, context);
        } else if (obj.length === + obj.length) {
            for (var i = 0, len = obj.length; i < len; i++) {
                iterator.call(context, obj[i], i, obj);
            }
        } else {
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    iterator.call(context, obj[key], key, obj);
                }
            }
        }
    },

    /**
     * Is object ?
     * @param  {}  obj
     * @return {boolean}
     * @memberOf qtek.core.util
     */
    isObject: function(obj) {
        return obj === Object(obj);
    },

    /**
     * Is array ?
     * @param  {}  obj
     * @return {boolean}
     * @memberOf qtek.core.util
     */
    isArray: function(obj) {
        return Array.isArray(obj);
    },

    /**
     * Is array like, which have a length property
     * @param  {}  obj
     * @return {boolean}
     * @memberOf qtek.core.util
     */
    isArrayLike: function(obj) {
        if (!obj) {
            return false;
        } else {
            return obj.length === + obj.length;
        }
    },

    /**
     * @param  {} obj
     * @return {}
     * @memberOf qtek.core.util
     */
    clone: function(obj) {
        if (!util.isObject(obj)) {
            return obj;
        } else if (util.isArray(obj)) {
            return obj.slice();
        } else if (util.isArrayLike(obj)) { // is typed array
            var ret = new obj.constructor(obj.length);
            for (var i = 0; i < obj.length; i++) {
                ret[i] = obj[i];
            }
            return ret;
        } else {
            return util.extend({}, obj);
        }
    }
};

/**
 * Base class of all objects
 * @constructor
 * @alias qtek.core.Base
 * @mixes qtek.core.mixin.notifier
 */
var Base = function () {
    /**
     * @type {number}
     */
    this.__GUID__ = util.genGUID();
};

Base.__initializers__ = [
    function (opts) {
        util.extend(this, opts);
    }
];

util.extend(Base, extendMixin);
util.extend(Base.prototype, notifier);

/**
 * @namespace qtek.core.glinfo
 * @see http://www.khronos.org/registry/webgl/extensions/
 */

var EXTENSION_LIST = [
    'OES_texture_float',
    'OES_texture_half_float',
    'OES_texture_float_linear',
    'OES_texture_half_float_linear',
    'OES_standard_derivatives',
    'OES_vertex_array_object',
    'OES_element_index_uint',
    'WEBGL_compressed_texture_s3tc',
    'WEBGL_depth_texture',
    'EXT_texture_filter_anisotropic',
    'EXT_shader_texture_lod',
    'WEBGL_draw_buffers',
    'EXT_frag_depth',
    'EXT_sRGB'
];

var PARAMETER_NAMES = [
    'MAX_TEXTURE_SIZE',
    'MAX_CUBE_MAP_TEXTURE_SIZE'
];

function GLInfo(_gl) { 
    var extensions = {};
    var parameters = {};

    // Get webgl extension
    for (var i = 0; i < EXTENSION_LIST.length; i++) {
        var extName = EXTENSION_LIST[i];
        createExtension(extName);
    }
    // Get parameters
    for (var i = 0; i < PARAMETER_NAMES.length; i++) {
        var name = PARAMETER_NAMES[i];
        parameters[name] = _gl.getParameter(_gl[name]);
    }

    /**
     * Get extension
     * @param {string} name - Extension name, vendorless
     * @return {WebGLExtension}
     * @memberOf qtek.core.glinfo
     */
    this.getExtension = function (name) {
        if (!(name in extensions)) {
            createExtension(name);
        }
        return extensions[name];
    };

    /**
     * Get parameter
     * @param {string} name Parameter name
     * @return {*}
     */
    this.getParameter = function (name) {
        return parameters[name];
    };

    function createExtension(name) {
        var ext = _gl.getExtension(name);
        if (!ext) {
            ext = _gl.getExtension('MOZ_' + name);
        }
        if (!ext) {
            ext = _gl.getExtension('WEBKIT_' + name);
        }
        extensions[name] = ext;
    }
}

/**
 * @namespace qtek.core.glenum
 * @see http://www.khronos.org/registry/webgl/specs/latest/1.0/#5.14
 */
var glenum = {
    /* ClearBufferMask */
    DEPTH_BUFFER_BIT               : 0x00000100,
    STENCIL_BUFFER_BIT             : 0x00000400,
    COLOR_BUFFER_BIT               : 0x00004000,

    /* BeginMode */
    POINTS                         : 0x0000,
    LINES                          : 0x0001,
    LINE_LOOP                      : 0x0002,
    LINE_STRIP                     : 0x0003,
    TRIANGLES                      : 0x0004,
    TRIANGLE_STRIP                 : 0x0005,
    TRIANGLE_FAN                   : 0x0006,

    /* AlphaFunction (not supported in ES20) */
    /*      NEVER */
    /*      LESS */
    /*      EQUAL */
    /*      LEQUAL */
    /*      GREATER */
    /*      NOTEQUAL */
    /*      GEQUAL */
    /*      ALWAYS */

    /* BlendingFactorDest */
    ZERO                           : 0,
    ONE                            : 1,
    SRC_COLOR                      : 0x0300,
    ONE_MINUS_SRC_COLOR            : 0x0301,
    SRC_ALPHA                      : 0x0302,
    ONE_MINUS_SRC_ALPHA            : 0x0303,
    DST_ALPHA                      : 0x0304,
    ONE_MINUS_DST_ALPHA            : 0x0305,

    /* BlendingFactorSrc */
    /*      ZERO */
    /*      ONE */
    DST_COLOR                      : 0x0306,
    ONE_MINUS_DST_COLOR            : 0x0307,
    SRC_ALPHA_SATURATE             : 0x0308,
    /*      SRC_ALPHA */
    /*      ONE_MINUS_SRC_ALPHA */
    /*      DST_ALPHA */
    /*      ONE_MINUS_DST_ALPHA */

    /* BlendEquationSeparate */
    FUNC_ADD                       : 0x8006,
    BLEND_EQUATION                 : 0x8009,
    BLEND_EQUATION_RGB             : 0x8009, /* same as BLEND_EQUATION */
    BLEND_EQUATION_ALPHA           : 0x883D,

    /* BlendSubtract */
    FUNC_SUBTRACT                  : 0x800A,
    FUNC_REVERSE_SUBTRACT          : 0x800B,

    /* Separate Blend Functions */
    BLEND_DST_RGB                  : 0x80C8,
    BLEND_SRC_RGB                  : 0x80C9,
    BLEND_DST_ALPHA                : 0x80CA,
    BLEND_SRC_ALPHA                : 0x80CB,
    CONSTANT_COLOR                 : 0x8001,
    ONE_MINUS_CONSTANT_COLOR       : 0x8002,
    CONSTANT_ALPHA                 : 0x8003,
    ONE_MINUS_CONSTANT_ALPHA       : 0x8004,
    BLEND_COLOR                    : 0x8005,

    /* Buffer Objects */
    ARRAY_BUFFER                   : 0x8892,
    ELEMENT_ARRAY_BUFFER           : 0x8893,
    ARRAY_BUFFER_BINDING           : 0x8894,
    ELEMENT_ARRAY_BUFFER_BINDING   : 0x8895,

    STREAM_DRAW                    : 0x88E0,
    STATIC_DRAW                    : 0x88E4,
    DYNAMIC_DRAW                   : 0x88E8,

    BUFFER_SIZE                    : 0x8764,
    BUFFER_USAGE                   : 0x8765,

    CURRENT_VERTEX_ATTRIB          : 0x8626,

    /* CullFaceMode */
    FRONT                          : 0x0404,
    BACK                           : 0x0405,
    FRONT_AND_BACK                 : 0x0408,

    /* DepthFunction */
    /*      NEVER */
    /*      LESS */
    /*      EQUAL */
    /*      LEQUAL */
    /*      GREATER */
    /*      NOTEQUAL */
    /*      GEQUAL */
    /*      ALWAYS */

    /* EnableCap */
    /* TEXTURE_2D */
    CULL_FACE                      : 0x0B44,
    BLEND                          : 0x0BE2,
    DITHER                         : 0x0BD0,
    STENCIL_TEST                   : 0x0B90,
    DEPTH_TEST                     : 0x0B71,
    SCISSOR_TEST                   : 0x0C11,
    POLYGON_OFFSET_FILL            : 0x8037,
    SAMPLE_ALPHA_TO_COVERAGE       : 0x809E,
    SAMPLE_COVERAGE                : 0x80A0,

    /* ErrorCode */
    NO_ERROR                       : 0,
    INVALID_ENUM                   : 0x0500,
    INVALID_VALUE                  : 0x0501,
    INVALID_OPERATION              : 0x0502,
    OUT_OF_MEMORY                  : 0x0505,

    /* FrontFaceDirection */
    CW                             : 0x0900,
    CCW                            : 0x0901,

    /* GetPName */
    LINE_WIDTH                     : 0x0B21,
    ALIASED_POINT_SIZE_RANGE       : 0x846D,
    ALIASED_LINE_WIDTH_RANGE       : 0x846E,
    CULL_FACE_MODE                 : 0x0B45,
    FRONT_FACE                     : 0x0B46,
    DEPTH_RANGE                    : 0x0B70,
    DEPTH_WRITEMASK                : 0x0B72,
    DEPTH_CLEAR_VALUE              : 0x0B73,
    DEPTH_FUNC                     : 0x0B74,
    STENCIL_CLEAR_VALUE            : 0x0B91,
    STENCIL_FUNC                   : 0x0B92,
    STENCIL_FAIL                   : 0x0B94,
    STENCIL_PASS_DEPTH_FAIL        : 0x0B95,
    STENCIL_PASS_DEPTH_PASS        : 0x0B96,
    STENCIL_REF                    : 0x0B97,
    STENCIL_VALUE_MASK             : 0x0B93,
    STENCIL_WRITEMASK              : 0x0B98,
    STENCIL_BACK_FUNC              : 0x8800,
    STENCIL_BACK_FAIL              : 0x8801,
    STENCIL_BACK_PASS_DEPTH_FAIL   : 0x8802,
    STENCIL_BACK_PASS_DEPTH_PASS   : 0x8803,
    STENCIL_BACK_REF               : 0x8CA3,
    STENCIL_BACK_VALUE_MASK        : 0x8CA4,
    STENCIL_BACK_WRITEMASK         : 0x8CA5,
    VIEWPORT                       : 0x0BA2,
    SCISSOR_BOX                    : 0x0C10,
    /*      SCISSOR_TEST */
    COLOR_CLEAR_VALUE              : 0x0C22,
    COLOR_WRITEMASK                : 0x0C23,
    UNPACK_ALIGNMENT               : 0x0CF5,
    PACK_ALIGNMENT                 : 0x0D05,
    MAX_TEXTURE_SIZE               : 0x0D33,
    MAX_VIEWPORT_DIMS              : 0x0D3A,
    SUBPIXEL_BITS                  : 0x0D50,
    RED_BITS                       : 0x0D52,
    GREEN_BITS                     : 0x0D53,
    BLUE_BITS                      : 0x0D54,
    ALPHA_BITS                     : 0x0D55,
    DEPTH_BITS                     : 0x0D56,
    STENCIL_BITS                   : 0x0D57,
    POLYGON_OFFSET_UNITS           : 0x2A00,
    /*      POLYGON_OFFSET_FILL */
    POLYGON_OFFSET_FACTOR          : 0x8038,
    TEXTURE_BINDING_2D             : 0x8069,
    SAMPLE_BUFFERS                 : 0x80A8,
    SAMPLES                        : 0x80A9,
    SAMPLE_COVERAGE_VALUE          : 0x80AA,
    SAMPLE_COVERAGE_INVERT         : 0x80AB,

    /* GetTextureParameter */
    /*      TEXTURE_MAG_FILTER */
    /*      TEXTURE_MIN_FILTER */
    /*      TEXTURE_WRAP_S */
    /*      TEXTURE_WRAP_T */

    COMPRESSED_TEXTURE_FORMATS     : 0x86A3,

    /* HintMode */
    DONT_CARE                      : 0x1100,
    FASTEST                        : 0x1101,
    NICEST                         : 0x1102,

    /* HintTarget */
    GENERATE_MIPMAP_HINT            : 0x8192,

    /* DataType */
    BYTE                           : 0x1400,
    UNSIGNED_BYTE                  : 0x1401,
    SHORT                          : 0x1402,
    UNSIGNED_SHORT                 : 0x1403,
    INT                            : 0x1404,
    UNSIGNED_INT                   : 0x1405,
    FLOAT                          : 0x1406,

    /* PixelFormat */
    DEPTH_COMPONENT                : 0x1902,
    ALPHA                          : 0x1906,
    RGB                            : 0x1907,
    RGBA                           : 0x1908,
    LUMINANCE                      : 0x1909,
    LUMINANCE_ALPHA                : 0x190A,

    /* PixelType */
    /*      UNSIGNED_BYTE */
    UNSIGNED_SHORT_4_4_4_4         : 0x8033,
    UNSIGNED_SHORT_5_5_5_1         : 0x8034,
    UNSIGNED_SHORT_5_6_5           : 0x8363,

    /* Shaders */
    FRAGMENT_SHADER                  : 0x8B30,
    VERTEX_SHADER                    : 0x8B31,
    MAX_VERTEX_ATTRIBS               : 0x8869,
    MAX_VERTEX_UNIFORM_VECTORS       : 0x8DFB,
    MAX_VARYING_VECTORS              : 0x8DFC,
    MAX_COMBINED_TEXTURE_IMAGE_UNITS : 0x8B4D,
    MAX_VERTEX_TEXTURE_IMAGE_UNITS   : 0x8B4C,
    MAX_TEXTURE_IMAGE_UNITS          : 0x8872,
    MAX_FRAGMENT_UNIFORM_VECTORS     : 0x8DFD,
    SHADER_TYPE                      : 0x8B4F,
    DELETE_STATUS                    : 0x8B80,
    LINK_STATUS                      : 0x8B82,
    VALIDATE_STATUS                  : 0x8B83,
    ATTACHED_SHADERS                 : 0x8B85,
    ACTIVE_UNIFORMS                  : 0x8B86,
    ACTIVE_ATTRIBUTES                : 0x8B89,
    SHADING_LANGUAGE_VERSION         : 0x8B8C,
    CURRENT_PROGRAM                  : 0x8B8D,

    /* StencilFunction */
    NEVER                          : 0x0200,
    LESS                           : 0x0201,
    EQUAL                          : 0x0202,
    LEQUAL                         : 0x0203,
    GREATER                        : 0x0204,
    NOTEQUAL                       : 0x0205,
    GEQUAL                         : 0x0206,
    ALWAYS                         : 0x0207,

    /* StencilOp */
    /*      ZERO */
    KEEP                           : 0x1E00,
    REPLACE                        : 0x1E01,
    INCR                           : 0x1E02,
    DECR                           : 0x1E03,
    INVERT                         : 0x150A,
    INCR_WRAP                      : 0x8507,
    DECR_WRAP                      : 0x8508,

    /* StringName */
    VENDOR                         : 0x1F00,
    RENDERER                       : 0x1F01,
    VERSION                        : 0x1F02,

    /* TextureMagFilter */
    NEAREST                        : 0x2600,
    LINEAR                         : 0x2601,

    /* TextureMinFilter */
    /*      NEAREST */
    /*      LINEAR */
    NEAREST_MIPMAP_NEAREST         : 0x2700,
    LINEAR_MIPMAP_NEAREST          : 0x2701,
    NEAREST_MIPMAP_LINEAR          : 0x2702,
    LINEAR_MIPMAP_LINEAR           : 0x2703,

    /* TextureParameterName */
    TEXTURE_MAG_FILTER             : 0x2800,
    TEXTURE_MIN_FILTER             : 0x2801,
    TEXTURE_WRAP_S                 : 0x2802,
    TEXTURE_WRAP_T                 : 0x2803,

    /* TextureTarget */
    TEXTURE_2D                     : 0x0DE1,
    TEXTURE                        : 0x1702,

    TEXTURE_CUBE_MAP               : 0x8513,
    TEXTURE_BINDING_CUBE_MAP       : 0x8514,
    TEXTURE_CUBE_MAP_POSITIVE_X    : 0x8515,
    TEXTURE_CUBE_MAP_NEGATIVE_X    : 0x8516,
    TEXTURE_CUBE_MAP_POSITIVE_Y    : 0x8517,
    TEXTURE_CUBE_MAP_NEGATIVE_Y    : 0x8518,
    TEXTURE_CUBE_MAP_POSITIVE_Z    : 0x8519,
    TEXTURE_CUBE_MAP_NEGATIVE_Z    : 0x851A,
    MAX_CUBE_MAP_TEXTURE_SIZE      : 0x851C,

    /* TextureUnit */
    TEXTURE0                       : 0x84C0,
    TEXTURE1                       : 0x84C1,
    TEXTURE2                       : 0x84C2,
    TEXTURE3                       : 0x84C3,
    TEXTURE4                       : 0x84C4,
    TEXTURE5                       : 0x84C5,
    TEXTURE6                       : 0x84C6,
    TEXTURE7                       : 0x84C7,
    TEXTURE8                       : 0x84C8,
    TEXTURE9                       : 0x84C9,
    TEXTURE10                      : 0x84CA,
    TEXTURE11                      : 0x84CB,
    TEXTURE12                      : 0x84CC,
    TEXTURE13                      : 0x84CD,
    TEXTURE14                      : 0x84CE,
    TEXTURE15                      : 0x84CF,
    TEXTURE16                      : 0x84D0,
    TEXTURE17                      : 0x84D1,
    TEXTURE18                      : 0x84D2,
    TEXTURE19                      : 0x84D3,
    TEXTURE20                      : 0x84D4,
    TEXTURE21                      : 0x84D5,
    TEXTURE22                      : 0x84D6,
    TEXTURE23                      : 0x84D7,
    TEXTURE24                      : 0x84D8,
    TEXTURE25                      : 0x84D9,
    TEXTURE26                      : 0x84DA,
    TEXTURE27                      : 0x84DB,
    TEXTURE28                      : 0x84DC,
    TEXTURE29                      : 0x84DD,
    TEXTURE30                      : 0x84DE,
    TEXTURE31                      : 0x84DF,
    ACTIVE_TEXTURE                 : 0x84E0,

    /* TextureWrapMode */
    REPEAT                         : 0x2901,
    CLAMP_TO_EDGE                  : 0x812F,
    MIRRORED_REPEAT                : 0x8370,

    /* Uniform Types */
    FLOAT_VEC2                     : 0x8B50,
    FLOAT_VEC3                     : 0x8B51,
    FLOAT_VEC4                     : 0x8B52,
    INT_VEC2                       : 0x8B53,
    INT_VEC3                       : 0x8B54,
    INT_VEC4                       : 0x8B55,
    BOOL                           : 0x8B56,
    BOOL_VEC2                      : 0x8B57,
    BOOL_VEC3                      : 0x8B58,
    BOOL_VEC4                      : 0x8B59,
    FLOAT_MAT2                     : 0x8B5A,
    FLOAT_MAT3                     : 0x8B5B,
    FLOAT_MAT4                     : 0x8B5C,
    SAMPLER_2D                     : 0x8B5E,
    SAMPLER_CUBE                   : 0x8B60,

    /* Vertex Arrays */
    VERTEX_ATTRIB_ARRAY_ENABLED        : 0x8622,
    VERTEX_ATTRIB_ARRAY_SIZE           : 0x8623,
    VERTEX_ATTRIB_ARRAY_STRIDE         : 0x8624,
    VERTEX_ATTRIB_ARRAY_TYPE           : 0x8625,
    VERTEX_ATTRIB_ARRAY_NORMALIZED     : 0x886A,
    VERTEX_ATTRIB_ARRAY_POINTER        : 0x8645,
    VERTEX_ATTRIB_ARRAY_BUFFER_BINDING : 0x889F,

    /* Shader Source */
    COMPILE_STATUS                 : 0x8B81,

    /* Shader Precision-Specified Types */
    LOW_FLOAT                      : 0x8DF0,
    MEDIUM_FLOAT                   : 0x8DF1,
    HIGH_FLOAT                     : 0x8DF2,
    LOW_INT                        : 0x8DF3,
    MEDIUM_INT                     : 0x8DF4,
    HIGH_INT                       : 0x8DF5,

    /* Framebuffer Object. */
    FRAMEBUFFER                    : 0x8D40,
    RENDERBUFFER                   : 0x8D41,

    RGBA4                          : 0x8056,
    RGB5_A1                        : 0x8057,
    RGB565                         : 0x8D62,
    DEPTH_COMPONENT16              : 0x81A5,
    STENCIL_INDEX                  : 0x1901,
    STENCIL_INDEX8                 : 0x8D48,
    DEPTH_STENCIL                  : 0x84F9,

    RENDERBUFFER_WIDTH             : 0x8D42,
    RENDERBUFFER_HEIGHT            : 0x8D43,
    RENDERBUFFER_INTERNAL_FORMAT   : 0x8D44,
    RENDERBUFFER_RED_SIZE          : 0x8D50,
    RENDERBUFFER_GREEN_SIZE        : 0x8D51,
    RENDERBUFFER_BLUE_SIZE         : 0x8D52,
    RENDERBUFFER_ALPHA_SIZE        : 0x8D53,
    RENDERBUFFER_DEPTH_SIZE        : 0x8D54,
    RENDERBUFFER_STENCIL_SIZE      : 0x8D55,

    FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE           : 0x8CD0,
    FRAMEBUFFER_ATTACHMENT_OBJECT_NAME           : 0x8CD1,
    FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL         : 0x8CD2,
    FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE : 0x8CD3,

    COLOR_ATTACHMENT0              : 0x8CE0,
    DEPTH_ATTACHMENT               : 0x8D00,
    STENCIL_ATTACHMENT             : 0x8D20,
    DEPTH_STENCIL_ATTACHMENT       : 0x821A,

    NONE                           : 0,

    FRAMEBUFFER_COMPLETE                      : 0x8CD5,
    FRAMEBUFFER_INCOMPLETE_ATTACHMENT         : 0x8CD6,
    FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT : 0x8CD7,
    FRAMEBUFFER_INCOMPLETE_DIMENSIONS         : 0x8CD9,
    FRAMEBUFFER_UNSUPPORTED                   : 0x8CDD,

    FRAMEBUFFER_BINDING            : 0x8CA6,
    RENDERBUFFER_BINDING           : 0x8CA7,
    MAX_RENDERBUFFER_SIZE          : 0x84E8,

    INVALID_FRAMEBUFFER_OPERATION  : 0x0506,

    /* WebGL-specific enums */
    UNPACK_FLIP_Y_WEBGL            : 0x9240,
    UNPACK_PREMULTIPLY_ALPHA_WEBGL : 0x9241,
    CONTEXT_LOST_WEBGL             : 0x9242,
    UNPACK_COLORSPACE_CONVERSION_WEBGL : 0x9243,
    BROWSER_DEFAULT_WEBGL          : 0x9244,
};

var supportWebGL = true;
try {
    var canvas = document.createElement('canvas');
    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
        throw new Error();
    }
} catch (e) {
    supportWebGL = false;
}

var vendor = {};

/**
 * If support WebGL
 * @return {boolean}
 */
vendor.supportWebGL = function () {
    return supportWebGL;
};


vendor.Int8Array = typeof Int8Array == 'undefined' ? Array : Int8Array;

vendor.Uint8Array = typeof Uint8Array == 'undefined' ? Array : Uint8Array;

vendor.Uint16Array = typeof Uint16Array == 'undefined' ? Array : Uint16Array;

vendor.Uint32Array = typeof Uint32Array == 'undefined' ? Array : Uint32Array;

vendor.Int16Array = typeof Int16Array == 'undefined' ? Array : Int16Array;

vendor.Float32Array = typeof Float32Array == 'undefined' ? Array : Float32Array;

vendor.Float64Array = typeof Float64Array == 'undefined' ? Array : Float64Array;

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};





function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var glmatrix = createCommonjsModule(function (module, exports) {
/**
 * @fileoverview gl-matrix - High performance matrix and vector operations
 * @author Brandon Jones
 * @author Colin MacKenzie IV
 * @version 2.2.2
 */

/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */


(function(_global) {
  var shim = {};
  {
    // gl-matrix lives in commonjs, define its namespaces in exports
    shim.exports = exports;
  }

  (function(exports) {
    /* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */


if(!GLMAT_EPSILON) {
    var GLMAT_EPSILON = 0.000001;
}

if(!GLMAT_ARRAY_TYPE) {
    var GLMAT_ARRAY_TYPE = (typeof Float32Array !== 'undefined') ? Float32Array : Array;
}

if(!GLMAT_RANDOM) {
    var GLMAT_RANDOM = Math.random;
}

/**
 * @class Common utilities
 * @name glMatrix
 */
var glMatrix = {};

/**
 * Sets the type of array used when creating new vectors and matrices
 *
 * @param {Type} type Array type, such as Float32Array or Array
 */
glMatrix.setMatrixArrayType = function(type) {
    GLMAT_ARRAY_TYPE = type;
};

if(typeof(exports) !== 'undefined') {
    exports.glMatrix = glMatrix;
}

var degree = Math.PI / 180;

/**
* Convert Degree To Radian
*
* @param {Number} Angle in Degrees
*/
glMatrix.toRadian = function(a){
     return a * degree;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 2 Dimensional Vector
 * @name vec2
 */

var vec2 = {};

/**
 * Creates a new, empty vec2
 *
 * @returns {vec2} a new 2D vector
 */
vec2.create = function() {
    var out = new GLMAT_ARRAY_TYPE(2);
    out[0] = 0;
    out[1] = 0;
    return out;
};

/**
 * Creates a new vec2 initialized with values from an existing vector
 *
 * @param {vec2} a vector to clone
 * @returns {vec2} a new 2D vector
 */
vec2.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(2);
    out[0] = a[0];
    out[1] = a[1];
    return out;
};

/**
 * Creates a new vec2 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @returns {vec2} a new 2D vector
 */
vec2.fromValues = function(x, y) {
    var out = new GLMAT_ARRAY_TYPE(2);
    out[0] = x;
    out[1] = y;
    return out;
};

/**
 * Copy the values from one vec2 to another
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the source vector
 * @returns {vec2} out
 */
vec2.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    return out;
};

/**
 * Set the components of a vec2 to the given values
 *
 * @param {vec2} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @returns {vec2} out
 */
vec2.set = function(out, x, y) {
    out[0] = x;
    out[1] = y;
    return out;
};

/**
 * Adds two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.add = function(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    return out;
};

/**
 * Subtracts vector b from vector a
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.subtract = function(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    return out;
};

/**
 * Alias for {@link vec2.subtract}
 * @function
 */
vec2.sub = vec2.subtract;

/**
 * Multiplies two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.multiply = function(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    return out;
};

/**
 * Alias for {@link vec2.multiply}
 * @function
 */
vec2.mul = vec2.multiply;

/**
 * Divides two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.divide = function(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    return out;
};

/**
 * Alias for {@link vec2.divide}
 * @function
 */
vec2.div = vec2.divide;

/**
 * Returns the minimum of two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.min = function(out, a, b) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    return out;
};

/**
 * Returns the maximum of two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.max = function(out, a, b) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    return out;
};

/**
 * Scales a vec2 by a scalar number
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec2} out
 */
vec2.scale = function(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    return out;
};

/**
 * Adds two vec2's after scaling the second operand by a scalar value
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec2} out
 */
vec2.scaleAndAdd = function(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale);
    out[1] = a[1] + (b[1] * scale);
    return out;
};

/**
 * Calculates the euclidian distance between two vec2's
 *
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {Number} distance between a and b
 */
vec2.distance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1];
    return Math.sqrt(x*x + y*y);
};

/**
 * Alias for {@link vec2.distance}
 * @function
 */
vec2.dist = vec2.distance;

/**
 * Calculates the squared euclidian distance between two vec2's
 *
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {Number} squared distance between a and b
 */
vec2.squaredDistance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1];
    return x*x + y*y;
};

/**
 * Alias for {@link vec2.squaredDistance}
 * @function
 */
vec2.sqrDist = vec2.squaredDistance;

/**
 * Calculates the length of a vec2
 *
 * @param {vec2} a vector to calculate length of
 * @returns {Number} length of a
 */
vec2.length = function (a) {
    var x = a[0],
        y = a[1];
    return Math.sqrt(x*x + y*y);
};

/**
 * Alias for {@link vec2.length}
 * @function
 */
vec2.len = vec2.length;

/**
 * Calculates the squared length of a vec2
 *
 * @param {vec2} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */
vec2.squaredLength = function (a) {
    var x = a[0],
        y = a[1];
    return x*x + y*y;
};

/**
 * Alias for {@link vec2.squaredLength}
 * @function
 */
vec2.sqrLen = vec2.squaredLength;

/**
 * Negates the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a vector to negate
 * @returns {vec2} out
 */
vec2.negate = function(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    return out;
};

/**
 * Returns the inverse of the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a vector to invert
 * @returns {vec2} out
 */
vec2.inverse = function(out, a) {
  out[0] = 1.0 / a[0];
  out[1] = 1.0 / a[1];
  return out;
};

/**
 * Normalize a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a vector to normalize
 * @returns {vec2} out
 */
vec2.normalize = function(out, a) {
    var x = a[0],
        y = a[1];
    var len = x*x + y*y;
    if (len > 0) {
        //TODO: evaluate use of glm_invsqrt here?
        len = 1 / Math.sqrt(len);
        out[0] = a[0] * len;
        out[1] = a[1] * len;
    }
    return out;
};

/**
 * Calculates the dot product of two vec2's
 *
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {Number} dot product of a and b
 */
vec2.dot = function (a, b) {
    return a[0] * b[0] + a[1] * b[1];
};

/**
 * Computes the cross product of two vec2's
 * Note that the cross product must by definition produce a 3D vector
 *
 * @param {vec3} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec3} out
 */
vec2.cross = function(out, a, b) {
    var z = a[0] * b[1] - a[1] * b[0];
    out[0] = out[1] = 0;
    out[2] = z;
    return out;
};

/**
 * Performs a linear interpolation between two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {vec2} out
 */
vec2.lerp = function (out, a, b, t) {
    var ax = a[0],
        ay = a[1];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    return out;
};

/**
 * Generates a random vector with the given scale
 *
 * @param {vec2} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec2} out
 */
vec2.random = function (out, scale) {
    scale = scale || 1.0;
    var r = GLMAT_RANDOM() * 2.0 * Math.PI;
    out[0] = Math.cos(r) * scale;
    out[1] = Math.sin(r) * scale;
    return out;
};

/**
 * Transforms the vec2 with a mat2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat2} m matrix to transform with
 * @returns {vec2} out
 */
vec2.transformMat2 = function(out, a, m) {
    var x = a[0],
        y = a[1];
    out[0] = m[0] * x + m[2] * y;
    out[1] = m[1] * x + m[3] * y;
    return out;
};

/**
 * Transforms the vec2 with a mat2d
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat2d} m matrix to transform with
 * @returns {vec2} out
 */
vec2.transformMat2d = function(out, a, m) {
    var x = a[0],
        y = a[1];
    out[0] = m[0] * x + m[2] * y + m[4];
    out[1] = m[1] * x + m[3] * y + m[5];
    return out;
};

/**
 * Transforms the vec2 with a mat3
 * 3rd vector component is implicitly '1'
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat3} m matrix to transform with
 * @returns {vec2} out
 */
vec2.transformMat3 = function(out, a, m) {
    var x = a[0],
        y = a[1];
    out[0] = m[0] * x + m[3] * y + m[6];
    out[1] = m[1] * x + m[4] * y + m[7];
    return out;
};

/**
 * Transforms the vec2 with a mat4
 * 3rd vector component is implicitly '0'
 * 4th vector component is implicitly '1'
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns {vec2} out
 */
vec2.transformMat4 = function(out, a, m) {
    var x = a[0],
        y = a[1];
    out[0] = m[0] * x + m[4] * y + m[12];
    out[1] = m[1] * x + m[5] * y + m[13];
    return out;
};

/**
 * Perform some operation over an array of vec2s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec2. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */
vec2.forEach = (function() {
    var vec = vec2.create();

    return function(a, stride, offset, count, fn, arg) {
        var i, l;
        if(!stride) {
            stride = 2;
        }

        if(!offset) {
            offset = 0;
        }

        if(count) {
            l = Math.min((count * stride) + offset, a.length);
        } else {
            l = a.length;
        }

        for(i = offset; i < l; i += stride) {
            vec[0] = a[i]; vec[1] = a[i+1];
            fn(vec, vec, arg);
            a[i] = vec[0]; a[i+1] = vec[1];
        }

        return a;
    };
})();

/**
 * Returns a string representation of a vector
 *
 * @param {vec2} vec vector to represent as a string
 * @returns {String} string representation of the vector
 */
vec2.str = function (a) {
    return 'vec2(' + a[0] + ', ' + a[1] + ')';
};

if(typeof(exports) !== 'undefined') {
    exports.vec2 = vec2;
}

/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 3 Dimensional Vector
 * @name vec3
 */

var vec3 = {};

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */
vec3.create = function() {
    var out = new GLMAT_ARRAY_TYPE(3);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    return out;
};

/**
 * Creates a new vec3 initialized with values from an existing vector
 *
 * @param {vec3} a vector to clone
 * @returns {vec3} a new 3D vector
 */
vec3.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(3);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    return out;
};

/**
 * Creates a new vec3 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} a new 3D vector
 */
vec3.fromValues = function(x, y, z) {
    var out = new GLMAT_ARRAY_TYPE(3);
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
};

/**
 * Copy the values from one vec3 to another
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the source vector
 * @returns {vec3} out
 */
vec3.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    return out;
};

/**
 * Set the components of a vec3 to the given values
 *
 * @param {vec3} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} out
 */
vec3.set = function(out, x, y, z) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
};

/**
 * Adds two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.add = function(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    return out;
};

/**
 * Subtracts vector b from vector a
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.subtract = function(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    return out;
};

/**
 * Alias for {@link vec3.subtract}
 * @function
 */
vec3.sub = vec3.subtract;

/**
 * Multiplies two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.multiply = function(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    return out;
};

/**
 * Alias for {@link vec3.multiply}
 * @function
 */
vec3.mul = vec3.multiply;

/**
 * Divides two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.divide = function(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    out[2] = a[2] / b[2];
    return out;
};

/**
 * Alias for {@link vec3.divide}
 * @function
 */
vec3.div = vec3.divide;

/**
 * Returns the minimum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.min = function(out, a, b) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    out[2] = Math.min(a[2], b[2]);
    return out;
};

/**
 * Returns the maximum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.max = function(out, a, b) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    out[2] = Math.max(a[2], b[2]);
    return out;
};

/**
 * Scales a vec3 by a scalar number
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec3} out
 */
vec3.scale = function(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    return out;
};

/**
 * Adds two vec3's after scaling the second operand by a scalar value
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec3} out
 */
vec3.scaleAndAdd = function(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale);
    out[1] = a[1] + (b[1] * scale);
    out[2] = a[2] + (b[2] * scale);
    return out;
};

/**
 * Calculates the euclidian distance between two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} distance between a and b
 */
vec3.distance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2];
    return Math.sqrt(x*x + y*y + z*z);
};

/**
 * Alias for {@link vec3.distance}
 * @function
 */
vec3.dist = vec3.distance;

/**
 * Calculates the squared euclidian distance between two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} squared distance between a and b
 */
vec3.squaredDistance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2];
    return x*x + y*y + z*z;
};

/**
 * Alias for {@link vec3.squaredDistance}
 * @function
 */
vec3.sqrDist = vec3.squaredDistance;

/**
 * Calculates the length of a vec3
 *
 * @param {vec3} a vector to calculate length of
 * @returns {Number} length of a
 */
vec3.length = function (a) {
    var x = a[0],
        y = a[1],
        z = a[2];
    return Math.sqrt(x*x + y*y + z*z);
};

/**
 * Alias for {@link vec3.length}
 * @function
 */
vec3.len = vec3.length;

/**
 * Calculates the squared length of a vec3
 *
 * @param {vec3} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */
vec3.squaredLength = function (a) {
    var x = a[0],
        y = a[1],
        z = a[2];
    return x*x + y*y + z*z;
};

/**
 * Alias for {@link vec3.squaredLength}
 * @function
 */
vec3.sqrLen = vec3.squaredLength;

/**
 * Negates the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to negate
 * @returns {vec3} out
 */
vec3.negate = function(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    return out;
};

/**
 * Returns the inverse of the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to invert
 * @returns {vec3} out
 */
vec3.inverse = function(out, a) {
  out[0] = 1.0 / a[0];
  out[1] = 1.0 / a[1];
  out[2] = 1.0 / a[2];
  return out;
};

/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to normalize
 * @returns {vec3} out
 */
vec3.normalize = function(out, a) {
    var x = a[0],
        y = a[1],
        z = a[2];
    var len = x*x + y*y + z*z;
    if (len > 0) {
        //TODO: evaluate use of glm_invsqrt here?
        len = 1 / Math.sqrt(len);
        out[0] = a[0] * len;
        out[1] = a[1] * len;
        out[2] = a[2] * len;
    }
    return out;
};

/**
 * Calculates the dot product of two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} dot product of a and b
 */
vec3.dot = function (a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
};

/**
 * Computes the cross product of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.cross = function(out, a, b) {
    var ax = a[0], ay = a[1], az = a[2],
        bx = b[0], by = b[1], bz = b[2];

    out[0] = ay * bz - az * by;
    out[1] = az * bx - ax * bz;
    out[2] = ax * by - ay * bx;
    return out;
};

/**
 * Performs a linear interpolation between two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {vec3} out
 */
vec3.lerp = function (out, a, b, t) {
    var ax = a[0],
        ay = a[1],
        az = a[2];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    return out;
};

/**
 * Generates a random vector with the given scale
 *
 * @param {vec3} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec3} out
 */
vec3.random = function (out, scale) {
    scale = scale || 1.0;

    var r = GLMAT_RANDOM() * 2.0 * Math.PI;
    var z = (GLMAT_RANDOM() * 2.0) - 1.0;
    var zScale = Math.sqrt(1.0-z*z) * scale;

    out[0] = Math.cos(r) * zScale;
    out[1] = Math.sin(r) * zScale;
    out[2] = z * scale;
    return out;
};

/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns {vec3} out
 */
vec3.transformMat4 = function(out, a, m) {
    var x = a[0], y = a[1], z = a[2],
        w = m[3] * x + m[7] * y + m[11] * z + m[15];
    w = w || 1.0;
    out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
    out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
    out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
    return out;
};

/**
 * Transforms the vec3 with a mat3.
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {mat4} m the 3x3 matrix to transform with
 * @returns {vec3} out
 */
vec3.transformMat3 = function(out, a, m) {
    var x = a[0], y = a[1], z = a[2];
    out[0] = x * m[0] + y * m[3] + z * m[6];
    out[1] = x * m[1] + y * m[4] + z * m[7];
    out[2] = x * m[2] + y * m[5] + z * m[8];
    return out;
};

/**
 * Transforms the vec3 with a quat
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {quat} q quaternion to transform with
 * @returns {vec3} out
 */
vec3.transformQuat = function(out, a, q) {
    // benchmarks: http://jsperf.com/quaternion-transform-vec3-implementations

    var x = a[0], y = a[1], z = a[2],
        qx = q[0], qy = q[1], qz = q[2], qw = q[3],

        // calculate quat * vec
        ix = qw * x + qy * z - qz * y,
        iy = qw * y + qz * x - qx * z,
        iz = qw * z + qx * y - qy * x,
        iw = -qx * x - qy * y - qz * z;

    // calculate result * inverse quat
    out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    return out;
};

/**
 * Rotate a 3D vector around the x-axis
 * @param {vec3} out The receiving vec3
 * @param {vec3} a The vec3 point to rotate
 * @param {vec3} b The origin of the rotation
 * @param {Number} c The angle of rotation
 * @returns {vec3} out
 */
vec3.rotateX = function(out, a, b, c){
   var p = [], r=[];
      //Translate point to the origin
      p[0] = a[0] - b[0];
      p[1] = a[1] - b[1];
    p[2] = a[2] - b[2];

      //perform rotation
      r[0] = p[0];
      r[1] = p[1]*Math.cos(c) - p[2]*Math.sin(c);
      r[2] = p[1]*Math.sin(c) + p[2]*Math.cos(c);

      //translate to correct position
      out[0] = r[0] + b[0];
      out[1] = r[1] + b[1];
      out[2] = r[2] + b[2];

    return out;
};

/**
 * Rotate a 3D vector around the y-axis
 * @param {vec3} out The receiving vec3
 * @param {vec3} a The vec3 point to rotate
 * @param {vec3} b The origin of the rotation
 * @param {Number} c The angle of rotation
 * @returns {vec3} out
 */
vec3.rotateY = function(out, a, b, c){
    var p = [], r=[];
    //Translate point to the origin
    p[0] = a[0] - b[0];
    p[1] = a[1] - b[1];
    p[2] = a[2] - b[2];

    //perform rotation
    r[0] = p[2]*Math.sin(c) + p[0]*Math.cos(c);
    r[1] = p[1];
    r[2] = p[2]*Math.cos(c) - p[0]*Math.sin(c);

    //translate to correct position
    out[0] = r[0] + b[0];
    out[1] = r[1] + b[1];
    out[2] = r[2] + b[2];

    return out;
};

/**
 * Rotate a 3D vector around the z-axis
 * @param {vec3} out The receiving vec3
 * @param {vec3} a The vec3 point to rotate
 * @param {vec3} b The origin of the rotation
 * @param {Number} c The angle of rotation
 * @returns {vec3} out
 */
vec3.rotateZ = function(out, a, b, c){
    var p = [], r=[];
    //Translate point to the origin
    p[0] = a[0] - b[0];
    p[1] = a[1] - b[1];
    p[2] = a[2] - b[2];

    //perform rotation
    r[0] = p[0]*Math.cos(c) - p[1]*Math.sin(c);
    r[1] = p[0]*Math.sin(c) + p[1]*Math.cos(c);
    r[2] = p[2];

    //translate to correct position
    out[0] = r[0] + b[0];
    out[1] = r[1] + b[1];
    out[2] = r[2] + b[2];

    return out;
};

/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */
vec3.forEach = (function() {
    var vec = vec3.create();

    return function(a, stride, offset, count, fn, arg) {
        var i, l;
        if(!stride) {
            stride = 3;
        }

        if(!offset) {
            offset = 0;
        }

        if(count) {
            l = Math.min((count * stride) + offset, a.length);
        } else {
            l = a.length;
        }

        for(i = offset; i < l; i += stride) {
            vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2];
            fn(vec, vec, arg);
            a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2];
        }

        return a;
    };
})();

/**
 * Get the angle between two 3D vectors
 * @param {vec3} a The first operand
 * @param {vec3} b The second operand
 * @returns {Number} The angle in radians
 */
vec3.angle = function(a, b) {

    var tempA = vec3.fromValues(a[0], a[1], a[2]);
    var tempB = vec3.fromValues(b[0], b[1], b[2]);

    vec3.normalize(tempA, tempA);
    vec3.normalize(tempB, tempB);

    var cosine = vec3.dot(tempA, tempB);

    if(cosine > 1.0){
        return 0;
    } else {
        return Math.acos(cosine);
    }
};

/**
 * Returns a string representation of a vector
 *
 * @param {vec3} vec vector to represent as a string
 * @returns {String} string representation of the vector
 */
vec3.str = function (a) {
    return 'vec3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ')';
};

if(typeof(exports) !== 'undefined') {
    exports.vec3 = vec3;
}

/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 4 Dimensional Vector
 * @name vec4
 */

var vec4 = {};

/**
 * Creates a new, empty vec4
 *
 * @returns {vec4} a new 4D vector
 */
vec4.create = function() {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    return out;
};

/**
 * Creates a new vec4 initialized with values from an existing vector
 *
 * @param {vec4} a vector to clone
 * @returns {vec4} a new 4D vector
 */
vec4.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
};

/**
 * Creates a new vec4 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {vec4} a new 4D vector
 */
vec4.fromValues = function(x, y, z, w) {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
    return out;
};

/**
 * Copy the values from one vec4 to another
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the source vector
 * @returns {vec4} out
 */
vec4.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
};

/**
 * Set the components of a vec4 to the given values
 *
 * @param {vec4} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {vec4} out
 */
vec4.set = function(out, x, y, z, w) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
    return out;
};

/**
 * Adds two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.add = function(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    return out;
};

/**
 * Subtracts vector b from vector a
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.subtract = function(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    return out;
};

/**
 * Alias for {@link vec4.subtract}
 * @function
 */
vec4.sub = vec4.subtract;

/**
 * Multiplies two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.multiply = function(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    out[3] = a[3] * b[3];
    return out;
};

/**
 * Alias for {@link vec4.multiply}
 * @function
 */
vec4.mul = vec4.multiply;

/**
 * Divides two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.divide = function(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    out[2] = a[2] / b[2];
    out[3] = a[3] / b[3];
    return out;
};

/**
 * Alias for {@link vec4.divide}
 * @function
 */
vec4.div = vec4.divide;

/**
 * Returns the minimum of two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.min = function(out, a, b) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    out[2] = Math.min(a[2], b[2]);
    out[3] = Math.min(a[3], b[3]);
    return out;
};

/**
 * Returns the maximum of two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.max = function(out, a, b) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    out[2] = Math.max(a[2], b[2]);
    out[3] = Math.max(a[3], b[3]);
    return out;
};

/**
 * Scales a vec4 by a scalar number
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec4} out
 */
vec4.scale = function(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    return out;
};

/**
 * Adds two vec4's after scaling the second operand by a scalar value
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec4} out
 */
vec4.scaleAndAdd = function(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale);
    out[1] = a[1] + (b[1] * scale);
    out[2] = a[2] + (b[2] * scale);
    out[3] = a[3] + (b[3] * scale);
    return out;
};

/**
 * Calculates the euclidian distance between two vec4's
 *
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {Number} distance between a and b
 */
vec4.distance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2],
        w = b[3] - a[3];
    return Math.sqrt(x*x + y*y + z*z + w*w);
};

/**
 * Alias for {@link vec4.distance}
 * @function
 */
vec4.dist = vec4.distance;

/**
 * Calculates the squared euclidian distance between two vec4's
 *
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {Number} squared distance between a and b
 */
vec4.squaredDistance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2],
        w = b[3] - a[3];
    return x*x + y*y + z*z + w*w;
};

/**
 * Alias for {@link vec4.squaredDistance}
 * @function
 */
vec4.sqrDist = vec4.squaredDistance;

/**
 * Calculates the length of a vec4
 *
 * @param {vec4} a vector to calculate length of
 * @returns {Number} length of a
 */
vec4.length = function (a) {
    var x = a[0],
        y = a[1],
        z = a[2],
        w = a[3];
    return Math.sqrt(x*x + y*y + z*z + w*w);
};

/**
 * Alias for {@link vec4.length}
 * @function
 */
vec4.len = vec4.length;

/**
 * Calculates the squared length of a vec4
 *
 * @param {vec4} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */
vec4.squaredLength = function (a) {
    var x = a[0],
        y = a[1],
        z = a[2],
        w = a[3];
    return x*x + y*y + z*z + w*w;
};

/**
 * Alias for {@link vec4.squaredLength}
 * @function
 */
vec4.sqrLen = vec4.squaredLength;

/**
 * Negates the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a vector to negate
 * @returns {vec4} out
 */
vec4.negate = function(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = -a[3];
    return out;
};

/**
 * Returns the inverse of the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a vector to invert
 * @returns {vec4} out
 */
vec4.inverse = function(out, a) {
  out[0] = 1.0 / a[0];
  out[1] = 1.0 / a[1];
  out[2] = 1.0 / a[2];
  out[3] = 1.0 / a[3];
  return out;
};

/**
 * Normalize a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a vector to normalize
 * @returns {vec4} out
 */
vec4.normalize = function(out, a) {
    var x = a[0],
        y = a[1],
        z = a[2],
        w = a[3];
    var len = x*x + y*y + z*z + w*w;
    if (len > 0) {
        len = 1 / Math.sqrt(len);
        out[0] = a[0] * len;
        out[1] = a[1] * len;
        out[2] = a[2] * len;
        out[3] = a[3] * len;
    }
    return out;
};

/**
 * Calculates the dot product of two vec4's
 *
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {Number} dot product of a and b
 */
vec4.dot = function (a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
};

/**
 * Performs a linear interpolation between two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {vec4} out
 */
vec4.lerp = function (out, a, b, t) {
    var ax = a[0],
        ay = a[1],
        az = a[2],
        aw = a[3];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    out[3] = aw + t * (b[3] - aw);
    return out;
};

/**
 * Generates a random vector with the given scale
 *
 * @param {vec4} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec4} out
 */
vec4.random = function (out, scale) {
    scale = scale || 1.0;

    //TODO: This is a pretty awful way of doing this. Find something better.
    out[0] = GLMAT_RANDOM();
    out[1] = GLMAT_RANDOM();
    out[2] = GLMAT_RANDOM();
    out[3] = GLMAT_RANDOM();
    vec4.normalize(out, out);
    vec4.scale(out, out, scale);
    return out;
};

/**
 * Transforms the vec4 with a mat4.
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns {vec4} out
 */
vec4.transformMat4 = function(out, a, m) {
    var x = a[0], y = a[1], z = a[2], w = a[3];
    out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
    out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
    out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
    out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
    return out;
};

/**
 * Transforms the vec4 with a quat
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the vector to transform
 * @param {quat} q quaternion to transform with
 * @returns {vec4} out
 */
vec4.transformQuat = function(out, a, q) {
    var x = a[0], y = a[1], z = a[2],
        qx = q[0], qy = q[1], qz = q[2], qw = q[3],

        // calculate quat * vec
        ix = qw * x + qy * z - qz * y,
        iy = qw * y + qz * x - qx * z,
        iz = qw * z + qx * y - qy * x,
        iw = -qx * x - qy * y - qz * z;

    // calculate result * inverse quat
    out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    return out;
};

/**
 * Perform some operation over an array of vec4s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec4s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */
vec4.forEach = (function() {
    var vec = vec4.create();

    return function(a, stride, offset, count, fn, arg) {
        var i, l;
        if(!stride) {
            stride = 4;
        }

        if(!offset) {
            offset = 0;
        }

        if(count) {
            l = Math.min((count * stride) + offset, a.length);
        } else {
            l = a.length;
        }

        for(i = offset; i < l; i += stride) {
            vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2]; vec[3] = a[i+3];
            fn(vec, vec, arg);
            a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2]; a[i+3] = vec[3];
        }

        return a;
    };
})();

/**
 * Returns a string representation of a vector
 *
 * @param {vec4} vec vector to represent as a string
 * @returns {String} string representation of the vector
 */
vec4.str = function (a) {
    return 'vec4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
};

if(typeof(exports) !== 'undefined') {
    exports.vec4 = vec4;
}

/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 2x2 Matrix
 * @name mat2
 */

var mat2 = {};

/**
 * Creates a new identity mat2
 *
 * @returns {mat2} a new 2x2 matrix
 */
mat2.create = function() {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Creates a new mat2 initialized with values from an existing matrix
 *
 * @param {mat2} a matrix to clone
 * @returns {mat2} a new 2x2 matrix
 */
mat2.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
};

/**
 * Copy the values from one mat2 to another
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */
mat2.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
};

/**
 * Set a mat2 to the identity matrix
 *
 * @param {mat2} out the receiving matrix
 * @returns {mat2} out
 */
mat2.identity = function(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Transpose the values of a mat2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */
mat2.transpose = function(out, a) {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        var a1 = a[1];
        out[1] = a[2];
        out[2] = a1;
    } else {
        out[0] = a[0];
        out[1] = a[2];
        out[2] = a[1];
        out[3] = a[3];
    }

    return out;
};

/**
 * Inverts a mat2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */
mat2.invert = function(out, a) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],

        // Calculate the determinant
        det = a0 * a3 - a2 * a1;

    if (!det) {
        return null;
    }
    det = 1.0 / det;

    out[0] =  a3 * det;
    out[1] = -a1 * det;
    out[2] = -a2 * det;
    out[3] =  a0 * det;

    return out;
};

/**
 * Calculates the adjugate of a mat2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */
mat2.adjoint = function(out, a) {
    // Caching this value is nessecary if out == a
    var a0 = a[0];
    out[0] =  a[3];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] =  a0;

    return out;
};

/**
 * Calculates the determinant of a mat2
 *
 * @param {mat2} a the source matrix
 * @returns {Number} determinant of a
 */
mat2.determinant = function (a) {
    return a[0] * a[3] - a[2] * a[1];
};

/**
 * Multiplies two mat2's
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the first operand
 * @param {mat2} b the second operand
 * @returns {mat2} out
 */
mat2.multiply = function (out, a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = a0 * b0 + a2 * b1;
    out[1] = a1 * b0 + a3 * b1;
    out[2] = a0 * b2 + a2 * b3;
    out[3] = a1 * b2 + a3 * b3;
    return out;
};

/**
 * Alias for {@link mat2.multiply}
 * @function
 */
mat2.mul = mat2.multiply;

/**
 * Rotates a mat2 by the given angle
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat2} out
 */
mat2.rotate = function (out, a, rad) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
        s = Math.sin(rad),
        c = Math.cos(rad);
    out[0] = a0 *  c + a2 * s;
    out[1] = a1 *  c + a3 * s;
    out[2] = a0 * -s + a2 * c;
    out[3] = a1 * -s + a3 * c;
    return out;
};

/**
 * Scales the mat2 by the dimensions in the given vec2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the matrix to rotate
 * @param {vec2} v the vec2 to scale the matrix by
 * @returns {mat2} out
 **/
mat2.scale = function(out, a, v) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
        v0 = v[0], v1 = v[1];
    out[0] = a0 * v0;
    out[1] = a1 * v0;
    out[2] = a2 * v1;
    out[3] = a3 * v1;
    return out;
};

/**
 * Returns a string representation of a mat2
 *
 * @param {mat2} mat matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
mat2.str = function (a) {
    return 'mat2(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
};

/**
 * Returns Frobenius norm of a mat2
 *
 * @param {mat2} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */
mat2.frob = function (a) {
    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2)))
};

/**
 * Returns L, D and U matrices (Lower triangular, Diagonal and Upper triangular) by factorizing the input matrix
 * @param {mat2} L the lower triangular matrix
 * @param {mat2} D the diagonal matrix
 * @param {mat2} U the upper triangular matrix
 * @param {mat2} a the input matrix to factorize
 */

mat2.LDU = function (L, D, U, a) {
    L[2] = a[2]/a[0];
    U[0] = a[0];
    U[1] = a[1];
    U[3] = a[3] - L[2] * U[1];
    return [L, D, U];
};

if(typeof(exports) !== 'undefined') {
    exports.mat2 = mat2;
}

/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 2x3 Matrix
 * @name mat2d
 *
 * @description
 * A mat2d contains six elements defined as:
 * <pre>
 * [a, c, tx,
 *  b, d, ty]
 * </pre>
 * This is a short form for the 3x3 matrix:
 * <pre>
 * [a, c, tx,
 *  b, d, ty,
 *  0, 0, 1]
 * </pre>
 * The last row is ignored so the array is shorter and operations are faster.
 */

var mat2d = {};

/**
 * Creates a new identity mat2d
 *
 * @returns {mat2d} a new 2x3 matrix
 */
mat2d.create = function() {
    var out = new GLMAT_ARRAY_TYPE(6);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    out[4] = 0;
    out[5] = 0;
    return out;
};

/**
 * Creates a new mat2d initialized with values from an existing matrix
 *
 * @param {mat2d} a matrix to clone
 * @returns {mat2d} a new 2x3 matrix
 */
mat2d.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(6);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    return out;
};

/**
 * Copy the values from one mat2d to another
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the source matrix
 * @returns {mat2d} out
 */
mat2d.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    return out;
};

/**
 * Set a mat2d to the identity matrix
 *
 * @param {mat2d} out the receiving matrix
 * @returns {mat2d} out
 */
mat2d.identity = function(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    out[4] = 0;
    out[5] = 0;
    return out;
};

/**
 * Inverts a mat2d
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the source matrix
 * @returns {mat2d} out
 */
mat2d.invert = function(out, a) {
    var aa = a[0], ab = a[1], ac = a[2], ad = a[3],
        atx = a[4], aty = a[5];

    var det = aa * ad - ab * ac;
    if(!det){
        return null;
    }
    det = 1.0 / det;

    out[0] = ad * det;
    out[1] = -ab * det;
    out[2] = -ac * det;
    out[3] = aa * det;
    out[4] = (ac * aty - ad * atx) * det;
    out[5] = (ab * atx - aa * aty) * det;
    return out;
};

/**
 * Calculates the determinant of a mat2d
 *
 * @param {mat2d} a the source matrix
 * @returns {Number} determinant of a
 */
mat2d.determinant = function (a) {
    return a[0] * a[3] - a[1] * a[2];
};

/**
 * Multiplies two mat2d's
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the first operand
 * @param {mat2d} b the second operand
 * @returns {mat2d} out
 */
mat2d.multiply = function (out, a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
        b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5];
    out[0] = a0 * b0 + a2 * b1;
    out[1] = a1 * b0 + a3 * b1;
    out[2] = a0 * b2 + a2 * b3;
    out[3] = a1 * b2 + a3 * b3;
    out[4] = a0 * b4 + a2 * b5 + a4;
    out[5] = a1 * b4 + a3 * b5 + a5;
    return out;
};

/**
 * Alias for {@link mat2d.multiply}
 * @function
 */
mat2d.mul = mat2d.multiply;


/**
 * Rotates a mat2d by the given angle
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat2d} out
 */
mat2d.rotate = function (out, a, rad) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
        s = Math.sin(rad),
        c = Math.cos(rad);
    out[0] = a0 *  c + a2 * s;
    out[1] = a1 *  c + a3 * s;
    out[2] = a0 * -s + a2 * c;
    out[3] = a1 * -s + a3 * c;
    out[4] = a4;
    out[5] = a5;
    return out;
};

/**
 * Scales the mat2d by the dimensions in the given vec2
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the matrix to translate
 * @param {vec2} v the vec2 to scale the matrix by
 * @returns {mat2d} out
 **/
mat2d.scale = function(out, a, v) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
        v0 = v[0], v1 = v[1];
    out[0] = a0 * v0;
    out[1] = a1 * v0;
    out[2] = a2 * v1;
    out[3] = a3 * v1;
    out[4] = a4;
    out[5] = a5;
    return out;
};

/**
 * Translates the mat2d by the dimensions in the given vec2
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the matrix to translate
 * @param {vec2} v the vec2 to translate the matrix by
 * @returns {mat2d} out
 **/
mat2d.translate = function(out, a, v) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
        v0 = v[0], v1 = v[1];
    out[0] = a0;
    out[1] = a1;
    out[2] = a2;
    out[3] = a3;
    out[4] = a0 * v0 + a2 * v1 + a4;
    out[5] = a1 * v0 + a3 * v1 + a5;
    return out;
};

/**
 * Returns a string representation of a mat2d
 *
 * @param {mat2d} a matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
mat2d.str = function (a) {
    return 'mat2d(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' +
                    a[3] + ', ' + a[4] + ', ' + a[5] + ')';
};

/**
 * Returns Frobenius norm of a mat2d
 *
 * @param {mat2d} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */
mat2d.frob = function (a) {
    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + 1))
};

if(typeof(exports) !== 'undefined') {
    exports.mat2d = mat2d;
}

/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 3x3 Matrix
 * @name mat3
 */

var mat3 = {};

/**
 * Creates a new identity mat3
 *
 * @returns {mat3} a new 3x3 matrix
 */
mat3.create = function() {
    var out = new GLMAT_ARRAY_TYPE(9);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
};

/**
 * Copies the upper-left 3x3 values into the given mat3.
 *
 * @param {mat3} out the receiving 3x3 matrix
 * @param {mat4} a   the source 4x4 matrix
 * @returns {mat3} out
 */
mat3.fromMat4 = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[4];
    out[4] = a[5];
    out[5] = a[6];
    out[6] = a[8];
    out[7] = a[9];
    out[8] = a[10];
    return out;
};

/**
 * Creates a new mat3 initialized with values from an existing matrix
 *
 * @param {mat3} a matrix to clone
 * @returns {mat3} a new 3x3 matrix
 */
mat3.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(9);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
};

/**
 * Copy the values from one mat3 to another
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */
mat3.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
};

/**
 * Set a mat3 to the identity matrix
 *
 * @param {mat3} out the receiving matrix
 * @returns {mat3} out
 */
mat3.identity = function(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
};

/**
 * Transpose the values of a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */
mat3.transpose = function(out, a) {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        var a01 = a[1], a02 = a[2], a12 = a[5];
        out[1] = a[3];
        out[2] = a[6];
        out[3] = a01;
        out[5] = a[7];
        out[6] = a02;
        out[7] = a12;
    } else {
        out[0] = a[0];
        out[1] = a[3];
        out[2] = a[6];
        out[3] = a[1];
        out[4] = a[4];
        out[5] = a[7];
        out[6] = a[2];
        out[7] = a[5];
        out[8] = a[8];
    }

    return out;
};

/**
 * Inverts a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */
mat3.invert = function(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        b01 = a22 * a11 - a12 * a21,
        b11 = -a22 * a10 + a12 * a20,
        b21 = a21 * a10 - a11 * a20,

        // Calculate the determinant
        det = a00 * b01 + a01 * b11 + a02 * b21;

    if (!det) {
        return null;
    }
    det = 1.0 / det;

    out[0] = b01 * det;
    out[1] = (-a22 * a01 + a02 * a21) * det;
    out[2] = (a12 * a01 - a02 * a11) * det;
    out[3] = b11 * det;
    out[4] = (a22 * a00 - a02 * a20) * det;
    out[5] = (-a12 * a00 + a02 * a10) * det;
    out[6] = b21 * det;
    out[7] = (-a21 * a00 + a01 * a20) * det;
    out[8] = (a11 * a00 - a01 * a10) * det;
    return out;
};

/**
 * Calculates the adjugate of a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */
mat3.adjoint = function(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8];

    out[0] = (a11 * a22 - a12 * a21);
    out[1] = (a02 * a21 - a01 * a22);
    out[2] = (a01 * a12 - a02 * a11);
    out[3] = (a12 * a20 - a10 * a22);
    out[4] = (a00 * a22 - a02 * a20);
    out[5] = (a02 * a10 - a00 * a12);
    out[6] = (a10 * a21 - a11 * a20);
    out[7] = (a01 * a20 - a00 * a21);
    out[8] = (a00 * a11 - a01 * a10);
    return out;
};

/**
 * Calculates the determinant of a mat3
 *
 * @param {mat3} a the source matrix
 * @returns {Number} determinant of a
 */
mat3.determinant = function (a) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8];

    return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
};

/**
 * Multiplies two mat3's
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the first operand
 * @param {mat3} b the second operand
 * @returns {mat3} out
 */
mat3.multiply = function (out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        b00 = b[0], b01 = b[1], b02 = b[2],
        b10 = b[3], b11 = b[4], b12 = b[5],
        b20 = b[6], b21 = b[7], b22 = b[8];

    out[0] = b00 * a00 + b01 * a10 + b02 * a20;
    out[1] = b00 * a01 + b01 * a11 + b02 * a21;
    out[2] = b00 * a02 + b01 * a12 + b02 * a22;

    out[3] = b10 * a00 + b11 * a10 + b12 * a20;
    out[4] = b10 * a01 + b11 * a11 + b12 * a21;
    out[5] = b10 * a02 + b11 * a12 + b12 * a22;

    out[6] = b20 * a00 + b21 * a10 + b22 * a20;
    out[7] = b20 * a01 + b21 * a11 + b22 * a21;
    out[8] = b20 * a02 + b21 * a12 + b22 * a22;
    return out;
};

/**
 * Alias for {@link mat3.multiply}
 * @function
 */
mat3.mul = mat3.multiply;

/**
 * Translate a mat3 by the given vector
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the matrix to translate
 * @param {vec2} v vector to translate by
 * @returns {mat3} out
 */
mat3.translate = function(out, a, v) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],
        x = v[0], y = v[1];

    out[0] = a00;
    out[1] = a01;
    out[2] = a02;

    out[3] = a10;
    out[4] = a11;
    out[5] = a12;

    out[6] = x * a00 + y * a10 + a20;
    out[7] = x * a01 + y * a11 + a21;
    out[8] = x * a02 + y * a12 + a22;
    return out;
};

/**
 * Rotates a mat3 by the given angle
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat3} out
 */
mat3.rotate = function (out, a, rad) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        s = Math.sin(rad),
        c = Math.cos(rad);

    out[0] = c * a00 + s * a10;
    out[1] = c * a01 + s * a11;
    out[2] = c * a02 + s * a12;

    out[3] = c * a10 - s * a00;
    out[4] = c * a11 - s * a01;
    out[5] = c * a12 - s * a02;

    out[6] = a20;
    out[7] = a21;
    out[8] = a22;
    return out;
};

/**
 * Scales the mat3 by the dimensions in the given vec2
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the matrix to rotate
 * @param {vec2} v the vec2 to scale the matrix by
 * @returns {mat3} out
 **/
mat3.scale = function(out, a, v) {
    var x = v[0], y = v[1];

    out[0] = x * a[0];
    out[1] = x * a[1];
    out[2] = x * a[2];

    out[3] = y * a[3];
    out[4] = y * a[4];
    out[5] = y * a[5];

    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
};

/**
 * Copies the values from a mat2d into a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat2d} a the matrix to copy
 * @returns {mat3} out
 **/
mat3.fromMat2d = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = 0;

    out[3] = a[2];
    out[4] = a[3];
    out[5] = 0;

    out[6] = a[4];
    out[7] = a[5];
    out[8] = 1;
    return out;
};

/**
* Calculates a 3x3 matrix from the given quaternion
*
* @param {mat3} out mat3 receiving operation result
* @param {quat} q Quaternion to create matrix from
*
* @returns {mat3} out
*/
mat3.fromQuat = function (out, q) {
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        yx = y * x2,
        yy = y * y2,
        zx = z * x2,
        zy = z * y2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - yy - zz;
    out[3] = yx - wz;
    out[6] = zx + wy;

    out[1] = yx + wz;
    out[4] = 1 - xx - zz;
    out[7] = zy - wx;

    out[2] = zx - wy;
    out[5] = zy + wx;
    out[8] = 1 - xx - yy;

    return out;
};

/**
* Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix
*
* @param {mat3} out mat3 receiving operation result
* @param {mat4} a Mat4 to derive the normal matrix from
*
* @returns {mat3} out
*/
mat3.normalFromMat4 = function (out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) {
        return null;
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;

    out[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det;

    out[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det;

    return out;
};

/**
 * Returns a string representation of a mat3
 *
 * @param {mat3} mat matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
mat3.str = function (a) {
    return 'mat3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' +
                    a[3] + ', ' + a[4] + ', ' + a[5] + ', ' +
                    a[6] + ', ' + a[7] + ', ' + a[8] + ')';
};

/**
 * Returns Frobenius norm of a mat3
 *
 * @param {mat3} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */
mat3.frob = function (a) {
    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + Math.pow(a[6], 2) + Math.pow(a[7], 2) + Math.pow(a[8], 2)))
};


if(typeof(exports) !== 'undefined') {
    exports.mat3 = mat3;
}

/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 4x4 Matrix
 * @name mat4
 */

var mat4 = {};

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */
mat4.create = function() {
    var out = new GLMAT_ARRAY_TYPE(16);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};

/**
 * Creates a new mat4 initialized with values from an existing matrix
 *
 * @param {mat4} a matrix to clone
 * @returns {mat4} a new 4x4 matrix
 */
mat4.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(16);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

/**
 * Copy the values from one mat4 to another
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */
mat4.identity = function(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};

/**
 * Transpose the values of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.transpose = function(out, a) {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        var a01 = a[1], a02 = a[2], a03 = a[3],
            a12 = a[6], a13 = a[7],
            a23 = a[11];

        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a01;
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a02;
        out[9] = a12;
        out[11] = a[14];
        out[12] = a03;
        out[13] = a13;
        out[14] = a23;
    } else {
        out[0] = a[0];
        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a[1];
        out[5] = a[5];
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a[2];
        out[9] = a[6];
        out[10] = a[10];
        out[11] = a[14];
        out[12] = a[3];
        out[13] = a[7];
        out[14] = a[11];
        out[15] = a[15];
    }

    return out;
};

/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.invert = function(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) {
        return null;
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
};

/**
 * Calculates the adjugate of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.adjoint = function(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    out[0]  =  (a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22));
    out[1]  = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
    out[2]  =  (a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12));
    out[3]  = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
    out[4]  = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
    out[5]  =  (a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22));
    out[6]  = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
    out[7]  =  (a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12));
    out[8]  =  (a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21));
    out[9]  = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
    out[10] =  (a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11));
    out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
    out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
    out[13] =  (a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21));
    out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
    out[15] =  (a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11));
    return out;
};

/**
 * Calculates the determinant of a mat4
 *
 * @param {mat4} a the source matrix
 * @returns {Number} determinant of a
 */
mat4.determinant = function (a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32;

    // Calculate the determinant
    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
};

/**
 * Multiplies two mat4's
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the first operand
 * @param {mat4} b the second operand
 * @returns {mat4} out
 */
mat4.multiply = function (out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    // Cache only the current line of the second matrix
    var b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
    return out;
};

/**
 * Multiplies two affine mat4's
 * Add by https://github.com/pissang
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the first operand
 * @param {mat4} b the second operand
 * @returns {mat4} out
 */
mat4.multiplyAffine = function (out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[4], a11 = a[5], a12 = a[6],
        a20 = a[8], a21 = a[9], a22 = a[10],
        a30 = a[12], a31 = a[13], a32 = a[14];

    // Cache only the current line of the second matrix
    var b0  = b[0], b1 = b[1], b2 = b[2];
    out[0] = b0*a00 + b1*a10 + b2*a20;
    out[1] = b0*a01 + b1*a11 + b2*a21;
    out[2] = b0*a02 + b1*a12 + b2*a22;
    // out[3] = 0;

    b0 = b[4]; b1 = b[5]; b2 = b[6];
    out[4] = b0*a00 + b1*a10 + b2*a20;
    out[5] = b0*a01 + b1*a11 + b2*a21;
    out[6] = b0*a02 + b1*a12 + b2*a22;
    // out[7] = 0;

    b0 = b[8]; b1 = b[9]; b2 = b[10];
    out[8] = b0*a00 + b1*a10 + b2*a20;
    out[9] = b0*a01 + b1*a11 + b2*a21;
    out[10] = b0*a02 + b1*a12 + b2*a22;
    // out[11] = 0;

    b0 = b[12]; b1 = b[13]; b2 = b[14];
    out[12] = b0*a00 + b1*a10 + b2*a20 + a30;
    out[13] = b0*a01 + b1*a11 + b2*a21 + a31;
    out[14] = b0*a02 + b1*a12 + b2*a22 + a32;
    // out[15] = 1;
    return out;
};

/**
 * Alias for {@link mat4.multiply}
 * @function
 */
mat4.mul = mat4.multiply;

/**
 * Alias for {@link mat4.multiplyAffine}
 * @function
 */
mat4.mulAffine = mat4.multiplyAffine;
/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to translate
 * @param {vec3} v vector to translate by
 * @returns {mat4} out
 */
mat4.translate = function (out, a, v) {
    var x = v[0], y = v[1], z = v[2],
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23;

    if (a === out) {
        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    } else {
        a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
        a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
        a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

        out[0] = a00; out[1] = a01; out[2] = a02; out[3] = a03;
        out[4] = a10; out[5] = a11; out[6] = a12; out[7] = a13;
        out[8] = a20; out[9] = a21; out[10] = a22; out[11] = a23;

        out[12] = a00 * x + a10 * y + a20 * z + a[12];
        out[13] = a01 * x + a11 * y + a21 * z + a[13];
        out[14] = a02 * x + a12 * y + a22 * z + a[14];
        out[15] = a03 * x + a13 * y + a23 * z + a[15];
    }

    return out;
};

/**
 * Scales the mat4 by the dimensions in the given vec3
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to scale
 * @param {vec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/
mat4.scale = function(out, a, v) {
    var x = v[0], y = v[1], z = v[2];

    out[0] = a[0] * x;
    out[1] = a[1] * x;
    out[2] = a[2] * x;
    out[3] = a[3] * x;
    out[4] = a[4] * y;
    out[5] = a[5] * y;
    out[6] = a[6] * y;
    out[7] = a[7] * y;
    out[8] = a[8] * z;
    out[9] = a[9] * z;
    out[10] = a[10] * z;
    out[11] = a[11] * z;
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

/**
 * Rotates a mat4 by the given angle
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @param {vec3} axis the axis to rotate around
 * @returns {mat4} out
 */
mat4.rotate = function (out, a, rad, axis) {
    var x = axis[0], y = axis[1], z = axis[2],
        len = Math.sqrt(x * x + y * y + z * z),
        s, c, t,
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23,
        b00, b01, b02,
        b10, b11, b12,
        b20, b21, b22;

    if (Math.abs(len) < GLMAT_EPSILON) { return null; }

    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;

    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;

    a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
    a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
    a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

    // Construct the elements of the rotation matrix
    b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
    b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
    b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;

    // Perform rotation-specific matrix multiplication
    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22;

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }
    return out;
};

/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
mat4.rotateX = function (out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[0]  = a[0];
        out[1]  = a[1];
        out[2]  = a[2];
        out[3]  = a[3];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[4] = a10 * c + a20 * s;
    out[5] = a11 * c + a21 * s;
    out[6] = a12 * c + a22 * s;
    out[7] = a13 * c + a23 * s;
    out[8] = a20 * c - a10 * s;
    out[9] = a21 * c - a11 * s;
    out[10] = a22 * c - a12 * s;
    out[11] = a23 * c - a13 * s;
    return out;
};

/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
mat4.rotateY = function (out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[4]  = a[4];
        out[5]  = a[5];
        out[6]  = a[6];
        out[7]  = a[7];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c - a20 * s;
    out[1] = a01 * c - a21 * s;
    out[2] = a02 * c - a22 * s;
    out[3] = a03 * c - a23 * s;
    out[8] = a00 * s + a20 * c;
    out[9] = a01 * s + a21 * c;
    out[10] = a02 * s + a22 * c;
    out[11] = a03 * s + a23 * c;
    return out;
};

/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
mat4.rotateZ = function (out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7];

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[8]  = a[8];
        out[9]  = a[9];
        out[10] = a[10];
        out[11] = a[11];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c + a10 * s;
    out[1] = a01 * c + a11 * s;
    out[2] = a02 * c + a12 * s;
    out[3] = a03 * c + a13 * s;
    out[4] = a10 * c - a00 * s;
    out[5] = a11 * c - a01 * s;
    out[6] = a12 * c - a02 * s;
    out[7] = a13 * c - a03 * s;
    return out;
};

/**
 * Creates a matrix from a quaternion rotation and vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     var quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {vec3} v Translation vector
 * @returns {mat4} out
 */
mat4.fromRotationTranslation = function (out, q, v) {
    // Quaternion math
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        xy = x * y2,
        xz = x * z2,
        yy = y * y2,
        yz = y * z2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;
    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;
    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;

    return out;
};

mat4.fromQuat = function (out, q) {
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        yx = y * x2,
        yy = y * y2,
        zx = z * x2,
        zy = z * y2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - yy - zz;
    out[1] = yx + wz;
    out[2] = zx - wy;
    out[3] = 0;

    out[4] = yx - wz;
    out[5] = 1 - xx - zz;
    out[6] = zy + wx;
    out[7] = 0;

    out[8] = zx + wy;
    out[9] = zy - wx;
    out[10] = 1 - xx - yy;
    out[11] = 0;

    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;

    return out;
};

/**
 * Generates a frustum matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {Number} left Left bound of the frustum
 * @param {Number} right Right bound of the frustum
 * @param {Number} bottom Bottom bound of the frustum
 * @param {Number} top Top bound of the frustum
 * @param {Number} near Near bound of the frustum
 * @param {Number} far Far bound of the frustum
 * @returns {mat4} out
 */
mat4.frustum = function (out, left, right, bottom, top, near, far) {
    var rl = 1 / (right - left),
        tb = 1 / (top - bottom),
        nf = 1 / (near - far);
    out[0] = (near * 2) * rl;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = (near * 2) * tb;
    out[6] = 0;
    out[7] = 0;
    out[8] = (right + left) * rl;
    out[9] = (top + bottom) * tb;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (far * near * 2) * nf;
    out[15] = 0;
    return out;
};

/**
 * Generates a perspective projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
mat4.perspective = function (out, fovy, aspect, near, far) {
    var f = 1.0 / Math.tan(fovy / 2),
        nf = 1 / (near - far);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (2 * far * near) * nf;
    out[15] = 0;
    return out;
};

/**
 * Generates a orthogonal projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
mat4.ortho = function (out, left, right, bottom, top, near, far) {
    var lr = 1 / (left - right),
        bt = 1 / (bottom - top),
        nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return out;
};

/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {vec3} eye Position of the viewer
 * @param {vec3} center Point the viewer is looking at
 * @param {vec3} up vec3 pointing up
 * @returns {mat4} out
 */
mat4.lookAt = function (out, eye, center, up) {
    var x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
        eyex = eye[0],
        eyey = eye[1],
        eyez = eye[2],
        upx = up[0],
        upy = up[1],
        upz = up[2],
        centerx = center[0],
        centery = center[1],
        centerz = center[2];

    if (Math.abs(eyex - centerx) < GLMAT_EPSILON &&
        Math.abs(eyey - centery) < GLMAT_EPSILON &&
        Math.abs(eyez - centerz) < GLMAT_EPSILON) {
        return mat4.identity(out);
    }

    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;

    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;

    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) {
        x0 = 0;
        x1 = 0;
        x2 = 0;
    } else {
        len = 1 / len;
        x0 *= len;
        x1 *= len;
        x2 *= len;
    }

    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;

    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (!len) {
        y0 = 0;
        y1 = 0;
        y2 = 0;
    } else {
        len = 1 / len;
        y0 *= len;
        y1 *= len;
        y2 *= len;
    }

    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;

    return out;
};

/**
 * Returns a string representation of a mat4
 *
 * @param {mat4} mat matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
mat4.str = function (a) {
    return 'mat4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ', ' +
                    a[4] + ', ' + a[5] + ', ' + a[6] + ', ' + a[7] + ', ' +
                    a[8] + ', ' + a[9] + ', ' + a[10] + ', ' + a[11] + ', ' +
                    a[12] + ', ' + a[13] + ', ' + a[14] + ', ' + a[15] + ')';
};

/**
 * Returns Frobenius norm of a mat4
 *
 * @param {mat4} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */
mat4.frob = function (a) {
    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + Math.pow(a[6], 2) + Math.pow(a[7], 2) + Math.pow(a[8], 2) + Math.pow(a[9], 2) + Math.pow(a[10], 2) + Math.pow(a[11], 2) + Math.pow(a[12], 2) + Math.pow(a[13], 2) + Math.pow(a[14], 2) + Math.pow(a[15], 2) ))
};


if(typeof(exports) !== 'undefined') {
    exports.mat4 = mat4;
}

/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class Quaternion
 * @name quat
 */

var quat = {};

/**
 * Creates a new identity quat
 *
 * @returns {quat} a new quaternion
 */
quat.create = function() {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Sets a quaternion to represent the shortest rotation from one
 * vector to another.
 *
 * Both vectors are assumed to be unit length.
 *
 * @param {quat} out the receiving quaternion.
 * @param {vec3} a the initial vector
 * @param {vec3} b the destination vector
 * @returns {quat} out
 */
quat.rotationTo = (function() {
    var tmpvec3 = vec3.create();
    var xUnitVec3 = vec3.fromValues(1,0,0);
    var yUnitVec3 = vec3.fromValues(0,1,0);

    return function(out, a, b) {
        var dot = vec3.dot(a, b);
        if (dot < -0.999999) {
            vec3.cross(tmpvec3, xUnitVec3, a);
            if (vec3.length(tmpvec3) < 0.000001)
                vec3.cross(tmpvec3, yUnitVec3, a);
            vec3.normalize(tmpvec3, tmpvec3);
            quat.setAxisAngle(out, tmpvec3, Math.PI);
            return out;
        } else if (dot > 0.999999) {
            out[0] = 0;
            out[1] = 0;
            out[2] = 0;
            out[3] = 1;
            return out;
        } else {
            vec3.cross(tmpvec3, a, b);
            out[0] = tmpvec3[0];
            out[1] = tmpvec3[1];
            out[2] = tmpvec3[2];
            out[3] = 1 + dot;
            return quat.normalize(out, out);
        }
    };
})();

/**
 * Sets the specified quaternion with values corresponding to the given
 * axes. Each axis is a vec3 and is expected to be unit length and
 * perpendicular to all other specified axes.
 *
 * @param {vec3} view  the vector representing the viewing direction
 * @param {vec3} right the vector representing the local "right" direction
 * @param {vec3} up    the vector representing the local "up" direction
 * @returns {quat} out
 */
quat.setAxes = (function() {
    var matr = mat3.create();

    return function(out, view, right, up) {
        matr[0] = right[0];
        matr[3] = right[1];
        matr[6] = right[2];

        matr[1] = up[0];
        matr[4] = up[1];
        matr[7] = up[2];

        matr[2] = -view[0];
        matr[5] = -view[1];
        matr[8] = -view[2];

        return quat.normalize(out, quat.fromMat3(out, matr));
    };
})();

/**
 * Creates a new quat initialized with values from an existing quaternion
 *
 * @param {quat} a quaternion to clone
 * @returns {quat} a new quaternion
 * @function
 */
quat.clone = vec4.clone;

/**
 * Creates a new quat initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {quat} a new quaternion
 * @function
 */
quat.fromValues = vec4.fromValues;

/**
 * Copy the values from one quat to another
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the source quaternion
 * @returns {quat} out
 * @function
 */
quat.copy = vec4.copy;

/**
 * Set the components of a quat to the given values
 *
 * @param {quat} out the receiving quaternion
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {quat} out
 * @function
 */
quat.set = vec4.set;

/**
 * Set a quat to the identity quaternion
 *
 * @param {quat} out the receiving quaternion
 * @returns {quat} out
 */
quat.identity = function(out) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Sets a quat from the given angle and rotation axis,
 * then returns it.
 *
 * @param {quat} out the receiving quaternion
 * @param {vec3} axis the axis around which to rotate
 * @param {Number} rad the angle in radians
 * @returns {quat} out
 **/
quat.setAxisAngle = function(out, axis, rad) {
    rad = rad * 0.5;
    var s = Math.sin(rad);
    out[0] = s * axis[0];
    out[1] = s * axis[1];
    out[2] = s * axis[2];
    out[3] = Math.cos(rad);
    return out;
};

/**
 * Adds two quat's
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @returns {quat} out
 * @function
 */
quat.add = vec4.add;

/**
 * Multiplies two quat's
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @returns {quat} out
 */
quat.multiply = function(out, a, b) {
    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bx = b[0], by = b[1], bz = b[2], bw = b[3];

    out[0] = ax * bw + aw * bx + ay * bz - az * by;
    out[1] = ay * bw + aw * by + az * bx - ax * bz;
    out[2] = az * bw + aw * bz + ax * by - ay * bx;
    out[3] = aw * bw - ax * bx - ay * by - az * bz;
    return out;
};

/**
 * Alias for {@link quat.multiply}
 * @function
 */
quat.mul = quat.multiply;

/**
 * Scales a quat by a scalar number
 *
 * @param {quat} out the receiving vector
 * @param {quat} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {quat} out
 * @function
 */
quat.scale = vec4.scale;

/**
 * Rotates a quaternion by the given angle about the X axis
 *
 * @param {quat} out quat receiving operation result
 * @param {quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */
quat.rotateX = function (out, a, rad) {
    rad *= 0.5;

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bx = Math.sin(rad), bw = Math.cos(rad);

    out[0] = ax * bw + aw * bx;
    out[1] = ay * bw + az * bx;
    out[2] = az * bw - ay * bx;
    out[3] = aw * bw - ax * bx;
    return out;
};

/**
 * Rotates a quaternion by the given angle about the Y axis
 *
 * @param {quat} out quat receiving operation result
 * @param {quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */
quat.rotateY = function (out, a, rad) {
    rad *= 0.5;

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        by = Math.sin(rad), bw = Math.cos(rad);

    out[0] = ax * bw - az * by;
    out[1] = ay * bw + aw * by;
    out[2] = az * bw + ax * by;
    out[3] = aw * bw - ay * by;
    return out;
};

/**
 * Rotates a quaternion by the given angle about the Z axis
 *
 * @param {quat} out quat receiving operation result
 * @param {quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */
quat.rotateZ = function (out, a, rad) {
    rad *= 0.5;

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bz = Math.sin(rad), bw = Math.cos(rad);

    out[0] = ax * bw + ay * bz;
    out[1] = ay * bw - ax * bz;
    out[2] = az * bw + aw * bz;
    out[3] = aw * bw - az * bz;
    return out;
};

/**
 * Calculates the W component of a quat from the X, Y, and Z components.
 * Assumes that quaternion is 1 unit in length.
 * Any existing W component will be ignored.
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quat to calculate W component of
 * @returns {quat} out
 */
quat.calculateW = function (out, a) {
    var x = a[0], y = a[1], z = a[2];

    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
    return out;
};

/**
 * Calculates the dot product of two quat's
 *
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @returns {Number} dot product of a and b
 * @function
 */
quat.dot = vec4.dot;

/**
 * Performs a linear interpolation between two quat's
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {quat} out
 * @function
 */
quat.lerp = vec4.lerp;

/**
 * Performs a spherical linear interpolation between two quat
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {quat} out
 */
quat.slerp = function (out, a, b, t) {
    // benchmarks:
    //    http://jsperf.com/quaternion-slerp-implementations

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bx = b[0], by = b[1], bz = b[2], bw = b[3];

    var        omega, cosom, sinom, scale0, scale1;

    // calc cosine
    cosom = ax * bx + ay * by + az * bz + aw * bw;
    // adjust signs (if necessary)
    if ( cosom < 0.0 ) {
        cosom = -cosom;
        bx = - bx;
        by = - by;
        bz = - bz;
        bw = - bw;
    }
    // calculate coefficients
    if ( (1.0 - cosom) > 0.000001 ) {
        // standard case (slerp)
        omega  = Math.acos(cosom);
        sinom  = Math.sin(omega);
        scale0 = Math.sin((1.0 - t) * omega) / sinom;
        scale1 = Math.sin(t * omega) / sinom;
    } else {
        // "from" and "to" quaternions are very close
        //  ... so we can do a linear interpolation
        scale0 = 1.0 - t;
        scale1 = t;
    }
    // calculate final values
    out[0] = scale0 * ax + scale1 * bx;
    out[1] = scale0 * ay + scale1 * by;
    out[2] = scale0 * az + scale1 * bz;
    out[3] = scale0 * aw + scale1 * bw;

    return out;
};

/**
 * Calculates the inverse of a quat
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quat to calculate inverse of
 * @returns {quat} out
 */
quat.invert = function(out, a) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
        dot = a0*a0 + a1*a1 + a2*a2 + a3*a3,
        invDot = dot ? 1.0/dot : 0;

    // TODO: Would be faster to return [0,0,0,0] immediately if dot == 0

    out[0] = -a0*invDot;
    out[1] = -a1*invDot;
    out[2] = -a2*invDot;
    out[3] = a3*invDot;
    return out;
};

/**
 * Calculates the conjugate of a quat
 * If the quaternion is normalized, this function is faster than quat.inverse and produces the same result.
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quat to calculate conjugate of
 * @returns {quat} out
 */
quat.conjugate = function (out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = a[3];
    return out;
};

/**
 * Calculates the length of a quat
 *
 * @param {quat} a vector to calculate length of
 * @returns {Number} length of a
 * @function
 */
quat.length = vec4.length;

/**
 * Alias for {@link quat.length}
 * @function
 */
quat.len = quat.length;

/**
 * Calculates the squared length of a quat
 *
 * @param {quat} a vector to calculate squared length of
 * @returns {Number} squared length of a
 * @function
 */
quat.squaredLength = vec4.squaredLength;

/**
 * Alias for {@link quat.squaredLength}
 * @function
 */
quat.sqrLen = quat.squaredLength;

/**
 * Normalize a quat
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quaternion to normalize
 * @returns {quat} out
 * @function
 */
quat.normalize = vec4.normalize;

/**
 * Creates a quaternion from the given 3x3 rotation matrix.
 *
 * NOTE: The resultant quaternion is not normalized, so you should be sure
 * to renormalize the quaternion yourself where necessary.
 *
 * @param {quat} out the receiving quaternion
 * @param {mat3} m rotation matrix
 * @returns {quat} out
 * @function
 */
quat.fromMat3 = function(out, m) {
    // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
    // article "Quaternion Calculus and Fast Animation".
    var fTrace = m[0] + m[4] + m[8];
    var fRoot;

    if ( fTrace > 0.0 ) {
        // |w| > 1/2, may as well choose w > 1/2
        fRoot = Math.sqrt(fTrace + 1.0);  // 2w
        out[3] = 0.5 * fRoot;
        fRoot = 0.5/fRoot;  // 1/(4w)
        out[0] = (m[5]-m[7])*fRoot;
        out[1] = (m[6]-m[2])*fRoot;
        out[2] = (m[1]-m[3])*fRoot;
    } else {
        // |w| <= 1/2
        var i = 0;
        if ( m[4] > m[0] )
          i = 1;
        if ( m[8] > m[i*3+i] )
          i = 2;
        var j = (i+1)%3;
        var k = (i+2)%3;

        fRoot = Math.sqrt(m[i*3+i]-m[j*3+j]-m[k*3+k] + 1.0);
        out[i] = 0.5 * fRoot;
        fRoot = 0.5 / fRoot;
        out[3] = (m[j*3+k] - m[k*3+j]) * fRoot;
        out[j] = (m[j*3+i] + m[i*3+j]) * fRoot;
        out[k] = (m[k*3+i] + m[i*3+k]) * fRoot;
    }

    return out;
};

/**
 * Returns a string representation of a quatenion
 *
 * @param {quat} vec vector to represent as a string
 * @returns {String} string representation of the vector
 */
quat.str = function (a) {
    return 'quat(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
};

if(typeof(exports) !== 'undefined') {
    exports.quat = quat;
}














  })(shim.exports);
})(commonjsGlobal);
});

var vec3$2 = glmatrix.vec3;

/**
 * @constructor
 * @alias qtek.math.Vector3
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
var Vector3 = function(x, y, z) {

    x = x || 0;
    y = y || 0;
    z = z || 0;

    /**
     * Storage of Vector3, read and write of x, y, z will change the values in _array
     * All methods also operate on the _array instead of x, y, z components
     * @name _array
     * @type {Float32Array}
     */
    this._array = vec3$2.fromValues(x, y, z);

    /**
     * Dirty flag is used by the Node to determine
     * if the matrix is updated to latest
     * @name _dirty
     * @type {boolean}
     */
    this._dirty = true;
};

Vector3.prototype = {

    constructor : Vector3,

    /**
     * Add b to self
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    add: function (b) {
        vec3$2.add(this._array, this._array, b._array);
        this._dirty = true;
        return this;
    },

    /**
     * Set x, y and z components
     * @param  {number}  x
     * @param  {number}  y
     * @param  {number}  z
     * @return {qtek.math.Vector3}
     */
    set: function (x, y, z) {
        this._array[0] = x;
        this._array[1] = y;
        this._array[2] = z;
        this._dirty = true;
        return this;
    },

    /**
     * Set x, y and z components from array
     * @param  {Float32Array|number[]} arr
     * @return {qtek.math.Vector3}
     */
    setArray: function (arr) {
        this._array[0] = arr[0];
        this._array[1] = arr[1];
        this._array[2] = arr[2];

        this._dirty = true;
        return this;
    },

    /**
     * Clone a new Vector3
     * @return {qtek.math.Vector3}
     */
    clone: function () {
        return new Vector3(this.x, this.y, this.z);
    },

    /**
     * Copy from b
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    copy: function (b) {
        vec3$2.copy(this._array, b._array);
        this._dirty = true;
        return this;
    },

    /**
     * Cross product of self and b, written to a Vector3 out
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    cross: function (a, b) {
        vec3$2.cross(this._array, a._array, b._array);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for distance
     * @param  {qtek.math.Vector3} b
     * @return {number}
     */
    dist: function (b) {
        return vec3$2.dist(this._array, b._array);
    },

    /**
     * Distance between self and b
     * @param  {qtek.math.Vector3} b
     * @return {number}
     */
    distance: function (b) {
        return vec3$2.distance(this._array, b._array);
    },

    /**
     * Alias for divide
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    div: function (b) {
        vec3$2.div(this._array, this._array, b._array);
        this._dirty = true;
        return this;
    },

    /**
     * Divide self by b
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    divide: function (b) {
        vec3$2.divide(this._array, this._array, b._array);
        this._dirty = true;
        return this;
    },

    /**
     * Dot product of self and b
     * @param  {qtek.math.Vector3} b
     * @return {number}
     */
    dot: function (b) {
        return vec3$2.dot(this._array, b._array);
    },

    /**
     * Alias of length
     * @return {number}
     */
    len: function () {
        return vec3$2.len(this._array);
    },

    /**
     * Calculate the length
     * @return {number}
     */
    length: function () {
        return vec3$2.length(this._array);
    },
    /**
     * Linear interpolation between a and b
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Vector3} b
     * @param  {number}  t
     * @return {qtek.math.Vector3}
     */
    lerp: function (a, b, t) {
        vec3$2.lerp(this._array, a._array, b._array, t);
        this._dirty = true;
        return this;
    },

    /**
     * Minimum of self and b
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    min: function (b) {
        vec3$2.min(this._array, this._array, b._array);
        this._dirty = true;
        return this;
    },

    /**
     * Maximum of self and b
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    max: function (b) {
        vec3$2.max(this._array, this._array, b._array);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for multiply
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    mul: function (b) {
        vec3$2.mul(this._array, this._array, b._array);
        this._dirty = true;
        return this;
    },

    /**
     * Mutiply self and b
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    multiply: function (b) {
        vec3$2.multiply(this._array, this._array, b._array);
        this._dirty = true;
        return this;
    },

    /**
     * Negate self
     * @return {qtek.math.Vector3}
     */
    negate: function () {
        vec3$2.negate(this._array, this._array);
        this._dirty = true;
        return this;
    },

    /**
     * Normalize self
     * @return {qtek.math.Vector3}
     */
    normalize: function () {
        vec3$2.normalize(this._array, this._array);
        this._dirty = true;
        return this;
    },

    /**
     * Generate random x, y, z components with a given scale
     * @param  {number} scale
     * @return {qtek.math.Vector3}
     */
    random: function (scale) {
        vec3$2.random(this._array, scale);
        this._dirty = true;
        return this;
    },

    /**
     * Scale self
     * @param  {number}  scale
     * @return {qtek.math.Vector3}
     */
    scale: function (s) {
        vec3$2.scale(this._array, this._array, s);
        this._dirty = true;
        return this;
    },

    /**
     * Scale b and add to self
     * @param  {qtek.math.Vector3} b
     * @param  {number}  scale
     * @return {qtek.math.Vector3}
     */
    scaleAndAdd: function (b, s) {
        vec3$2.scaleAndAdd(this._array, this._array, b._array, s);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for squaredDistance
     * @param  {qtek.math.Vector3} b
     * @return {number}
     */
    sqrDist: function (b) {
        return vec3$2.sqrDist(this._array, b._array);
    },

    /**
     * Squared distance between self and b
     * @param  {qtek.math.Vector3} b
     * @return {number}
     */
    squaredDistance: function (b) {
        return vec3$2.squaredDistance(this._array, b._array);
    },

    /**
     * Alias for squaredLength
     * @return {number}
     */
    sqrLen: function () {
        return vec3$2.sqrLen(this._array);
    },

    /**
     * Squared length of self
     * @return {number}
     */
    squaredLength: function () {
        return vec3$2.squaredLength(this._array);
    },

    /**
     * Alias for subtract
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    sub: function (b) {
        vec3$2.sub(this._array, this._array, b._array);
        this._dirty = true;
        return this;
    },

    /**
     * Subtract b from self
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Vector3}
     */
    subtract: function (b) {
        vec3$2.subtract(this._array, this._array, b._array);
        this._dirty = true;
        return this;
    },

    /**
     * Transform self with a Matrix3 m
     * @param  {qtek.math.Matrix3} m
     * @return {qtek.math.Vector3}
     */
    transformMat3: function (m) {
        vec3$2.transformMat3(this._array, this._array, m._array);
        this._dirty = true;
        return this;
    },

    /**
     * Transform self with a Matrix4 m
     * @param  {qtek.math.Matrix4} m
     * @return {qtek.math.Vector3}
     */
    transformMat4: function (m) {
        vec3$2.transformMat4(this._array, this._array, m._array);
        this._dirty = true;
        return this;
    },
    /**
     * Transform self with a Quaternion q
     * @param  {qtek.math.Quaternion} q
     * @return {qtek.math.Vector3}
     */
    transformQuat: function (q) {
        vec3$2.transformQuat(this._array, this._array, q._array);
        this._dirty = true;
        return this;
    },

    /**
     * Trasnform self into projection space with m
     * @param  {qtek.math.Matrix4} m
     * @return {qtek.math.Vector3}
     */
    applyProjection: function (m) {
        var v = this._array;
        m = m._array;

        // Perspective projection
        if (m[15] === 0) {
            var w = -1 / v[2];
            v[0] = m[0] * v[0] * w;
            v[1] = m[5] * v[1] * w;
            v[2] = (m[10] * v[2] + m[14]) * w;
        }
        else {
            v[0] = m[0] * v[0] + m[12];
            v[1] = m[5] * v[1] + m[13];
            v[2] = m[10] * v[2] + m[14];
        }
        this._dirty = true;

        return this;
    },

    eulerFromQuat: function(q, order) {
        Vector3.eulerFromQuat(this, q, order);
    },

    eulerFromMat3: function (m, order) {
        Vector3.eulerFromMat3(this, m, order);
    },

    toString: function() {
        return '[' + Array.prototype.join.call(this._array, ',') + ']';
    },

    toArray: function () {
        return Array.prototype.slice.call(this._array);
    }
};

var defineProperty = Object.defineProperty;
// Getter and Setter
if (defineProperty) {

    var proto = Vector3.prototype;
    /**
     * @name x
     * @type {number}
     * @memberOf qtek.math.Vector3
     * @instance
     */
    defineProperty(proto, 'x', {
        get: function () {
            return this._array[0];
        },
        set: function (value) {
            this._array[0] = value;
            this._dirty = true;
        }
    });

    /**
     * @name y
     * @type {number}
     * @memberOf qtek.math.Vector3
     * @instance
     */
    defineProperty(proto, 'y', {
        get: function () {
            return this._array[1];
        },
        set: function (value) {
            this._array[1] = value;
            this._dirty = true;
        }
    });

    /**
     * @name z
     * @type {number}
     * @memberOf qtek.math.Vector3
     * @instance
     */
    defineProperty(proto, 'z', {
        get: function () {
            return this._array[2];
        },
        set: function (value) {
            this._array[2] = value;
            this._dirty = true;
        }
    });
}


// Supply methods that are not in place

/**
 * @param  {qtek.math.Vector3} out
 * @param  {qtek.math.Vector3} a
 * @param  {qtek.math.Vector3} b
 * @return {qtek.math.Vector3}
 */
Vector3.add = function(out, a, b) {
    vec3$2.add(out._array, a._array, b._array);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Vector3} out
 * @param  {number}  x
 * @param  {number}  y
 * @param  {number}  z
 * @return {qtek.math.Vector3}
 */
Vector3.set = function(out, x, y, z) {
    vec3$2.set(out._array, x, y, z);
    out._dirty = true;
};

/**
 * @param  {qtek.math.Vector3} out
 * @param  {qtek.math.Vector3} b
 * @return {qtek.math.Vector3}
 */
Vector3.copy = function(out, b) {
    vec3$2.copy(out._array, b._array);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Vector3} out
 * @param  {qtek.math.Vector3} a
 * @param  {qtek.math.Vector3} b
 * @return {qtek.math.Vector3}
 */
Vector3.cross = function(out, a, b) {
    vec3$2.cross(out._array, a._array, b._array);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Vector3} a
 * @param  {qtek.math.Vector3} b
 * @return {number}
 */
Vector3.dist = function(a, b) {
    return vec3$2.distance(a._array, b._array);
};

/**
 * @method
 * @param  {qtek.math.Vector3} a
 * @param  {qtek.math.Vector3} b
 * @return {number}
 */
Vector3.distance = Vector3.dist;

/**
 * @param  {qtek.math.Vector3} out
 * @param  {qtek.math.Vector3} a
 * @param  {qtek.math.Vector3} b
 * @return {qtek.math.Vector3}
 */
Vector3.div = function(out, a, b) {
    vec3$2.divide(out._array, a._array, b._array);
    out._dirty = true;
    return out;
};

/**
 * @method
 * @param  {qtek.math.Vector3} out
 * @param  {qtek.math.Vector3} a
 * @param  {qtek.math.Vector3} b
 * @return {qtek.math.Vector3}
 */
Vector3.divide = Vector3.div;

/**
 * @param  {qtek.math.Vector3} a
 * @param  {qtek.math.Vector3} b
 * @return {number}
 */
Vector3.dot = function(a, b) {
    return vec3$2.dot(a._array, b._array);
};

/**
 * @param  {qtek.math.Vector3} a
 * @return {number}
 */
Vector3.len = function(b) {
    return vec3$2.length(b._array);
};

// Vector3.length = Vector3.len;

/**
 * @param  {qtek.math.Vector3} out
 * @param  {qtek.math.Vector3} a
 * @param  {qtek.math.Vector3} b
 * @param  {number}  t
 * @return {qtek.math.Vector3}
 */
Vector3.lerp = function(out, a, b, t) {
    vec3$2.lerp(out._array, a._array, b._array, t);
    out._dirty = true;
    return out;
};
/**
 * @param  {qtek.math.Vector3} out
 * @param  {qtek.math.Vector3} a
 * @param  {qtek.math.Vector3} b
 * @return {qtek.math.Vector3}
 */
Vector3.min = function(out, a, b) {
    vec3$2.min(out._array, a._array, b._array);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Vector3} out
 * @param  {qtek.math.Vector3} a
 * @param  {qtek.math.Vector3} b
 * @return {qtek.math.Vector3}
 */
Vector3.max = function(out, a, b) {
    vec3$2.max(out._array, a._array, b._array);
    out._dirty = true;
    return out;
};
/**
 * @param  {qtek.math.Vector3} out
 * @param  {qtek.math.Vector3} a
 * @param  {qtek.math.Vector3} b
 * @return {qtek.math.Vector3}
 */
Vector3.mul = function(out, a, b) {
    vec3$2.multiply(out._array, a._array, b._array);
    out._dirty = true;
    return out;
};
/**
 * @method
 * @param  {qtek.math.Vector3} out
 * @param  {qtek.math.Vector3} a
 * @param  {qtek.math.Vector3} b
 * @return {qtek.math.Vector3}
 */
Vector3.multiply = Vector3.mul;
/**
 * @param  {qtek.math.Vector3} out
 * @param  {qtek.math.Vector3} a
 * @return {qtek.math.Vector3}
 */
Vector3.negate = function(out, a) {
    vec3$2.negate(out._array, a._array);
    out._dirty = true;
    return out;
};
/**
 * @param  {qtek.math.Vector3} out
 * @param  {qtek.math.Vector3} a
 * @return {qtek.math.Vector3}
 */
Vector3.normalize = function(out, a) {
    vec3$2.normalize(out._array, a._array);
    out._dirty = true;
    return out;
};
/**
 * @param  {qtek.math.Vector3} out
 * @param  {number}  scale
 * @return {qtek.math.Vector3}
 */
Vector3.random = function(out, scale) {
    vec3$2.random(out._array, scale);
    out._dirty = true;
    return out;
};
/**
 * @param  {qtek.math.Vector3} out
 * @param  {qtek.math.Vector3} a
 * @param  {number}  scale
 * @return {qtek.math.Vector3}
 */
Vector3.scale = function(out, a, scale) {
    vec3$2.scale(out._array, a._array, scale);
    out._dirty = true;
    return out;
};
/**
 * @param  {qtek.math.Vector3} out
 * @param  {qtek.math.Vector3} a
 * @param  {qtek.math.Vector3} b
 * @param  {number}  scale
 * @return {qtek.math.Vector3}
 */
Vector3.scaleAndAdd = function(out, a, b, scale) {
    vec3$2.scaleAndAdd(out._array, a._array, b._array, scale);
    out._dirty = true;
    return out;
};
/**
 * @param  {qtek.math.Vector3} a
 * @param  {qtek.math.Vector3} b
 * @return {number}
 */
Vector3.sqrDist = function(a, b) {
    return vec3$2.sqrDist(a._array, b._array);
};
/**
 * @method
 * @param  {qtek.math.Vector3} a
 * @param  {qtek.math.Vector3} b
 * @return {number}
 */
Vector3.squaredDistance = Vector3.sqrDist;
/**
 * @param  {qtek.math.Vector3} a
 * @return {number}
 */
Vector3.sqrLen = function(a) {
    return vec3$2.sqrLen(a._array);
};
/**
 * @method
 * @param  {qtek.math.Vector3} a
 * @return {number}
 */
Vector3.squaredLength = Vector3.sqrLen;

/**
 * @param  {qtek.math.Vector3} out
 * @param  {qtek.math.Vector3} a
 * @param  {qtek.math.Vector3} b
 * @return {qtek.math.Vector3}
 */
Vector3.sub = function(out, a, b) {
    vec3$2.subtract(out._array, a._array, b._array);
    out._dirty = true;
    return out;
};
/**
 * @method
 * @param  {qtek.math.Vector3} out
 * @param  {qtek.math.Vector3} a
 * @param  {qtek.math.Vector3} b
 * @return {qtek.math.Vector3}
 */
Vector3.subtract = Vector3.sub;

/**
 * @param  {qtek.math.Vector3} out
 * @param  {qtek.math.Vector3} a
 * @param  {Matrix3} m
 * @return {qtek.math.Vector3}
 */
Vector3.transformMat3 = function(out, a, m) {
    vec3$2.transformMat3(out._array, a._array, m._array);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Vector3} out
 * @param  {qtek.math.Vector3} a
 * @param  {qtek.math.Matrix4} m
 * @return {qtek.math.Vector3}
 */
Vector3.transformMat4 = function(out, a, m) {
    vec3$2.transformMat4(out._array, a._array, m._array);
    out._dirty = true;
    return out;
};
/**
 * @param  {qtek.math.Vector3} out
 * @param  {qtek.math.Vector3} a
 * @param  {qtek.math.Quaternion} q
 * @return {qtek.math.Vector3}
 */
Vector3.transformQuat = function(out, a, q) {
    vec3$2.transformQuat(out._array, a._array, q._array);
    out._dirty = true;
    return out;
};

function clamp(val, min, max) {
    return val < min ? min : (val > max ? max : val);
}
var atan2 = Math.atan2;
var asin = Math.asin;
var abs = Math.abs;
/**
 * Convert quaternion to euler angle
 * Quaternion must be normalized
 * From three.js
 */
Vector3.eulerFromQuat = function (out, q, order) {
    out._dirty = true;
    q = q._array;

    var target = out._array;
    var x = q[0], y = q[1], z = q[2], w = q[3];
    var x2 = x * x;
    var y2 = y * y;
    var z2 = z * z;
    var w2 = w * w;

    var order = (order || 'XYZ').toUpperCase();

    switch (order) {
        case 'XYZ':
            target[0] = atan2(2 * (x * w - y * z), (w2 - x2 - y2 + z2));
            target[1] = asin(clamp(2 * (x * z + y * w), - 1, 1));
            target[2] = atan2(2 * (z * w - x * y), (w2 + x2 - y2 - z2));
            break;
        case 'YXZ':
            target[0] = asin(clamp(2 * (x * w - y * z), - 1, 1));
            target[1] = atan2(2 * (x * z + y * w), (w2 - x2 - y2 + z2));
            target[2] = atan2(2 * (x * y + z * w), (w2 - x2 + y2 - z2));
            break;
        case 'ZXY':
            target[0] = asin(clamp(2 * (x * w + y * z), - 1, 1));
            target[1] = atan2(2 * (y * w - z * x), (w2 - x2 - y2 + z2));
            target[2] = atan2(2 * (z * w - x * y), (w2 - x2 + y2 - z2));
            break;
        case 'ZYX':
            target[0] = atan2(2 * (x * w + z * y), (w2 - x2 - y2 + z2));
            target[1] = asin(clamp(2 * (y * w - x * z), - 1, 1));
            target[2] = atan2(2 * (x * y + z * w), (w2 + x2 - y2 - z2));
            break;
        case 'YZX':
            target[0] = atan2(2 * (x * w - z * y), (w2 - x2 + y2 - z2));
            target[1] = atan2(2 * (y * w - x * z), (w2 + x2 - y2 - z2));
            target[2] = asin(clamp(2 * (x * y + z * w), - 1, 1));
            break;
        case 'XZY':
            target[0] = atan2(2 * (x * w + y * z), (w2 - x2 + y2 - z2));
            target[1] = atan2(2 * (x * z + y * w), (w2 + x2 - y2 - z2));
            target[2] = asin(clamp(2 * (z * w - x * y), - 1, 1));
            break;
        default:
            console.warn('Unkown order: ' + order);
    }
    return out;
};

/**
 * Convert rotation matrix to euler angle
 * from three.js
 */
Vector3.eulerFromMat3 = function (out, m, order) {
    // assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)
    var te = m._array;
    var m11 = te[0], m12 = te[3], m13 = te[6];
    var m21 = te[1], m22 = te[4], m23 = te[7];
    var m31 = te[2], m32 = te[5], m33 = te[8];
    var target = out._array;

    var order = (order || 'XYZ').toUpperCase();

    switch (order) {
        case 'XYZ':
            target[1] = asin(clamp(m13, -1, 1));
            if (abs(m13) < 0.99999) {
                target[0] = atan2(-m23, m33);
                target[2] = atan2(-m12, m11);
            }
            else {
                target[0] = atan2(m32, m22);
                target[2] = 0;
            }
            break;
        case 'YXZ':
            target[0] = asin(-clamp(m23, -1, 1));
            if (abs(m23) < 0.99999) {
                target[1] = atan2(m13, m33);
                target[2] = atan2(m21, m22);
            }
            else {
                target[1] = atan2(-m31, m11);
                target[2] = 0;
            }
            break;
        case 'ZXY':
            target[0] = asin(clamp(m32, -1, 1));
            if (abs(m32) < 0.99999) {
                target[1] = atan2(-m31, m33);
                target[2] = atan2(-m12, m22);
            }
            else {
                target[1] = 0;
                target[2] = atan2(m21, m11);
            }
            break;
        case 'ZYX':
            target[1] = asin(-clamp(m31, -1, 1));
            if (abs(m31) < 0.99999) {
                target[0] = atan2(m32, m33);
                target[2] = atan2(m21, m11);
            }
            else {
                target[0] = 0;
                target[2] = atan2(-m12, m22);
            }
            break;
        case 'YZX':
            target[2] = asin(clamp(m21, -1, 1));
            if (abs(m21) < 0.99999) {
                target[0] = atan2(-m23, m22);
                target[1] = atan2(-m31, m11);
            }
            else {
                target[0] = 0;
                target[1] = atan2(m13, m33);
            }
            break;
        case 'XZY':
            target[2] = asin(-clamp(m12, -1, 1));
            if (abs(m12) < 0.99999) {
                target[0] = atan2(m32, m22);
                target[1] = atan2(m13, m11);
            }
            else {
                target[0] = atan2(-m23, m33);
                target[1] = 0;
            }
            break;
        default:
            console.warn('Unkown order: ' + order);
    }
    out._dirty = true;

    return out;
};

/**
 * @type {qtek.math.Vector3}
 */
Vector3.POSITIVE_X = new Vector3(1, 0, 0);
/**
 * @type {qtek.math.Vector3}
 */
Vector3.NEGATIVE_X = new Vector3(-1, 0, 0);
/**
 * @type {qtek.math.Vector3}
 */
Vector3.POSITIVE_Y = new Vector3(0, 1, 0);
/**
 * @type {qtek.math.Vector3}
 */
Vector3.NEGATIVE_Y = new Vector3(0, -1, 0);
/**
 * @type {qtek.math.Vector3}
 */
Vector3.POSITIVE_Z = new Vector3(0, 0, 1);
/**
 * @type {qtek.math.Vector3}
 */
Vector3.NEGATIVE_Z = new Vector3(0, 0, -1);
/**
 * @type {qtek.math.Vector3}
 */
Vector3.UP = new Vector3(0, 1, 0);
/**
 * @type {qtek.math.Vector3}
 */
Vector3.ZERO = new Vector3(0, 0, 0);

var vec3$1 = glmatrix.vec3;

var vec3Copy = vec3$1.copy;
var vec3Set = vec3$1.set;

/**
 * Axis aligned bounding box
 * @constructor
 * @alias qtek.math.BoundingBox
 * @param {qtek.math.Vector3} [min]
 * @param {qtek.math.Vector3} [max]
 */
var BoundingBox = function (min, max) {

    /**
     * Minimum coords of bounding box
     * @type {qtek.math.Vector3}
     */
    this.min = min || new Vector3(Infinity, Infinity, Infinity);

    /**
     * Maximum coords of bounding box
     * @type {qtek.math.Vector3}
     */
    this.max = max || new Vector3(-Infinity, -Infinity, -Infinity);
};

BoundingBox.prototype = {

    constructor: BoundingBox,
    /**
     * Update min and max coords from a vertices array
     * @param  {array} vertices
     */
    updateFromVertices: function (vertices) {
        if (vertices.length > 0) {
            var min = this.min;
            var max = this.max;
            var minArr = min._array;
            var maxArr = max._array;
            vec3Copy(minArr, vertices[0]);
            vec3Copy(maxArr, vertices[0]);
            for (var i = 1; i < vertices.length; i++) {
                var vertex = vertices[i];

                if (vertex[0] < minArr[0]) { minArr[0] = vertex[0]; }
                if (vertex[1] < minArr[1]) { minArr[1] = vertex[1]; }
                if (vertex[2] < minArr[2]) { minArr[2] = vertex[2]; }

                if (vertex[0] > maxArr[0]) { maxArr[0] = vertex[0]; }
                if (vertex[1] > maxArr[1]) { maxArr[1] = vertex[1]; }
                if (vertex[2] > maxArr[2]) { maxArr[2] = vertex[2]; }
            }
            min._dirty = true;
            max._dirty = true;
        }
    },

    /**
     * Union operation with another bounding box
     * @param  {qtek.math.BoundingBox} bbox
     */
    union: function (bbox) {
        var min = this.min;
        var max = this.max;
        vec3$1.min(min._array, min._array, bbox.min._array);
        vec3$1.max(max._array, max._array, bbox.max._array);
        min._dirty = true;
        max._dirty = true;
        return this;
    },

    /**
     * Intersection operation with another bounding box
     * @param  {qtek.math.BoundingBox} bbox
     */
    intersection: function (bbox) {
        var min = this.min;
        var max = this.max;
        vec3$1.max(min._array, min._array, bbox.min._array);
        vec3$1.min(max._array, max._array, bbox.max._array);
        min._dirty = true;
        max._dirty = true;
        return this;
    },

    /**
     * If intersect with another bounding box
     * @param  {qtek.math.BoundingBox} bbox
     * @return {boolean}
     */
    intersectBoundingBox: function (bbox) {
        var _min = this.min._array;
        var _max = this.max._array;

        var _min2 = bbox.min._array;
        var _max2 = bbox.max._array;

        return ! (_min[0] > _max2[0] || _min[1] > _max2[1] || _min[2] > _max2[2]
            || _max[0] < _min2[0] || _max[1] < _min2[1] || _max[2] < _min2[2]);
    },

    /**
     * If contain another bounding box entirely
     * @param  {qtek.math.BoundingBox} bbox
     * @return {boolean}
     */
    containBoundingBox: function (bbox) {

        var _min = this.min._array;
        var _max = this.max._array;

        var _min2 = bbox.min._array;
        var _max2 = bbox.max._array;

        return _min[0] <= _min2[0] && _min[1] <= _min2[1] && _min[2] <= _min2[2]
            && _max[0] >= _max2[0] && _max[1] >= _max2[1] && _max[2] >= _max2[2];
    },

    /**
     * If contain point entirely
     * @param  {qtek.math.Vector3} point
     * @return {boolean}
     */
    containPoint: function (p) {
        var _min = this.min._array;
        var _max = this.max._array;

        var _p = p._array;

        return _min[0] <= _p[0] && _min[1] <= _p[1] && _min[2] <= _p[2]
            && _max[0] >= _p[0] && _max[1] >= _p[1] && _max[2] >= _p[2];
    },

    /**
     * If bounding box is finite
     */
    isFinite: function () {
        var _min = this.min._array;
        var _max = this.max._array;
        return isFinite(_min[0]) && isFinite(_min[1]) && isFinite(_min[2])
            && isFinite(_max[0]) && isFinite(_max[1]) && isFinite(_max[2]);
    },

    /**
     * Apply an affine transform matrix to the bounding box
     * @param  {qtek.math.Matrix4} matrix
     */
    applyTransform: (function () {
        // http://dev.theomader.com/transform-bounding-boxes/
        var xa = vec3$1.create();
        var xb = vec3$1.create();
        var ya = vec3$1.create();
        var yb = vec3$1.create();
        var za = vec3$1.create();
        var zb = vec3$1.create();

        return function (matrix) {
            var min = this.min._array;
            var max = this.max._array;

            var m = matrix._array;

            xa[0] = m[0] * min[0]; xa[1] = m[1] * min[0]; xa[2] = m[2] * min[0];
            xb[0] = m[0] * max[0]; xb[1] = m[1] * max[0]; xb[2] = m[2] * max[0];

            ya[0] = m[4] * min[1]; ya[1] = m[5] * min[1]; ya[2] = m[6] * min[1];
            yb[0] = m[4] * max[1]; yb[1] = m[5] * max[1]; yb[2] = m[6] * max[1];

            za[0] = m[8] * min[2]; za[1] = m[9] * min[2]; za[2] = m[10] * min[2];
            zb[0] = m[8] * max[2]; zb[1] = m[9] * max[2]; zb[2] = m[10] * max[2];

            min[0] = Math.min(xa[0], xb[0]) + Math.min(ya[0], yb[0]) + Math.min(za[0], zb[0]) + m[12];
            min[1] = Math.min(xa[1], xb[1]) + Math.min(ya[1], yb[1]) + Math.min(za[1], zb[1]) + m[13];
            min[2] = Math.min(xa[2], xb[2]) + Math.min(ya[2], yb[2]) + Math.min(za[2], zb[2]) + m[14];

            max[0] = Math.max(xa[0], xb[0]) + Math.max(ya[0], yb[0]) + Math.max(za[0], zb[0]) + m[12];
            max[1] = Math.max(xa[1], xb[1]) + Math.max(ya[1], yb[1]) + Math.max(za[1], zb[1]) + m[13];
            max[2] = Math.max(xa[2], xb[2]) + Math.max(ya[2], yb[2]) + Math.max(za[2], zb[2]) + m[14];

            this.min._dirty = true;
            this.max._dirty = true;

            return this;
        };
    })(),

    /**
     * Apply a projection matrix to the bounding box
     * @param  {qtek.math.Matrix4} matrix
     */
    applyProjection: function (matrix) {
        var min = this.min._array;
        var max = this.max._array;

        var m = matrix._array;
        // min in min z
        var v10 = min[0];
        var v11 = min[1];
        var v12 = min[2];
        // max in min z
        var v20 = max[0];
        var v21 = max[1];
        var v22 = min[2];
        // max in max z
        var v30 = max[0];
        var v31 = max[1];
        var v32 = max[2];

        if (m[15] === 1) {  // Orthographic projection
            min[0] = m[0] * v10 + m[12];
            min[1] = m[5] * v11 + m[13];
            max[2] = m[10] * v12 + m[14];

            max[0] = m[0] * v30 + m[12];
            max[1] = m[5] * v31 + m[13];
            min[2] = m[10] * v32 + m[14];
        }
        else {
            var w = -1 / v12;
            min[0] = m[0] * v10 * w;
            min[1] = m[5] * v11 * w;
            max[2] = (m[10] * v12 + m[14]) * w;

            w = -1 / v22;
            max[0] = m[0] * v20 * w;
            max[1] = m[5] * v21 * w;

            w = -1 / v32;
            min[2] = (m[10] * v32 + m[14]) * w;
        }
        this.min._dirty = true;
        this.max._dirty = true;

        return this;
    },

    updateVertices: function () {
        var vertices = this.vertices;
        if (!vertices) {
            // Cube vertices
            var vertices = [];
            for (var i = 0; i < 8; i++) {
                vertices[i] = vec3$1.fromValues(0, 0, 0);
            }

            /**
             * Eight coords of bounding box
             * @type {Float32Array[]}
             */
            this.vertices = vertices;
        }
        var min = this.min._array;
        var max = this.max._array;
        //--- min z
        // min x
        vec3Set(vertices[0], min[0], min[1], min[2]);
        vec3Set(vertices[1], min[0], max[1], min[2]);
        // max x
        vec3Set(vertices[2], max[0], min[1], min[2]);
        vec3Set(vertices[3], max[0], max[1], min[2]);

        //-- max z
        vec3Set(vertices[4], min[0], min[1], max[2]);
        vec3Set(vertices[5], min[0], max[1], max[2]);
        vec3Set(vertices[6], max[0], min[1], max[2]);
        vec3Set(vertices[7], max[0], max[1], max[2]);

        return this;
    },
    /**
     * Copy values from another bounding box
     * @param  {qtek.math.BoundingBox} bbox
     */
    copy: function (bbox) {
        var min = this.min;
        var max = this.max;
        vec3Copy(min._array, bbox.min._array);
        vec3Copy(max._array, bbox.max._array);
        min._dirty = true;
        max._dirty = true;
        return this;
    },

    /**
     * Clone a new bounding box
     * @return {qtek.math.BoundingBox}
     */
    clone: function () {
        var boundingBox = new BoundingBox();
        boundingBox.copy(this);
        return boundingBox;
    }
};

var mat4$1 = glmatrix.mat4;
var vec3$3 = glmatrix.vec3;
var mat3 = glmatrix.mat3;
var quat = glmatrix.quat;

/**
 * @constructor
 * @alias qtek.math.Matrix4
 */
var Matrix4 = function() {

    this._axisX = new Vector3();
    this._axisY = new Vector3();
    this._axisZ = new Vector3();

    /**
     * Storage of Matrix4
     * @name _array
     * @type {Float32Array}
     */
    this._array = mat4$1.create();

    /**
     * @name _dirty
     * @type {boolean}
     */
    this._dirty = true;
};

Matrix4.prototype = {

    constructor: Matrix4,

    /**
     * Set components from array
     * @param  {Float32Array|number[]} arr
     */
    setArray: function (arr) {
        for (var i = 0; i < this._array.length; i++) {
            this._array[i] = arr[i];
        }
        this._dirty = true;
        return this;
    },
    /**
     * Calculate the adjugate of self, in-place
     * @return {qtek.math.Matrix4}
     */
    adjoint: function() {
        mat4$1.adjoint(this._array, this._array);
        this._dirty = true;
        return this;
    },

    /**
     * Clone a new Matrix4
     * @return {qtek.math.Matrix4}
     */
    clone: function() {
        return (new Matrix4()).copy(this);
    },

    /**
     * Copy from b
     * @param  {qtek.math.Matrix4} b
     * @return {qtek.math.Matrix4}
     */
    copy: function(a) {
        mat4$1.copy(this._array, a._array);
        this._dirty = true;
        return this;
    },

    /**
     * Calculate matrix determinant
     * @return {number}
     */
    determinant: function() {
        return mat4$1.determinant(this._array);
    },

    /**
     * Set upper 3x3 part from quaternion
     * @param  {qtek.math.Quaternion} q
     * @return {qtek.math.Matrix4}
     */
    fromQuat: function(q) {
        mat4$1.fromQuat(this._array, q._array);
        this._dirty = true;
        return this;
    },

    /**
     * Set from a quaternion rotation and a vector translation
     * @param  {qtek.math.Quaternion} q
     * @param  {qtek.math.Vector3} v
     * @return {qtek.math.Matrix4}
     */
    fromRotationTranslation: function(q, v) {
        mat4$1.fromRotationTranslation(this._array, q._array, v._array);
        this._dirty = true;
        return this;
    },

    /**
     * Set from Matrix2d, it is used when converting a 2d shape to 3d space.
     * In 3d space it is equivalent to ranslate on xy plane and rotate about z axis
     * @param  {qtek.math.Matrix2d} m2d
     * @return {qtek.math.Matrix4}
     */
    fromMat2d: function(m2d) {
        Matrix4.fromMat2d(this, m2d);
        return this;
    },

    /**
     * Set from frustum bounds
     * @param  {number} left
     * @param  {number} right
     * @param  {number} bottom
     * @param  {number} top
     * @param  {number} near
     * @param  {number} far
     * @return {qtek.math.Matrix4}
     */
    frustum: function (left, right, bottom, top, near, far) {
        mat4$1.frustum(this._array, left, right, bottom, top, near, far);
        this._dirty = true;
        return this;
    },

    /**
     * Set to a identity matrix
     * @return {qtek.math.Matrix4}
     */
    identity: function() {
        mat4$1.identity(this._array);
        this._dirty = true;
        return this;
    },

    /**
     * Invert self
     * @return {qtek.math.Matrix4}
     */
    invert: function() {
        mat4$1.invert(this._array, this._array);
        this._dirty = true;
        return this;
    },

    /**
     * Set as a matrix with the given eye position, focal point, and up axis
     * @param  {qtek.math.Vector3} eye
     * @param  {qtek.math.Vector3} center
     * @param  {qtek.math.Vector3} up
     * @return {qtek.math.Matrix4}
     */
    lookAt: function(eye, center, up) {
        mat4$1.lookAt(this._array, eye._array, center._array, up._array);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for mutiply
     * @param  {qtek.math.Matrix4} b
     * @return {qtek.math.Matrix4}
     */
    mul: function(b) {
        mat4$1.mul(this._array, this._array, b._array);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for multiplyLeft
     * @param  {qtek.math.Matrix4} a
     * @return {qtek.math.Matrix4}
     */
    mulLeft: function(a) {
        mat4$1.mul(this._array, a._array, this._array);
        this._dirty = true;
        return this;
    },

    /**
     * Multiply self and b
     * @param  {qtek.math.Matrix4} b
     * @return {qtek.math.Matrix4}
     */
    multiply: function(b) {
        mat4$1.multiply(this._array, this._array, b._array);
        this._dirty = true;
        return this;
    },

    /**
     * Multiply a and self, a is on the left
     * @param  {qtek.math.Matrix3} a
     * @return {qtek.math.Matrix3}
     */
    multiplyLeft: function(a) {
        mat4$1.multiply(this._array, a._array, this._array);
        this._dirty = true;
        return this;
    },

    /**
     * Set as a orthographic projection matrix
     * @param  {number} left
     * @param  {number} right
     * @param  {number} bottom
     * @param  {number} top
     * @param  {number} near
     * @param  {number} far
     * @return {qtek.math.Matrix4}
     */
    ortho: function(left, right, bottom, top, near, far) {
        mat4$1.ortho(this._array, left, right, bottom, top, near, far);
        this._dirty = true;
        return this;
    },
    /**
     * Set as a perspective projection matrix
     * @param  {number} fovy
     * @param  {number} aspect
     * @param  {number} near
     * @param  {number} far
     * @return {qtek.math.Matrix4}
     */
    perspective: function(fovy, aspect, near, far) {
        mat4$1.perspective(this._array, fovy, aspect, near, far);
        this._dirty = true;
        return this;
    },

    /**
     * Rotate self by rad about axis.
     * Equal to right-multiply a rotaion matrix
     * @param  {number}   rad
     * @param  {qtek.math.Vector3} axis
     * @return {qtek.math.Matrix4}
     */
    rotate: function(rad, axis) {
        mat4$1.rotate(this._array, this._array, rad, axis._array);
        this._dirty = true;
        return this;
    },

    /**
     * Rotate self by a given radian about X axis.
     * Equal to right-multiply a rotaion matrix
     * @param {number} rad
     * @return {qtek.math.Matrix4}
     */
    rotateX: function(rad) {
        mat4$1.rotateX(this._array, this._array, rad);
        this._dirty = true;
        return this;
    },

    /**
     * Rotate self by a given radian about Y axis.
     * Equal to right-multiply a rotaion matrix
     * @param {number} rad
     * @return {qtek.math.Matrix4}
     */
    rotateY: function(rad) {
        mat4$1.rotateY(this._array, this._array, rad);
        this._dirty = true;
        return this;
    },

    /**
     * Rotate self by a given radian about Z axis.
     * Equal to right-multiply a rotaion matrix
     * @param {number} rad
     * @return {qtek.math.Matrix4}
     */
    rotateZ: function(rad) {
        mat4$1.rotateZ(this._array, this._array, rad);
        this._dirty = true;
        return this;
    },

    /**
     * Scale self by s
     * Equal to right-multiply a scale matrix
     * @param  {qtek.math.Vector3}  s
     * @return {qtek.math.Matrix4}
     */
    scale: function(v) {
        mat4$1.scale(this._array, this._array, v._array);
        this._dirty = true;
        return this;
    },

    /**
     * Translate self by v.
     * Equal to right-multiply a translate matrix
     * @param  {qtek.math.Vector3}  v
     * @return {qtek.math.Matrix4}
     */
    translate: function(v) {
        mat4$1.translate(this._array, this._array, v._array);
        this._dirty = true;
        return this;
    },

    /**
     * Transpose self, in-place.
     * @return {qtek.math.Matrix2}
     */
    transpose: function() {
        mat4$1.transpose(this._array, this._array);
        this._dirty = true;
        return this;
    },

    /**
     * Decompose a matrix to SRT
     * @param {qtek.math.Vector3} [scale]
     * @param {qtek.math.Quaternion} rotation
     * @param {qtek.math.Vector} position
     * @see http://msdn.microsoft.com/en-us/library/microsoft.xna.framework.matrix.decompose.aspx
     */
    decomposeMatrix: (function() {

        var x = vec3$3.create();
        var y = vec3$3.create();
        var z = vec3$3.create();

        var m3 = mat3.create();

        return function(scale, rotation, position) {

            var el = this._array;
            vec3$3.set(x, el[0], el[1], el[2]);
            vec3$3.set(y, el[4], el[5], el[6]);
            vec3$3.set(z, el[8], el[9], el[10]);

            var sx = vec3$3.length(x);
            var sy = vec3$3.length(y);
            var sz = vec3$3.length(z);

            // if determine is negative, we need to invert one scale
            var det = this.determinant();
            if (det < 0) {
                sx = -sx;
            }

            if (scale) {
                scale.set(sx, sy, sz);
            }

            position.set(el[12], el[13], el[14]);

            mat3.fromMat4(m3, el);
            // Not like mat4, mat3 in glmatrix seems to be row-based
            // Seems fixed in gl-matrix 2.2.2
            // https://github.com/toji/gl-matrix/issues/114
            // mat3.transpose(m3, m3);

            m3[0] /= sx;
            m3[1] /= sx;
            m3[2] /= sx;

            m3[3] /= sy;
            m3[4] /= sy;
            m3[5] /= sy;

            m3[6] /= sz;
            m3[7] /= sz;
            m3[8] /= sz;

            quat.fromMat3(rotation._array, m3);
            quat.normalize(rotation._array, rotation._array);

            rotation._dirty = true;
            position._dirty = true;
        };
    })(),

    toString: function() {
        return '[' + Array.prototype.join.call(this._array, ',') + ']';
    },

    toArray: function () {
        return Array.prototype.slice.call(this._array);
    }
};

var defineProperty$1 = Object.defineProperty;

if (defineProperty$1) {
    var proto$1 = Matrix4.prototype;
    /**
     * Z Axis of local transform
     * @name z
     * @type {qtek.math.Vector3}
     * @memberOf qtek.math.Matrix4
     * @instance
     */
    defineProperty$1(proto$1, 'z', {
        get: function () {
            var el = this._array;
            this._axisZ.set(el[8], el[9], el[10]);
            return this._axisZ;
        },
        set: function (v) {
            // TODO Here has a problem
            // If only set an item of vector will not work
            var el = this._array;
            v = v._array;
            el[8] = v[0];
            el[9] = v[1];
            el[10] = v[2];

            this._dirty = true;
        }
    });

    /**
     * Y Axis of local transform
     * @name y
     * @type {qtek.math.Vector3}
     * @memberOf qtek.math.Matrix4
     * @instance
     */
    defineProperty$1(proto$1, 'y', {
        get: function () {
            var el = this._array;
            this._axisY.set(el[4], el[5], el[6]);
            return this._axisY;
        },
        set: function (v) {
            var el = this._array;
            v = v._array;
            el[4] = v[0];
            el[5] = v[1];
            el[6] = v[2];

            this._dirty = true;
        }
    });

    /**
     * X Axis of local transform
     * @name x
     * @type {qtek.math.Vector3}
     * @memberOf qtek.math.Matrix4
     * @instance
     */
    defineProperty$1(proto$1, 'x', {
        get: function () {
            var el = this._array;
            this._axisX.set(el[0], el[1], el[2]);
            return this._axisX;
        },
        set: function (v) {
            var el = this._array;
            v = v._array;
            el[0] = v[0];
            el[1] = v[1];
            el[2] = v[2];

            this._dirty = true;
        }
    });
}

/**
 * @param  {qtek.math.Matrix4} out
 * @param  {qtek.math.Matrix4} a
 * @return {qtek.math.Matrix4}
 */
Matrix4.adjoint = function(out, a) {
    mat4$1.adjoint(out._array, a._array);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Matrix4} out
 * @param  {qtek.math.Matrix4} a
 * @return {qtek.math.Matrix4}
 */
Matrix4.copy = function(out, a) {
    mat4$1.copy(out._array, a._array);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Matrix4} a
 * @return {number}
 */
Matrix4.determinant = function(a) {
    return mat4$1.determinant(a._array);
};

/**
 * @param  {qtek.math.Matrix4} out
 * @return {qtek.math.Matrix4}
 */
Matrix4.identity = function(out) {
    mat4$1.identity(out._array);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Matrix4} out
 * @param  {number}  left
 * @param  {number}  right
 * @param  {number}  bottom
 * @param  {number}  top
 * @param  {number}  near
 * @param  {number}  far
 * @return {qtek.math.Matrix4}
 */
Matrix4.ortho = function(out, left, right, bottom, top, near, far) {
    mat4$1.ortho(out._array, left, right, bottom, top, near, far);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Matrix4} out
 * @param  {number}  fovy
 * @param  {number}  aspect
 * @param  {number}  near
 * @param  {number}  far
 * @return {qtek.math.Matrix4}
 */
Matrix4.perspective = function(out, fovy, aspect, near, far) {
    mat4$1.perspective(out._array, fovy, aspect, near, far);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Matrix4} out
 * @param  {qtek.math.Vector3} eye
 * @param  {qtek.math.Vector3} center
 * @param  {qtek.math.Vector3} up
 * @return {qtek.math.Matrix4}
 */
Matrix4.lookAt = function(out, eye, center, up) {
    mat4$1.lookAt(out._array, eye._array, center._array, up._array);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Matrix4} out
 * @param  {qtek.math.Matrix4} a
 * @return {qtek.math.Matrix4}
 */
Matrix4.invert = function(out, a) {
    mat4$1.invert(out._array, a._array);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Matrix4} out
 * @param  {qtek.math.Matrix4} a
 * @param  {qtek.math.Matrix4} b
 * @return {qtek.math.Matrix4}
 */
Matrix4.mul = function(out, a, b) {
    mat4$1.mul(out._array, a._array, b._array);
    out._dirty = true;
    return out;
};

/**
 * @method
 * @param  {qtek.math.Matrix4} out
 * @param  {qtek.math.Matrix4} a
 * @param  {qtek.math.Matrix4} b
 * @return {qtek.math.Matrix4}
 */
Matrix4.multiply = Matrix4.mul;

/**
 * @param  {qtek.math.Matrix4}    out
 * @param  {qtek.math.Quaternion} q
 * @return {qtek.math.Matrix4}
 */
Matrix4.fromQuat = function(out, q) {
    mat4$1.fromQuat(out._array, q._array);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Matrix4}    out
 * @param  {qtek.math.Quaternion} q
 * @param  {qtek.math.Vector3}    v
 * @return {qtek.math.Matrix4}
 */
Matrix4.fromRotationTranslation = function(out, q, v) {
    mat4$1.fromRotationTranslation(out._array, q._array, v._array);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Matrix4} m4
 * @param  {qtek.math.Matrix2d} m2d
 * @return {qtek.math.Matrix4}
 */
Matrix4.fromMat2d = function(m4, m2d) {
    m4._dirty = true;
    var m2d = m2d._array;
    var m4 = m4._array;

    m4[0] = m2d[0];
    m4[4] = m2d[2];
    m4[12] = m2d[4];

    m4[1] = m2d[1];
    m4[5] = m2d[3];
    m4[13] = m2d[5];

    return m4;
};

/**
 * @param  {qtek.math.Matrix4} out
 * @param  {qtek.math.Matrix4} a
 * @param  {number}  rad
 * @param  {qtek.math.Vector3} axis
 * @return {qtek.math.Matrix4}
 */
Matrix4.rotate = function(out, a, rad, axis) {
    mat4$1.rotate(out._array, a._array, rad, axis._array);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Matrix4} out
 * @param  {qtek.math.Matrix4} a
 * @param  {number}  rad
 * @return {qtek.math.Matrix4}
 */
Matrix4.rotateX = function(out, a, rad) {
    mat4$1.rotateX(out._array, a._array, rad);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Matrix4} out
 * @param  {qtek.math.Matrix4} a
 * @param  {number}  rad
 * @return {qtek.math.Matrix4}
 */
Matrix4.rotateY = function(out, a, rad) {
    mat4$1.rotateY(out._array, a._array, rad);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Matrix4} out
 * @param  {qtek.math.Matrix4} a
 * @param  {number}  rad
 * @return {qtek.math.Matrix4}
 */
Matrix4.rotateZ = function(out, a, rad) {
    mat4$1.rotateZ(out._array, a._array, rad);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Matrix4} out
 * @param  {qtek.math.Matrix4} a
 * @param  {qtek.math.Vector3} v
 * @return {qtek.math.Matrix4}
 */
Matrix4.scale = function(out, a, v) {
    mat4$1.scale(out._array, a._array, v._array);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Matrix4} out
 * @param  {qtek.math.Matrix4} a
 * @return {qtek.math.Matrix4}
 */
Matrix4.transpose = function(out, a) {
    mat4$1.transpose(out._array, a._array);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Matrix4} out
 * @param  {qtek.math.Matrix4} a
 * @param  {qtek.math.Vector3} v
 * @return {qtek.math.Matrix4}
 */
Matrix4.translate = function(out, a, v) {
    mat4$1.translate(out._array, a._array, v._array);
    out._dirty = true;
    return out;
};

var DIRTY_PREFIX = '__dt__';

var Cache = function () {

    this._contextId = 0;

    this._caches = [];

    this._context = {};
};

Cache.prototype = {

    use: function (contextId, documentSchema) {
        var caches = this._caches;
        if (!caches[contextId]) {
            caches[contextId] = {};

            if (documentSchema) {
                caches[contextId] = documentSchema();
            }
        }
        this._contextId = contextId;

        this._context = caches[contextId];
    },

    put: function (key, value) {
        this._context[key] = value;
    },

    get: function (key) {
        return this._context[key];
    },

    dirty: function (field) {
        field = field || '';
        var key = DIRTY_PREFIX + field;
        this.put(key, true);
    },

    dirtyAll: function (field) {
        field = field || '';
        var key = DIRTY_PREFIX + field;
        var caches = this._caches;
        for (var i = 0; i < caches.length; i++) {
            if (caches[i]) {
                caches[i][key] = true;
            }
        }
    },

    fresh: function (field) {
        field = field || '';
        var key = DIRTY_PREFIX + field;
        this.put(key, false);
    },

    freshAll: function (field) {
        field = field || '';
        var key = DIRTY_PREFIX + field;
        var caches = this._caches;
        for (var i = 0; i < caches.length; i++) {
            if (caches[i]) {
                caches[i][key] = false;
            }
        }
    },

    isDirty: function (field) {
        field = field || '';
        var key = DIRTY_PREFIX + field;
        var context = this._context;
        return  !context.hasOwnProperty(key)
            || context[key] === true;
    },

    deleteContext: function (contextId) {
        delete this._caches[contextId];
        this._context = {};
    },

    delete: function (key) {
        delete this._context[key];
    },

    clearAll: function () {
        this._caches = {};
    },

    getContext: function () {
        return this._context;
    },

    eachContext : function (cb, context) {
        var keys = Object.keys(this._caches);
        keys.forEach(function (key) {
            cb && cb.call(context, key);
        });
    },

    miss: function (key) {
        return ! this._context.hasOwnProperty(key);
    }
};

Cache.prototype.constructor = Cache;

/**
 * Mainly do the parse and compile of shader string
 * Support shader code chunk import and export
 * Support shader semantics
 * http://www.nvidia.com/object/using_sas.html
 * https://github.com/KhronosGroup/collada2json/issues/45
 *
 * TODO: Use etpl or other string template engine
 */
var mat2 = glmatrix.mat2;
var mat3$1 = glmatrix.mat3;
var mat4$2 = glmatrix.mat4;

var uniformRegex = /uniform\s+(bool|float|int|vec2|vec3|vec4|ivec2|ivec3|ivec4|mat2|mat3|mat4|sampler2D|samplerCube)\s+([\w\,]+)?(\[.*?\])?\s*(:\s*([\S\s]+?))?;/g;
var attributeRegex = /attribute\s+(float|int|vec2|vec3|vec4)\s+(\w*)\s*(:\s*(\w+))?;/g;
var defineRegex = /#define\s+(\w+)?(\s+[\w-.]+)?\s*;?\s*\n/g;
var loopRegex = /for\s*?\(int\s*?_idx_\s*\=\s*([\w-]+)\;\s*_idx_\s*<\s*([\w-]+);\s*_idx_\s*\+\+\s*\)\s*\{\{([\s\S]+?)(?=\}\})\}\}/g;

var uniformTypeMap = {
    'bool': '1i',
    'int': '1i',
    'sampler2D': 't',
    'samplerCube': 't',
    'float': '1f',
    'vec2': '2f',
    'vec3': '3f',
    'vec4': '4f',
    'ivec2': '2i',
    'ivec3': '3i',
    'ivec4': '4i',
    'mat2': 'm2',
    'mat3': 'm3',
    'mat4': 'm4'
};

var uniformValueConstructor = {
    'bool': function () {return true;},
    'int': function () {return 0;},
    'float': function () {return 0;},
    'sampler2D': function () {return null;},
    'samplerCube': function () {return null;},

    'vec2': function () {return [0, 0];},
    'vec3': function () {return [0, 0, 0];},
    'vec4': function () {return [0, 0, 0, 0];},

    'ivec2': function () {return [0, 0];},
    'ivec3': function () {return [0, 0, 0];},
    'ivec4': function () {return [0, 0, 0, 0];},

    'mat2': function () {return mat2.create();},
    'mat3': function () {return mat3$1.create();},
    'mat4': function () {return mat4$2.create();},

    'array': function () {return [];}
};

var attribSemantics = [
    'POSITION',
    'NORMAL',
    'BINORMAL',
    'TANGENT',
    'TEXCOORD',
    'TEXCOORD_0',
    'TEXCOORD_1',
    'COLOR',
    // Skinning
    // https://github.com/KhronosGroup/glTF/blob/master/specification/README.md#semantics
    'JOINT',
    'WEIGHT'
];
var uniformSemantics = [
    'SKIN_MATRIX',
    // Information about viewport
    'VIEWPORT_SIZE',
    'VIEWPORT',
    'DEVICEPIXELRATIO',
    // Window size for window relative coordinate
    // https://www.opengl.org/sdk/docs/man/html/gl_FragCoord.xhtml
    'WINDOW_SIZE',
    // Infomation about camera
    'NEAR',
    'FAR',
    // Time
    'TIME'
];
var matrixSemantics = [
    'WORLD',
    'VIEW',
    'PROJECTION',
    'WORLDVIEW',
    'VIEWPROJECTION',
    'WORLDVIEWPROJECTION',
    'WORLDINVERSE',
    'VIEWINVERSE',
    'PROJECTIONINVERSE',
    'WORLDVIEWINVERSE',
    'VIEWPROJECTIONINVERSE',
    'WORLDVIEWPROJECTIONINVERSE',
    'WORLDTRANSPOSE',
    'VIEWTRANSPOSE',
    'PROJECTIONTRANSPOSE',
    'WORLDVIEWTRANSPOSE',
    'VIEWPROJECTIONTRANSPOSE',
    'WORLDVIEWPROJECTIONTRANSPOSE',
    'WORLDINVERSETRANSPOSE',
    'VIEWINVERSETRANSPOSE',
    'PROJECTIONINVERSETRANSPOSE',
    'WORLDVIEWINVERSETRANSPOSE',
    'VIEWPROJECTIONINVERSETRANSPOSE',
    'WORLDVIEWPROJECTIONINVERSETRANSPOSE'
];

// Enable attribute operation is global to all programs
// Here saved the list of all enabled attribute index
// http://www.mjbshaw.com/2013/03/webgl-fixing-invalidoperation.html
var enabledAttributeList = {};

var SHADER_STATE_TO_ENABLE = 1;
var SHADER_STATE_KEEP_ENABLE = 2;
var SHADER_STATE_PENDING = 3;

/**
 * @constructor
 * @extends qtek.core.Base
 * @alias qtek.Shader
 * @example
 * // Create a phong shader
 * var shader = new qtek.Shader({
 *     vertex: qtek.Shader.source('qtek.phong.vertex'),
 *     fragment: qtek.Shader.source('qtek.phong.fragment')
 * });
 * // Enable diffuse texture
 * shader.enableTexture('diffuseMap');
 * // Use alpha channel in diffuse texture
 * shader.define('fragment', 'DIFFUSEMAP_ALPHA_ALPHA');
 */
var Shader = Base.extend(function () {
    return /** @lends qtek.Shader# */ {
        /**
         * Vertex shader code
         * @type {string}
         */
        vertex: '',

        /**
         * Fragment shader code
         * @type {string}
         */
        fragment: '',


        // FIXME mediump is toooooo low for depth on mobile
        precision: 'highp',

        // Properties follow will be generated by the program
        attribSemantics: {},
        matrixSemantics: {},
        uniformSemantics: {},
        matrixSemanticKeys: [],

        uniformTemplates: {},
        attributeTemplates: {},

        /**
         * Custom defined values in the vertex shader
         * @type {Object}
         */
        vertexDefines: {},
        /**
         * Custom defined values in the vertex shader
         * @type {Object}
         */
        fragmentDefines: {},

        /**
         * Enabled extensions
         * @type {Array.<string>}
         */
        extensions: [
            'OES_standard_derivatives',
            'EXT_shader_texture_lod'
        ],

        /**
         * Used light group. default is all zero
         */
        lightGroup: 0,

        // Defines the each type light number in the scene
        // AMBIENT_LIGHT
        // AMBIENT_SH_LIGHT
        // AMBIENT_CUBEMAP_LIGHT
        // POINT_LIGHT
        // SPOT_LIGHT
        // AREA_LIGHT
        lightNumber: {},

        _textureSlot: 0,

        _attacheMaterialNumber: 0,

        _uniformList: [],
        // {
        //  enabled: true
        //  shaderType: "vertex",
        // }
        _textureStatus: {},

        _vertexProcessed: '',
        _fragmentProcessed: '',

        _currentLocationsMap: {}
    };
}, function () {

    this._cache = new Cache();

    // All context use same code
    this._codeDirty = true;

    this._updateShaderString();
},
/** @lends qtek.Shader.prototype */
{
    /**
     * If code is equal with given shader.
     * @param {qtek.Shader}
     * @return {boolean}
     */
    isEqual: function (otherShader) {
        if (!otherShader) {
            return false;
        }
        if (this === otherShader) {
            // Still needs update and rebind if dirty.
            return !this._codeDirty;
        }
        if (otherShader._codeDirty) {
            otherShader._updateShaderString();
        }
        if (this._codeDirty) {
            this._updateShaderString();
        }
        return !(otherShader._vertexProcessed !== this._vertexProcessed
            || otherShader._fragmentProcessed !== this._fragmentProcessed);
    },
    /**
     * Set vertex shader code
     * @param {string} str
     */
    setVertex: function (str) {
        this.vertex = str;
        this._updateShaderString();
        this.dirty();
    },

    /**
     * Set fragment shader code
     * @param {string} str
     */
    setFragment: function (str) {
        this.fragment = str;
        this._updateShaderString();
        this.dirty();
    },

    /**
     * Bind shader program
     * Return true or error msg if error happened
     * @param {qtek.Renderer} renderer
     */
    bind: function (renderer) {
        var cache = this._cache;
        var _gl = renderer.gl;
        cache.use(renderer.__GUID__, getCacheSchema);

        this._currentLocationsMap = cache.get('locations');

        // Reset slot
        this._textureSlot = 0;

        if (this._codeDirty) {
            // PENDING
            // var availableExts = [];
            // var extensions = this.extensions;
            // for (var i = 0; i < extensions.length; i++) {
            //     if (glInfo.getExtension(_gl, extensions[i])) {
            //         availableExts.push(extensions[i]);
            //     }
            // }
            this._updateShaderString();
        }

        if (cache.isDirty('program')) {
            var errMsg = this._buildProgram(_gl, this._vertexProcessed, this._fragmentProcessed);
            cache.fresh('program');

            if (errMsg) {
                return errMsg;
            }
        }

        _gl.useProgram(cache.get('program'));
    },

    /**
     * Mark dirty and update program in next frame
     */
    dirty: function () {
        var cache = this._cache;
        this._codeDirty = true;
        cache.dirtyAll('program');
        for (var i = 0; i < cache._caches.length; i++) {
            if (cache._caches[i]) {
                var context = cache._caches[i];
                context['locations'] = {};
                context['attriblocations'] = {};
            }
        }
    },

    _updateShaderString: function (exts) {

        if (this.vertex !== this._vertexPrev ||
            this.fragment !== this._fragmentPrev
        ) {

            this._parseImport();

            this.attribSemantics = {};
            this.matrixSemantics = {};
            this._textureStatus = {};

            this._parseUniforms();
            this._parseAttributes();
            this._parseDefines();

            this._vertexPrev = this.vertex;
            this._fragmentPrev = this.fragment;
        }

        this._addDefineExtensionAndPrecision(exts);

        this._vertexProcessed = this._unrollLoop(this._vertexProcessed, this.vertexDefines);
        this._fragmentProcessed = this._unrollLoop(this._fragmentProcessed, this.fragmentDefines);

        this._codeDirty = false;
    },

    /**
     * Add a #define macro in shader code
     * @param  {string} shaderType Can be vertex, fragment or both
     * @param  {string} symbol
     * @param  {number} [val]
     */
    define: function (shaderType, symbol, val) {
        var vertexDefines = this.vertexDefines;
        var fragmentDefines = this.fragmentDefines;
        if (shaderType !== 'vertex' && shaderType !== 'fragment' && shaderType !== 'both'
            && arguments.length < 3
        ) {
            // shaderType default to be 'both'
            val = symbol;
            symbol = shaderType;
            shaderType = 'both';
        }
        val = val != null ? val : null;
        if (shaderType === 'vertex' || shaderType === 'both') {
            if (vertexDefines[symbol] !== val) {
                vertexDefines[symbol] = val;
                // Mark as dirty
                this.dirty();
            }
        }
        if (shaderType === 'fragment' || shaderType === 'both') {
            if (fragmentDefines[symbol] !== val) {
                fragmentDefines[symbol] = val;
                if (shaderType !== 'both') {
                    this.dirty();
                }
            }
        }
    },

    /**
     * Remove a #define macro in shader code
     * @param  {string} shaderType Can be vertex, fragment or both
     * @param  {string} symbol
     */
    undefine: function (shaderType, symbol) {
        if (shaderType !== 'vertex' && shaderType !== 'fragment' && shaderType !== 'both'
            && arguments.length < 2
        ) {
            // shaderType default to be 'both'
            symbol = shaderType;
            shaderType = 'both';
        }
        if (shaderType === 'vertex' || shaderType === 'both') {
            if (this.isDefined('vertex', symbol)) {
                delete this.vertexDefines[symbol];
                // Mark as dirty
                this.dirty();
            }
        }
        if (shaderType === 'fragment' || shaderType === 'both') {
            if (this.isDefined('fragment', symbol)) {
                delete this.fragmentDefines[symbol];
                if (shaderType !== 'both') {
                    this.dirty();
                }
            }
        }
    },

    /**
     * If macro is defined in shader.
     * @param  {string} shaderType Can be vertex, fragment or both
     * @param  {string} symbol
     */
    isDefined: function (shaderType, symbol) {
        switch (shaderType) {
            case 'vertex':
                return this.vertexDefines[symbol] !== undefined;
            case 'fragment':
                return this.fragmentDefines[symbol] !== undefined;
        }
    },
    /**
     * Get macro value defined in shader.
     * @param  {string} shaderType Can be vertex, fragment or both
     * @param  {string} symbol
     */
    getDefine: function (shaderType, symbol) {
        switch(shaderType) {
            case 'vertex':
                return this.vertexDefines[symbol];
            case 'fragment':
                return this.fragmentDefines[symbol];
        }
    },
    /**
     * Enable a texture, actually it will add a #define macro in the shader code
     * For example, if texture symbol is diffuseMap, it will add a line `#define DIFFUSEMAP_ENABLED` in the shader code
     * @param  {string} symbol
     */
    enableTexture: function (symbol) {
        if (Array.isArray(symbol)) {
            for (var i = 0; i < symbol.length; i++) {
                this.enableTexture(symbol[i]);
            }
            return;
        }

        var status = this._textureStatus[symbol];
        if (status) {
            var isEnabled = status.enabled;
            if (!isEnabled) {
                status.enabled = true;
                this.dirty();
            }
        }
    },
    /**
     * Enable all textures used in the shader
     */
    enableTexturesAll: function () {
        var textureStatus = this._textureStatus;
        for (var symbol in textureStatus) {
            textureStatus[symbol].enabled = true;
        }

        this.dirty();
    },
    /**
     * Disable a texture, it remove a #define macro in the shader
     * @param  {string} symbol
     */
    disableTexture: function (symbol) {
        if (Array.isArray(symbol)) {
            for (var i = 0; i < symbol.length; i++) {
                this.disableTexture(symbol[i]);
            }
            return;
        }

        var status = this._textureStatus[symbol];
        if (status) {
            var isDisabled = ! status.enabled;
            if (!isDisabled) {
                status.enabled = false;
                this.dirty();
            }
        }
    },
    /**
     * Disable all textures used in the shader
     */
    disableTexturesAll: function () {
        var textureStatus = this._textureStatus;
        for (var symbol in textureStatus) {
            textureStatus[symbol].enabled = false;
        }

        this.dirty();
    },
    /**
     * If texture of given type is enabled.
     * @param  {string}  symbol
     * @return {boolean}
     */
    isTextureEnabled: function (symbol) {
        var textureStatus = this._textureStatus;
        return !!textureStatus[symbol]
            && textureStatus[symbol].enabled;
    },

    /**
     * Get all enabled textures
     * @return {string[]}
     */
    getEnabledTextures: function () {
        var enabledTextures = [];
        var textureStatus = this._textureStatus;
        for (var symbol in textureStatus) {
            if (textureStatus[symbol].enabled) {
                enabledTextures.push(symbol);
            }
        }
        return enabledTextures;
    },

    hasUniform: function (symbol) {
        var location = this._currentLocationsMap[symbol];
        return location !== null && location !== undefined;
    },

    currentTextureSlot: function () {
        return this._textureSlot;
    },

    resetTextureSlot: function (slot) {
        this._textureSlot = slot || 0;
    },

    takeCurrentTextureSlot: function (_gl, texture) {
        var textureSlot = this._textureSlot;

        this.useTextureSlot(_gl, texture, textureSlot);

        this._textureSlot++;

        return textureSlot;
    },

    useTextureSlot: function (renderer, texture, slot) {
        if (texture) {
            renderer.gl.activeTexture(renderer.gl.TEXTURE0 + slot);
            // Maybe texture is not loaded yet;
            if (texture.isRenderable()) {
                texture.bind(renderer);
            }
            else {
                // Bind texture to null
                texture.unbind(renderer);
            }
        }
    },

    setUniform: function (_gl, type, symbol, value) {
        var locationMap = this._currentLocationsMap;
        var location = locationMap[symbol];
        // Uniform is not existed in the shader
        if (location === null || location === undefined) {
            return false;
        }
        switch (type) {
            case 'm4':
                // The matrix must be created by glmatrix and can pass it directly.
                _gl.uniformMatrix4fv(location, false, value);
                break;
            case '2i':
                _gl.uniform2i(location, value[0], value[1]);
                break;
            case '2f':
                _gl.uniform2f(location, value[0], value[1]);
                break;
            case '3i':
                _gl.uniform3i(location, value[0], value[1], value[2]);
                break;
            case '3f':
                _gl.uniform3f(location, value[0], value[1], value[2]);
                break;
            case '4i':
                _gl.uniform4i(location, value[0], value[1], value[2], value[3]);
                break;
            case '4f':
                _gl.uniform4f(location, value[0], value[1], value[2], value[3]);
                break;
            case '1i':
                _gl.uniform1i(location, value);
                break;
            case '1f':
                _gl.uniform1f(location, value);
                break;
            case '1fv':
                _gl.uniform1fv(location, value);
                break;
            case '1iv':
                _gl.uniform1iv(location, value);
                break;
            case '2iv':
                _gl.uniform2iv(location, value);
                break;
            case '2fv':
                _gl.uniform2fv(location, value);
                break;
            case '3iv':
                _gl.uniform3iv(location, value);
                break;
            case '3fv':
                _gl.uniform3fv(location, value);
                break;
            case '4iv':
                _gl.uniform4iv(location, value);
                break;
            case '4fv':
                _gl.uniform4fv(location, value);
                break;
            case 'm2':
            case 'm2v':
                _gl.uniformMatrix2fv(location, false, value);
                break;
            case 'm3':
            case 'm3v':
                _gl.uniformMatrix3fv(location, false, value);
                break;
            case 'm4v':
                // Raw value
                if (Array.isArray(value)) {
                    var array = new vendor.Float32Array(value.length * 16);
                    var cursor = 0;
                    for (var i = 0; i < value.length; i++) {
                        var item = value[i];
                        for (var j = 0; j < 16; j++) {
                            array[cursor++] = item[j];
                        }
                    }
                    _gl.uniformMatrix4fv(location, false, array);
                }
                else if (value instanceof vendor.Float32Array) {   // ArrayBufferView
                    _gl.uniformMatrix4fv(location, false, value);
                }
                break;
        }
        return true;
    },

    setUniformOfSemantic: function (_gl, semantic, val) {
        var semanticInfo = this.uniformSemantics[semantic];
        if (semanticInfo) {
            return this.setUniform(_gl, semanticInfo.type, semanticInfo.symbol, val);
        }
        return false;
    },

    // Used for creating VAO
    // Enable the attributes passed in and disable the rest
    // Example Usage:
    // enableAttributes(renderer, ["position", "texcoords"])
    enableAttributes: function (renderer, attribList, vao) {
        var _gl = renderer.gl;
        var program = this._cache.get('program');

        var locationMap = this._cache.get('attriblocations');

        var enabledAttributeListInContext;
        if (vao) {
            enabledAttributeListInContext = vao.__enabledAttributeList;
        }
        else {
            enabledAttributeListInContext = enabledAttributeList[renderer.__GUID__];
        }
        if (! enabledAttributeListInContext) {
            // In vertex array object context
            // PENDING Each vao object needs to enable attributes again?
            if (vao) {
                enabledAttributeListInContext
                    = vao.__enabledAttributeList
                    = [];
            }
            else {
                enabledAttributeListInContext
                    = enabledAttributeList[renderer.__GUID__]
                    = [];
            }
        }
        var locationList = [];
        for (var i = 0; i < attribList.length; i++) {
            var symbol = attribList[i];
            if (!this.attributeTemplates[symbol]) {
                locationList[i] = -1;
                continue;
            }
            var location = locationMap[symbol];
            if (location === undefined) {
                location = _gl.getAttribLocation(program, symbol);
                // Attrib location is a number from 0 to ...
                if (location === -1) {
                    locationList[i] = -1;
                    continue;
                }
                locationMap[symbol] = location;
            }
            locationList[i] = location;

            if (!enabledAttributeListInContext[location]) {
                enabledAttributeListInContext[location] = SHADER_STATE_TO_ENABLE;
            }
            else {
                enabledAttributeListInContext[location] = SHADER_STATE_KEEP_ENABLE;
            }
        }

        for (var i = 0; i < enabledAttributeListInContext.length; i++) {
            switch(enabledAttributeListInContext[i]){
                case SHADER_STATE_TO_ENABLE:
                    _gl.enableVertexAttribArray(i);
                    enabledAttributeListInContext[i] = SHADER_STATE_PENDING;
                    break;
                case SHADER_STATE_KEEP_ENABLE:
                    enabledAttributeListInContext[i] = SHADER_STATE_PENDING;
                    break;
                // Expired
                case SHADER_STATE_PENDING:
                    _gl.disableVertexAttribArray(i);
                    enabledAttributeListInContext[i] = 0;
                    break;
            }
        }

        return locationList;
    },

    _parseImport: function () {

        this._vertexProcessedWithoutDefine = Shader.parseImport(this.vertex);
        this._fragmentProcessedWithoutDefine = Shader.parseImport(this.fragment);

    },

    _addDefineExtensionAndPrecision: function (exts) {

        exts = exts || this.extensions;
        // Extension declaration must before all non-preprocessor codes
        // TODO vertex ? extension enum ?
        var extensionStr = [];
        for (var i = 0; i < exts.length; i++) {
            extensionStr.push('#extension GL_' + exts[i] + ' : enable');
        }

        // Add defines
        // VERTEX
        var defineStr = this._getDefineStr(this.vertexDefines);
        this._vertexProcessed = defineStr + '\n' + this._vertexProcessedWithoutDefine;

        // FRAGMENT
        defineStr = this._getDefineStr(this.fragmentDefines);
        var code = defineStr + '\n' + this._fragmentProcessedWithoutDefine;

        // Add precision
        this._fragmentProcessed = extensionStr.join('\n') + '\n'
            + ['precision', this.precision, 'float'].join(' ') + ';\n'
            + ['precision', this.precision, 'int'].join(' ') + ';\n'
            // depth texture may have precision problem on iOS device.
            + ['precision', this.precision, 'sampler2D'].join(' ') + ';\n'
            + code;
    },

    _getDefineStr: function (defines) {

        var lightNumber = this.lightNumber;
        var textureStatus = this._textureStatus;
        var defineStr = [];
        for (var lightType in lightNumber) {
            var count = lightNumber[lightType];
            if (count > 0) {
                defineStr.push('#define ' + lightType.toUpperCase() + '_COUNT ' + count);
            }
        }
        for (var symbol in textureStatus) {
            var status = textureStatus[symbol];
            if (status.enabled) {
                defineStr.push('#define ' + symbol.toUpperCase() + '_ENABLED');
            }
        }
        // Custom Defines
        for (var symbol in defines) {
            var value = defines[symbol];
            if (value === null) {
                defineStr.push('#define ' + symbol);
            }
            else{
                defineStr.push('#define ' + symbol + ' ' + value.toString());
            }
        }
        return defineStr.join('\n');
    },

    _unrollLoop: function (shaderStr, defines) {
        // Loop unroll from three.js, https://github.com/mrdoob/three.js/blob/master/src/renderers/webgl/WebGLProgram.js#L175
        // In some case like shadowMap in loop use 'i' to index value much slower.

        // Loop use _idx_ and increased with _idx_++ will be unrolled
        // Use {{ }} to match the pair so the if statement will not be affected
        // Write like following
        // for (int _idx_ = 0; _idx_ < 4; _idx_++) {{
        //     vec3 color = texture2D(textures[_idx_], uv).rgb;
        // }}
        function replace(match, start, end, snippet) {
            var unroll = '';
            // Try to treat as define
            if (isNaN(start)) {
                if (start in defines) {
                    start = defines[start];
                }
                else {
                    start = lightNumberDefines[start];
                }
            }
            if (isNaN(end)) {
                if (end in defines) {
                    end = defines[end];
                }
                else {
                    end = lightNumberDefines[end];
                }
            }
            // TODO Error checking

            for (var idx = parseInt(start); idx < parseInt(end); idx++) {
                // PENDING Add scope?
                unroll += '{'
                    + snippet
                        .replace(/float\s*\(\s*_idx_\s*\)/g, idx.toFixed(1))
                        .replace(/_idx_/g, idx)
                + '}';
            }

            return unroll;
        }

        var lightNumberDefines = {};
        for (var lightType in this.lightNumber) {
            lightNumberDefines[lightType + '_COUNT'] = this.lightNumber[lightType];
        }
        return shaderStr.replace(loopRegex, replace);
    },

    _parseUniforms: function () {
        var uniforms = {};
        var self = this;
        var shaderType = 'vertex';
        this._uniformList = [];

        this._vertexProcessedWithoutDefine = this._vertexProcessedWithoutDefine.replace(uniformRegex, _uniformParser);
        shaderType = 'fragment';
        this._fragmentProcessedWithoutDefine = this._fragmentProcessedWithoutDefine.replace(uniformRegex, _uniformParser);

        self.matrixSemanticKeys = Object.keys(this.matrixSemantics);

        function _uniformParser(str, type, symbol, isArray, semanticWrapper, semantic) {
            if (type && symbol) {
                var uniformType = uniformTypeMap[type];
                var isConfigurable = true;
                var defaultValueFunc;
                if (uniformType) {
                    self._uniformList.push(symbol);
                    if (type === 'sampler2D' || type === 'samplerCube') {
                        // Texture is default disabled
                        self._textureStatus[symbol] = {
                            enabled: false,
                            shaderType: shaderType
                        };
                    }
                    if (isArray) {
                        uniformType += 'v';
                    }
                    if (semantic) {
                        // This case is only for SKIN_MATRIX
                        // TODO
                        if (attribSemantics.indexOf(semantic) >= 0) {
                            self.attribSemantics[semantic] = {
                                symbol: symbol,
                                type: uniformType
                            };
                            isConfigurable = false;
                        }
                        else if (matrixSemantics.indexOf(semantic) >= 0) {
                            var isTranspose = false;
                            var semanticNoTranspose = semantic;
                            if (semantic.match(/TRANSPOSE$/)) {
                                isTranspose = true;
                                semanticNoTranspose = semantic.slice(0, -9);
                            }
                            self.matrixSemantics[semantic] = {
                                symbol: symbol,
                                type: uniformType,
                                isTranspose: isTranspose,
                                semanticNoTranspose: semanticNoTranspose
                            };
                            isConfigurable = false;
                        }
                        else if (uniformSemantics.indexOf(semantic) >= 0) {
                            self.uniformSemantics[semantic] = {
                                symbol: symbol,
                                type: uniformType
                            };
                            isConfigurable = false;
                        }
                        else {
                            // The uniform is not configurable, which means it will not appear
                            // in the material uniform properties
                            if (semantic === 'unconfigurable') {
                                isConfigurable = false;
                            }
                            else {
                                // Uniform have a defalut value, like
                                // uniform vec3 color: [1, 1, 1];
                                defaultValueFunc = self._parseDefaultValue(type, semantic);
                                if (!defaultValueFunc) {
                                    throw new Error('Unkown semantic "' + semantic + '"');
                                }
                                else {
                                    semantic = '';
                                }
                            }
                        }
                    }

                    if (isConfigurable) {
                        uniforms[symbol] = {
                            type: uniformType,
                            value: isArray ? uniformValueConstructor['array'] : (defaultValueFunc || uniformValueConstructor[type]),
                            semantic: semantic || null
                        };
                    }
                }
                return ['uniform', type, symbol, isArray].join(' ') + ';\n';
            }
        }

        this.uniformTemplates = uniforms;
    },

    _parseDefaultValue: function (type, str) {
        var arrayRegex = /\[\s*(.*)\s*\]/;
        if (type === 'vec2' || type === 'vec3' || type === 'vec4') {
            var arrayStr = arrayRegex.exec(str)[1];
            if (arrayStr) {
                var arr = arrayStr.split(/\s*,\s*/);
                return function () {
                    return new vendor.Float32Array(arr);
                };
            }
            else {
                // Invalid value
                return;
            }
        }
        else if (type === 'bool') {
            return function () {
                return str.toLowerCase() === 'true' ? true : false;
            };
        }
        else if (type === 'float') {
            return function () {
                return parseFloat(str);
            };
        }
        else if (type === 'int') {
            return function () {
                return parseInt(str);
            };
        }
    },

    // Create a new uniform instance for material
    createUniforms: function () {
        var uniforms = {};

        for (var symbol in this.uniformTemplates){
            var uniformTpl = this.uniformTemplates[symbol];
            uniforms[symbol] = {
                type: uniformTpl.type,
                value: uniformTpl.value()
            };
        }

        return uniforms;
    },

    // Attached to material
    attached: function () {
        this._attacheMaterialNumber++;
    },

    // Detached to material
    detached: function () {
        this._attacheMaterialNumber--;
    },

    isAttachedToAny: function () {
        return this._attacheMaterialNumber !== 0;
    },

    _parseAttributes: function () {
        var attributes = {};
        var self = this;
        this._vertexProcessedWithoutDefine = this._vertexProcessedWithoutDefine.replace(
            attributeRegex, _attributeParser
        );

        function _attributeParser(str, type, symbol, semanticWrapper, semantic) {
            if (type && symbol) {
                var size = 1;
                switch (type) {
                    case 'vec4':
                        size = 4;
                        break;
                    case 'vec3':
                        size = 3;
                        break;
                    case 'vec2':
                        size = 2;
                        break;
                    case 'float':
                        size = 1;
                        break;
                }

                attributes[symbol] = {
                    // Can only be float
                    type: 'float',
                    size: size,
                    semantic: semantic || null
                };

                if (semantic) {
                    if (attribSemantics.indexOf(semantic) < 0) {
                        throw new Error('Unkown semantic "' + semantic + '"');
                    }
                    else {
                        self.attribSemantics[semantic] = {
                            symbol: symbol,
                            type: type
                        };
                    }
                }
            }

            return ['attribute', type, symbol].join(' ') + ';\n';
        }

        this.attributeTemplates = attributes;
    },

    _parseDefines: function () {
        var self = this;
        var shaderType = 'vertex';
        this._vertexProcessedWithoutDefine = this._vertexProcessedWithoutDefine.replace(defineRegex, _defineParser);
        shaderType = 'fragment';
        this._fragmentProcessedWithoutDefine = this._fragmentProcessedWithoutDefine.replace(defineRegex, _defineParser);

        function _defineParser(str, symbol, value) {
            var defines = shaderType === 'vertex' ? self.vertexDefines : self.fragmentDefines;
            if (!defines[symbol]) { // Haven't been defined by user
                if (value == 'false') {
                    defines[symbol] = false;
                }
                else if (value == 'true') {
                    defines[symbol] = true;
                }
                else {
                    defines[symbol] = value 
                        // If can parse to float
                        ? (isNaN(parseFloat(value)) ? value : parseFloat(value))
                        : null;
                }
            }
            return '';
        }
    },

    // Return true or error msg if error happened
    _buildProgram: function (_gl, vertexShaderString, fragmentShaderString) {
        var cache = this._cache;
        if (cache.get('program')) {
            _gl.deleteProgram(cache.get('program'));
        }
        var program = _gl.createProgram();

        var vertexShader = _gl.createShader(_gl.VERTEX_SHADER);
        _gl.shaderSource(vertexShader, vertexShaderString);
        _gl.compileShader(vertexShader);

        var fragmentShader = _gl.createShader(_gl.FRAGMENT_SHADER);
        _gl.shaderSource(fragmentShader, fragmentShaderString);
        _gl.compileShader(fragmentShader);

        var msg = checkShaderErrorMsg(_gl, vertexShader, vertexShaderString);
        if (msg) {
            return msg;
        }
        msg = checkShaderErrorMsg(_gl, fragmentShader, fragmentShaderString);
        if (msg) {
            return msg;
        }

        _gl.attachShader(program, vertexShader);
        _gl.attachShader(program, fragmentShader);
        // Force the position bind to location 0;
        if (this.attribSemantics['POSITION']) {
            _gl.bindAttribLocation(program, 0, this.attribSemantics['POSITION'].symbol);
        }
        else {
            // Else choose an attribute and bind to location 0;
            var keys = Object.keys(this.attributeTemplates);
            _gl.bindAttribLocation(program, 0, keys[0]);
        }

        _gl.linkProgram(program);

        if (!_gl.getProgramParameter(program, _gl.LINK_STATUS)) {
            return 'Could not link program\n' + 'VALIDATE_STATUS: ' + _gl.getProgramParameter(program, _gl.VALIDATE_STATUS) + ', gl error [' + _gl.getError() + ']';
        }

        // Cache uniform locations
        for (var i = 0; i < this._uniformList.length; i++) {
            var uniformSymbol = this._uniformList[i];
            var locationMap = cache.get('locations');
            locationMap[uniformSymbol] = _gl.getUniformLocation(program, uniformSymbol);
        }

        _gl.deleteShader(vertexShader);
        _gl.deleteShader(fragmentShader);

        cache.put('program', program);
    },

    /**
     * Clone a new shader
     * @return {qtek.Shader}
     */
    clone: function () {
        var shader = new Shader({
            vertex: this.vertex,
            fragment: this.fragment,
            vertexDefines: util.clone(this.vertexDefines),
            fragmentDefines: util.clone(this.fragmentDefines)
        });
        for (var name in this._textureStatus) {
            shader._textureStatus[name] = util.clone(this._textureStatus[name]);
        }
        return shader;
    },
    /**
     * Dispose given context
     * @param  {qtek.Renderer} renderer
     */
    dispose: function (renderer) {
        var cache = this._cache;

        cache.use(renderer.__GUID__);
        var program = cache.get('program');
        if (program) {
            renderer.gl.deleteProgram(program);
        }
        cache.deleteContext(renderer.__GUID__);

        this._locations = {};
    }
});

function getCacheSchema() {
    return {
        locations: {},
        attriblocations: {}
    };
}

// Return true or error msg if error happened
function checkShaderErrorMsg(_gl, shader, shaderString) {
    if (!_gl.getShaderParameter(shader, _gl.COMPILE_STATUS)) {
        return [_gl.getShaderInfoLog(shader), addLineNumbers(shaderString)].join('\n');
    }
}

// some util functions
function addLineNumbers(string) {
    var chunks = string.split('\n');
    for (var i = 0, il = chunks.length; i < il; i ++) {
        // Chrome reports shader errors on lines
        // starting counting from 1
        chunks[i] = (i + 1) + ': ' + chunks[i];
    }
    return chunks.join('\n');
}

var importRegex = /(@import)\s*([0-9a-zA-Z_\-\.]*)/g;
Shader.parseImport = function (shaderStr) {
    shaderStr = shaderStr.replace(importRegex, function (str, importSymbol, importName) {
        var str = Shader.source(importName);
        if (str) {
            // Recursively parse
            return Shader.parseImport(str);
        }
        else {
            console.error('Shader chunk "' + importName + '" not existed in library');
            return '';
        }
    });
    return shaderStr;
};

var exportRegex = /(@export)\s*([0-9a-zA-Z_\-\.]*)\s*\n([\s\S]*?)@end/g;

/**
 * Import shader source
 * @param  {string} shaderStr
 * @memberOf qtek.Shader
 */
Shader['import'] = function (shaderStr) {
    shaderStr.replace(exportRegex, function (str, exportSymbol, exportName, code) {
        var code = code.replace(/(^[\s\t\xa0\u3000]+)|([\u3000\xa0\s\t]+\x24)/g, '');
        if (code) {
            var parts = exportName.split('.');
            var obj = Shader.codes;
            var i = 0;
            var key;
            while (i < parts.length - 1) {
                key = parts[i++];
                if (!obj[key]) {
                    obj[key] = {};
                }
                obj = obj[key];
            }
            key = parts[i];
            obj[key] = code;
        }
        return code;
    });
};

/**
 * Library to store all the loaded shader codes
 * @type {Object}
 * @readOnly
 * @memberOf qtek.Shader
 */
Shader.codes = {};

/**
 * Get shader source
 * @param  {string} name
 * @return {string}
 */
Shader.source = function (name) {
    var parts = name.split('.');
    var obj = Shader.codes;
    var i = 0;
    while (obj && i < parts.length) {
        var key = parts[i++];
        obj = obj[key];
    }
    if (typeof obj !== 'string') {
        // FIXME Use default instead
        console.error('Shader "' + name + '" not existed in library');
        return '';
    }
    return obj;
};

/**
 * @export{Object} library
 */
/**
 * @alias qtek.shader.library
 */

/**
 * Base class for all textures like compressed texture, texture2d, texturecube
 * TODO mapping
 */
/**
 * @constructor
 * @alias qtek.Texture
 * @extends qtek.core.Base
 */
var Texture = Base.extend(
/** @lends qtek.Texture# */
{
    /**
     * Texture width, readonly when the texture source is image
     * @type {number}
     */
    width: 512,
    /**
     * Texture height, readonly when the texture source is image
     * @type {number}
     */
    height: 512,
    /**
     * Texel data type.
     * Possible values:
     *  + {@link qtek.Texture.UNSIGNED_BYTE}
     *  + {@link qtek.Texture.HALF_FLOAT}
     *  + {@link qtek.Texture.FLOAT}
     *  + {@link qtek.Texture.UNSIGNED_INT_24_8_WEBGL}
     *  + {@link qtek.Texture.UNSIGNED_INT}
     * @type {number}
     */
    type: glenum.UNSIGNED_BYTE,
    /**
     * Format of texel data
     * Possible values:
     *  + {@link qtek.Texture.RGBA}
     *  + {@link qtek.Texture.DEPTH_COMPONENT}
     *  + {@link qtek.Texture.DEPTH_STENCIL}
     * @type {number}
     */
    format: glenum.RGBA,
    /**
     * Texture wrap. Default to be REPEAT.
     * Possible values:
     *  + {@link qtek.Texture.CLAMP_TO_EDGE}
     *  + {@link qtek.Texture.REPEAT}
     *  + {@link qtek.Texture.MIRRORED_REPEAT}
     * @type {number}
     */
    wrapS: glenum.REPEAT,
    /**
     * Texture wrap. Default to be REPEAT.
     * Possible values:
     *  + {@link qtek.Texture.CLAMP_TO_EDGE}
     *  + {@link qtek.Texture.REPEAT}
     *  + {@link qtek.Texture.MIRRORED_REPEAT}
     * @type {number}
     */
    wrapT: glenum.REPEAT,
    /**
     * Possible values:
     *  + {@link qtek.Texture.NEAREST}
     *  + {@link qtek.Texture.LINEAR}
     *  + {@link qtek.Texture.NEAREST_MIPMAP_NEAREST}
     *  + {@link qtek.Texture.LINEAR_MIPMAP_NEAREST}
     *  + {@link qtek.Texture.NEAREST_MIPMAP_LINEAR}
     *  + {@link qtek.Texture.LINEAR_MIPMAP_LINEAR}
     * @type {number}
     */
    minFilter: glenum.LINEAR_MIPMAP_LINEAR,
    /**
     * Possible values:
     *  + {@link qtek.Texture.NEAREST}
     *  + {@link qtek.Texture.LINEAR}
     * @type {number}
     */
    magFilter: glenum.LINEAR,
    /**
     * If enable mimap.
     * @type {boolean}
     */
    useMipmap: true,

    /**
     * Anisotropic filtering, enabled if value is larger than 1
     * @see http://blog.tojicode.com/2012/03/anisotropic-filtering-in-webgl.html
     * @type {number}
     */
    anisotropic: 1,
    // pixelStorei parameters, not available when texture is used as render target
    // http://www.khronos.org/opengles/sdk/docs/man/xhtml/glPixelStorei.xml
    /**
     * If flip in y axis for given image source
     * @type {boolean}
     * @default true
     */
    flipY: true,
    /**
     * @type {number}
     * @default 4
     */
    unpackAlignment: 4,
    /**
     * @type {boolean}
     * @default false
     */
    premultiplyAlpha: false,

    /**
     * Dynamic option for texture like video
     * @type {boolean}
     */
    dynamic: false,

    NPOT: false
}, function () {
    this._cache = new Cache();
},
/** @lends qtek.Texture.prototype */
{

    getWebGLTexture: function (renderer) {
        var _gl = renderer.gl;
        var cache = this._cache;
        cache.use(renderer.__GUID__);

        if (cache.miss('webgl_texture')) {
            // In a new gl context, create new texture and set dirty true
            cache.put('webgl_texture', _gl.createTexture());
        }
        if (this.dynamic) {
            this.update(renderer);
        }
        else if (cache.isDirty()) {
            this.update(renderer);
            cache.fresh();
        }

        return cache.get('webgl_texture');
    },

    bind: function () {},
    unbind: function () {},

    /**
     * Mark texture is dirty and update in the next frame
     */
    dirty: function () {
        if (this._cache) {
            this._cache.dirtyAll();
        }
    },

    update: function (renderer) {},

    // Update the common parameters of texture
    updateCommon: function (renderer) {
        var _gl = renderer.gl;
        _gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, this.flipY);
        _gl.pixelStorei(_gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this.premultiplyAlpha);
        _gl.pixelStorei(_gl.UNPACK_ALIGNMENT, this.unpackAlignment);

        // Use of none-power of two texture
        // http://www.khronos.org/webgl/wiki/WebGL_and_OpenGL_Differences
        if (this.format === glenum.DEPTH_COMPONENT) {
            this.useMipmap = false;
        }

        var sRGBExt = renderer.getGLExtension('EXT_sRGB');
        // Fallback
        if (this.format === Texture.SRGB && !sRGBExt) {
            this.format = Texture.RGB;
        }
        if (this.format === Texture.SRGB_ALPHA && !sRGBExt) {
            this.format = Texture.RGBA;
        }

        this.NPOT = !this.isPowerOfTwo();
    },

    getAvailableWrapS: function () {
        if (this.NPOT) {
            return glenum.CLAMP_TO_EDGE;
        }
        return this.wrapS;
    },
    getAvailableWrapT: function () {
        if (this.NPOT) {
            return glenum.CLAMP_TO_EDGE;
        }
        return this.wrapT;
    },
    getAvailableMinFilter: function () {
        var minFilter = this.minFilter;
        if (this.NPOT || !this.useMipmap) {
            if (minFilter == glenum.NEAREST_MIPMAP_NEAREST ||
                minFilter == glenum.NEAREST_MIPMAP_LINEAR
            ) {
                return glenum.NEAREST;
            }
            else if (minFilter == glenum.LINEAR_MIPMAP_LINEAR ||
                minFilter == glenum.LINEAR_MIPMAP_NEAREST
            ) {
                return glenum.LINEAR;
            }
            else {
                return minFilter;
            }
        }
        else {
            return minFilter;
        }
    },
    getAvailableMagFilter: function () {
        return this.magFilter;
    },

    nextHighestPowerOfTwo: function (x) {
        --x;
        for (var i = 1; i < 32; i <<= 1) {
            x = x | x >> i;
        }
        return x + 1;
    },
    /**
     * @param  {qtek.Renderer} renderer
     */
    dispose: function (renderer) {

        var cache = this._cache;

        cache.use(renderer.__GUID__);

        var webglTexture = cache.get('webgl_texture');
        if (webglTexture){
            renderer.gl.deleteTexture(webglTexture);
        }
        cache.deleteContext(renderer.__GUID__);

    },
    /**
     * Test if image of texture is valid and loaded.
     * @return {boolean}
     */
    isRenderable: function () {},

    /**
     * Test if texture size is power of two
     * @return {boolean}
     */
    isPowerOfTwo: function () {}
});

Object.defineProperty(Texture.prototype, 'width', {
    get: function () {
        return this._width;
    },
    set: function (value) {
        this._width = value;
    }
});
Object.defineProperty(Texture.prototype, 'height', {
    get: function () {
        return this._height;
    },
    set: function (value) {
        this._height = value;
    }
});

/* DataType */

/**
 * @type {number}
 */
Texture.BYTE = glenum.BYTE;
/**
 * @type {number}
 */
Texture.UNSIGNED_BYTE = glenum.UNSIGNED_BYTE;
/**
 * @type {number}
 */
Texture.SHORT = glenum.SHORT;
/**
 * @type {number}
 */
Texture.UNSIGNED_SHORT = glenum.UNSIGNED_SHORT;
/**
 * @type {number}
 */
Texture.INT = glenum.INT;
/**
 * @type {number}
 */
Texture.UNSIGNED_INT = glenum.UNSIGNED_INT;
/**
 * @type {number}
 */
Texture.FLOAT = glenum.FLOAT;
/**
 * @type {number}
 */
Texture.HALF_FLOAT = 0x8D61;

/**
 * UNSIGNED_INT_24_8_WEBGL for WEBGL_depth_texture extension
 * @type {number}
 */
Texture.UNSIGNED_INT_24_8_WEBGL = 34042;

/* PixelFormat */
/**
 * @type {number}
 */
Texture.DEPTH_COMPONENT = glenum.DEPTH_COMPONENT;
/**
 * @type {number}
 */
Texture.DEPTH_STENCIL = glenum.DEPTH_STENCIL;
/**
 * @type {number}
 */
Texture.ALPHA = glenum.ALPHA;
/**
 * @type {number}
 */
Texture.RGB = glenum.RGB;
/**
 * @type {number}
 */
Texture.RGBA = glenum.RGBA;
/**
 * @type {number}
 */
Texture.LUMINANCE = glenum.LUMINANCE;
/**
 * @type {number}
 */
Texture.LUMINANCE_ALPHA = glenum.LUMINANCE_ALPHA;

/**
 * @see https://www.khronos.org/registry/webgl/extensions/EXT_sRGB/
 * @type {number}
 */
Texture.SRGB = 0x8C40;
/**
 * @see https://www.khronos.org/registry/webgl/extensions/EXT_sRGB/
 * @type {number}
 */
Texture.SRGB_ALPHA = 0x8C42;

/* Compressed Texture */
Texture.COMPRESSED_RGB_S3TC_DXT1_EXT = 0x83F0;
Texture.COMPRESSED_RGBA_S3TC_DXT1_EXT = 0x83F1;
Texture.COMPRESSED_RGBA_S3TC_DXT3_EXT = 0x83F2;
Texture.COMPRESSED_RGBA_S3TC_DXT5_EXT = 0x83F3;

/* TextureMagFilter */
/**
 * @type {number}
 */
Texture.NEAREST = glenum.NEAREST;
/**
 * @type {number}
 */
Texture.LINEAR = glenum.LINEAR;

/* TextureMinFilter */
/**
 * @type {number}
 */
Texture.NEAREST_MIPMAP_NEAREST = glenum.NEAREST_MIPMAP_NEAREST;
/**
 * @type {number}
 */
Texture.LINEAR_MIPMAP_NEAREST = glenum.LINEAR_MIPMAP_NEAREST;
/**
 * @type {number}
 */
Texture.NEAREST_MIPMAP_LINEAR = glenum.NEAREST_MIPMAP_LINEAR;
/**
 * @type {number}
 */
Texture.LINEAR_MIPMAP_LINEAR = glenum.LINEAR_MIPMAP_LINEAR;

/* TextureWrapMode */
/**
 * @type {number}
 */
Texture.REPEAT = glenum.REPEAT;
/**
 * @type {number}
 */
Texture.CLAMP_TO_EDGE = glenum.CLAMP_TO_EDGE;
/**
 * @type {number}
 */
Texture.MIRRORED_REPEAT = glenum.MIRRORED_REPEAT;

/**
 * @constructor qtek.Material
 * @extends qtek.core.Base
 */
var Material = Base.extend(
/** @lends qtek.Material# */
{
    /**
     * @type {string}
     */
    name: '',

    /**
     * @type {Object}
     */
    // uniforms: null,

    /**
     * @type {qtek.Shader}
     */
    // shader: null,

    /**
     * @type {boolean}
     */
    depthTest: true,

    /**
     * @type {boolean}
     */
    depthMask: true,

    /**
     * @type {boolean}
     */
    transparent: false,
    /**
     * Blend func is a callback function when the material
     * have custom blending
     * The gl context will be the only argument passed in tho the
     * blend function
     * Detail of blend function in WebGL:
     * http://www.khronos.org/registry/gles/specs/2.0/es_full_spec_2.0.25.pdf
     *
     * Example :
     * function(_gl) {
     *  _gl.blendEquation(_gl.FUNC_ADD);
     *  _gl.blendFunc(_gl.SRC_ALPHA, _gl.ONE_MINUS_SRC_ALPHA);
     * }
     */
    blend: null,

    // shadowTransparentMap : null

    _enabledUniforms: null,
}, function () {
    if (!this.name) {
        this.name = 'MATERIAL_' + this.__GUID__;
    }
    if (this.shader) {
        this.attachShader(this.shader);
    }
    if (!this.uniforms) {
        this.uniforms = {};
    }
},
/** @lends qtek.Material.prototype */
{

    bind: function(renderer, shader, prevMaterial, prevShader) {
        var _gl = renderer.gl;
        // PENDING Same texture in different material take different slot?

        // May use shader of other material if shader code are same
        var shader = shader || this.shader;

        // var sameShader = prevShader === shader;

        var currentTextureSlot = shader.currentTextureSlot();

        for (var u = 0; u < this._enabledUniforms.length; u++) {
            var symbol = this._enabledUniforms[u];
            var uniformValue = this.uniforms[symbol].value;
            if (uniformValue instanceof Texture) {
                // Reset slot
                uniformValue.__slot = -1;
            }
            else if (Array.isArray(uniformValue)) {
                for (var i = 0; i < uniformValue.length; i++) {
                    if (uniformValue[i] instanceof Texture) {
                        uniformValue[i].__slot = -1;
                    }
                }
            }
        }
        // Set uniforms
        for (var u = 0; u < this._enabledUniforms.length; u++) {
            var symbol = this._enabledUniforms[u];
            var uniform = this.uniforms[symbol];
            var uniformValue = uniform.value;

            // PENDING
            // When binding two materials with the same shader
            // Many uniforms will be be set twice even if they have the same value
            // So add a evaluation to see if the uniform is really needed to be set
            // if (prevMaterial && sameShader) {
            //     if (prevMaterial.uniforms[symbol].value === uniformValue) {
            //         continue;
            //     }
            // }
            
            if (uniformValue === null) {
                // FIXME Assume material with same shader have same order uniforms
                // Or if different material use same textures,
                // the slot will be different and still skipped because optimization
                if (uniform.type === 't') {
                    var slot = shader.currentTextureSlot();
                    var res = shader.setUniform(_gl, '1i', symbol, slot);
                    if (res) { // Texture is enabled
                        // Still occupy the slot to make sure same texture in different materials have same slot.
                        shader.takeCurrentTextureSlot(renderer, null);
                    }
                }
                continue;
            }
            else if (uniformValue instanceof Texture) {
                if (uniformValue.__slot < 0) {
                    var slot = shader.currentTextureSlot();
                    var res = shader.setUniform(_gl, '1i', symbol, slot);
                    if (!res) { // Texture uniform is not enabled
                        continue;
                    }
                    shader.takeCurrentTextureSlot(renderer, uniformValue);
                    uniformValue.__slot = slot;
                }
                // Multiple uniform use same texture..
                else {
                    shader.setUniform(_gl, '1i', symbol, uniformValue.__slot);
                }
            }
            else if (Array.isArray(uniformValue)) {
                if (uniformValue.length === 0) {
                    continue;
                }
                // Texture Array
                var exampleValue = uniformValue[0];

                if (exampleValue instanceof Texture) {
                    if (!shader.hasUniform(symbol)) {
                        continue;
                    }

                    var arr = [];
                    for (var i = 0; i < uniformValue.length; i++) {
                        var texture = uniformValue[i];

                        if (texture.__slot < 0) {
                            var slot = shader.currentTextureSlot();
                            arr.push(slot);
                            shader.takeCurrentTextureSlot(renderer, texture);
                            texture.__slot = slot;
                        }
                        else {
                            arr.push(texture.__slot);
                        }
                    }

                    shader.setUniform(_gl, '1iv', symbol, arr);
                }
                else {
                    shader.setUniform(_gl, uniform.type, symbol, uniformValue);
                }
            }
            else{
                shader.setUniform(_gl, uniform.type, symbol, uniformValue);
            }
        }
        // Texture slot maybe used out of material.
        shader.resetTextureSlot(currentTextureSlot);
    },

    /**
     * Set material uniform
     * @example
     *  mat.setUniform('color', [1, 1, 1, 1]);
     * @param {string} symbol
     * @param {number|array|qtek.Texture|ArrayBufferView} value
     */
    setUniform: function (symbol, value) {
        if (value === undefined) {
            console.warn('Uniform value "' + symbol + '" is undefined');
        }
        var uniform = this.uniforms[symbol];
        if (uniform) {
            uniform.value = value;
        }
    },

    /**
     * @param {Object} obj
     */
    setUniforms: function(obj) {
        for (var key in obj) {
            var val = obj[key];
            this.setUniform(key, val);
        }
    },

    // /**
    //  * Enable a uniform
    //  * It only have effect on the uniform exists in shader.
    //  * @param  {string} symbol
    //  */
    // enableUniform: function (symbol) {
    //     if (this.uniforms[symbol] && !this.isUniformEnabled(symbol)) {
    //         this._enabledUniforms.push(symbol);
    //     }
    // },

    // /**
    //  * Disable a uniform
    //  * It will not affect the uniform state in the shader. Because the shader uniforms is parsed from shader code with naive regex. When using micro to disable some uniforms in the shader. It will still try to set these uniforms in each rendering pass. We can disable these uniforms manually if we need this bit performance improvement. Mostly we can simply ignore it.
    //  * @param  {string} symbol
    //  */
    // disableUniform: function (symbol) {
    //     var idx = this._enabledUniforms.indexOf(symbol);
    //     if (idx >= 0) {
    //         this._enabledUniforms.splice(idx, 1);
    //     }
    // },

    /**
     * @param  {string}  symbol
     * @return {boolean}
     */
    isUniformEnabled: function (symbol) {
        return this._enabledUniforms.indexOf(symbol) >= 0;
    },

    /**
     * Alias of setUniform and setUniforms
     * @param {object|string} symbol
     * @param {number|array|qtek.Texture|ArrayBufferView} [value]
     */
    set: function (symbol, value) {
        if (typeof(symbol) === 'object') {
            for (var key in symbol) {
                var val = symbol[key];
                this.set(key, val);
            }
        }
        else {
            var uniform = this.uniforms[symbol];
            if (uniform) {
                if (typeof value === 'undefined') {
                    console.warn('Uniform value "' + symbol + '" is undefined');
                    value = null;
                }
                uniform.value = value;
            }
        }
    },
    /**
     * Get uniform value
     * @param  {string} symbol
     * @return {number|array|qtek.Texture|ArrayBufferView}
     */
    get: function (symbol) {
        var uniform = this.uniforms[symbol];
        if (uniform) {
            return uniform.value;
        }
    },
    /**
     * Attach a shader instance
     * @param  {qtek.Shader} shader
     * @param  {boolean} keepUniform If try to keep uniform value
     */
    attachShader: function(shader, keepUniform) {
        if (this.shader) {
            this.shader.detached();
        }

        var originalUniforms = this.uniforms;

        // Ignore if uniform can use in shader.
        this.uniforms = shader.createUniforms();
        this.shader = shader;

        var uniforms = this.uniforms;
        this._enabledUniforms = Object.keys(uniforms);
        // Make sure uniforms are set in same order to avoid texture slot wrong
        this._enabledUniforms.sort();

        if (keepUniform) {
            for (var symbol in originalUniforms) {
                if (uniforms[symbol]) {
                    uniforms[symbol].value = originalUniforms[symbol].value;
                }
            }
        }

        shader.attached();
    },

    /**
     * Detach a shader instance
     */
    detachShader: function() {
        this.shader.detached();
        this.shader = null;
        this.uniforms = {};
    },

    /**
     * Clone a new material and keep uniforms, shader will not be cloned
     * @return {qtek.Material}
     */
    clone: function () {
        var material = new this.constructor({
            name: this.name,
            shader: this.shader
        });
        for (var symbol in this.uniforms) {
            material.uniforms[symbol].value = this.uniforms[symbol].value;
        }
        material.depthTest = this.depthTest;
        material.depthMask = this.depthMask;
        material.transparent = this.transparent;
        material.blend = this.blend;

        return material;
    },

    /**
     * Dispose material, if material shader is not attached to any other materials
     * Shader will also be disposed
     * @param {WebGLRenderingContext} gl
     * @param {boolean} [disposeTexture=false] If dispose the textures used in the material
     */
    dispose: function(renderer, disposeTexture) {
        if (disposeTexture) {
            for (var name in this.uniforms) {
                var val = this.uniforms[name].value;
                if (!val) {
                    continue;
                }
                if (val instanceof Texture) {
                    val.dispose(renderer);
                }
                else if (Array.isArray(val)) {
                    for (var i = 0; i < val.length; i++) {
                        if (val[i] instanceof Texture) {
                            val[i].dispose(renderer);
                        }
                    }
                }
            }
        }
        var shader = this.shader;
        if (shader) {
            this.detachShader();
            if (!shader.isAttachedToAny()) {
                shader.dispose(renderer);
            }
        }
    }
});

var vec2 = glmatrix.vec2;

/**
 * @constructor
 * @alias qtek.math.Vector2
 * @param {number} x
 * @param {number} y
 */
var Vector2 = function(x, y) {

    x = x || 0;
    y = y || 0;

    /**
     * Storage of Vector2, read and write of x, y will change the values in _array
     * All methods also operate on the _array instead of x, y components
     * @name _array
     * @type {Float32Array}
     */
    this._array = vec2.fromValues(x, y);

    /**
     * Dirty flag is used by the Node to determine
     * if the matrix is updated to latest
     * @name _dirty
     * @type {boolean}
     */
    this._dirty = true;
};

Vector2.prototype = {

    constructor: Vector2,

    /**
     * Add b to self
     * @param  {qtek.math.Vector2} b
     * @return {qtek.math.Vector2}
     */
    add: function(b) {
        vec2.add(this._array, this._array, b._array);
        this._dirty = true;
        return this;
    },

    /**
     * Set x and y components
     * @param  {number}  x
     * @param  {number}  y
     * @return {qtek.math.Vector2}
     */
    set: function(x, y) {
        this._array[0] = x;
        this._array[1] = y;
        this._dirty = true;
        return this;
    },

    /**
     * Set x and y components from array
     * @param  {Float32Array|number[]} arr
     * @return {qtek.math.Vector2}
     */
    setArray: function(arr) {
        this._array[0] = arr[0];
        this._array[1] = arr[1];

        this._dirty = true;
        return this;
    },

    /**
     * Clone a new Vector2
     * @return {qtek.math.Vector2}
     */
    clone: function() {
        return new Vector2(this.x, this.y);
    },

    /**
     * Copy x, y from b
     * @param  {qtek.math.Vector2} b
     * @return {qtek.math.Vector2}
     */
    copy: function(b) {
        vec2.copy(this._array, b._array);
        this._dirty = true;
        return this;
    },

    /**
     * Cross product of self and b, written to a Vector3 out
     * @param  {qtek.math.Vector3} out
     * @param  {qtek.math.Vector2} b
     * @return {qtek.math.Vector2}
     */
    cross: function(out, b) {
        vec2.cross(out._array, this._array, b._array);
        out._dirty = true;
        return this;
    },

    /**
     * Alias for distance
     * @param  {qtek.math.Vector2} b
     * @return {number}
     */
    dist: function(b) {
        return vec2.dist(this._array, b._array);
    },

    /**
     * Distance between self and b
     * @param  {qtek.math.Vector2} b
     * @return {number}
     */
    distance: function(b) {
        return vec2.distance(this._array, b._array);
    },

    /**
     * Alias for divide
     * @param  {qtek.math.Vector2} b
     * @return {qtek.math.Vector2}
     */
    div: function(b) {
        vec2.div(this._array, this._array, b._array);
        this._dirty = true;
        return this;
    },

    /**
     * Divide self by b
     * @param  {qtek.math.Vector2} b
     * @return {qtek.math.Vector2}
     */
    divide: function(b) {
        vec2.divide(this._array, this._array, b._array);
        this._dirty = true;
        return this;
    },

    /**
     * Dot product of self and b
     * @param  {qtek.math.Vector2} b
     * @return {number}
     */
    dot: function(b) {
        return vec2.dot(this._array, b._array);
    },

    /**
     * Alias of length
     * @return {number}
     */
    len: function() {
        return vec2.len(this._array);
    },

    /**
     * Calculate the length
     * @return {number}
     */
    length: function() {
        return vec2.length(this._array);
    },

    /**
     * Linear interpolation between a and b
     * @param  {qtek.math.Vector2} a
     * @param  {qtek.math.Vector2} b
     * @param  {number}  t
     * @return {qtek.math.Vector2}
     */
    lerp: function(a, b, t) {
        vec2.lerp(this._array, a._array, b._array, t);
        this._dirty = true;
        return this;
    },

    /**
     * Minimum of self and b
     * @param  {qtek.math.Vector2} b
     * @return {qtek.math.Vector2}
     */
    min: function(b) {
        vec2.min(this._array, this._array, b._array);
        this._dirty = true;
        return this;
    },

    /**
     * Maximum of self and b
     * @param  {qtek.math.Vector2} b
     * @return {qtek.math.Vector2}
     */
    max: function(b) {
        vec2.max(this._array, this._array, b._array);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for multiply
     * @param  {qtek.math.Vector2} b
     * @return {qtek.math.Vector2}
     */
    mul: function(b) {
        vec2.mul(this._array, this._array, b._array);
        this._dirty = true;
        return this;
    },

    /**
     * Mutiply self and b
     * @param  {qtek.math.Vector2} b
     * @return {qtek.math.Vector2}
     */
    multiply: function(b) {
        vec2.multiply(this._array, this._array, b._array);
        this._dirty = true;
        return this;
    },

    /**
     * Negate self
     * @return {qtek.math.Vector2}
     */
    negate: function() {
        vec2.negate(this._array, this._array);
        this._dirty = true;
        return this;
    },

    /**
     * Normalize self
     * @return {qtek.math.Vector2}
     */
    normalize: function() {
        vec2.normalize(this._array, this._array);
        this._dirty = true;
        return this;
    },

    /**
     * Generate random x, y components with a given scale
     * @param  {number} scale
     * @return {qtek.math.Vector2}
     */
    random: function(scale) {
        vec2.random(this._array, scale);
        this._dirty = true;
        return this;
    },

    /**
     * Scale self
     * @param  {number}  scale
     * @return {qtek.math.Vector2}
     */
    scale: function(s) {
        vec2.scale(this._array, this._array, s);
        this._dirty = true;
        return this;
    },

    /**
     * Scale b and add to self
     * @param  {qtek.math.Vector2} b
     * @param  {number}  scale
     * @return {qtek.math.Vector2}
     */
    scaleAndAdd: function(b, s) {
        vec2.scaleAndAdd(this._array, this._array, b._array, s);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for squaredDistance
     * @param  {qtek.math.Vector2} b
     * @return {number}
     */
    sqrDist: function(b) {
        return vec2.sqrDist(this._array, b._array);
    },

    /**
     * Squared distance between self and b
     * @param  {qtek.math.Vector2} b
     * @return {number}
     */
    squaredDistance: function(b) {
        return vec2.squaredDistance(this._array, b._array);
    },

    /**
     * Alias for squaredLength
     * @return {number}
     */
    sqrLen: function() {
        return vec2.sqrLen(this._array);
    },

    /**
     * Squared length of self
     * @return {number}
     */
    squaredLength: function() {
        return vec2.squaredLength(this._array);
    },

    /**
     * Alias for subtract
     * @param  {qtek.math.Vector2} b
     * @return {qtek.math.Vector2}
     */
    sub: function(b) {
        vec2.sub(this._array, this._array, b._array);
        this._dirty = true;
        return this;
    },

    /**
     * Subtract b from self
     * @param  {qtek.math.Vector2} b
     * @return {qtek.math.Vector2}
     */
    subtract: function(b) {
        vec2.subtract(this._array, this._array, b._array);
        this._dirty = true;
        return this;
    },

    /**
     * Transform self with a Matrix2 m
     * @param  {qtek.math.Matrix2} m
     * @return {qtek.math.Vector2}
     */
    transformMat2: function(m) {
        vec2.transformMat2(this._array, this._array, m._array);
        this._dirty = true;
        return this;
    },

    /**
     * Transform self with a Matrix2d m
     * @param  {qtek.math.Matrix2d} m
     * @return {qtek.math.Vector2}
     */
    transformMat2d: function(m) {
        vec2.transformMat2d(this._array, this._array, m._array);
        this._dirty = true;
        return this;
    },

    /**
     * Transform self with a Matrix3 m
     * @param  {qtek.math.Matrix3} m
     * @return {qtek.math.Vector2}
     */
    transformMat3: function(m) {
        vec2.transformMat3(this._array, this._array, m._array);
        this._dirty = true;
        return this;
    },

    /**
     * Transform self with a Matrix4 m
     * @param  {qtek.math.Matrix4} m
     * @return {qtek.math.Vector2}
     */
    transformMat4: function(m) {
        vec2.transformMat4(this._array, this._array, m._array);
        this._dirty = true;
        return this;
    },

    toString: function() {
        return '[' + Array.prototype.join.call(this._array, ',') + ']';
    },

    toArray: function () {
        return Array.prototype.slice.call(this._array);
    }
};

// Getter and Setter
if (Object.defineProperty) {

    var proto$2 = Vector2.prototype;
    /**
     * @name x
     * @type {number}
     * @memberOf qtek.math.Vector2
     * @instance
     */
    Object.defineProperty(proto$2, 'x', {
        get: function () {
            return this._array[0];
        },
        set: function (value) {
            this._array[0] = value;
            this._dirty = true;
        }
    });

    /**
     * @name y
     * @type {number}
     * @memberOf qtek.math.Vector2
     * @instance
     */
    Object.defineProperty(proto$2, 'y', {
        get: function () {
            return this._array[1];
        },
        set: function (value) {
            this._array[1] = value;
            this._dirty = true;
        }
    });
}

// Supply methods that are not in place

/**
 * @param  {qtek.math.Vector2} out
 * @param  {qtek.math.Vector2} a
 * @param  {qtek.math.Vector2} b
 * @return {qtek.math.Vector2}
 */
Vector2.add = function(out, a, b) {
    vec2.add(out._array, a._array, b._array);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Vector2} out
 * @param  {number}  x
 * @param  {number}  y
 * @return {qtek.math.Vector2}
 */
Vector2.set = function(out, x, y) {
    vec2.set(out._array, x, y);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Vector2} out
 * @param  {qtek.math.Vector2} b
 * @return {qtek.math.Vector2}
 */
Vector2.copy = function(out, b) {
    vec2.copy(out._array, b._array);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Vector3} out
 * @param  {qtek.math.Vector2} a
 * @param  {qtek.math.Vector2} b
 * @return {qtek.math.Vector2}
 */
Vector2.cross = function(out, a, b) {
    vec2.cross(out._array, a._array, b._array);
    out._dirty = true;
    return out;
};
/**
 * @param  {qtek.math.Vector2} a
 * @param  {qtek.math.Vector2} b
 * @return {number}
 */
Vector2.dist = function(a, b) {
    return vec2.distance(a._array, b._array);
};
/**
 * @method
 * @param  {qtek.math.Vector2} a
 * @param  {qtek.math.Vector2} b
 * @return {number}
 */
Vector2.distance = Vector2.dist;
/**
 * @param  {qtek.math.Vector2} out
 * @param  {qtek.math.Vector2} a
 * @param  {qtek.math.Vector2} b
 * @return {qtek.math.Vector2}
 */
Vector2.div = function(out, a, b) {
    vec2.divide(out._array, a._array, b._array);
    out._dirty = true;
    return out;
};
/**
 * @method
 * @param  {qtek.math.Vector2} out
 * @param  {qtek.math.Vector2} a
 * @param  {qtek.math.Vector2} b
 * @return {qtek.math.Vector2}
 */
Vector2.divide = Vector2.div;
/**
 * @param  {qtek.math.Vector2} a
 * @param  {qtek.math.Vector2} b
 * @return {number}
 */
Vector2.dot = function(a, b) {
    return vec2.dot(a._array, b._array);
};

/**
 * @param  {qtek.math.Vector2} a
 * @return {number}
 */
Vector2.len = function(b) {
    return vec2.length(b._array);
};

// Vector2.length = Vector2.len;

/**
 * @param  {qtek.math.Vector2} out
 * @param  {qtek.math.Vector2} a
 * @param  {qtek.math.Vector2} b
 * @param  {number}  t
 * @return {qtek.math.Vector2}
 */
Vector2.lerp = function(out, a, b, t) {
    vec2.lerp(out._array, a._array, b._array, t);
    out._dirty = true;
    return out;
};
/**
 * @param  {qtek.math.Vector2} out
 * @param  {qtek.math.Vector2} a
 * @param  {qtek.math.Vector2} b
 * @return {qtek.math.Vector2}
 */
Vector2.min = function(out, a, b) {
    vec2.min(out._array, a._array, b._array);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Vector2} out
 * @param  {qtek.math.Vector2} a
 * @param  {qtek.math.Vector2} b
 * @return {qtek.math.Vector2}
 */
Vector2.max = function(out, a, b) {
    vec2.max(out._array, a._array, b._array);
    out._dirty = true;
    return out;
};
/**
 * @param  {qtek.math.Vector2} out
 * @param  {qtek.math.Vector2} a
 * @param  {qtek.math.Vector2} b
 * @return {qtek.math.Vector2}
 */
Vector2.mul = function(out, a, b) {
    vec2.multiply(out._array, a._array, b._array);
    out._dirty = true;
    return out;
};
/**
 * @method
 * @param  {qtek.math.Vector2} out
 * @param  {qtek.math.Vector2} a
 * @param  {qtek.math.Vector2} b
 * @return {qtek.math.Vector2}
 */
Vector2.multiply = Vector2.mul;
/**
 * @param  {qtek.math.Vector2} out
 * @param  {qtek.math.Vector2} a
 * @return {qtek.math.Vector2}
 */
Vector2.negate = function(out, a) {
    vec2.negate(out._array, a._array);
    out._dirty = true;
    return out;
};
/**
 * @param  {qtek.math.Vector2} out
 * @param  {qtek.math.Vector2} a
 * @return {qtek.math.Vector2}
 */
Vector2.normalize = function(out, a) {
    vec2.normalize(out._array, a._array);
    out._dirty = true;
    return out;
};
/**
 * @param  {qtek.math.Vector2} out
 * @param  {number}  scale
 * @return {qtek.math.Vector2}
 */
Vector2.random = function(out, scale) {
    vec2.random(out._array, scale);
    out._dirty = true;
    return out;
};
/**
 * @param  {qtek.math.Vector2} out
 * @param  {qtek.math.Vector2} a
 * @param  {number}  scale
 * @return {qtek.math.Vector2}
 */
Vector2.scale = function(out, a, scale) {
    vec2.scale(out._array, a._array, scale);
    out._dirty = true;
    return out;
};
/**
 * @param  {qtek.math.Vector2} out
 * @param  {qtek.math.Vector2} a
 * @param  {qtek.math.Vector2} b
 * @param  {number}  scale
 * @return {qtek.math.Vector2}
 */
Vector2.scaleAndAdd = function(out, a, b, scale) {
    vec2.scaleAndAdd(out._array, a._array, b._array, scale);
    out._dirty = true;
    return out;
};
/**
 * @param  {qtek.math.Vector2} a
 * @param  {qtek.math.Vector2} b
 * @return {number}
 */
Vector2.sqrDist = function(a, b) {
    return vec2.sqrDist(a._array, b._array);
};
/**
 * @method
 * @param  {qtek.math.Vector2} a
 * @param  {qtek.math.Vector2} b
 * @return {number}
 */
Vector2.squaredDistance = Vector2.sqrDist;

/**
 * @param  {qtek.math.Vector2} a
 * @return {number}
 */
Vector2.sqrLen = function(a) {
    return vec2.sqrLen(a._array);
};
/**
 * @method
 * @param  {qtek.math.Vector2} a
 * @return {number}
 */
Vector2.squaredLength = Vector2.sqrLen;

/**
 * @param  {qtek.math.Vector2} out
 * @param  {qtek.math.Vector2} a
 * @param  {qtek.math.Vector2} b
 * @return {qtek.math.Vector2}
 */
Vector2.sub = function(out, a, b) {
    vec2.subtract(out._array, a._array, b._array);
    out._dirty = true;
    return out;
};
/**
 * @method
 * @param  {qtek.math.Vector2} out
 * @param  {qtek.math.Vector2} a
 * @param  {qtek.math.Vector2} b
 * @return {qtek.math.Vector2}
 */
Vector2.subtract = Vector2.sub;
/**
 * @param  {qtek.math.Vector2} out
 * @param  {qtek.math.Vector2} a
 * @param  {qtek.math.Matrix2} m
 * @return {qtek.math.Vector2}
 */
Vector2.transformMat2 = function(out, a, m) {
    vec2.transformMat2(out._array, a._array, m._array);
    out._dirty = true;
    return out;
};
/**
 * @param  {qtek.math.Vector2}  out
 * @param  {qtek.math.Vector2}  a
 * @param  {qtek.math.Matrix2d} m
 * @return {qtek.math.Vector2}
 */
Vector2.transformMat2d = function(out, a, m) {
    vec2.transformMat2d(out._array, a._array, m._array);
    out._dirty = true;
    return out;
};
/**
 * @param  {qtek.math.Vector2} out
 * @param  {qtek.math.Vector2} a
 * @param  {Matrix3} m
 * @return {qtek.math.Vector2}
 */
Vector2.transformMat3 = function(out, a, m) {
    vec2.transformMat3(out._array, a._array, m._array);
    out._dirty = true;
    return out;
};
/**
 * @param  {qtek.math.Vector2} out
 * @param  {qtek.math.Vector2} a
 * @param  {qtek.math.Matrix4} m
 * @return {qtek.math.Vector2}
 */
Vector2.transformMat4 = function(out, a, m) {
    vec2.transformMat4(out._array, a._array, m._array);
    out._dirty = true;
    return out;
};

var calcAmbientSHLightEssl = "vec3 calcAmbientSHLight(int idx, vec3 N) {\n    int offset = 9 * idx;\n    return ambientSHLightCoefficients[0]\n        + ambientSHLightCoefficients[1] * N.x\n        + ambientSHLightCoefficients[2] * N.y\n        + ambientSHLightCoefficients[3] * N.z\n        + ambientSHLightCoefficients[4] * N.x * N.z\n        + ambientSHLightCoefficients[5] * N.z * N.y\n        + ambientSHLightCoefficients[6] * N.y * N.x\n        + ambientSHLightCoefficients[7] * (3.0 * N.z * N.z - 1.0)\n        + ambientSHLightCoefficients[8] * (N.x * N.x - N.y * N.y);\n}";

var uniformVec3Prefix = 'uniform vec3 ';
var uniformFloatPrefix = 'uniform float ';
var exportHeaderPrefix = '@export qtek.header.';
var exportEnd = '@end';
var unconfigurable = ':unconfigurable;';
var lightShader = [
    exportHeaderPrefix + 'directional_light',
    uniformVec3Prefix + 'directionalLightDirection[DIRECTIONAL_LIGHT_COUNT]' + unconfigurable,
    uniformVec3Prefix + 'directionalLightColor[DIRECTIONAL_LIGHT_COUNT]' + unconfigurable,
    exportEnd,

    exportHeaderPrefix + 'ambient_light',
    uniformVec3Prefix + 'ambientLightColor[AMBIENT_LIGHT_COUNT]' + unconfigurable,
    exportEnd,

    exportHeaderPrefix + 'ambient_sh_light',
    uniformVec3Prefix + 'ambientSHLightColor[AMBIENT_SH_LIGHT_COUNT]' + unconfigurable,
    uniformVec3Prefix + 'ambientSHLightCoefficients[AMBIENT_SH_LIGHT_COUNT * 9]' + unconfigurable,
    calcAmbientSHLightEssl,
    exportEnd,

    exportHeaderPrefix + 'ambient_cubemap_light',
    uniformVec3Prefix + 'ambientCubemapLightColor[AMBIENT_CUBEMAP_LIGHT_COUNT]' + unconfigurable,
    'uniform samplerCube ambientCubemapLightCubemap[AMBIENT_CUBEMAP_LIGHT_COUNT]' + unconfigurable,
    'uniform sampler2D ambientCubemapLightBRDFLookup[AMBIENT_CUBEMAP_LIGHT_COUNT]' + unconfigurable,
    exportEnd,

    exportHeaderPrefix + 'point_light',
    uniformVec3Prefix + 'pointLightPosition[POINT_LIGHT_COUNT]' + unconfigurable,
    uniformFloatPrefix + 'pointLightRange[POINT_LIGHT_COUNT]' + unconfigurable,
    uniformVec3Prefix + 'pointLightColor[POINT_LIGHT_COUNT]' + unconfigurable,
    exportEnd,

    exportHeaderPrefix + 'spot_light',
    uniformVec3Prefix + 'spotLightPosition[SPOT_LIGHT_COUNT]' + unconfigurable,
    uniformVec3Prefix + 'spotLightDirection[SPOT_LIGHT_COUNT]' + unconfigurable,
    uniformFloatPrefix + 'spotLightRange[SPOT_LIGHT_COUNT]' + unconfigurable,
    uniformFloatPrefix + 'spotLightUmbraAngleCosine[SPOT_LIGHT_COUNT]' + unconfigurable,
    uniformFloatPrefix + 'spotLightPenumbraAngleCosine[SPOT_LIGHT_COUNT]' + unconfigurable,
    uniformFloatPrefix + 'spotLightFalloffFactor[SPOT_LIGHT_COUNT]' + unconfigurable,
    uniformVec3Prefix + 'spotLightColor[SPOT_LIGHT_COUNT]' + unconfigurable,
    exportEnd
].join('\n');

var prezEssl = "@export qtek.prez.vertex\nuniform mat4 worldViewProjection : WORLDVIEWPROJECTION;\nattribute vec3 position : POSITION;\n@import qtek.chunk.skinning_header\nvoid main()\n{\n    vec3 skinnedPosition = position;\n#ifdef SKINNING\n    @import qtek.chunk.skin_matrix\n    skinnedPosition = (skinMatrixWS * vec4(position, 1.0)).xyz;\n#endif\n    gl_Position = worldViewProjection * vec4(skinnedPosition, 1.0);\n}\n@end\n@export qtek.prez.fragment\nvoid main()\n{\n    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);\n}\n@end";

// TODO Resources like shader, texture, geometry reference management
// Trace and find out which shader, texture, geometry can be destroyed
//
// TODO prez skinning
// Light header
Shader['import'](lightShader);
Shader['import'](prezEssl);

var mat4 = glmatrix.mat4;
var vec3 = glmatrix.vec3;

var mat4Create = mat4.create;

var errorShader = {};

/**
 * @constructor qtek.Renderer
 */
var Renderer = Base.extend(function () {
    return /** @lends qtek.Renderer# */ {

        /**
         * @type {HTMLCanvasElement}
         * @readonly
         */
        canvas: null,

        /**
         * Canvas width, set by resize method
         * @type {number}
         * @private
         */
        _width: 100,

        /**
         * Canvas width, set by resize method
         * @type {number}
         * @private
         */
        _height: 100,

        /**
         * Device pixel ratio, set by setDevicePixelRatio method
         * Specially for high defination display
         * @see http://www.khronos.org/webgl/wiki/HandlingHighDPI
         * @type {number}
         * @private
         */
        devicePixelRatio: window.devicePixelRatio || 1.0,

        /**
         * Clear color
         * @type {number[]}
         */
        clearColor: [0.0, 0.0, 0.0, 0.0],

        /**
         * Default:
         *     _gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT | _gl.STENCIL_BUFFER_BIT
         * @type {number}
         */
        clearBit: 17664,

        // Settings when getting context
        // http://www.khronos.org/registry/webgl/specs/latest/#2.4

        /**
         * If enable alpha, default true
         * @type {boolean}
         */
        alpha: true,
        /**
         * If enable depth buffer, default true
         * @type {boolean}
         */
        depth: true,
        /**
         * If enable stencil buffer, default false
         * @type {boolean}
         */
        stencil: false,
        /**
         * If enable antialias, default true
         * @type {boolean}
         */
        antialias: true,
        /**
         * If enable premultiplied alpha, default true
         * @type {boolean}
         */
        premultipliedAlpha: true,
        /**
         * If preserve drawing buffer, default false
         * @type {boolean}
         */
        preserveDrawingBuffer: false,
        /**
         * If throw context error, usually turned on in debug mode
         * @type {boolean}
         */
        throwError: true,
        /**
         * WebGL Context created from given canvas
         * @type {WebGLRenderingContext}
         */
        gl: null,
        /**
         * Renderer viewport, read-only, can be set by setViewport method
         * @type {Object}
         */
        viewport: {},

        // Set by FrameBuffer#bind
        __currentFrameBuffer: null,

        _viewportStack: [],
        _clearStack: [],

        _sceneRendering: null
    };
}, function () {

    if (!this.canvas) {
        this.canvas = document.createElement('canvas');
    }
    var canvas = this.canvas;
    try {
        var opts = {
            alpha: this.alpha,
            depth: this.depth,
            stencil: this.stencil,
            antialias: this.antialias,
            premultipliedAlpha: this.premultipliedAlpha,
            preserveDrawingBuffer: this.preserveDrawingBuffer
        };

        this.gl = canvas.getContext('webgl', opts)
            || canvas.getContext('experimental-webgl', opts);

        if (!this.gl) {
            throw new Error();
        }

        this._glinfo = new GLInfo(this.gl);

        if (this.gl.targetRenderer) {
            console.error('Already created a renderer');
        }
        this.gl.targetRenderer = this;

        this.resize();
    }
    catch (e) {
        throw 'Error creating WebGL Context ' + e;
    }
},
/** @lends qtek.Renderer.prototype. **/
{
    /**
     * Resize the canvas
     * @param {number} width
     * @param {number} height
     */
    resize: function(width, height) {
        var canvas = this.canvas;
        // http://www.khronos.org/webgl/wiki/HandlingHighDPI
        // set the display size of the canvas.
        var dpr = this.devicePixelRatio;
        if (width != null) {
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            // set the size of the drawingBuffer
            canvas.width = width * dpr;
            canvas.height = height * dpr;

            this._width = width;
            this._height = height;
        }
        else {
            this._width = canvas.width / dpr;
            this._height = canvas.height / dpr;
        }

        this.setViewport(0, 0, this._width, this._height);
    },

    /**
     * Get renderer width
     * @return {number}
     */
    getWidth: function () {
        return this._width;
    },

    /**
     * Get renderer height
     * @return {number}
     */
    getHeight: function () {
        return this._height;
    },

    /**
     * Get viewport aspect,
     * @return {number}
     */
    getViewportAspect: function () {
        var viewport = this.viewport;
        return viewport.width / viewport.height;
    },

    /**
     * Set devicePixelRatio
     * @param {number} devicePixelRatio
     */
    setDevicePixelRatio: function(devicePixelRatio) {
        this.devicePixelRatio = devicePixelRatio;
        this.resize(this._width, this._height);
    },

    /**
     * Get devicePixelRatio
     * @param {number} devicePixelRatio
     */
    getDevicePixelRatio: function () {
        return this.devicePixelRatio;
    },

    /**
     * Get WebGL extension
     * @param {string} name
     * @return {object}
     */
    getGLExtension: function (name) {
        return this._glinfo.getExtension(name);
    },

    /**
     * Get WebGL parameter
     * @param {string} name
     * @return {*}
     */
    getGLParameter: function (name) {
        return this._glinfo.getParameter(name);
    },

    /**
     * Set rendering viewport
     * @param {number|Object} x
     * @param {number} [y]
     * @param {number} [width]
     * @param {number} [height]
     * @param {number} [devicePixelRatio]
     *        Defaultly use the renderere devicePixelRatio
     *        It needs to be 1 when setViewport is called by frameBuffer
     *
     * @example
     *  setViewport(0,0,width,height,1)
     *  setViewport({
     *      x: 0,
     *      y: 0,
     *      width: width,
     *      height: height,
     *      devicePixelRatio: 1
     *  })
     */
    setViewport: function (x, y, width, height, dpr) {

        if (typeof x === 'object') {
            var obj = x;

            x = obj.x;
            y = obj.y;
            width = obj.width;
            height = obj.height;
            dpr = obj.devicePixelRatio;
        }
        dpr = dpr || this.devicePixelRatio;

        this.gl.viewport(
            x * dpr, y * dpr, width * dpr, height * dpr
        );
        // Use a fresh new object, not write property.
        this.viewport = {
            x: x,
            y: y,
            width: width,
            height: height,
            devicePixelRatio: dpr
        };
    },

    /**
     * Push current viewport into a stack
     */
    saveViewport: function () {
        this._viewportStack.push(this.viewport);
    },

    /**
     * Pop viewport from stack, restore in the renderer
     */
    restoreViewport: function () {
        if (this._viewportStack.length > 0) {
            this.setViewport(this._viewportStack.pop());
        }
    },

    /**
     * Push current clear into a stack
     */
    saveClear: function () {
        this._clearStack.push({
            clearBit: this.clearBit,
            clearColor: this.clearColor
        });
    },

    /**
     * Pop clear from stack, restore in the renderer
     */
    restoreClear: function () {
        if (this._clearStack.length > 0) {
            var opt = this._clearStack.pop();
            this.clearColor = opt.clearColor;
            this.clearBit = opt.clearBit;
        }
    },

    bindSceneRendering: function (scene) {
        this._sceneRendering = scene;
    },

    // Hook before and after render each object
    beforeRenderObject: function () {},
    afterRenderObject: function () {},
    /**
     * Render the scene in camera to the screen or binded offline framebuffer
     * @param  {qtek.Scene}       scene
     * @param  {qtek.Camera}      camera
     * @param  {boolean}     [notUpdateScene] If not call the scene.update methods in the rendering, default true
     * @param  {boolean}     [preZ]           If use preZ optimization, default false
     * @return {IRenderInfo}
     */
    render: function(scene, camera, notUpdateScene, preZ) {
        var _gl = this.gl;

        this._sceneRendering = scene;

        var clearColor = this.clearColor;

        if (this.clearBit) {

            // Must set depth and color mask true before clear
            _gl.colorMask(true, true, true, true);
            _gl.depthMask(true);
            var viewport = this.viewport;
            var needsScissor = false;
            var viewportDpr = viewport.devicePixelRatio;
            if (viewport.width !== this._width || viewport.height !== this._height
                || (viewportDpr && viewportDpr !== this.devicePixelRatio)
                || viewport.x || viewport.y
            ) {
                needsScissor = true;
                // http://stackoverflow.com/questions/11544608/how-to-clear-a-rectangle-area-in-webgl
                // Only clear the viewport
                _gl.enable(_gl.SCISSOR_TEST);
                _gl.scissor(viewport.x * viewportDpr, viewport.y * viewportDpr, viewport.width * viewportDpr, viewport.height * viewportDpr);
            }
            _gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
            _gl.clear(this.clearBit);
            if (needsScissor) {
                _gl.disable(_gl.SCISSOR_TEST);
            }
        }

        // If the scene have been updated in the prepass like shadow map
        // There is no need to update it again
        if (!notUpdateScene) {
            scene.update(false);
        }
        // Update if camera not mounted on the scene
        if (!camera.getScene()) {
            camera.update(true);
        }

        var opaqueQueue = scene.opaqueQueue;
        var transparentQueue = scene.transparentQueue;
        var sceneMaterial = scene.material;

        // StandardMaterial needs updateShader method so shader can be created on demand.
        for (var i = 0; i < opaqueQueue.length; i++) {
            var material = opaqueQueue[i].material;
            material.updateShader && material.updateShader(this);
        }
        // StandardMaterial needs updateShader method so shader can be created on demand.
        for (var i = 0; i < transparentQueue.length; i++) {
            var material = transparentQueue[i].material;
            material.updateShader && material.updateShader(this);
        }
        scene.trigger('beforerender', this, scene, camera);
        // Sort render queue
        // Calculate the object depth
        if (transparentQueue.length > 0) {
            var worldViewMat = mat4Create();
            var posViewSpace = vec3.create();
            for (var i = 0; i < transparentQueue.length; i++) {
                var node = transparentQueue[i];
                mat4.multiplyAffine(worldViewMat, camera.viewMatrix._array, node.worldTransform._array);
                vec3.transformMat4(posViewSpace, node.position._array, worldViewMat);
                node.__depth = posViewSpace[2];
            }
        }
        opaqueQueue.sort(this.opaqueSortFunc);
        transparentQueue.sort(this.transparentSortFunc);

        // Render Opaque queue
        scene.trigger('beforerender:opaque', this, opaqueQueue);

        // Reset the scene bounding box;
        scene.viewBoundingBoxLastFrame.min.set(Infinity, Infinity, Infinity);
        scene.viewBoundingBoxLastFrame.max.set(-Infinity, -Infinity, -Infinity);

        _gl.disable(_gl.BLEND);
        _gl.enable(_gl.DEPTH_TEST);
        var opaqueRenderInfo = this.renderQueue(opaqueQueue, camera, sceneMaterial, preZ);

        scene.trigger('afterrender:opaque', this, opaqueQueue, opaqueRenderInfo);
        scene.trigger('beforerender:transparent', this, transparentQueue);

        // Render Transparent Queue
        _gl.enable(_gl.BLEND);
        var transparentRenderInfo = this.renderQueue(transparentQueue, camera, sceneMaterial);

        scene.trigger('afterrender:transparent', this, transparentQueue, transparentRenderInfo);
        var renderInfo = {};
        for (var name in opaqueRenderInfo) {
            renderInfo[name] = opaqueRenderInfo[name] + transparentRenderInfo[name];
        }

        scene.trigger('afterrender', this, scene, camera, renderInfo);

        // Cleanup
        this._sceneRendering = null;
        return renderInfo;
    },

    resetRenderStatus: function () {
        this._currentShader = null;
    },

    /**
     * Callback during rendering process to determine if render given renderable.
     * @param {qtek.Renderable} given renderable.
     * @return {boolean}
     */
    ifRenderObject: function (obj) {
        return true;
    },

    /**
     * Render a single renderable list in camera in sequence
     * @param  {qtek.Renderable[]} queue       List of all renderables.
     *                                         Best to be sorted by Renderer.opaqueSortFunc or Renderer.transparentSortFunc
     * @param  {qtek.Camera}       camera
     * @param  {qtek.Material}     [globalMaterial] globalMaterial will override the material of each renderable
     * @param  {boolean}           [preZ]           If use preZ optimization, default false
     * @return {IRenderInfo}
     */
    renderQueue: function(queue, camera, globalMaterial, preZ) {
        var renderInfo = {
            triangleCount: 0,
            vertexCount: 0,
            drawCallCount: 0,
            meshCount: queue.length,
            renderedMeshCount: 0
        };

        // Some common builtin uniforms
        var viewport = this.viewport;
        var vDpr = viewport.devicePixelRatio;
        var viewportUniform = [
            viewport.x * vDpr, viewport.y * vDpr,
            viewport.width * vDpr, viewport.height * vDpr
        ];
        var windowDpr = this.devicePixelRatio;
        var windowSizeUniform = this.__currentFrameBuffer
            ? [this.__currentFrameBuffer.getTextureWidth(), this.__currentFrameBuffer.getTextureHeight()]
            : [this._width * windowDpr, this._height * windowDpr];
        // DEPRECATED
        var viewportSizeUniform = [
            viewportUniform[2], viewportUniform[3]
        ];
        var time = Date.now();

        // Calculate view and projection matrix
        mat4.copy(matrices.VIEW, camera.viewMatrix._array);
        mat4.copy(matrices.PROJECTION, camera.projectionMatrix._array);
        mat4.multiply(matrices.VIEWPROJECTION, camera.projectionMatrix._array, matrices.VIEW);
        mat4.copy(matrices.VIEWINVERSE, camera.worldTransform._array);
        mat4.invert(matrices.PROJECTIONINVERSE, matrices.PROJECTION);
        mat4.invert(matrices.VIEWPROJECTIONINVERSE, matrices.VIEWPROJECTION);

        var _gl = this.gl;
        var scene = this._sceneRendering;

        var prevMaterial;
        var prevShader;

        var culledRenderQueue;
        if (preZ) {
            culledRenderQueue = this._renderPreZ(queue, scene, camera);
        }
        else {
            culledRenderQueue = queue;
            _gl.depthFunc(_gl.LESS);
        }

        // Status
        var depthTest, depthMask;
        var culling, cullFace, frontFace;

        for (var i = 0; i < culledRenderQueue.length; i++) {
            var renderable = culledRenderQueue[i];
            if (!this.ifRenderObject(renderable)) {
                continue;
            }

            var geometry = renderable.geometry;

            // Skinned mesh will transformed to joint space. Ignore the mesh transform
            var worldM = renderable.isSkinnedMesh() ? matrices.IDENTITY : renderable.worldTransform._array;
            // All matrices ralated to world matrix will be updated on demand;
            mat4.multiplyAffine(matrices.WORLDVIEW, matrices.VIEW , worldM);
            // TODO Skinned mesh may have wrong bounding box.
            if (geometry.boundingBox && !preZ) {
                if (this.isFrustumCulled(
                    renderable, scene, camera, matrices.WORLDVIEW, matrices.PROJECTION
                )) {
                    continue;
                }
            }

            var material = globalMaterial || renderable.material;

            var shader = material.shader;

            mat4.copy(matrices.WORLD, worldM);
            mat4.multiply(matrices.WORLDVIEWPROJECTION, matrices.VIEWPROJECTION , worldM);
            if (shader.matrixSemantics.WORLDINVERSE ||
                shader.matrixSemantics.WORLDINVERSETRANSPOSE) {
                mat4.invert(matrices.WORLDINVERSE, worldM);
            }
            if (shader.matrixSemantics.WORLDVIEWINVERSE ||
                shader.matrixSemantics.WORLDVIEWINVERSETRANSPOSE) {
                mat4.invert(matrices.WORLDVIEWINVERSE, matrices.WORLDVIEW);
            }
            if (shader.matrixSemantics.WORLDVIEWPROJECTIONINVERSE ||
                shader.matrixSemantics.WORLDVIEWPROJECTIONINVERSETRANSPOSE) {
                mat4.invert(matrices.WORLDVIEWPROJECTIONINVERSE, matrices.WORLDVIEWPROJECTION);
            }

            // FIXME Optimize for compositing.
            // var prevShader = this._sceneRendering ? null : this._currentShader;
            // var prevShader = null;

            // Before render hook
            renderable.beforeRender(this);
            this.beforeRenderObject(renderable, prevMaterial, prevShader);

            var shaderChanged = !shader.isEqual(prevShader);
            if (shaderChanged) {
                // Set lights number
                if (scene && scene.isShaderLightNumberChanged(shader)) {
                    scene.setShaderLightNumber(shader);
                }
                var errMsg = shader.bind(this);
                if (errMsg) {

                    if (errorShader[shader.__GUID__]) {
                        continue;
                    }
                    errorShader[shader.__GUID__] = true;

                    if (this.throwError) {
                        throw new Error(errMsg);
                    }
                    else {
                        this.trigger('error', errMsg);
                    }
                }
                // Set some common uniforms
                shader.setUniformOfSemantic(_gl, 'VIEWPORT', viewportUniform);
                shader.setUniformOfSemantic(_gl, 'WINDOW_SIZE', windowSizeUniform);
                shader.setUniformOfSemantic(_gl, 'NEAR', camera.near);
                shader.setUniformOfSemantic(_gl, 'FAR', camera.far);
                shader.setUniformOfSemantic(_gl, 'DEVICEPIXELRATIO', vDpr);
                shader.setUniformOfSemantic(_gl, 'TIME', time);
                // DEPRECATED
                shader.setUniformOfSemantic(_gl, 'VIEWPORT_SIZE', viewportSizeUniform);

                // Set lights uniforms
                // TODO needs optimized
                if (scene) {
                    scene.setLightUniforms(shader, this);
                }

                // Save current used shader in the renderer
                // ALWAYS USE RENDERER TO DRAW THE MESH
                // this._currentShader = shader;
            }
            else {
                shader = prevShader;
            }

            if (prevMaterial !== material) {
                if (!preZ) {
                    if (material.depthTest !== depthTest) {
                        material.depthTest ?
                            _gl.enable(_gl.DEPTH_TEST) :
                            _gl.disable(_gl.DEPTH_TEST);
                        depthTest = material.depthTest;
                    }
                    if (material.depthMask !== depthMask) {
                        _gl.depthMask(material.depthMask);
                        depthMask = material.depthMask;
                    }
                }
                material.bind(this, shader, prevMaterial, prevShader);
                prevMaterial = material;

                // TODO cache blending
                if (material.transparent) {
                    if (material.blend) {
                        material.blend(_gl);
                    }
                    else {    // Default blend function
                        _gl.blendEquationSeparate(_gl.FUNC_ADD, _gl.FUNC_ADD);
                        _gl.blendFuncSeparate(_gl.SRC_ALPHA, _gl.ONE_MINUS_SRC_ALPHA, _gl.ONE, _gl.ONE_MINUS_SRC_ALPHA);
                    }
                }
            }

            var matrixSemanticKeys = shader.matrixSemanticKeys;
            for (var k = 0; k < matrixSemanticKeys.length; k++) {
                var semantic = matrixSemanticKeys[k];
                var semanticInfo = shader.matrixSemantics[semantic];
                var matrix = matrices[semantic];
                if (semanticInfo.isTranspose) {
                    var matrixNoTranspose = matrices[semanticInfo.semanticNoTranspose];
                    mat4.transpose(matrix, matrixNoTranspose);
                }
                shader.setUniform(_gl, semanticInfo.type, semanticInfo.symbol, matrix);
            }

            if (renderable.cullFace !== cullFace) {
                cullFace = renderable.cullFace;
                _gl.cullFace(cullFace);
            }
            if (renderable.frontFace !== frontFace) {
                frontFace = renderable.frontFace;
                _gl.frontFace(frontFace);
            }
            if (renderable.culling !== culling) {
                culling = renderable.culling;
                culling ? _gl.enable(_gl.CULL_FACE) : _gl.disable(_gl.CULL_FACE);
            }

            var objectRenderInfo = renderable.render(this, shader);

            if (objectRenderInfo) {
                renderInfo.triangleCount += objectRenderInfo.triangleCount;
                renderInfo.vertexCount += objectRenderInfo.vertexCount;
                renderInfo.drawCallCount += objectRenderInfo.drawCallCount;
                renderInfo.renderedMeshCount ++;
            }

            // After render hook
            this.afterRenderObject(renderable, objectRenderInfo);
            renderable.afterRender(this, objectRenderInfo);

            prevShader = shader;
        }

        return renderInfo;
    },

    _renderPreZ: function (queue, scene, camera) {
        var _gl = this.gl;
        var preZPassMaterial = this._prezMaterial || new Material({
            shader: new Shader({
                vertex: Shader.source('qtek.prez.vertex'),
                fragment: Shader.source('qtek.prez.fragment')
            })
        });
        this._prezMaterial = preZPassMaterial;
        var preZPassShader = preZPassMaterial.shader;

        var culledRenderQueue = [];
        // Status
        var culling, cullFace, frontFace;

        preZPassShader.bind(this);
        _gl.colorMask(false, false, false, false);
        _gl.depthMask(true);
        _gl.enable(_gl.DEPTH_TEST);
        for (var i = 0; i < queue.length; i++) {
            var renderable = queue[i];
            // PENDING
            if (!this.ifRenderObject(renderable)) {
                continue;
            }

            var worldM = renderable.isSkinnedMesh() ? matrices.IDENTITY : renderable.worldTransform._array;
            var geometry = renderable.geometry;

            mat4.multiplyAffine(matrices.WORLDVIEW, matrices.VIEW , worldM);

            if (geometry.boundingBox) {
                if (this.isFrustumCulled(
                    renderable, scene, camera, matrices.WORLDVIEW, matrices.PROJECTION
                )) {
                    continue;
                }
            }
            culledRenderQueue.push(renderable);
            if (renderable.skeleton || renderable.ignorePreZ) {  // FIXME  skinned mesh and custom vertex shader material.
                continue;
            }

            mat4.multiply(matrices.WORLDVIEWPROJECTION, matrices.VIEWPROJECTION , worldM);

            if (renderable.cullFace !== cullFace) {
                cullFace = renderable.cullFace;
                _gl.cullFace(cullFace);
            }
            if (renderable.frontFace !== frontFace) {
                frontFace = renderable.frontFace;
                _gl.frontFace(frontFace);
            }
            if (renderable.culling !== culling) {
                culling = renderable.culling;
                culling ? _gl.enable(_gl.CULL_FACE) : _gl.disable(_gl.CULL_FACE);
            }

            var semanticInfo = preZPassShader.matrixSemantics.WORLDVIEWPROJECTION;
            preZPassShader.setUniform(_gl, semanticInfo.type, semanticInfo.symbol, matrices.WORLDVIEWPROJECTION);

            // PENDING If invoke beforeRender hook
            renderable.render(this, preZPassMaterial.shader);
        }
        _gl.depthFunc(_gl.LEQUAL);
        _gl.colorMask(true, true, true, true);
        _gl.depthMask(true);

        return culledRenderQueue;
    },

    /**
     * If an scene object is culled by camera frustum
     *
     * Object can be a renderable or a light
     *
     * @param {qtek.Node} Scene object
     * @param {qtek.Camera} camera
     * @param {Array.<number>} worldViewMat represented with array
     * @param {Array.<number>} projectionMat represented with array
     */
    isFrustumCulled: (function () {
        // Frustum culling
        // http://www.cse.chalmers.se/~uffe/vfc_bbox.pdf
        var cullingBoundingBox = new BoundingBox();
        var cullingMatrix = new Matrix4();
        return function (object, scene, camera, worldViewMat, projectionMat) {
            // Bounding box can be a property of object(like light) or renderable.geometry
            var geoBBox = object.boundingBox || object.geometry.boundingBox;
            cullingMatrix._array = worldViewMat;
            cullingBoundingBox.copy(geoBBox);
            cullingBoundingBox.applyTransform(cullingMatrix);

            // Passingly update the scene bounding box
            // FIXME exclude very large mesh like ground plane or terrain ?
            // FIXME Only rendererable which cast shadow ?

            // FIXME boundingBox becomes much larger after transformd.
            if (scene && object.isRenderable() && object.castShadow) {
                scene.viewBoundingBoxLastFrame.union(cullingBoundingBox);
            }
            // Ignore frustum culling if object is skinned mesh.
            if (object.frustumCulling && !object.isSkinnedMesh())  {
                if (!cullingBoundingBox.intersectBoundingBox(camera.frustum.boundingBox)) {
                    return true;
                }

                cullingMatrix._array = projectionMat;
                if (
                    cullingBoundingBox.max._array[2] > 0 &&
                    cullingBoundingBox.min._array[2] < 0
                ) {
                    // Clip in the near plane
                    cullingBoundingBox.max._array[2] = -1e-20;
                }

                cullingBoundingBox.applyProjection(cullingMatrix);

                var min = cullingBoundingBox.min._array;
                var max = cullingBoundingBox.max._array;

                if (
                    max[0] < -1 || min[0] > 1
                    || max[1] < -1 || min[1] > 1
                    || max[2] < -1 || min[2] > 1
                ) {
                    return true;
                }
            }

            return false;
        };
    })(),

    /**
     * Dispose given scene, including all geometris, textures and shaders in the scene
     * @param {qtek.Scene} scene
     */
    disposeScene: function(scene) {
        this.disposeNode(scene, true, true);
        scene.dispose();
    },

    /**
     * Dispose given node, including all geometries, textures and shaders attached on it or its descendant
     * @param {qtek.Node} node
     * @param {boolean} [disposeGeometry=false] If dispose the geometries used in the descendant mesh
     * @param {boolean} [disposeTexture=false] If dispose the textures used in the descendant mesh
     */
    disposeNode: function(root, disposeGeometry, disposeTexture) {
        var materials = {};
        // Dettached from parent
        if (root.getParent()) {
            root.getParent().remove(root);
        }
        root.traverse(function(node) {
            if (node.geometry && disposeGeometry) {
                node.geometry.dispose(this);
            }
            if (node.material) {
                materials[node.material.__GUID__] = node.material;
            }
            // Particle system and AmbientCubemap light need to dispose
            if (node.dispose) {
                node.dispose(this);
            }
        }, this);
        for (var guid in materials) {
            var mat = materials[guid];
            mat.dispose(this, disposeTexture);
        }
    },

    /**
     * Dispose given shader
     * @param {qtek.Shader} shader
     */
    disposeShader: function(shader) {
        shader.dispose(this);
    },

    /**
     * Dispose given geometry
     * @param {qtek.Geometry} geometry
     */
    disposeGeometry: function(geometry) {
        geometry.dispose(this);
    },

    /**
     * Dispose given texture
     * @param {qtek.Texture} texture
     */
    disposeTexture: function(texture) {
        texture.dispose(this);
    },

    /**
     * Dispose given frame buffer
     * @param {qtek.FrameBuffer} frameBuffer
     */
    disposeFrameBuffer: function(frameBuffer) {
        frameBuffer.dispose(this);
    },

    /**
     * Dispose renderer
     */
    dispose: function () {},

    /**
     * Convert screen coords to normalized device coordinates(NDC)
     * Screen coords can get from mouse event, it is positioned relative to canvas element
     * NDC can be used in ray casting with Camera.prototype.castRay methods
     *
     * @param  {number}       x
     * @param  {number}       y
     * @param  {qtek.math.Vector2} [out]
     * @return {qtek.math.Vector2}
     */
    screenToNDC: function(x, y, out) {
        if (!out) {
            out = new Vector2();
        }
        // Invert y;
        y = this._height - y;

        var viewport = this.viewport;
        var arr = out._array;
        arr[0] = (x - viewport.x) / viewport.width;
        arr[0] = arr[0] * 2 - 1;
        arr[1] = (y - viewport.y) / viewport.height;
        arr[1] = arr[1] * 2 - 1;

        return out;
    }
});

/**
 * Opaque renderables compare function
 * @param  {qtek.Renderable} x
 * @param  {qtek.Renderable} y
 * @return {boolean}
 * @static
 */
Renderer.opaqueSortFunc = Renderer.prototype.opaqueSortFunc = function(x, y) {
    // Priority renderOrder -> shader -> material -> geometry
    if (x.renderOrder === y.renderOrder) {
        if (x.material.shader === y.material.shader) {
            if (x.material === y.material) {
                return x.geometry.__GUID__ - y.geometry.__GUID__;
            }
            return x.material.__GUID__ - y.material.__GUID__;
        }
        return x.material.shader.__GUID__ - y.material.shader.__GUID__;
    }
    return x.renderOrder - y.renderOrder;
};

/**
 * Transparent renderables compare function
 * @param  {qtek.Renderable} a
 * @param  {qtek.Renderable} b
 * @return {boolean}
 * @static
 */
Renderer.transparentSortFunc = Renderer.prototype.transparentSortFunc = function(x, y) {
    // Priority renderOrder -> depth -> shader -> material -> geometry

    if (x.renderOrder === y.renderOrder) {
        if (x.__depth === y.__depth) {
            if (x.material.shader === y.material.shader) {
                if (x.material === y.material) {
                    return x.geometry.__GUID__ - y.geometry.__GUID__;
                }
                return x.material.__GUID__ - y.material.__GUID__;
            }
            return x.material.shader.__GUID__ - y.material.shader.__GUID__;
        }
        // Depth is negative
        // So farther object has smaller depth value
        return x.__depth - y.__depth;
    }
    return x.renderOrder - y.renderOrder;
};

// Temporary variables
var matrices = {
    IDENTITY: mat4Create(),
    
    WORLD: mat4Create(),
    VIEW: mat4Create(),
    PROJECTION: mat4Create(),
    WORLDVIEW: mat4Create(),
    VIEWPROJECTION: mat4Create(),
    WORLDVIEWPROJECTION: mat4Create(),

    WORLDINVERSE: mat4Create(),
    VIEWINVERSE: mat4Create(),
    PROJECTIONINVERSE: mat4Create(),
    WORLDVIEWINVERSE: mat4Create(),
    VIEWPROJECTIONINVERSE: mat4Create(),
    WORLDVIEWPROJECTIONINVERSE: mat4Create(),

    WORLDTRANSPOSE: mat4Create(),
    VIEWTRANSPOSE: mat4Create(),
    PROJECTIONTRANSPOSE: mat4Create(),
    WORLDVIEWTRANSPOSE: mat4Create(),
    VIEWPROJECTIONTRANSPOSE: mat4Create(),
    WORLDVIEWPROJECTIONTRANSPOSE: mat4Create(),
    WORLDINVERSETRANSPOSE: mat4Create(),
    VIEWINVERSETRANSPOSE: mat4Create(),
    PROJECTIONINVERSETRANSPOSE: mat4Create(),
    WORLDVIEWINVERSETRANSPOSE: mat4Create(),
    VIEWPROJECTIONINVERSETRANSPOSE: mat4Create(),
    WORLDVIEWPROJECTIONINVERSETRANSPOSE: mat4Create()
};

/**
 * @name qtek.Renderer.COLOR_BUFFER_BIT
 * @type {number}
 */
Renderer.COLOR_BUFFER_BIT = glenum.COLOR_BUFFER_BIT;
/**
 * @name qtek.Renderer.DEPTH_BUFFER_BIT
 * @type {number}
 */
Renderer.DEPTH_BUFFER_BIT = glenum.DEPTH_BUFFER_BIT;
/**
 * @name qtek.Renderer.STENCIL_BUFFER_BIT
 * @type {number}
 */
Renderer.STENCIL_BUFFER_BIT = glenum.STENCIL_BUFFER_BIT;

var quat$1 = glmatrix.quat;

/**
 * @constructor
 * @alias qtek.math.Quaternion
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} w
 */
var Quaternion = function (x, y, z, w) {

    x = x || 0;
    y = y || 0;
    z = z || 0;
    w = w === undefined ? 1 : w;

    /**
     * Storage of Quaternion, read and write of x, y, z, w will change the values in _array
     * All methods also operate on the _array instead of x, y, z, w components
     * @name _array
     * @type {Float32Array}
     */
    this._array = quat$1.fromValues(x, y, z, w);

    /**
     * Dirty flag is used by the Node to determine
     * if the matrix is updated to latest
     * @name _dirty
     * @type {boolean}
     */
    this._dirty = true;
};

Quaternion.prototype = {

    constructor: Quaternion,

    /**
     * Add b to self
     * @param  {qtek.math.Quaternion} b
     * @return {qtek.math.Quaternion}
     */
    add: function (b) {
        quat$1.add(this._array, this._array, b._array);
        this._dirty = true;
        return this;
    },

    /**
     * Calculate the w component from x, y, z component
     * @return {qtek.math.Quaternion}
     */
    calculateW: function () {
        quat$1.calculateW(this._array, this._array);
        this._dirty = true;
        return this;
    },

    /**
     * Set x, y and z components
     * @param  {number}  x
     * @param  {number}  y
     * @param  {number}  z
     * @param  {number}  w
     * @return {qtek.math.Quaternion}
     */
    set: function (x, y, z, w) {
        this._array[0] = x;
        this._array[1] = y;
        this._array[2] = z;
        this._array[3] = w;
        this._dirty = true;
        return this;
    },

    /**
     * Set x, y, z and w components from array
     * @param  {Float32Array|number[]} arr
     * @return {qtek.math.Quaternion}
     */
    setArray: function (arr) {
        this._array[0] = arr[0];
        this._array[1] = arr[1];
        this._array[2] = arr[2];
        this._array[3] = arr[3];

        this._dirty = true;
        return this;
    },

    /**
     * Clone a new Quaternion
     * @return {qtek.math.Quaternion}
     */
    clone: function () {
        return new Quaternion(this.x, this.y, this.z, this.w);
    },

    /**
     * Calculates the conjugate of self If the quaternion is normalized,
     * this function is faster than invert and produces the same result.
     *
     * @return {qtek.math.Quaternion}
     */
    conjugate: function () {
        quat$1.conjugate(this._array, this._array);
        this._dirty = true;
        return this;
    },

    /**
     * Copy from b
     * @param  {qtek.math.Quaternion} b
     * @return {qtek.math.Quaternion}
     */
    copy: function (b) {
        quat$1.copy(this._array, b._array);
        this._dirty = true;
        return this;
    },

    /**
     * Dot product of self and b
     * @param  {qtek.math.Quaternion} b
     * @return {number}
     */
    dot: function (b) {
        return quat$1.dot(this._array, b._array);
    },

    /**
     * Set from the given 3x3 rotation matrix
     * @param  {qtek.math.Matrix3} m
     * @return {qtek.math.Quaternion}
     */
    fromMat3: function (m) {
        quat$1.fromMat3(this._array, m._array);
        this._dirty = true;
        return this;
    },

    /**
     * Set from the given 4x4 rotation matrix
     * The 4th column and 4th row will be droped
     * @param  {qtek.math.Matrix4} m
     * @return {qtek.math.Quaternion}
     */
    fromMat4: (function () {
        var mat3 = glmatrix.mat3;
        var m3 = mat3.create();
        return function (m) {
            mat3.fromMat4(m3, m._array);
            // TODO Not like mat4, mat3 in glmatrix seems to be row-based
            mat3.transpose(m3, m3);
            quat$1.fromMat3(this._array, m3);
            this._dirty = true;
            return this;
        };
    })(),

    /**
     * Set to identity quaternion
     * @return {qtek.math.Quaternion}
     */
    identity: function () {
        quat$1.identity(this._array);
        this._dirty = true;
        return this;
    },
    /**
     * Invert self
     * @return {qtek.math.Quaternion}
     */
    invert: function () {
        quat$1.invert(this._array, this._array);
        this._dirty = true;
        return this;
    },
    /**
     * Alias of length
     * @return {number}
     */
    len: function () {
        return quat$1.len(this._array);
    },

    /**
     * Calculate the length
     * @return {number}
     */
    length: function () {
        return quat$1.length(this._array);
    },

    /**
     * Linear interpolation between a and b
     * @param  {qtek.math.Quaternion} a
     * @param  {qtek.math.Quaternion} b
     * @param  {number}  t
     * @return {qtek.math.Quaternion}
     */
    lerp: function (a, b, t) {
        quat$1.lerp(this._array, a._array, b._array, t);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for multiply
     * @param  {qtek.math.Quaternion} b
     * @return {qtek.math.Quaternion}
     */
    mul: function (b) {
        quat$1.mul(this._array, this._array, b._array);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for multiplyLeft
     * @param  {qtek.math.Quaternion} a
     * @return {qtek.math.Quaternion}
     */
    mulLeft: function (a) {
        quat$1.multiply(this._array, a._array, this._array);
        this._dirty = true;
        return this;
    },

    /**
     * Mutiply self and b
     * @param  {qtek.math.Quaternion} b
     * @return {qtek.math.Quaternion}
     */
    multiply: function (b) {
        quat$1.multiply(this._array, this._array, b._array);
        this._dirty = true;
        return this;
    },

    /**
     * Mutiply a and self
     * Quaternion mutiply is not commutative, so the result of mutiplyLeft is different with multiply.
     * @param  {qtek.math.Quaternion} a
     * @return {qtek.math.Quaternion}
     */
    multiplyLeft: function (a) {
        quat$1.multiply(this._array, a._array, this._array);
        this._dirty = true;
        return this;
    },

    /**
     * Normalize self
     * @return {qtek.math.Quaternion}
     */
    normalize: function () {
        quat$1.normalize(this._array, this._array);
        this._dirty = true;
        return this;
    },

    /**
     * Rotate self by a given radian about X axis
     * @param {number} rad
     * @return {qtek.math.Quaternion}
     */
    rotateX: function (rad) {
        quat$1.rotateX(this._array, this._array, rad);
        this._dirty = true;
        return this;
    },

    /**
     * Rotate self by a given radian about Y axis
     * @param {number} rad
     * @return {qtek.math.Quaternion}
     */
    rotateY: function (rad) {
        quat$1.rotateY(this._array, this._array, rad);
        this._dirty = true;
        return this;
    },

    /**
     * Rotate self by a given radian about Z axis
     * @param {number} rad
     * @return {qtek.math.Quaternion}
     */
    rotateZ: function (rad) {
        quat$1.rotateZ(this._array, this._array, rad);
        this._dirty = true;
        return this;
    },

    /**
     * Sets self to represent the shortest rotation from Vector3 a to Vector3 b.
     * a and b needs to be normalized
     * @param  {qtek.math.Vector3} a
     * @param  {qtek.math.Vector3} b
     * @return {qtek.math.Quaternion}
     */
    rotationTo: function (a, b) {
        quat$1.rotationTo(this._array, a._array, b._array);
        this._dirty = true;
        return this;
    },
    /**
     * Sets self with values corresponding to the given axes
     * @param {qtek.math.Vector3} view
     * @param {qtek.math.Vector3} right
     * @param {qtek.math.Vector3} up
     * @return {qtek.math.Quaternion}
     */
    setAxes: function (view, right, up) {
        quat$1.setAxes(this._array, view._array, right._array, up._array);
        this._dirty = true;
        return this;
    },

    /**
     * Sets self with a rotation axis and rotation angle
     * @param {qtek.math.Vector3} axis
     * @param {number} rad
     * @return {qtek.math.Quaternion}
     */
    setAxisAngle: function (axis, rad) {
        quat$1.setAxisAngle(this._array, axis._array, rad);
        this._dirty = true;
        return this;
    },
    /**
     * Perform spherical linear interpolation between a and b
     * @param  {qtek.math.Quaternion} a
     * @param  {qtek.math.Quaternion} b
     * @param  {number} t
     * @return {qtek.math.Quaternion}
     */
    slerp: function (a, b, t) {
        quat$1.slerp(this._array, a._array, b._array, t);
        this._dirty = true;
        return this;
    },

    /**
     * Alias for squaredLength
     * @return {number}
     */
    sqrLen: function () {
        return quat$1.sqrLen(this._array);
    },

    /**
     * Squared length of self
     * @return {number}
     */
    squaredLength: function () {
        return quat$1.squaredLength(this._array);
    },

    /**
     * Set from euler
     * @param {qtek.math.Vector3} v
     * @param {String} order
     */
    fromEuler: function (v, order) {
        return Quaternion.fromEuler(this, v, order);
    },

    toString: function () {
        return '[' + Array.prototype.join.call(this._array, ',') + ']';
    },

    toArray: function () {
        return Array.prototype.slice.call(this._array);
    }
};

var defineProperty$2 = Object.defineProperty;
// Getter and Setter
if (defineProperty$2) {

    var proto$3 = Quaternion.prototype;
    /**
     * @name x
     * @type {number}
     * @memberOf qtek.math.Quaternion
     * @instance
     */
    defineProperty$2(proto$3, 'x', {
        get: function () {
            return this._array[0];
        },
        set: function (value) {
            this._array[0] = value;
            this._dirty = true;
        }
    });

    /**
     * @name y
     * @type {number}
     * @memberOf qtek.math.Quaternion
     * @instance
     */
    defineProperty$2(proto$3, 'y', {
        get: function () {
            return this._array[1];
        },
        set: function (value) {
            this._array[1] = value;
            this._dirty = true;
        }
    });

    /**
     * @name z
     * @type {number}
     * @memberOf qtek.math.Quaternion
     * @instance
     */
    defineProperty$2(proto$3, 'z', {
        get: function () {
            return this._array[2];
        },
        set: function (value) {
            this._array[2] = value;
            this._dirty = true;
        }
    });

    /**
     * @name w
     * @type {number}
     * @memberOf qtek.math.Quaternion
     * @instance
     */
    defineProperty$2(proto$3, 'w', {
        get: function () {
            return this._array[3];
        },
        set: function (value) {
            this._array[3] = value;
            this._dirty = true;
        }
    });
}

// Supply methods that are not in place

/**
 * @param  {qtek.math.Quaternion} out
 * @param  {qtek.math.Quaternion} a
 * @param  {qtek.math.Quaternion} b
 * @return {qtek.math.Quaternion}
 */
Quaternion.add = function (out, a, b) {
    quat$1.add(out._array, a._array, b._array);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Quaternion} out
 * @param  {number}     x
 * @param  {number}     y
 * @param  {number}     z
 * @param  {number}     w
 * @return {qtek.math.Quaternion}
 */
Quaternion.set = function (out, x, y, z, w) {
    quat$1.set(out._array, x, y, z, w);
    out._dirty = true;
};

/**
 * @param  {qtek.math.Quaternion} out
 * @param  {qtek.math.Quaternion} b
 * @return {qtek.math.Quaternion}
 */
Quaternion.copy = function (out, b) {
    quat$1.copy(out._array, b._array);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Quaternion} out
 * @param  {qtek.math.Quaternion} a
 * @return {qtek.math.Quaternion}
 */
Quaternion.calculateW = function (out, a) {
    quat$1.calculateW(out._array, a._array);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Quaternion} out
 * @param  {qtek.math.Quaternion} a
 * @return {qtek.math.Quaternion}
 */
Quaternion.conjugate = function (out, a) {
    quat$1.conjugate(out._array, a._array);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Quaternion} out
 * @return {qtek.math.Quaternion}
 */
Quaternion.identity = function (out) {
    quat$1.identity(out._array);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Quaternion} out
 * @param  {qtek.math.Quaternion} a
 * @return {qtek.math.Quaternion}
 */
Quaternion.invert = function (out, a) {
    quat$1.invert(out._array, a._array);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Quaternion} a
 * @param  {qtek.math.Quaternion} b
 * @return {number}
 */
Quaternion.dot = function (a, b) {
    return quat$1.dot(a._array, b._array);
};

/**
 * @param  {qtek.math.Quaternion} a
 * @return {number}
 */
Quaternion.len = function (a) {
    return quat$1.length(a._array);
};

// Quaternion.length = Quaternion.len;

/**
 * @param  {qtek.math.Quaternion} out
 * @param  {qtek.math.Quaternion} a
 * @param  {qtek.math.Quaternion} b
 * @param  {number}     t
 * @return {qtek.math.Quaternion}
 */
Quaternion.lerp = function (out, a, b, t) {
    quat$1.lerp(out._array, a._array, b._array, t);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Quaternion} out
 * @param  {qtek.math.Quaternion} a
 * @param  {qtek.math.Quaternion} b
 * @param  {number}     t
 * @return {qtek.math.Quaternion}
 */
Quaternion.slerp = function (out, a, b, t) {
    quat$1.slerp(out._array, a._array, b._array, t);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Quaternion} out
 * @param  {qtek.math.Quaternion} a
 * @param  {qtek.math.Quaternion} b
 * @return {qtek.math.Quaternion}
 */
Quaternion.mul = function (out, a, b) {
    quat$1.multiply(out._array, a._array, b._array);
    out._dirty = true;
    return out;
};

/**
 * @method
 * @param  {qtek.math.Quaternion} out
 * @param  {qtek.math.Quaternion} a
 * @param  {qtek.math.Quaternion} b
 * @return {qtek.math.Quaternion}
 */
Quaternion.multiply = Quaternion.mul;

/**
 * @param  {qtek.math.Quaternion} out
 * @param  {qtek.math.Quaternion} a
 * @param  {number}     rad
 * @return {qtek.math.Quaternion}
 */
Quaternion.rotateX = function (out, a, rad) {
    quat$1.rotateX(out._array, a._array, rad);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Quaternion} out
 * @param  {qtek.math.Quaternion} a
 * @param  {number}     rad
 * @return {qtek.math.Quaternion}
 */
Quaternion.rotateY = function (out, a, rad) {
    quat$1.rotateY(out._array, a._array, rad);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Quaternion} out
 * @param  {qtek.math.Quaternion} a
 * @param  {number}     rad
 * @return {qtek.math.Quaternion}
 */
Quaternion.rotateZ = function (out, a, rad) {
    quat$1.rotateZ(out._array, a._array, rad);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Quaternion} out
 * @param  {qtek.math.Vector3}    axis
 * @param  {number}     rad
 * @return {qtek.math.Quaternion}
 */
Quaternion.setAxisAngle = function (out, axis, rad) {
    quat$1.setAxisAngle(out._array, axis._array, rad);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Quaternion} out
 * @param  {qtek.math.Quaternion} a
 * @return {qtek.math.Quaternion}
 */
Quaternion.normalize = function (out, a) {
    quat$1.normalize(out._array, a._array);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Quaternion} a
 * @return {number}
 */
Quaternion.sqrLen = function (a) {
    return quat$1.sqrLen(a._array);
};

/**
 * @method
 * @param  {qtek.math.Quaternion} a
 * @return {number}
 */
Quaternion.squaredLength = Quaternion.sqrLen;

/**
 * @param  {qtek.math.Quaternion} out
 * @param  {qtek.math.Matrix3}    m
 * @return {qtek.math.Quaternion}
 */
Quaternion.fromMat3 = function (out, m) {
    quat$1.fromMat3(out._array, m._array);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Quaternion} out
 * @param  {qtek.math.Vector3}    view
 * @param  {qtek.math.Vector3}    right
 * @param  {qtek.math.Vector3}    up
 * @return {qtek.math.Quaternion}
 */
Quaternion.setAxes = function (out, view, right, up) {
    quat$1.setAxes(out._array, view._array, right._array, up._array);
    out._dirty = true;
    return out;
};

/**
 * @param  {qtek.math.Quaternion} out
 * @param  {qtek.math.Vector3}    a
 * @param  {qtek.math.Vector3}    b
 * @return {qtek.math.Quaternion}
 */
Quaternion.rotationTo = function (out, a, b) {
    quat$1.rotationTo(out._array, a._array, b._array);
    out._dirty = true;
    return out;
};

/**
 * Set quaternion from euler
 * @param {qtek.math.Quaternion} out
 * @param {qtek.math.Vector3} v
 * @param {String} order
 */
Quaternion.fromEuler = function (out, v, order) {

    out._dirty = true;

    v = v._array;
    var target = out._array;
    var c1 = Math.cos(v[0] / 2);
    var c2 = Math.cos(v[1] / 2);
    var c3 = Math.cos(v[2] / 2);
    var s1 = Math.sin(v[0] / 2);
    var s2 = Math.sin(v[1] / 2);
    var s3 = Math.sin(v[2] / 2);

    var order = (order || 'XYZ').toUpperCase();

    // http://www.mathworks.com/matlabcentral/fileexchange/
    //  20696-function-to-convert-between-dcm-euler-angles-quaternions-and-euler-vectors/
    //  content/SpinCalc.m

    switch (order) {
        case 'XYZ':
            target[0] = s1 * c2 * c3 + c1 * s2 * s3;
            target[1] = c1 * s2 * c3 - s1 * c2 * s3;
            target[2] = c1 * c2 * s3 + s1 * s2 * c3;
            target[3] = c1 * c2 * c3 - s1 * s2 * s3;
            break;
        case 'YXZ':
            target[0] = s1 * c2 * c3 + c1 * s2 * s3;
            target[1] = c1 * s2 * c3 - s1 * c2 * s3;
            target[2] = c1 * c2 * s3 - s1 * s2 * c3;
            target[3] = c1 * c2 * c3 + s1 * s2 * s3;
            break;
        case 'ZXY':
            target[0] = s1 * c2 * c3 - c1 * s2 * s3;
            target[1] = c1 * s2 * c3 + s1 * c2 * s3;
            target[2] = c1 * c2 * s3 + s1 * s2 * c3;
            target[3] = c1 * c2 * c3 - s1 * s2 * s3;
            break;
        case 'ZYX':
            target[0] = s1 * c2 * c3 - c1 * s2 * s3;
            target[1] = c1 * s2 * c3 + s1 * c2 * s3;
            target[2] = c1 * c2 * s3 - s1 * s2 * c3;
            target[3] = c1 * c2 * c3 + s1 * s2 * s3;
            break;
        case 'YZX':
            target[0] = s1 * c2 * c3 + c1 * s2 * s3;
            target[1] = c1 * s2 * c3 + s1 * c2 * s3;
            target[2] = c1 * c2 * s3 - s1 * s2 * c3;
            target[3] = c1 * c2 * c3 - s1 * s2 * s3;
            break;
        case 'XZY':
            target[0] = s1 * c2 * c3 - c1 * s2 * s3;
            target[1] = c1 * s2 * c3 - s1 * c2 * s3;
            target[2] = c1 * c2 * s3 + s1 * s2 * c3;
            target[3] = c1 * c2 * c3 + s1 * s2 * s3;
            break;
    }
};

var mat4$3 = glmatrix.mat4;

var nameId = 0;

/**
 * @constructor qtek.Node
 * @extends qtek.core.Base
 */
var Node = Base.extend(
/** @lends qtek.Node# */
{
    /**
     * Scene node name
     * @type {string}
     */
    name: '',

    /**
     * Position relative to its parent node. aka translation.
     * @type {qtek.math.Vector3}
     */
    position: null,

    /**
     * Rotation relative to its parent node. Represented by a quaternion
     * @type {qtek.math.Quaternion}
     */
    rotation: null,

    /**
     * Scale relative to its parent node
     * @type {qtek.math.Vector3}
     */
    scale: null,

    /**
     * Affine transform matrix relative to its root scene.
     * @type {qtek.math.Matrix4}
     */
    worldTransform: null,

    /**
     * Affine transform matrix relative to its parent node.
     * Composited with position, rotation and scale.
     * @type {qtek.math.Matrix4}
     */
    localTransform: null,

    /**
     * If the local transform is update from SRT(scale, rotation, translation, which is position here) each frame
     * @type {boolean}
     */
    autoUpdateLocalTransform: true,

    /**
     * Parent of current scene node
     * @type {?qtek.Node}
     * @private
     */
    _parent: null,
    /**
     * The root scene mounted. Null if it is a isolated node
     * @type {?qtek.Scene}
     * @private
     */
    _scene: null,
    /**
     * @type {boolean}
     * @private
     */
    _needsUpdateWorldTransform: true,
    /**
     * @type {boolean}
     * @private
     */
    _inIterating: false,

    // Depth for transparent queue sorting
    __depth: 0

}, function () {

    if (!this.name) {
        this.name = (this.type || 'NODE') + '_' + (nameId++);
    }

    if (!this.position) {
        this.position = new Vector3();
    }
    if (!this.rotation) {
        this.rotation = new Quaternion();
    }
    if (!this.scale) {
        this.scale = new Vector3(1, 1, 1);
    }

    this.worldTransform = new Matrix4();
    this.localTransform = new Matrix4();

    this._children = [];

},
/**@lends qtek.Node.prototype. */
{

    /**
     * @type {?qtek.math.Vector3}
     * @instance
     */
    target: null,
    /**
     * If node and its chilren invisible
     * @type {boolean}
     * @instance
     */
    invisible: false,

    /**
     * If Node is a skinned mesh
     * @return {boolean}
     */
    isSkinnedMesh: function () {
        return false;
    },
    /**
     * Return true if it is a renderable scene node, like Mesh and ParticleSystem
     * @return {boolean}
     */
    isRenderable: function () {
        return false;
    },

    /**
     * Set the name of the scene node
     * @param {string} name
     */
    setName: function (name) {
        var scene = this._scene;
        if (scene) {
            var nodeRepository = scene._nodeRepository;
            delete nodeRepository[this.name];
            nodeRepository[name] = this;
        }
        this.name = name;
    },

    /**
     * Add a child node
     * @param {qtek.Node} node
     */
    add: function (node) {
        if (this._inIterating) {
            console.warn('Add operation can cause unpredictable error when in iterating');
        }
        var originalParent = node._parent;
        if (originalParent === this) {
            return;
        }
        if (originalParent) {
            originalParent.remove(node);
        }
        node._parent = this;
        this._children.push(node);

        var scene = this._scene;
        if (scene && scene !== node.scene) {
            node.traverse(this._addSelfToScene, this);
        }
        // Mark children needs update transform
        // In case child are remove and added again after parent moved
        node._needsUpdateWorldTransform = true;
    },

    /**
     * Remove the given child scene node
     * @param {qtek.Node} node
     */
    remove: function (node) {
        if (this._inIterating) {
            console.warn('Remove operation can cause unpredictable error when in iterating');
        }
        var children = this._children;
        var idx = children.indexOf(node);
        if (idx < 0) {
            return;
        }

        children.splice(idx, 1);
        node._parent = null;

        if (this._scene) {
            node.traverse(this._removeSelfFromScene, this);
        }
    },

    /**
     * Remove all children
     */
    removeAll: function () {
        var children = this._children;

        for (var idx = 0; idx < children.length; idx++) {
            children[idx]._parent = null;

            if (this._scene) {
                children[idx].traverse(this._removeSelfFromScene, this);
            }
        }

        this._children = [];
    },

    /**
     * Get the scene mounted
     * @return {qtek.Scene}
     */
    getScene: function () {
        return this._scene;
    },

    /**
     * Get parent node
     * @return {qtek.Scene}
     */
    getParent: function () {
        return this._parent;
    },

    _removeSelfFromScene: function (descendant) {
        descendant._scene.removeFromScene(descendant);
        descendant._scene = null;
    },

    _addSelfToScene: function (descendant) {
        this._scene.addToScene(descendant);
        descendant._scene = this._scene;
    },

    /**
     * Return true if it is ancestor of the given scene node
     * @param {qtek.Node} node
     */
    isAncestor: function (node) {
        var parent = node._parent;
        while(parent) {
            if (parent === this) {
                return true;
            }
            parent = parent._parent;
        }
        return false;
    },

    /**
     * Get a new created array of all children nodes
     * @return {qtek.Node[]}
     */
    children: function () {
        return this._children.slice();
    },

    /**
     * Get child scene node at given index.
     * @param {number} idx
     * @return {qtek.Node}
     */
    childAt: function (idx) {
        return this._children[idx];
    },

    /**
     * Get first child with the given name
     * @param {string} name
     * @return {qtek.Node}
     */
    getChildByName: function (name) {
        var children = this._children;
        for (var i = 0; i < children.length; i++) {
            if (children[i].name === name) {
                return children[i];
            }
        }
    },

    /**
     * Get first descendant have the given name
     * @param {string} name
     * @return {qtek.Node}
     */
    getDescendantByName: function (name) {
        var children = this._children;
        for (var i = 0; i < children.length; i++) {
            var child = children[i];
            if (child.name === name) {
                return child;
            } else {
                var res = child.getDescendantByName(name);
                if (res) {
                    return res;
                }
            }
        }
    },

    /**
     * Query descendant node by path
     * @param {string} path
     * @return {qtek.Node}
     * @example
     *  node.queryNode('root/parent/child');
     */
    queryNode: function (path) {
        if (!path) {
            return;
        }
        // TODO Name have slash ?
        var pathArr = path.split('/');
        var current = this;
        for (var i = 0; i < pathArr.length; i++) {
            var name = pathArr[i];
            // Skip empty
            if (!name) {
                continue;
            }
            var found = false;
            var children = current._children;
            for (var j = 0; j < children.length; j++) {
                var child = children[j];
                if (child.name === name) {
                    current = child;
                    found = true;
                    break;
                }
            }
            // Early return if not found
            if (!found) {
                return;
            }
        }

        return current;
    },

    /**
     * Get query path, relative to rootNode(default is scene)
     * @param {qtek.Node} [rootNode]
     * @return {string}
     */
    getPath: function (rootNode) {
        if (!this._parent) {
            return '/';
        }

        var current = this._parent;
        var path = this.name;
        while (current._parent) {
            path = current.name + '/' + path;
            if (current._parent == rootNode) {
                break;
            }
            current = current._parent;
        }
        if (!current._parent && rootNode) {
            return null;
        }
        return path;
    },

    /**
     * Depth first traverse all its descendant scene nodes and
     * @param {Function} callback
     * @param {Node} [context]
     * @param {Function} [filter]
     */
    traverse: function (callback, context, filter) {

        this._inIterating = true;

        if (!filter || filter.call(context, this)) {
            callback.call(context, this);
        }
        var _children = this._children;
        for(var i = 0, len = _children.length; i < len; i++) {
            _children[i].traverse(callback, context, filter);
        }

        this._inIterating = false;
    },

    eachChild: function (callback, context, ctor) {
        this._inIterating = true;

        var _children = this._children;
        var noCtor = ctor == null;
        for(var i = 0, len = _children.length; i < len; i++) {
            var child = _children[i];
            if (noCtor || child.constructor === ctor) {
                callback.call(context, child, i);
            }
        }

        this._inIterating = false;
    },

    /**
     * Set the local transform and decompose to SRT
     * @param {qtek.math.Matrix4} matrix
     */
    setLocalTransform: function (matrix) {
        mat4$3.copy(this.localTransform._array, matrix._array);
        this.decomposeLocalTransform();
    },

    /**
     * Decompose the local transform to SRT
     */
    decomposeLocalTransform: function (keepScale) {
        var scale = !keepScale ? this.scale: null;
        this.localTransform.decomposeMatrix(scale, this.rotation, this.position);
    },

    /**
     * Set the world transform and decompose to SRT
     * @param {qtek.math.Matrix4} matrix
     */
    setWorldTransform: function (matrix) {
        mat4$3.copy(this.worldTransform._array, matrix._array);
        this.decomposeWorldTransform();
    },

    /**
     * Decompose the world transform to SRT
     * @method
     */
    decomposeWorldTransform: (function () {

        var tmp = mat4$3.create();

        return function (keepScale) {
            var localTransform = this.localTransform;
            var worldTransform = this.worldTransform;
            // Assume world transform is updated
            if (this._parent) {
                mat4$3.invert(tmp, this._parent.worldTransform._array);
                mat4$3.multiply(localTransform._array, tmp, worldTransform._array);
            } else {
                mat4$3.copy(localTransform._array, worldTransform._array);
            }
            var scale = !keepScale ? this.scale: null;
            localTransform.decomposeMatrix(scale, this.rotation, this.position);
        };
    })(),

    transformNeedsUpdate: function () {
        return this.position._dirty
            || this.rotation._dirty
            || this.scale._dirty;
    },

    /**
     * Update local transform from SRT
     * Notice that local transform will not be updated if _dirty mark of position, rotation, scale is all false
     */
    updateLocalTransform: function () {
        var position = this.position;
        var rotation = this.rotation;
        var scale = this.scale;

        if (this.transformNeedsUpdate()) {
            var m = this.localTransform._array;

            // Transform order, scale->rotation->position
            mat4$3.fromRotationTranslation(m, rotation._array, position._array);

            mat4$3.scale(m, m, scale._array);

            rotation._dirty = false;
            scale._dirty = false;
            position._dirty = false;

            this._needsUpdateWorldTransform = true;
        }
    },

    /**
     * Update world transform, assume its parent world transform have been updated
     * @private
     */
    _updateWorldTransformTopDown: function () {
        var localTransform = this.localTransform._array;
        var worldTransform = this.worldTransform._array;
        if (this._parent) {
            mat4$3.multiplyAffine(
                worldTransform,
                this._parent.worldTransform._array,
                localTransform
            );
        }
        else {
            mat4$3.copy(worldTransform, localTransform);
        }
    },

    /**
     * Update world transform before whole scene is updated.
     */
    updateWorldTransform: function () {
        // Find the root node which transform needs update;
        var rootNodeIsDirty = this;
        while (rootNodeIsDirty && rootNodeIsDirty.getParent()
            && rootNodeIsDirty.getParent().transformNeedsUpdate()
        ) {
            rootNodeIsDirty = rootNodeIsDirty.getParent();
        }rootNodeIsDirty.update();
    },

    /**
     * Update local transform and world transform recursively
     * @param {boolean} forceUpdateWorld
     */
    update: function (forceUpdateWorld) {
        if (this.autoUpdateLocalTransform) {
            this.updateLocalTransform();
        }
        else {
            // Transform is manually setted
            forceUpdateWorld = true;
        }

        if (forceUpdateWorld || this._needsUpdateWorldTransform) {
            this._updateWorldTransformTopDown();
            forceUpdateWorld = true;
            this._needsUpdateWorldTransform = false;
        }

        var children = this._children;
        for(var i = 0, len = children.length; i < len; i++) {
            children[i].update(forceUpdateWorld);
        }
    },

    /**
     * Get bounding box of node
     * @param  {Function} [filter]
     * @param  {qtek.math.BoundingBox} [out]
     * @return {qtek.math.BoundingBox}
     */
    // TODO Skinning
    getBoundingBox: (function () {
        function defaultFilter (el) {
            return !el.invisible && el.geometry;
        }
        var tmpBBox = new BoundingBox();
        var tmpMat4 = new Matrix4();
        var invWorldTransform = new Matrix4();
        return function (filter, out) {
            out = out || new BoundingBox();
            filter = filter || defaultFilter;
            
            if (this._parent) {
                Matrix4.invert(invWorldTransform, this._parent.worldTransform);
            }
            else {
                Matrix4.identity(invWorldTransform);
            }

            this.traverse(function (mesh) {
                if (mesh.geometry && mesh.geometry.boundingBox) {
                    tmpBBox.copy(mesh.geometry.boundingBox);
                    Matrix4.multiply(tmpMat4, invWorldTransform, mesh.worldTransform);
                    tmpBBox.applyTransform(tmpMat4);
                    out.union(tmpBBox);
                }
            }, this, defaultFilter);
            
            return out;
        };
    })(),

    /**
     * Get world position, extracted from world transform
     * @param  {qtek.math.Vector3} [out]
     * @return {qtek.math.Vector3}
     */
    getWorldPosition: function (out) {
        // PENDING
        if (this.transformNeedsUpdate()) {
            this.updateWorldTransform();
        }
        var m = this.worldTransform._array;
        if (out) {
            var arr = out._array;
            arr[0] = m[12];
            arr[1] = m[13];
            arr[2] = m[14];
            return out;
        }
        else {
            return new Vector3(m[12], m[13], m[14]);
        }
    },

    /**
     * Clone a new node
     * @return {Node}
     */
    clone: function () {
        var node = new this.constructor();
        var children = this._children;

        node.setName(this.name);
        node.position.copy(this.position);
        node.rotation.copy(this.rotation);
        node.scale.copy(this.scale);

        for (var i = 0; i < children.length; i++) {
            node.add(children[i].clone());
        }
        return node;
    },

    /**
     * Rotate the node around a axis by angle degrees, axis passes through point
     * @param {qtek.math.Vector3} point Center point
     * @param {qtek.math.Vector3} axis  Center axis
     * @param {number}       angle Rotation angle
     * @see http://docs.unity3d.com/Documentation/ScriptReference/Transform.RotateAround.html
     * @method
     */
    rotateAround: (function () {
        var v = new Vector3();
        var RTMatrix = new Matrix4();

        // TODO improve performance
        return function (point, axis, angle) {

            v.copy(this.position).subtract(point);

            var localTransform = this.localTransform;
            localTransform.identity();
            // parent node
            localTransform.translate(point);
            localTransform.rotate(angle, axis);

            RTMatrix.fromRotationTranslation(this.rotation, v);
            localTransform.multiply(RTMatrix);
            localTransform.scale(this.scale);

            this.decomposeLocalTransform();
            this._needsUpdateWorldTransform = true;
        };
    })(),

    /**
     * @param {qtek.math.Vector3} target
     * @param {qtek.math.Vector3} [up]
     * @see http://www.opengl.org/sdk/docs/man2/xhtml/gluLookAt.xml
     * @method
     */
    lookAt: (function () {
        var m = new Matrix4();
        return function (target, up) {
            m.lookAt(this.position, target, up || this.localTransform.y).invert();
            this.setLocalTransform(m);

            this.target = target;
        };
    })()
});

var vec3$6 = glmatrix.vec3;
var mat4$4 = glmatrix.mat4;
var vec4$1 = glmatrix.vec4;

/**
 * @constructor
 * @alias qtek.math.Plane
 * @param {qtek.math.Vector3} [normal]
 * @param {number} [distance]
 */
var Plane = function(normal, distance) {
    /**
     * Normal of the plane
     * @type {qtek.math.Vector3}
     */
    this.normal = normal || new Vector3(0, 1, 0);

    /**
     * Constant of the plane equation, used as distance to the origin
     * @type {number}
     */
    this.distance = distance || 0;
};

Plane.prototype = {

    constructor: Plane,

    /**
     * Distance from given point to plane
     * @param  {qtek.math.Vector3} point
     * @return {number}
     */
    distanceToPoint: function(point) {
        return vec3$6.dot(point._array, this.normal._array) - this.distance;
    },

    /**
     * Calculate the projection on the plane of point
     * @param  {qtek.math.Vector3} point
     * @param  {qtek.math.Vector3} out
     * @return {qtek.math.Vector3}
     */
    projectPoint: function(point, out) {
        if (!out) {
            out = new Vector3();
        }
        var d = this.distanceToPoint(point);
        vec3$6.scaleAndAdd(out._array, point._array, this.normal._array, -d);
        out._dirty = true;
        return out;
    },

    /**
     * Normalize the plane's normal and calculate distance
     */
    normalize: function() {
        var invLen = 1 / vec3$6.len(this.normal._array);
        vec3$6.scale(this.normal._array, invLen);
        this.distance *= invLen;
    },

    /**
     * If the plane intersect a frustum
     * @param  {qtek.math.Frustum} Frustum
     * @return {boolean}
     */
    intersectFrustum: function(frustum) {
        // Check if all coords of frustum is on plane all under plane
        var coords = frustum.vertices;
        var normal = this.normal._array;
        var onPlane = vec3$6.dot(coords[0]._array, normal) > this.distance;
        for (var i = 1; i < 8; i++) {
            if ((vec3$6.dot(coords[i]._array, normal) > this.distance) != onPlane) {
                return true;
            } 
        }
    },

    /**
     * Calculate the intersection point between plane and a given line
     * @method
     * @param {qtek.math.Vector3} start start point of line
     * @param {qtek.math.Vector3} end end point of line
     * @param {qtek.math.Vector3} [out]
     * @return {qtek.math.Vector3}
     */
    intersectLine: (function() {
        var rd = vec3$6.create();
        return function(start, end, out) {
            var d0 = this.distanceToPoint(start);
            var d1 = this.distanceToPoint(end);
            if ((d0 > 0 && d1 > 0) || (d0 < 0 && d1 < 0)) {
                return null;
            }
            // Ray intersection
            var pn = this.normal._array;
            var d = this.distance;
            var ro = start._array;
            // direction
            vec3$6.sub(rd, end._array, start._array);
            vec3$6.normalize(rd, rd);

            var divider = vec3$6.dot(pn, rd);
            // ray is parallel to the plane
            if (divider === 0) {
                return null;
            }
            if (!out) {
                out = new Vector3();
            }
            var t = (vec3$6.dot(pn, ro) - d) / divider;
            vec3$6.scaleAndAdd(out._array, ro, rd, -t);
            out._dirty = true;
            return out;
        };
    })(),

    /**
     * Apply an affine transform matrix to plane
     * @method
     * @return {qtek.math.Matrix4}
     */
    applyTransform: (function() {
        var inverseTranspose = mat4$4.create();
        var normalv4 = vec4$1.create();
        var pointv4 = vec4$1.create();
        pointv4[3] = 1;
        return function(m4) {
            m4 = m4._array;
            // Transform point on plane
            vec3$6.scale(pointv4, this.normal._array, this.distance);
            vec4$1.transformMat4(pointv4, pointv4, m4);
            this.distance = vec3$6.dot(pointv4, this.normal._array);
            // Transform plane normal
            mat4$4.invert(inverseTranspose, m4);
            mat4$4.transpose(inverseTranspose, inverseTranspose);
            normalv4[3] = 0;
            vec3$6.copy(normalv4, this.normal._array);
            vec4$1.transformMat4(normalv4, normalv4, inverseTranspose);
            vec3$6.copy(this.normal._array, normalv4);
        };
    })(),

    /**
     * Copy from another plane
     * @param  {qtek.math.Vector3} plane
     */
    copy: function(plane) {
        vec3$6.copy(this.normal._array, plane.normal._array);
        this.normal._dirty = true;
        this.distance = plane.distance;
    },

    /**
     * Clone a new plane
     * @return {qtek.math.Plane}
     */
    clone: function() {
        var plane = new Plane();
        plane.copy(this);
        return plane;
    }
};

var vec3$5 = glmatrix.vec3;

var vec3Set$1 = vec3$5.set;
var vec3Copy$1 = vec3$5.copy;
var vec3TranformMat4 = vec3$5.transformMat4;
var mathMin = Math.min;
var mathMax = Math.max;
/**
 * @constructor
 * @alias qtek.math.Frustum
 */
var Frustum = function() {

    /**
     * Eight planes to enclose the frustum
     * @type {qtek.math.Plane[]}
     */
    this.planes = [];

    for (var i = 0; i < 6; i++) {
        this.planes.push(new Plane());
    }

    /**
     * Bounding box of frustum
     * @type {qtek.math.BoundingBox}
     */
    this.boundingBox = new BoundingBox();

    /**
     * Eight vertices of frustum
     * @type {Float32Array[]}
     */
    this.vertices = [];
    for (var i = 0; i < 8; i++) {
        this.vertices[i] = vec3$5.fromValues(0, 0, 0);
    }
};

Frustum.prototype = {

    // http://web.archive.org/web/20120531231005/http://crazyjoke.free.fr/doc/3D/plane%20extraction.pdf
    /**
     * Set frustum from a projection matrix
     * @param {qtek.math.Matrix4} projectionMatrix
     */
    setFromProjection: function(projectionMatrix) {

        var planes = this.planes;
        var m = projectionMatrix._array;
        var m0 = m[0], m1 = m[1], m2 = m[2], m3 = m[3];
        var m4 = m[4], m5 = m[5], m6 = m[6], m7 = m[7];
        var m8 = m[8], m9 = m[9], m10 = m[10], m11 = m[11];
        var m12 = m[12], m13 = m[13], m14 = m[14], m15 = m[15];

        // Update planes
        vec3Set$1(planes[0].normal._array, m3 - m0, m7 - m4, m11 - m8);
        planes[0].distance = -(m15 - m12);
        planes[0].normalize();

        vec3Set$1(planes[1].normal._array, m3 + m0, m7 + m4, m11 + m8);
        planes[1].distance = -(m15 + m12);
        planes[1].normalize();

        vec3Set$1(planes[2].normal._array, m3 + m1, m7 + m5, m11 + m9);
        planes[2].distance = -(m15 + m13);
        planes[2].normalize();

        vec3Set$1(planes[3].normal._array, m3 - m1, m7 - m5, m11 - m9);
        planes[3].distance = -(m15 - m13);
        planes[3].normalize();

        vec3Set$1(planes[4].normal._array, m3 - m2, m7 - m6, m11 - m10);
        planes[4].distance = -(m15 - m14);
        planes[4].normalize();

        vec3Set$1(planes[5].normal._array, m3 + m2, m7 + m6, m11 + m10);
        planes[5].distance = -(m15 + m14);
        planes[5].normalize();

        // Perspective projection
        var boundingBox = this.boundingBox;
        if (m15 === 0)  {
            var aspect = m5 / m0;
            var zNear = -m14 / (m10 - 1);
            var zFar = -m14 / (m10 + 1);
            var farY = -zFar / m5;
            var nearY = -zNear / m5;
            // Update bounding box
            boundingBox.min.set(-farY * aspect, -farY, zFar);
            boundingBox.max.set(farY * aspect, farY, zNear);
            // update vertices
            var vertices = this.vertices;
            //--- min z
            // min x
            vec3Set$1(vertices[0], -farY * aspect, -farY, zFar);
            vec3Set$1(vertices[1], -farY * aspect, farY, zFar);
            // max x
            vec3Set$1(vertices[2], farY * aspect, -farY, zFar);
            vec3Set$1(vertices[3], farY * aspect, farY, zFar);
            //-- max z
            vec3Set$1(vertices[4], -nearY * aspect, -nearY, zNear);
            vec3Set$1(vertices[5], -nearY * aspect, nearY, zNear);
            vec3Set$1(vertices[6], nearY * aspect, -nearY, zNear);
            vec3Set$1(vertices[7], nearY * aspect, nearY, zNear);
        }
        else { // Orthographic projection
            var left = (-1 - m12) / m0;
            var right = (1 - m12) / m0;
            var top = (1 - m13) / m5;
            var bottom = (-1 - m13) / m5;
            var near = (-1 - m14) / m10;
            var far = (1 - m14) / m10;


            boundingBox.min.set(Math.min(left, right), Math.min(bottom, top), Math.min(far, near));
            boundingBox.max.set(Math.max(right, left), Math.max(top, bottom), Math.max(near, far));

            var min = boundingBox.min._array;
            var max = boundingBox.max._array;
            var vertices = this.vertices;
            //--- min z
            // min x
            vec3Set$1(vertices[0], min[0], min[1], min[2]);
            vec3Set$1(vertices[1], min[0], max[1], min[2]);
            // max x
            vec3Set$1(vertices[2], max[0], min[1], min[2]);
            vec3Set$1(vertices[3], max[0], max[1], min[2]);
            //-- max z
            vec3Set$1(vertices[4], min[0], min[1], max[2]);
            vec3Set$1(vertices[5], min[0], max[1], max[2]);
            vec3Set$1(vertices[6], max[0], min[1], max[2]);
            vec3Set$1(vertices[7], max[0], max[1], max[2]);
        }
    },

    /**
     * Apply a affine transform matrix and set to the given bounding box
     * @method
     * @param {qtek.math.BoundingBox}
     * @param {qtek.math.Matrix4}
     * @return {qtek.math.BoundingBox}
     */
    getTransformedBoundingBox: (function() {

        var tmpVec3 = vec3$5.create();

        return function(bbox, matrix) {
            var vertices = this.vertices;

            var m4 = matrix._array;
            var min = bbox.min;
            var max = bbox.max;
            var minArr = min._array;
            var maxArr = max._array;
            var v = vertices[0];
            vec3TranformMat4(tmpVec3, v, m4);
            vec3Copy$1(minArr, tmpVec3);
            vec3Copy$1(maxArr, tmpVec3);

            for (var i = 1; i < 8; i++) {
                v = vertices[i];
                vec3TranformMat4(tmpVec3, v, m4);

                minArr[0] = mathMin(tmpVec3[0], minArr[0]);
                minArr[1] = mathMin(tmpVec3[1], minArr[1]);
                minArr[2] = mathMin(tmpVec3[2], minArr[2]);

                maxArr[0] = mathMax(tmpVec3[0], maxArr[0]);
                maxArr[1] = mathMax(tmpVec3[1], maxArr[1]);
                maxArr[2] = mathMax(tmpVec3[2], maxArr[2]);
            }

            min._dirty = true;
            max._dirty = true;

            return bbox;
        };
    }) ()
};

var vec3$7 = glmatrix.vec3;

var EPSILON = 1e-5;

/**
 * @constructor
 * @alias qtek.math.Ray
 * @param {qtek.math.Vector3} [origin]
 * @param {qtek.math.Vector3} [direction]
 */
var Ray = function (origin, direction) {
    /**
     * @type {qtek.math.Vector3}
     */
    this.origin = origin || new Vector3();
    /**
     * @type {qtek.math.Vector3}
     */
    this.direction = direction || new Vector3();
};

Ray.prototype = {

    constructor: Ray,

    // http://www.siggraph.org/education/materials/HyperGraph/raytrace/rayplane_intersection.htm
    /**
     * Calculate intersection point between ray and a give plane
     * @param  {qtek.math.Plane} plane
     * @param  {qtek.math.Vector3} [out]
     * @return {qtek.math.Vector3}
     */
    intersectPlane: function (plane, out) {
        var pn = plane.normal._array;
        var d = plane.distance;
        var ro = this.origin._array;
        var rd = this.direction._array;

        var divider = vec3$7.dot(pn, rd);
        // ray is parallel to the plane
        if (divider === 0) {
            return null;
        }
        if (!out) {
            out = new Vector3();
        }
        var t = (vec3$7.dot(pn, ro) - d) / divider;
        vec3$7.scaleAndAdd(out._array, ro, rd, -t);
        out._dirty = true;
        return out;
    },

    /**
     * Mirror the ray against plane
     * @param  {qtek.math.Plane} plane
     */
    mirrorAgainstPlane: function (plane) {
        // Distance to plane
        var d = vec3$7.dot(plane.normal._array, this.direction._array);
        vec3$7.scaleAndAdd(this.direction._array, this.direction._array, plane.normal._array, -d * 2);
        this.direction._dirty = true;
    },

    distanceToPoint: (function () {
        var v = vec3$7.create();
        return function (point) {
            vec3$7.sub(v, point, this.origin._array);
            // Distance from projection point to origin
            var b = vec3$7.dot(v, this.direction._array);
            if (b < 0) {
                return vec3$7.distance(this.origin._array, point);
            }
            // Squared distance from center to origin
            var c2 = vec3$7.lenSquared(v);
            // Squared distance from center to projection point
            return Math.sqrt(c2 - b * b);
        };
    })(),

    /**
     * Calculate intersection point between ray and sphere
     * @param  {qtek.math.Vector3} center
     * @param  {number} radius
     * @param  {qtek.math.Vector3} out
     * @return {qtek.math.Vector3}
     */
    intersectSphere: (function () {
        var v = vec3$7.create();
        return function (center, radius, out) {
            var origin = this.origin._array;
            var direction = this.direction._array;
            center = center._array;
            vec3$7.sub(v, center, origin);
            // Distance from projection point to origin
            var b = vec3$7.dot(v, direction);
            // Squared distance from center to origin
            var c2 = vec3$7.squaredLength(v);
            // Squared distance from center to projection point
            var d2 = c2 - b * b;

            var r2 = radius * radius;
            // No intersection
            if (d2 > r2) {
                return;
            }

            var a = Math.sqrt(r2 - d2);
            // First intersect point
            var t0 = b - a;
            // Second intersect point
            var t1 = b + a;

            if (!out) {
                out = new Vector3();
            }
            if (t0 < 0) {
                if (t1 < 0) {
                    return null;
                }
                else {
                    vec3$7.scaleAndAdd(out._array, origin, direction, t1);
                    return out;
                }
            }
            else {
                vec3$7.scaleAndAdd(out._array, origin, direction, t0);
                return out;
            }
        };
    })(),

    // http://www.scratchapixel.com/lessons/3d-basic-lessons/lesson-7-intersecting-simple-shapes/ray-box-intersection/
    /**
     * Calculate intersection point between ray and bounding box
     * @param {qtek.math.BoundingBox} bbox
     * @param {qtek.math.Vector3}
     * @return {qtek.math.Vector3}
     */
    intersectBoundingBox: function (bbox, out) {
        var dir = this.direction._array;
        var origin = this.origin._array;
        var min = bbox.min._array;
        var max = bbox.max._array;

        var invdirx = 1 / dir[0];
        var invdiry = 1 / dir[1];
        var invdirz = 1 / dir[2];

        var tmin, tmax, tymin, tymax, tzmin, tzmax;
        if (invdirx >= 0) {
            tmin = (min[0] - origin[0]) * invdirx;
            tmax = (max[0] - origin[0]) * invdirx;
        }
        else {
            tmax = (min[0] - origin[0]) * invdirx;
            tmin = (max[0] - origin[0]) * invdirx;
        }
        if (invdiry >= 0) {
            tymin = (min[1] - origin[1]) * invdiry;
            tymax = (max[1] - origin[1]) * invdiry;
        }
        else {
            tymax = (min[1] - origin[1]) * invdiry;
            tymin = (max[1] - origin[1]) * invdiry;
        }

        if ((tmin > tymax) || (tymin > tmax)) {
            return null;
        }

        if (tymin > tmin || tmin !== tmin) {
            tmin = tymin;
        }
        if (tymax < tmax || tmax !== tmax) {
            tmax = tymax;
        }

        if (invdirz >= 0) {
            tzmin = (min[2] - origin[2]) * invdirz;
            tzmax = (max[2] - origin[2]) * invdirz;
        }
        else {
            tzmax = (min[2] - origin[2]) * invdirz;
            tzmin = (max[2] - origin[2]) * invdirz;
        }

        if ((tmin > tzmax) || (tzmin > tmax)) {
            return null;
        }

        if (tzmin > tmin || tmin !== tmin) {
            tmin = tzmin;
        }
        if (tzmax < tmax || tmax !== tmax) {
            tmax = tzmax;
        }
        if (tmax < 0) {
            return null;
        }

        var t = tmin >= 0 ? tmin : tmax;

        if (!out) {
            out = new Vector3();
        }
        vec3$7.scaleAndAdd(out._array, origin, dir, t);
        return out;
    },

    // http://en.wikipedia.org/wiki/M%C3%B6ller%E2%80%93Trumbore_intersection_algorithm
    /**
     * Calculate intersection point between ray and three triangle vertices
     * @param {qtek.math.Vector3} a
     * @param {qtek.math.Vector3} b
     * @param {qtek.math.Vector3} c
     * @param {boolean}           singleSided, CW triangle will be ignored
     * @param {qtek.math.Vector3} [out]
     * @param {qtek.math.Vector3} [barycenteric] barycentric coords
     * @return {qtek.math.Vector3}
     */
    intersectTriangle: (function () {

        var eBA = vec3$7.create();
        var eCA = vec3$7.create();
        var AO = vec3$7.create();
        var vCross = vec3$7.create();

        return function (a, b, c, singleSided, out, barycenteric) {
            var dir = this.direction._array;
            var origin = this.origin._array;
            a = a._array;
            b = b._array;
            c = c._array;

            vec3$7.sub(eBA, b, a);
            vec3$7.sub(eCA, c, a);

            vec3$7.cross(vCross, eCA, dir);

            var det = vec3$7.dot(eBA, vCross);

            if (singleSided) {
                if (det > -EPSILON) {
                    return null;
                }
            }
            else {
                if (det > -EPSILON && det < EPSILON) {
                    return null;
                }
            }

            vec3$7.sub(AO, origin, a);
            var u = vec3$7.dot(vCross, AO) / det;
            if (u < 0 || u > 1) {
                return null;
            }

            vec3$7.cross(vCross, eBA, AO);
            var v = vec3$7.dot(dir, vCross) / det;

            if (v < 0 || v > 1 || (u + v > 1)) {
                return null;
            }

            vec3$7.cross(vCross, eBA, eCA);
            var t = -vec3$7.dot(AO, vCross) / det;

            if (t < 0) {
                return null;
            }

            if (!out) {
                out = new Vector3();
            }
            if (barycenteric) {
                Vector3.set(barycenteric, (1 - u - v), u, v);
            }
            vec3$7.scaleAndAdd(out._array, origin, dir, t);

            return out;
        };
    })(),

    /**
     * Apply an affine transform matrix to the ray
     * @return {qtek.math.Matrix4} matrix
     */
    applyTransform: function (matrix) {
        Vector3.add(this.direction, this.direction, this.origin);
        Vector3.transformMat4(this.origin, this.origin, matrix);
        Vector3.transformMat4(this.direction, this.direction, matrix);

        Vector3.sub(this.direction, this.direction, this.origin);
        Vector3.normalize(this.direction, this.direction);
    },

    /**
     * Copy values from another ray
     * @param {qtek.math.Ray} ray
     */
    copy: function (ray) {
        Vector3.copy(this.origin, ray.origin);
        Vector3.copy(this.direction, ray.direction);
    },

    /**
     * Clone a new ray
     * @return {qtek.math.Ray}
     */
    clone: function () {
        var ray = new Ray();
        ray.copy(this);
        return ray;
    }
};

var vec3$4 = glmatrix.vec3;
var vec4 = glmatrix.vec4;

/**
 * @constructor qtek.Camera
 * @extends qtek.Node
 */
var Camera$1 = Node.extend(function () {
    return /** @lends qtek.Camera# */ {
        /**
         * Camera projection matrix
         * @type {qtek.math.Matrix4}
         */
        projectionMatrix: new Matrix4(),

        /**
         * Inverse of camera projection matrix
         * @type {qtek.math.Matrix4}
         */
        invProjectionMatrix: new Matrix4(),

        /**
         * View matrix, equal to inverse of camera's world matrix
         * @type {qtek.math.Matrix4}
         */
        viewMatrix: new Matrix4(),

        /**
         * Camera frustum in view space
         * @type {qtek.math.Frustum}
         */
        frustum: new Frustum()
    };
}, function () {
    this.update(true);
},
/** @lends qtek.Camera.prototype */
{

    update: function (force) {
        Node.prototype.update.call(this, force);
        Matrix4.invert(this.viewMatrix, this.worldTransform);

        this.updateProjectionMatrix();
        Matrix4.invert(this.invProjectionMatrix, this.projectionMatrix);

        this.frustum.setFromProjection(this.projectionMatrix);
    },

    /**
     * Set camera view matrix
     */
    setViewMatrix: function (viewMatrix) {
        Matrix4.copy(this.viewMatrix, viewMatrix);
        Matrix4.invert(this.worldTransform, viewMatrix);
        this.decomposeWorldTransform();
    },

    /**
     * Decompose camera projection matrix
     */
    decomposeProjectionMatrix: function () {},

    /**
     * Set camera projection matrix
     * @param {qtek.math.Matrix4} projectionMatrix
     */
    setProjectionMatrix: function (projectionMatrix) {
        Matrix4.copy(this.projectionMatrix, projectionMatrix);
        Matrix4.invert(this.invProjectionMatrix, projectionMatrix);
        this.decomposeProjectionMatrix();
    },
    /**
     * Update projection matrix, called after update
     */
    updateProjectionMatrix: function () {},

    /**
     * Cast a picking ray from camera near plane to far plane
     * @method
     * @param {qtek.math.Vector2} ndc
     * @param {qtek.math.Ray} [out]
     * @return {qtek.math.Ray}
     */
    castRay: (function () {
        var v4 = vec4.create();
        return function (ndc, out) {
            var ray = out !== undefined ? out : new Ray();
            var x = ndc._array[0];
            var y = ndc._array[1];
            vec4.set(v4, x, y, -1, 1);
            vec4.transformMat4(v4, v4, this.invProjectionMatrix._array);
            vec4.transformMat4(v4, v4, this.worldTransform._array);
            vec3$4.scale(ray.origin._array, v4, 1 / v4[3]);

            vec4.set(v4, x, y, 1, 1);
            vec4.transformMat4(v4, v4, this.invProjectionMatrix._array);
            vec4.transformMat4(v4, v4, this.worldTransform._array);
            vec3$4.scale(v4, v4, 1 / v4[3]);
            vec3$4.sub(ray.direction._array, v4, ray.origin._array);

            vec3$4.normalize(ray.direction._array, ray.direction._array);
            ray.direction._dirty = true;
            ray.origin._dirty = true;

            return ray;
        };
    })()

    /**
     * @method
     * @name clone
     * @return {qtek.Camera}
     * @memberOf qtek.Camera.prototype
     */
});

/**
 * @constructor qtek.camera.Perspective
 * @extends qtek.Camera
 */
var Perspective = Camera$1.extend(
/** @lends qtek.camera.Perspective# */
{
    /**
     * Vertical field of view in radians
     * @type {number}
     */
    fov: 50,
    /**
     * Aspect ratio, typically viewport width / height
     * @type {number}
     */
    aspect: 1,
    /**
     * Near bound of the frustum
     * @type {number}
     */
    near: 0.1,
    /**
     * Far bound of the frustum
     * @type {number}
     */
    far: 2000
},
/** @lends qtek.camera.Perspective.prototype */
{

    updateProjectionMatrix: function() {
        var rad = this.fov / 180 * Math.PI;
        this.projectionMatrix.perspective(rad, this.aspect, this.near, this.far);
    },
    decomposeProjectionMatrix: function () {
        var m = this.projectionMatrix._array;
        var rad = Math.atan(1 / m[5]) * 2;
        this.fov = rad / Math.PI * 180;
        this.aspect = m[5] / m[0];
        this.near = m[14] / (m[10] - 1);
        this.far = m[14] / (m[10] + 1);
    },
    /**
     * @return {qtek.camera.Perspective}
     */
    clone: function() {
        var camera = Camera$1.prototype.clone.call(this);
        camera.fov = this.fov;
        camera.aspect = this.aspect;
        camera.near = this.near;
        camera.far = this.far;

        return camera;
    }
});

/**
 * @constructor qtek.Light
 * @extends qtek.Node
 */
var Light = Node.extend(function(){
    return /** @lends qtek.Light# */ {
        /**
         * Light RGB color
         * @type {number[]}
         */
        color: [1, 1, 1],

        /**
         * Light intensity
         * @type {number}
         */
        intensity: 1.0,

        // Config for shadow map
        /**
         * If light cast shadow
         * @type {boolean}
         */
        castShadow: true,

        /**
         * Shadow map size
         * @type {number}
         */
        shadowResolution: 512,

        /**
         * Light group, shader with same `lightGroup` will be affected
         *
         * Only useful in forward rendering
         * @type {number}
         */
        group: 0
    };
},
/** @lends qtek.Light.prototype. */
{
    /**
     * Light type
     * @type {string}
     * @memberOf qtek.Light#
     */
    type: '',

    /**
     * @return {qtek.Light}
     * @memberOf qtek.Light.prototype
     */
    clone: function() {
        var light = Node.prototype.clone.call(this);
        light.color = Array.prototype.slice.call(this.color);
        light.intensity = this.intensity;
        light.castShadow = this.castShadow;
        light.shadowResolution = this.shadowResolution;

        return light;
    }
});

/**
 * @constructor qtek.Scene
 * @extends qtek.Node
 */
var Scene = Node.extend(function () {
    return /** @lends qtek.Scene# */ {
        /**
         * Global material of scene
         * @type {qtek.Material}
         */
        material: null,

        /**
         * @type {boolean}
         */
        autoUpdate: true,

        /**
         * Opaque renderable list, it will be updated automatically
         * @type {qtek.Renderable[]}
         * @readonly
         */
        opaqueQueue: [],

        /**
         * Opaque renderable list, it will be updated automatically
         * @type {qtek.Renderable[]}
         * @readonly
         */
        transparentQueue: [],

        lights: [],


        /**
         * Scene bounding box in view space.
         * Used when camera needs to adujst the near and far plane automatically
         * so that the view frustum contains the visible objects as tightly as possible.
         * Notice:
         *  It is updated after rendering (in the step of frustum culling passingly). So may be not so accurate, but saves a lot of calculation
         *
         * @type {qtek.math.BoundingBox}
         */
        viewBoundingBoxLastFrame: new BoundingBox(),

        // Properties to save the light information in the scene
        // Will be set in the render function
        _lightUniforms: {},

        _lightNumber: {
            // groupId: {
                // POINT_LIGHT: 0,
                // DIRECTIONAL_LIGHT: 0,
                // SPOT_LIGHT: 0,
                // AMBIENT_LIGHT: 0,
                // AMBIENT_SH_LIGHT: 0
            // }
        },

        _opaqueObjectCount: 0,
        _transparentObjectCount: 0,

        _nodeRepository: {},

    };
}, function () {
    this._scene = this;
},
/** @lends qtek.Scene.prototype. */
{
    /**
     * Add node to scene
     * @param {Node} node
     */
    addToScene: function (node) {
        if (node.name) {
            this._nodeRepository[node.name] = node;
        }
    },

    /**
     * Remove node from scene
     * @param {Node} node
     */
    removeFromScene: function (node) {
        if (node.name) {
            delete this._nodeRepository[node.name];
        }
    },

    /**
     * Get node by name
     * @param  {string} name
     * @return {Node}
     * @DEPRECATED
     */
    getNode: function (name) {
        return this._nodeRepository[name];
    },

    /**
     * Clone a new scene node recursively, including material, skeleton.
     * Shader and geometry instances will not been cloned
     * @param  {qtek.Node} node
     * @return {qtek.Node}
     */
    cloneNode: function (node) {
        var newNode = node.clone();
        var materialsMap = {};

        var cloneSkeleton = function (current, currentNew) {
            if (current.skeleton) {
                currentNew.skeleton = current.skeleton.clone(node, newNode);
                currentNew.joints = current.joints.slice();
            }
            if (current.material) {
                materialsMap[current.material.__GUID__] = {
                    oldMat: current.material
                };
            }
            for (var i = 0; i < current._children.length; i++) {
                cloneSkeleton(current._children[i], currentNew._children[i]);
            }
        };

        cloneSkeleton(node, newNode);

        for (var guid in materialsMap) {
            materialsMap[guid].newMat = materialsMap[guid].oldMat.clone();
        }

        // Replace material
        newNode.traverse(function (current) {
            if (current.material) {
                current.material = materialsMap[current.material.__GUID__].newMat;
            }
        });

        return newNode;
    },


    /**
     * Scene update
     * @param  {boolean} force
     * @param  {boolean} notUpdateLights
     *         Useful in deferred pipeline
     */
    update: function (force, notUpdateLights) {
        if (!(this.autoUpdate || force)) {
            return;
        }
        Node.prototype.update.call(this, force);

        var lights = this.lights;
        var sceneMaterialTransparent = this.material && this.material.transparent;

        this._opaqueObjectCount = 0;
        this._transparentObjectCount = 0;

        lights.length = 0;

        this._updateRenderQueue(this, sceneMaterialTransparent);

        this.opaqueQueue.length = this._opaqueObjectCount;
        this.transparentQueue.length = this._transparentObjectCount;

        // reset
        if (!notUpdateLights) {
            var lightNumber = this._lightNumber;
            // Reset light numbers
            for (var group in lightNumber) {
                for (var type in lightNumber[group]) {
                    lightNumber[group][type] = 0;
                }
            }
            for (var i = 0; i < lights.length; i++) {
                var light = lights[i];
                var group = light.group;
                if (!lightNumber[group]) {
                    lightNumber[group] = {};
                }
                // User can use any type of light
                lightNumber[group][light.type] = lightNumber[group][light.type] || 0;
                lightNumber[group][light.type]++;
            }
            // PENDING Remove unused group?

            this._updateLightUniforms();
        }
    },

    // Traverse the scene and add the renderable
    // object to the render queue
    _updateRenderQueue: function (parent, sceneMaterialTransparent) {
        if (parent.invisible) {
            return;
        }

        for (var i = 0; i < parent._children.length; i++) {
            var child = parent._children[i];

            if (child instanceof Light) {
                this.lights.push(child);
            }
            if (child.isRenderable()) {
                if (child.material.transparent || sceneMaterialTransparent) {
                    this.transparentQueue[this._transparentObjectCount++] = child;
                }
                else {
                    this.opaqueQueue[this._opaqueObjectCount++] = child;
                }
            }
            if (child._children.length > 0) {
                this._updateRenderQueue(child);
            }
        }
    },

    _updateLightUniforms: function () {
        var lights = this.lights;
        // Put the light cast shadow before the light not cast shadow
        lights.sort(lightSortFunc);

        var lightUniforms = this._lightUniforms;
        for (var group in lightUniforms) {
            for (var symbol in lightUniforms[group]) {
                lightUniforms[group][symbol].value.length = 0;
            }
        }
        for (var i = 0; i < lights.length; i++) {

            var light = lights[i];
            var group = light.group;

            for (var symbol in light.uniformTemplates) {

                var uniformTpl = light.uniformTemplates[symbol];
                if (!lightUniforms[group]) {
                    lightUniforms[group] = {};
                }
                if (!lightUniforms[group][symbol]) {
                    lightUniforms[group][symbol] = {
                        type: '',
                        value: []
                    };
                }
                var value = uniformTpl.value(light);
                var lu = lightUniforms[group][symbol];
                lu.type = uniformTpl.type + 'v';
                switch (uniformTpl.type) {
                    case '1i':
                    case '1f':
                    case 't':
                        lu.value.push(value);
                        break;
                    case '2f':
                    case '3f':
                    case '4f':
                        for (var j =0; j < value.length; j++) {
                            lu.value.push(value[j]);
                        }
                        break;
                    default:
                        console.error('Unkown light uniform type ' + uniformTpl.type);
                }
            }
        }
    },
    
    /**
     * Determine if light group of the shader is different from scene's
     * Used to determine whether to update shader and scene's uniforms in Renderer.render
     * @param {Shader} shader
     * @returns {Boolean}
     */
    isShaderLightNumberChanged: function (shader) {
        var group = shader.lightGroup;
        // PENDING Performance
        for (var type in this._lightNumber[group]) {
            if (this._lightNumber[group][type] !== shader.lightNumber[type]) {
                return true;
            }
        }
        for (var type in shader.lightNumber) {
            if (this._lightNumber[group][type] !== shader.lightNumber[type]) {
                return true;
            }
        }
        return false;
    },

    /**
     * Set shader's light group with scene's
     * @param {Shader} shader
     */
    setShaderLightNumber: function (shader) {
        var group = shader.lightGroup;
        for (var type in this._lightNumber[group]) {
            shader.lightNumber[type] = this._lightNumber[group][type];
        }
        shader.dirty();
    },

    setLightUniforms: function (shader, renderer) {
        var group = shader.lightGroup;
        for (var symbol in this._lightUniforms[group]) {
            var lu = this._lightUniforms[group][symbol];
            if (lu.type === 'tv') {
                for (var i = 0; i < lu.value.length; i++) {
                    var texture = lu.value[i];
                    var slot = shader.currentTextureSlot();
                    var result = shader.setUniform(renderer.gl, '1i', symbol, slot);
                    if (result) {
                        shader.takeCurrentTextureSlot(renderer, texture);
                    }
                }
            }
            else {
                shader.setUniform(renderer.gl, lu.type, symbol, lu.value);
            }
        }
    },

    /**
     * Dispose self, clear all the scene objects
     * But resources of gl like texuture, shader will not be disposed.
     * Mostly you should use disposeScene method in Renderer to do dispose.
     */
    dispose: function () {
        this.material = null;
        this.opaqueQueue = [];
        this.transparentQueue = [];

        this.lights = [];

        this._lightUniforms = {};

        this._lightNumber = {};
        this._nodeRepository = {};
    }
});

function lightSortFunc(a, b) {
    if (b.castShadow && !a.castShadow) {
        return true;
    }
}

var mathUtil = {};

mathUtil.isPowerOfTwo = function (value) {
    return (value & (value - 1)) === 0;
};

mathUtil.nextPowerOfTwo = function (value) {
    value --;
    value |= value >> 1;
    value |= value >> 2;
    value |= value >> 4;
    value |= value >> 8;
    value |= value >> 16;
    value ++;

    return value;
};

mathUtil.nearestPowerOfTwo = function (value) {
    return Math.pow( 2, Math.round( Math.log( value ) / Math.LN2 ) );
};

var isPowerOfTwo = mathUtil.isPowerOfTwo;

var targetList = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];

/**
 * @constructor qtek.TextureCube
 * @extends qtek.Texture
 *
 * @example
 *     ...
 *     var mat = new qtek.Material({
 *         shader: qtek.shader.library.get('qtek.phong', 'environmentMap')
 *     });
 *     var envMap = new qtek.TextureCube();
 *     envMap.load({
 *         'px': 'assets/textures/sky/px.jpg',
 *         'nx': 'assets/textures/sky/nx.jpg'
 *         'py': 'assets/textures/sky/py.jpg'
 *         'ny': 'assets/textures/sky/ny.jpg'
 *         'pz': 'assets/textures/sky/pz.jpg'
 *         'nz': 'assets/textures/sky/nz.jpg'
 *     });
 *     mat.set('environmentMap', envMap);
 *     ...
 *     envMap.success(function () {
 *         // Wait for the sky texture loaded
 *         animation.on('frame', function (frameTime) {
 *             renderer.render(scene, camera);
 *         });
 *     });
 */
var TextureCube = Texture.extend(function () {
    return /** @lends qtek.TextureCube# */{
        /**
         * @type {Object}
         * @property {?HTMLImageElement|HTMLCanvasElemnet} px
         * @property {?HTMLImageElement|HTMLCanvasElemnet} nx
         * @property {?HTMLImageElement|HTMLCanvasElemnet} py
         * @property {?HTMLImageElement|HTMLCanvasElemnet} ny
         * @property {?HTMLImageElement|HTMLCanvasElemnet} pz
         * @property {?HTMLImageElement|HTMLCanvasElemnet} nz
         */
        image: {
            px: null,
            nx: null,
            py: null,
            ny: null,
            pz: null,
            nz: null
        },
        /**
         * Pixels data of each side. Will be ignored if images are set.
         * @type {Object}
         * @property {?Uint8Array} px
         * @property {?Uint8Array} nx
         * @property {?Uint8Array} py
         * @property {?Uint8Array} ny
         * @property {?Uint8Array} pz
         * @property {?Uint8Array} nz
         */
        pixels: {
            px: null,
            nx: null,
            py: null,
            ny: null,
            pz: null,
            nz: null
        },

        /**
         * @type {Array.<Object>}
         */
        mipmaps: []
    };
}, {
    update: function (renderer) {
        var _gl = renderer.gl;
        _gl.bindTexture(_gl.TEXTURE_CUBE_MAP, this._cache.get('webgl_texture'));

        this.updateCommon(renderer);

        var glFormat = this.format;
        var glType = this.type;

        _gl.texParameteri(_gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_WRAP_S, this.getAvailableWrapS());
        _gl.texParameteri(_gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_WRAP_T, this.getAvailableWrapT());

        _gl.texParameteri(_gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_MAG_FILTER, this.getAvailableMagFilter());
        _gl.texParameteri(_gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_MIN_FILTER, this.getAvailableMinFilter());

        var anisotropicExt = renderer.getGLExtension('EXT_texture_filter_anisotropic');
        if (anisotropicExt && this.anisotropic > 1) {
            _gl.texParameterf(_gl.TEXTURE_CUBE_MAP, anisotropicExt.TEXTURE_MAX_ANISOTROPY_EXT, this.anisotropic);
        }

        // Fallback to float type if browser don't have half float extension
        if (glType === 36193) {
            var halfFloatExt = renderer.getGLExtension('OES_texture_half_float');
            if (!halfFloatExt) {
                glType = glenum.FLOAT;
            }
        }

        if (this.mipmaps.length) {
            var width = this.width;
            var height = this.height;
            for (var i = 0; i < this.mipmaps.length; i++) {
                var mipmap = this.mipmaps[i];
                this._updateTextureData(_gl, mipmap, i, width, height, glFormat, glType);
                width /= 2;
                height /= 2;
            }
        }
        else {
            this._updateTextureData(_gl, this, 0, this.width, this.height, glFormat, glType);

            if (!this.NPOT && this.useMipmap) {
                _gl.generateMipmap(_gl.TEXTURE_CUBE_MAP);
            }
        }

        _gl.bindTexture(_gl.TEXTURE_CUBE_MAP, null);
    },

    _updateTextureData: function (_gl, data, level, width, height, glFormat, glType) {
        for (var i = 0; i < 6; i++) {
            var target = targetList[i];
            var img = data.image && data.image[target];
            if (img) {
                _gl.texImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, level, glFormat, glFormat, glType, img);
            }
            else {
                _gl.texImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, level, glFormat, width, height, 0, glFormat, glType, data.pixels && data.pixels[target]);
            }
        }
    },

    /**
     * @param  {qtek.Renderer} renderer
     * @memberOf qtek.TextureCube.prototype
     */
    generateMipmap: function (renderer) {
        var _gl = renderer.gl;
        if (this.useMipmap && !this.NPOT) {
            _gl.bindTexture(_gl.TEXTURE_CUBE_MAP, this._cache.get('webgl_texture'));
            _gl.generateMipmap(_gl.TEXTURE_CUBE_MAP);
        }
    },

    bind: function (renderer) {
        renderer.gl.bindTexture(renderer.gl.TEXTURE_CUBE_MAP, this.getWebGLTexture(renderer));
    },

    unbind: function (renderer) {
        renderer.gl.bindTexture(renderer.gl.TEXTURE_CUBE_MAP, null);
    },

    // Overwrite the isPowerOfTwo method
    isPowerOfTwo: function () {
        if (this.image.px) {
            return isPowerOfTwo(this.image.px.width)
                && isPowerOfTwo(this.image.px.height);
        }
        else {
            return isPowerOfTwo(this.width)
                && isPowerOfTwo(this.height);
        }
    },

    isRenderable: function () {
        if (this.image.px) {
            return isImageRenderable(this.image.px)
                && isImageRenderable(this.image.nx)
                && isImageRenderable(this.image.py)
                && isImageRenderable(this.image.ny)
                && isImageRenderable(this.image.pz)
                && isImageRenderable(this.image.nz);
        }
        else {
            return !!(this.width && this.height);
        }
    },

    load: function (imageList, crossOrigin) {
        var loading = 0;
        var self = this;
        util.each(imageList, function (src, target){
            var image = new Image();
            if (crossOrigin) {
                image.crossOrigin = crossOrigin;
            }
            image.onload = function () {
                loading --;
                if (loading === 0){
                    self.dirty();
                    self.trigger('success', self);
                }
                image.onload = null;
            };
            image.onerror = function () {
                loading --;
                image.onerror = null;
            };

            loading++;
            image.src = src;
            self.image[target] = image;
        });

        return this;
    }
});

Object.defineProperty(TextureCube.prototype, 'width', {
    get: function () {
        if (this.image && this.image.px) {
            return this.image.px.width;
        }
        return this._width;
    },
    set: function (value) {
        if (this.image && this.image.px) {
            console.warn('Texture from image can\'t set width');
        }
        else {
            if (this._width !== value) {
                this.dirty();
            }
            this._width = value;
        }
    }
});
Object.defineProperty(TextureCube.prototype, 'height', {
    get: function () {
        if (this.image && this.image.px) {
            return this.image.px.height;
        }
        return this._height;
    },
    set: function (value) {
        if (this.image && this.image.px) {
            console.warn('Texture from image can\'t set height');
        }
        else {
            if (this._height !== value) {
                this.dirty();
            }
            this._height = value;
        }
    }
});
function isImageRenderable(image) {
    return image.nodeName === 'CANVAS' ||
            image.nodeName === 'VIDEO' ||
            image.complete;
}

var isPowerOfTwo$1 = mathUtil.isPowerOfTwo;

/**
 * @constructor qtek.Texture2D
 * @extends qtek.Texture
 *
 * @example
 *     ...
 *     var mat = new qtek.Material({
 *         shader: qtek.shader.library.get('qtek.phong', 'diffuseMap')
 *     });
 *     var diffuseMap = new qtek.Texture2D();
 *     diffuseMap.load('assets/textures/diffuse.jpg');
 *     mat.set('diffuseMap', diffuseMap);
 *     ...
 *     diffuseMap.success(function () {
 *         // Wait for the diffuse texture loaded
 *         animation.on('frame', function (frameTime) {
 *             renderer.render(scene, camera);
 *         });
 *     });
 */
var Texture2D = Texture.extend(function () {
    return /** @lends qtek.Texture2D# */ {
        /**
         * @type {?HTMLImageElement|HTMLCanvasElemnet}
         */
        image: null,
        /**
         * Pixels data. Will be ignored if image is set.
         * @type {?Uint8Array|Float32Array}
         */
        pixels: null,
        /**
         * @type {Array.<Object>}
         * @example
         *     [{
         *         image: mipmap0,
         *         pixels: null
         *     }, {
         *         image: mipmap1,
         *         pixels: null
         *     }, ....]
         */
        mipmaps: []
    };
}, {
    update: function (renderer) {

        var _gl = renderer.gl;
        _gl.bindTexture(_gl.TEXTURE_2D, this._cache.get('webgl_texture'));

        this.updateCommon(renderer);

        var glFormat = this.format;
        var glType = this.type;

        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, this.getAvailableWrapS());
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, this.getAvailableWrapT());

        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, this.getAvailableMagFilter());
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, this.getAvailableMinFilter());

        var anisotropicExt = renderer.getGLExtension('EXT_texture_filter_anisotropic');
        if (anisotropicExt && this.anisotropic > 1) {
            _gl.texParameterf(_gl.TEXTURE_2D, anisotropicExt.TEXTURE_MAX_ANISOTROPY_EXT, this.anisotropic);
        }

        // Fallback to float type if browser don't have half float extension
        if (glType === 36193) {
            var halfFloatExt = renderer.getGLExtension('OES_texture_half_float');
            if (!halfFloatExt) {
                glType = glenum.FLOAT;
            }
        }

        if (this.mipmaps.length) {
            var width = this.width;
            var height = this.height;
            for (var i = 0; i < this.mipmaps.length; i++) {
                var mipmap = this.mipmaps[i];
                this._updateTextureData(_gl, mipmap, i, width, height, glFormat, glType);
                width /= 2;
                height /= 2;
            }
        }
        else {
            this._updateTextureData(_gl, this, 0, this.width, this.height, glFormat, glType);

            if (this.useMipmap && !this.NPOT) {
                _gl.generateMipmap(_gl.TEXTURE_2D);
            }
        }

        _gl.bindTexture(_gl.TEXTURE_2D, null);
    },

    _updateTextureData: function (_gl, data, level, width, height, glFormat, glType) {
        if (data.image) {
            _gl.texImage2D(_gl.TEXTURE_2D, level, glFormat, glFormat, glType, data.image);
        }
        else {
            // Can be used as a blank texture when writing render to texture(RTT)
            if (
                glFormat <= Texture.COMPRESSED_RGBA_S3TC_DXT5_EXT
                && glFormat >= Texture.COMPRESSED_RGB_S3TC_DXT1_EXT
            ) {
                _gl.compressedTexImage2D(_gl.TEXTURE_2D, level, glFormat, width, height, 0, data.pixels);
            }
            else {
                // Is a render target if pixels is null
                _gl.texImage2D(_gl.TEXTURE_2D, level, glFormat, width, height, 0, glFormat, glType, data.pixels);
            }
        }
    },

    /**
     * @param  {qtek.Renderer} renderer
     * @memberOf qtek.Texture2D.prototype
     */
    generateMipmap: function (renderer) {
        var _gl = renderer.gl;
        if (this.useMipmap && !this.NPOT) {
            _gl.bindTexture(_gl.TEXTURE_2D, this._cache.get('webgl_texture'));
            _gl.generateMipmap(_gl.TEXTURE_2D);
        }
    },

    isPowerOfTwo: function () {
        var width;
        var height;
        if (this.image) {
            width = this.image.width;
            height = this.image.height;
        }
        else {
            width = this.width;
            height = this.height;
        }
        return isPowerOfTwo$1(width) && isPowerOfTwo$1(height);
    },

    isRenderable: function () {
        if (this.image) {
            return this.image.nodeName === 'CANVAS'
                || this.image.nodeName === 'VIDEO'
                || this.image.complete;
        }
        else {
            return !!(this.width && this.height);
        }
    },

    bind: function (renderer) {
        renderer.gl.bindTexture(renderer.gl.TEXTURE_2D, this.getWebGLTexture(renderer));
    },

    unbind: function (renderer) {
        renderer.gl.bindTexture(renderer.gl.TEXTURE_2D, null);
    },

    load: function (src, crossOrigin) {
        var image = new Image();
        if (crossOrigin) {
            image.crossOrigin = crossOrigin;
        }
        var self = this;
        image.onload = function () {
            self.dirty();
            self.trigger('success', self);
            image.onload = null;
        };
        image.onerror = function () {
            self.trigger('error', self);
            image.onerror = null;
        };

        image.src = src;
        this.image = image;

        return this;
    }
});

Object.defineProperty(Texture2D.prototype, 'width', {
    get: function () {
        if (this.image) {
            return this.image.width;
        }
        return this._width;
    },
    set: function (value) {
        if (this.image) {
            console.warn('Texture from image can\'t set width');
        }
        else {
            if (this._width !== value) {
                this.dirty();
            }
            this._width = value;
        }
    }
});
Object.defineProperty(Texture2D.prototype, 'height', {
    get: function () {
        if (this.image) {
            return this.image.height;
        }
        return this._height;
    },
    set: function (value) {
        if (this.image) {
            console.warn('Texture from image can\'t set height');
        }
        else {
            if (this._height !== value) {
                this.dirty();
            }
            this._height = value;
        }
    }
});

/**
 * Only implements needed gestures for mobile.
 */
var GestureMgr = function () {

    /**
     * @private
     * @type {Array.<Object>}
     */
    this._track = [];
};

GestureMgr.prototype = {

    constructor: GestureMgr,

    recognize: function (event, target, root) {
        this._doTrack(event, target, root);
        return this._recognize(event);
    },

    clear: function () {
        this._track.length = 0;
        return this;
    },

    _doTrack: function (event, target, root) {
        var touches = event.targetTouches;

        if (!touches) {
            return;
        }

        var trackItem = {
            points: [],
            touches: [],
            target: target,
            event: event
        };

        for (var i = 0, len = touches.length; i < len; i++) {
            var touch = touches[i];
            trackItem.points.push([touch.clientX, touch.clientY]);
            trackItem.touches.push(touch);
        }

        this._track.push(trackItem);
    },

    _recognize: function (event) {
        for (var eventName in recognizers) {
            if (recognizers.hasOwnProperty(eventName)) {
                var gestureInfo = recognizers[eventName](this._track, event);
                if (gestureInfo) {
                    return gestureInfo;
                }
            }
        }
    }
};

function dist(pointPair) {
    var dx = pointPair[1][0] - pointPair[0][0];
    var dy = pointPair[1][1] - pointPair[0][1];

    return Math.sqrt(dx * dx + dy * dy);
}

function center(pointPair) {
    return [
        (pointPair[0][0] + pointPair[1][0]) / 2,
        (pointPair[0][1] + pointPair[1][1]) / 2
    ];
}

var recognizers = {

    pinch: function (track, event) {
        var trackLen = track.length;

        if (!trackLen) {
            return;
        }

        var pinchEnd = (track[trackLen - 1] || {}).points;
        var pinchPre = (track[trackLen - 2] || {}).points || pinchEnd;

        if (pinchPre
            && pinchPre.length > 1
            && pinchEnd
            && pinchEnd.length > 1
        ) {
            var pinchScale = dist(pinchEnd) / dist(pinchPre);
            !isFinite(pinchScale) && (pinchScale = 1);

            event.pinchScale = pinchScale;

            var pinchCenter = center(pinchEnd);
            event.pinchX = pinchCenter[0];
            event.pinchY = pinchCenter[1];

            return {
                type: 'pinch',
                target: track[0].target,
                event: event
            };
        }
    }
};

function convertToArray(val) {
    if (!Array.isArray(val)) {
        val = [val, val];
    }
    return val;
}

/**
 * @alias module:echarts-x/util/OrbitControl
 */
var OrbitControl = Base.extend(function () {

    return {

        animation: null,

        /**
         * @type {HTMLDomElement}
         */
        domElement: null,

        /**
         * @type {qtek.Node}
         */
        target: null,
        /**
         * @type {qtek.math.Vector3}
         */
        _center: new Vector3(),

        /**
         * Minimum distance to the center
         * @type {number}
         * @default 0.5
         */
        minDistance: 0.1,

        /**
         * Maximum distance to the center
         * @type {number}
         * @default 2
         */
        maxDistance: 1000,

        /**
         * Minimum alpha rotation
         */
        minAlpha: -90,

        /**
         * Maximum alpha rotation
         */
        maxAlpha: 90,

        /**
         * Minimum beta rotation
         */
        minBeta: -Infinity,
        /**
         * Maximum beta rotation
         */
        maxBeta: Infinity,

        /**
         * Start auto rotating after still for the given time
         */
        autoRotateAfterStill: 0,

        /**
         * Direction of autoRotate. cw or ccw when looking top down.
         */
        autoRotateDirection: 'cw',

        /**
         * Degree per second
         */
        autoRotateSpeed: 60,

        /**
         * Pan or rotate
         * @type {String}
         */
        _mode: 'rotate',

        /**
         * @param {number}
         */
        damping: 0.8,

        /**
         * @param {number}
         */
        rotateSensitivity: 1,

        /**
         * @param {number}
         */
        zoomSensitivity: 1,

        /**
         * @param {number}
         */
        panSensitivity: 1,

        _needsUpdate: false,

        _rotating: false,

        // Rotation around yAxis
        _phi: 0,
        // Rotation around xAxis
        _theta: 0,

        _mouseX: 0,
        _mouseY: 0,

        _rotateVelocity: new Vector2(),

        _panVelocity: new Vector2(),

        _distance: 20,

        _zoomSpeed: 0,

        _stillTimeout: 0,

        _animators: [],

        _gestureMgr: new GestureMgr()
    };
}, function () {
    // Each OrbitControl has it's own handler
    this._mouseDownHandler = this._mouseDownHandler.bind(this);
    this._mouseWheelHandler = this._mouseWheelHandler.bind(this);
    this._mouseMoveHandler = this._mouseMoveHandler.bind(this);
    this._mouseUpHandler = this._mouseUpHandler.bind(this);
    this._pinchHandler = this._pinchHandler.bind(this);

    this.update = this.update.bind(this);

    this.init();
}, {
    /**
     * Initialize.
     * Mouse event binding
     */
    init: function () {
        var dom = this.domElement;

        dom.addEventListener('touchstart', this._mouseDownHandler);

        dom.addEventListener('mousedown', this._mouseDownHandler);
        dom.addEventListener('mousewheel', this._mouseWheelHandler);

        if (this.animation) {
            this.animation.on('frame', this.update);
        }
    },

    /**
     * Dispose.
     * Mouse event unbinding
     */
    dispose: function () {
        var dom = this.domElement;

        dom.removeEventListener('touchstart', this._mouseDownHandler);
        dom.removeEventListener('touchmove', this._mouseMoveHandler);
        dom.removeEventListener('touchend', this._mouseUpHandler);

        dom.removeEventListener('mousedown', this._mouseDownHandler);
        dom.removeEventListener('mousemove', this._mouseMoveHandler);
        dom.removeEventListener('mouseup', this._mouseUpHandler);
        dom.removeEventListener('mousewheel', this._mouseWheelHandler);

        if (this.animation) {
            this.animation.off('frame', this.update);
        }
        this.stopAllAnimation();
    },

    /**
     * Get distance
     * @return {number}
     */
    getDistance: function () {
        return this._distance;
    },

    /**
     * Set distance
     * @param {number} distance
     */
    setDistance: function (distance) {
        this._distance = distance;
        this._needsUpdate = true;
    },

    /**
     * Get alpha rotation
     * Alpha angle for top-down rotation. Positive to rotate to top.
     *
     * Which means camera rotation around x axis.
     */
    getAlpha: function () {
        return this._theta / Math.PI * 180;
    },

    /**
     * Get beta rotation
     * Beta angle for left-right rotation. Positive to rotate to right.
     *
     * Which means camera rotation around y axis.
     */
    getBeta: function () {
        return -this._phi / Math.PI * 180;
    },

    /**
     * Get control center
     * @return {Array.<number>}
     */
    getCenter: function () {
        return this._center.toArray();
    },

    /**
     * Set alpha rotation angle
     * @param {number} alpha
     */
    setAlpha: function (alpha) {
        alpha = Math.max(Math.min(this.maxAlpha, alpha), this.minAlpha);

        this._theta = alpha / 180 * Math.PI;
        this._needsUpdate = true;
    },

    /**
     * Set beta rotation angle
     * @param {number} beta
     */
    setBeta: function (beta) {
        beta = Math.max(Math.min(this.maxBeta, beta), this.minBeta);

        this._phi = -beta / 180 * Math.PI;
        this._needsUpdate = true;
    },

    /**
     * Set control center
     * @param {Array.<number>} center
     */
    setCenter: function (centerArr) {
        this._center.setArray(centerArr);
    },

    setOption: function (opts) {
        opts = opts || {};

        ['autoRotate', 'autoRotateAfterStill',
            'autoRotateDirection', 'autoRotateSpeed',
            'damping',
            'minDistance', 'maxDistance',
            'minAlpha', 'maxAlpha', 'minBeta', 'maxBeta',
            'rotateSensitivity', 'zoomSensitivity', 'panSensitivity'
        ].forEach(function (key) {
            if (opts[key] != null) {
                this[key] = opts[key];
            }
        }, this);

        if (opts.distance != null) {
            this.setDistance(opts.distance);
        }

        if (opts.alpha != null) {
            this.setAlpha(opts.alpha);
        }
        if (opts.beta != null) {
            this.setBeta(opts.beta);
        }

        if (opts.center) {
            this.setCenter(opts.center);
        }
    },

    /**
     * @param {Object} opts
     * @param {number} opts.distance
     * @param {number} opts.alpha
     * @param {number} opts.beta
     * @param {number} [opts.duration=1000]
     * @param {number} [opts.easing='linear']
     * @param {number} [opts.done]
     */
    animateTo: function (opts) {
        var self = this;

        var obj = {};
        var target = {};
        var animation = this.animation;
        if (!animation) {
            return;
        }
        if (opts.distance != null) {
            obj.distance = this.getDistance();
            target.distance = opts.distance;
        }
        if (opts.alpha != null) {
            obj.alpha = this.getAlpha();
            target.alpha = opts.alpha;
        }
        if (opts.beta != null) {
            obj.beta = this.getBeta();
            target.beta = opts.beta;
        }
        if (opts.center != null) {
            obj.center = this.getCenter();
            target.center = opts.center;
        }

        return this._addAnimator(
            animation.animate(obj)
                .when(opts.duration || 1000, target)
                .during(function () {
                    if (obj.alpha != null) {
                        self.setAlpha(obj.alpha);
                    }
                    if (obj.beta != null) {
                        self.setBeta(obj.beta);
                    }
                    if (obj.distance != null) {
                        self.setDistance(obj.distance);
                    }
                    if (obj.center != null) {
                        self.setCenter(obj.center);
                    }
                    self._needsUpdate = true;
                })
                .done(opts.done)
        ).start(opts.easing || 'linear');
    },

    /**
     * Stop all animation
     */
    stopAllAnimation: function () {
        for (var i = 0; i < this._animators.length; i++) {
            this._animators[i].stop();
        }
        this._animators.length = 0;
    },

    _isAnimating: function () {
        return this._animators.length > 0;
    },
    /**
     * Call update each frame
     * @param  {number} deltaTime Frame time
     */
    update: function (deltaTime) {

        deltaTime = deltaTime || 16;

        if (this._rotating) {
            var radian = (this.autoRotateDirection === 'cw' ? 1 : -1)
                * this.autoRotateSpeed / 180 * Math.PI;
            this._phi -= radian * deltaTime / 1000;
            this._needsUpdate = true;
        }
        else if (this._rotateVelocity.len() > 0) {
            this._needsUpdate = true;
        }

        if (Math.abs(this._zoomSpeed) > 0.01 || this._panVelocity.len() > 0) {
            this._needsUpdate = true;
        }

        if (!this._needsUpdate) {
            return;
        }

        // Fixed deltaTime
        this._updateDistance(Math.min(deltaTime, 50));
        this._updatePan(Math.min(deltaTime, 50));

        this._updateRotate(Math.min(deltaTime, 50));

        this._updateTransform();

        this.target.update();

        this.trigger('update');

        this._needsUpdate = false;
    },

    _updateRotate: function (deltaTime) {
        var velocity = this._rotateVelocity;
        this._phi = velocity.y * deltaTime / 20 + this._phi;
        this._theta = velocity.x * deltaTime / 20 + this._theta;

        this.setAlpha(this.getAlpha());
        this.setBeta(this.getBeta());

        this._vectorDamping(velocity, this.damping);
    },

    _updateDistance: function (deltaTime) {
        this._setDistance(this._distance + this._zoomSpeed * deltaTime / 20);
        this._zoomSpeed *= this.damping;
    },

    _setDistance: function (distance) {
        this._distance = Math.max(Math.min(distance, this.maxDistance), this.minDistance);
    },

    _updatePan: function (deltaTime) {
        var velocity = this._panVelocity;
        var len = this._distance;

        var target = this.target;
        var yAxis = target.worldTransform.y;
        var xAxis = target.worldTransform.x;

        // PENDING
        this._center
            .scaleAndAdd(xAxis, -velocity.x * len / 200)
            .scaleAndAdd(yAxis, -velocity.y * len / 200);

        this._vectorDamping(velocity, 0);
    },

    _updateTransform: function () {
        var camera = this.target;

        var dir = new Vector3();
        var theta = this._theta + Math.PI / 2;
        var phi = this._phi + Math.PI / 2;
        var r = Math.sin(theta);

        dir.x = r * Math.cos(phi);
        dir.y = -Math.cos(theta);
        dir.z = r * Math.sin(phi);

        camera.position.copy(this._center).scaleAndAdd(dir, this._distance);
        camera.rotation.identity()
            // First around y, then around x
            .rotateY(-this._phi)
            .rotateX(-this._theta);
    },

    _startCountingStill: function () {
        clearTimeout(this._stillTimeout);

        var time = this.autoRotateAfterStill;
        var self = this;
        if (!isNaN(time) && time > 0) {
            this._stillTimeout = setTimeout(function () {
                self._rotating = true;
            }, time * 1000);
        }
    },

    _vectorDamping: function (v, damping) {
        var speed = v.len();
        speed = speed * damping;
        if (speed < 1e-4) {
            speed = 0;
        }
        v.normalize().scale(speed);
    },

    // TODO Following code will cause decompose problem.
    // camera.position.y = 2;
    // camera.position.z = -4;
    // camera.lookAt(scene.position);
    // 
    decomposeTransform: function () {
        if (!this.target) {
            return;
        }

        // FIXME euler order......
        // FIXME alpha is not certain when beta is 90 or -90
        var euler = new Vector3();
        euler.eulerFromQuat(
            this.target.rotation.normalize(), 'ZYX'
        );

        this._theta = -euler.x;
        this._phi = -euler.y;

        this.setBeta(this.getBeta());
        this.setAlpha(this.getAlpha());

        this._setDistance(this.target.position.dist(this._center));
    },

    _mouseDownHandler: function (e) {
        if (this._isAnimating()) {
            return;
        }
        var x = e.clientX;
        var y = e.clientY;
        // Touch
        if (e.targetTouches) {
            var touch = e.targetTouches[0];
            x = touch.clientX;
            y = touch.clientY;

            this._mode = 'rotate';

            this._processGesture(e, 'start');
        }

        var dom = this.domElement;
        dom.addEventListener('touchmove', this._mouseMoveHandler);
        dom.addEventListener('touchend', this._mouseUpHandler);

        dom.addEventListener('mousemove', this._mouseMoveHandler);
        dom.addEventListener('mouseup', this._mouseUpHandler);

        if (e.button === 0) {
            this._mode = 'rotate';
        }
        else if (e.button === 1) {
            this._mode = 'pan';
        }

        // Reset rotate velocity
        this._rotateVelocity.set(0, 0);
        this._rotating = false;
        if (this.autoRotate) {
            this._startCountingStill();
        }

        this._mouseX = x;
        this._mouseY = y;
    },

    _mouseMoveHandler: function (e) {
        if (this._isAnimating()) {
            return;
        }
        var x = e.clientX;
        var y = e.clientY;

        var haveGesture;
        // Touch
        if (e.targetTouches) {
            var touch = e.targetTouches[0];
            x = touch.clientX;
            y = touch.clientY;

            haveGesture = this._processGesture(e, 'change');
        }

        var panSensitivity = convertToArray(this.panSensitivity);
        var rotateSensitivity = convertToArray(this.rotateSensitivity);

        if (!haveGesture) {
            if (this._mode === 'rotate') {
                this._rotateVelocity.y = (x - this._mouseX) / this.domElement.clientHeight * 2 * rotateSensitivity[0];
                this._rotateVelocity.x = (y - this._mouseY) / this.domElement.clientWidth * 2 * rotateSensitivity[1];
            }
            else if (this._mode === 'pan') {
                this._panVelocity.x = (x - this._mouseX) / this.domElement.clientWidth * panSensitivity[0] * 400;
                this._panVelocity.y = (-y + this._mouseY) / this.domElement.clientHeight * panSensitivity[1] * 400;
            }
        }

        this._mouseX = x;
        this._mouseY = y;

        e.preventDefault();
    },

    _mouseWheelHandler: function (e) {
        if (this._isAnimating()) {
            return;
        }
        var delta = e.wheelDelta // Webkit
                || -e.detail; // Firefox
        if (delta === 0) {
            return;
        }
        this._zoomHandler(e, delta > 0 ? -1 : 1);
    },

    _pinchHandler: function (e) {
        if (this._isAnimating()) {
            return;
        }
        this._zoomHandler(e, e.pinchScale > 1 ? -0.4 : 0.4);
    },

    _zoomHandler: function (e, delta) {

        var distance = Math.max(Math.min(
            this._distance - this.minDistance,
            this.maxDistance - this._distance
        ));
        this._zoomSpeed = delta * Math.max(distance / 40 * this.zoomSensitivity, 0.2);

        this._rotating = false;

        if (this.autoRotate && this._mode === 'rotate') {
            this._startCountingStill();
        }

        e.preventDefault();
    },

    _mouseUpHandler: function (event) {
        var dom = this.domElement;
        dom.removeEventListener('touchmove', this._mouseMoveHandler);
        dom.removeEventListener('touchend', this._mouseUpHandler);
        dom.removeEventListener('mousemove', this._mouseMoveHandler);
        dom.removeEventListener('mouseup', this._mouseUpHandler);

        this._processGesture(event, 'end');
    },

    _addAnimator: function (animator) {
        var animators = this._animators;
        animators.push(animator);
        animator.done(function () {
            var idx = animators.indexOf(animator);
            if (idx >= 0) {
                animators.splice(idx, 1);
            }
        });
        return animator;
    },


    _processGesture: function (event, stage) {
        var gestureMgr = this._gestureMgr;

        stage === 'start' && gestureMgr.clear();

        var gestureInfo = gestureMgr.recognize(
            event,
            null,
            this.domElement
        );

        stage === 'end' && gestureMgr.clear();

        // Do not do any preventDefault here. Upper application do that if necessary.
        if (gestureInfo) {
            var type = gestureInfo.type;
            event.gestureEvent = type;

            this._pinchHandler(gestureInfo.event);
        }

        return gestureInfo;
    }
});

/**
 * If auto rotate the target
 * @type {boolean}
 * @default false
 */
Object.defineProperty(OrbitControl.prototype, 'autoRotate', {
    get: function () {
        return this._autoRotate;
    },
    set: function (val) {
        this._autoRotate = val;
        this._rotating = val;
    }
});

Object.defineProperty(OrbitControl.prototype, 'target', {
    get: function () {
        return this._target;
    },
    set: function (val) {
        if (val && val.target) {
            this.setCenter(val.target.toArray());
        }
        this._target = val;
        this.decomposeTransform();
    }
});

// Port from https://github.com/mrdoob/three.js/blob/master/examples/js/controls/DeviceOrientationControls.js
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

// Cache
var prevDrawID = 0;
var prevDrawIndicesBuffer = null;
var prevDrawIsUseIndices = true;

var currentDrawID;

var RenderInfo = function() {
    this.triangleCount = 0;
    this.vertexCount = 0;
    this.drawCallCount = 0;
};

function VertexArrayObject(
    availableAttributes,
    availableAttributeSymbols,
    indicesBuffer
) {
    this.availableAttributes = availableAttributes;
    this.availableAttributeSymbols = availableAttributeSymbols;
    this.indicesBuffer = indicesBuffer;

    this.vao = null;
}
/**
 * @constructor
 * @alias qtek.Renderable
 * @extends qtek.Node
 */
var Renderable = Node.extend(
/** @lends qtek.Renderable# */
{
    /**
     * @type {qtek.Material}
     */
    material: null,

    /**
     * @type {qtek.Geometry}
     */
    geometry: null,

    /**
     * @type {number}
     */
    mode: glenum.TRIANGLES,

    _drawCache: null,

    _renderInfo: null
}, function() {
    this._drawCache = {};
    this._renderInfo = new RenderInfo();
},
/** @lends qtek.Renderable.prototype */
{

    /**
     * Render order, Nodes with smaller value renders before nodes with larger values.
     * @type {Number}
     */
    renderOrder: 0,
    /**
     * Used when mode is LINES, LINE_STRIP or LINE_LOOP
     * @type {number}
     */
    lineWidth: 1,

    /**
     * If enable culling
     * @type {boolean}
     */
    culling: true,
    /**
     * Specify which side of polygon will be culled.
     * Possible values:
     *  + {@link qtek.Renderable.BACK}
     *  + {@link qtek.Renderable.FRONT}
     *  + {@link qtek.Renderable.FRONT_AND_BACK}
     * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/cullFace
     * @type {number}
     */
    cullFace: glenum.BACK,
    /**
     * Specify which side is front face.
     * Possible values:
     *  + {@link qtek.Renderable.CW}
     *  + {@link qtek.Renderable.CCW}
     * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/frontFace
     * @type {number}
     */
    frontFace: glenum.CCW,

    /**
     * If enable software frustum culling 
     * @type {boolean}
     */
    frustumCulling: true,
    /**
     * @type {boolean}
     */
    receiveShadow: true,
    /**
     * @type {boolean}
     */
    castShadow: true,
    /**
     * @type {boolean}
     */
    ignorePicking: false,
    /**
     * @type {boolean}
     */
    ignorePreZ: false,

    /**
     * @type {boolean}
     */
    ignoreGBuffer: false,
    
    /**
     * @return {boolean}
     */
    isRenderable: function() {
        // TODO Shader ?
        return this.geometry && this.material && !this.invisible
            && this.geometry.vertexCount > 0;
    },

    /**
     * Before render hook
     * @type {Function}
     */
    beforeRender: function (_gl) {},

    /**
     * Before render hook
     * @type {Function}
     */
    afterRender: function (_gl, renderStat) {},

    getBoundingBox: function (filter, out) {
        out = Node.prototype.getBoundingBox.call(this, filter, out);
        if (this.geometry && this.geometry.boundingBox) {
            out.union(this.geometry.boundingBox);
        }

        return out;
    },

    /**
     * @param  {qtek.Renderer} renderer
     * @param  {qtek.Shader} [shader] May use shader of other material if shader code are same
     * @return {Object}
     */
    render: function (renderer, shader) {
        var _gl = renderer.gl;
        // May use shader of other material if shader code are same
        var shader = shader || this.material.shader;
        var geometry = this.geometry;

        var glDrawMode = this.mode;

        var nVertex = geometry.vertexCount;
        var isUseIndices = geometry.isUseIndices();

        var uintExt = renderer.getGLExtension('OES_element_index_uint');
        var useUintExt = uintExt && nVertex > 0xffff;
        var indicesType = useUintExt ? _gl.UNSIGNED_INT : _gl.UNSIGNED_SHORT;

        var vaoExt = renderer.getGLExtension('OES_vertex_array_object');
        // var vaoExt = null;

        var isStatic = !geometry.dynamic;

        var renderInfo = this._renderInfo;
        renderInfo.vertexCount = nVertex;
        renderInfo.triangleCount = 0;
        renderInfo.drawCallCount = 0;
        // Draw each chunk
        var drawHashChanged = false;
        // Hash with shader id in case previous material has less attributes than next material
        currentDrawID = renderer.__GUID__ + '-' + geometry.__GUID__ + '-' + shader.__GUID__;

        if (currentDrawID !== prevDrawID) {
            drawHashChanged = true;
        }
        else {
            // The cache will be invalid in the following cases
            // 1. Geometry is splitted to multiple chunks
            // 2. VAO is enabled and is binded to null after render
            // 3. Geometry needs update
            if (
                ((nVertex > 0xffff && !uintExt) && isUseIndices)
                || (vaoExt && isStatic)
                || geometry._cache.isDirty()
            ) {
                drawHashChanged = true;
            }
        }
        prevDrawID = currentDrawID;

        if (!drawHashChanged) {
            // Direct draw
            if (prevDrawIsUseIndices) {
                _gl.drawElements(glDrawMode, prevDrawIndicesBuffer.count, indicesType, 0);
                renderInfo.triangleCount = prevDrawIndicesBuffer.count / 3;
            }
            else {
                // FIXME Use vertex number in buffer
                // vertexCount may get the wrong value when geometry forget to mark dirty after update
                _gl.drawArrays(glDrawMode, 0, nVertex);
            }
            renderInfo.drawCallCount = 1;
        }
        else {
            // Use the cache of static geometry
            var vaoList = this._drawCache[currentDrawID];
            if (!vaoList) {
                var chunks = geometry.getBufferChunks(renderer);
                if (!chunks) {  // Empty mesh
                    return;
                }
                vaoList = [];
                for (var c = 0; c < chunks.length; c++) {
                    var chunk = chunks[c];
                    var attributeBuffers = chunk.attributeBuffers;
                    var indicesBuffer = chunk.indicesBuffer;

                    var availableAttributes = [];
                    var availableAttributeSymbols = [];
                    for (var a = 0; a < attributeBuffers.length; a++) {
                        var attributeBufferInfo = attributeBuffers[a];
                        var name = attributeBufferInfo.name;
                        var semantic = attributeBufferInfo.semantic;
                        var symbol;
                        if (semantic) {
                            var semanticInfo = shader.attribSemantics[semantic];
                            symbol = semanticInfo && semanticInfo.symbol;
                        }
                        else {
                            symbol = name;
                        }
                        if (symbol && shader.attributeTemplates[symbol]) {
                            availableAttributes.push(attributeBufferInfo);
                            availableAttributeSymbols.push(symbol);
                        }
                    }

                    var vao = new VertexArrayObject(
                        availableAttributes,
                        availableAttributeSymbols,
                        indicesBuffer
                    );
                    vaoList.push(vao);
                }
                if (isStatic) {
                    this._drawCache[currentDrawID] = vaoList;
                }
            }

            for (var i = 0; i < vaoList.length; i++) {
                var vao = vaoList[i];
                var needsBindAttributes = true;

                // Create vertex object array cost a lot
                // So we don't use it on the dynamic object
                if (vaoExt && isStatic) {
                    // Use vertex array object
                    // http://blog.tojicode.com/2012/10/oesvertexarrayobject-extension.html
                    if (vao.vao == null) {
                        vao.vao = vaoExt.createVertexArrayOES();
                    }
                    else {
                        needsBindAttributes = false;
                    }
                    vaoExt.bindVertexArrayOES(vao.vao);
                }

                var availableAttributes = vao.availableAttributes;
                var indicesBuffer = vao.indicesBuffer;

                if (needsBindAttributes) {
                    var locationList = shader.enableAttributes(renderer, vao.availableAttributeSymbols, (vaoExt && isStatic && vao.vao));
                    // Setting attributes;
                    for (var a = 0; a < availableAttributes.length; a++) {
                        var location = locationList[a];
                        if (location === -1) {
                            continue;
                        }
                        var attributeBufferInfo = availableAttributes[a];
                        var buffer = attributeBufferInfo.buffer;
                        var size = attributeBufferInfo.size;
                        var glType;
                        switch (attributeBufferInfo.type) {
                            case 'float':
                                glType = _gl.FLOAT;
                                break;
                            case 'byte':
                                glType = _gl.BYTE;
                                break;
                            case 'ubyte':
                                glType = _gl.UNSIGNED_BYTE;
                                break;
                            case 'short':
                                glType = _gl.SHORT;
                                break;
                            case 'ushort':
                                glType = _gl.UNSIGNED_SHORT;
                                break;
                            default:
                                glType = _gl.FLOAT;
                                break;
                        }

                        _gl.bindBuffer(_gl.ARRAY_BUFFER, buffer);
                        _gl.vertexAttribPointer(location, size, glType, false, 0, 0);
                    }
                }
                if (
                    glDrawMode == glenum.LINES ||
                    glDrawMode == glenum.LINE_STRIP ||
                    glDrawMode == glenum.LINE_LOOP
                ) {
                    _gl.lineWidth(this.lineWidth);
                }

                prevDrawIndicesBuffer = indicesBuffer;
                prevDrawIsUseIndices = geometry.isUseIndices();
                // Do drawing
                if (prevDrawIsUseIndices) {
                    if (needsBindAttributes) {
                        _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, indicesBuffer.buffer);
                    }
                    _gl.drawElements(glDrawMode, indicesBuffer.count, indicesType, 0);
                    renderInfo.triangleCount += indicesBuffer.count / 3;
                } else {
                    _gl.drawArrays(glDrawMode, 0, nVertex);
                }

                if (vaoExt && isStatic) {
                    vaoExt.bindVertexArrayOES(null);
                }

                renderInfo.drawCallCount++;
            }
        }

        return renderInfo;
    },

    /**
     * Clone a new renderable
     * @method
     * @return {qtek.Renderable}
     */
    clone: (function() {
        var properties = [
            'castShadow', 'receiveShadow',
            'mode', 'culling', 'cullFace', 'frontFace',
            'frustumCulling',
            'renderOrder', 'lineWidth',
            'ignorePicking', 'ignorePreZ', 'ignoreGBuffer'
        ];
        return function() {
            var renderable = Node.prototype.clone.call(this);

            renderable.geometry = this.geometry;
            renderable.material = this.material;

            for (var i = 0; i < properties.length; i++) {
                var name = properties[i];
                // Try not to overwrite the prototype property
                if (renderable[name] !== this[name]) {
                    renderable[name] = this[name];
                }
            }

            return renderable;
        };
    })()
});

/**
 * @type {number}
 */
Renderable.POINTS = glenum.POINTS;
/**
 * @type {number}
 */
Renderable.LINES = glenum.LINES;
/**
 * @type {number}
 */
Renderable.LINE_LOOP = glenum.LINE_LOOP;
/**
 * @type {number}
 */
Renderable.LINE_STRIP = glenum.LINE_STRIP;
/**
 * @type {number}
 */
Renderable.TRIANGLES = glenum.TRIANGLES;
/**
 * @type {number}
 */
Renderable.TRIANGLE_STRIP = glenum.TRIANGLE_STRIP;
/**
 * @type {number}
 */
Renderable.TRIANGLE_FAN = glenum.TRIANGLE_FAN;
/**
 * @type {number}
 */
Renderable.BACK = glenum.BACK;
/**
 * @type {number}
 */
Renderable.FRONT = glenum.FRONT;
/**
 * @type {number}
 */
Renderable.FRONT_AND_BACK = glenum.FRONT_AND_BACK;
/**
 * @type {number}
 */
Renderable.CW = glenum.CW;
/**
 * @type {number}
 */
Renderable.CCW = glenum.CCW;

Renderable.RenderInfo = RenderInfo;

var vec3$8 = glmatrix.vec3;
var mat4$5 = glmatrix.mat4;

var vec3Create = vec3$8.create;
var vec3Add = vec3$8.add;
var vec3Set$2 = vec3$8.set;

function getArrayCtorByType (type) {
    return ({
        'byte': vendor.Int8Array,
        'ubyte': vendor.Uint8Array,
        'short': vendor.Int16Array,
        'ushort': vendor.Uint16Array
    })[type] || vendor.Float32Array;
}

function makeAttrKey(attrName) {
    return 'attr_' + attrName;
}
/**
 * Geometry attribute
 * @alias qtek.Geometry.Attribute
 * @constructor
 */
function Attribute(name, type, size, semantic) {
    /**
     * Attribute name
     * @type {string}
     */
    this.name = name;
    /**
     * Attribute type
     * Possible values:
     *  + `'byte'`
     *  + `'ubyte'`
     *  + `'short'`
     *  + `'ushort'`
     *  + `'float'` Most commonly used.
     * @type {string}
     */
    this.type = type;
    /**
     * Size of attribute component. 1 - 4.
     * @type {number}
     */
    this.size = size;
    /**
     * Semantic of this attribute.
     * Possible values:
     *  + `'POSITION'`
     *  + `'NORMAL'`
     *  + `'BINORMAL'`
     *  + `'TANGENT'`
     *  + `'TEXCOORD'`
     *  + `'TEXCOORD_0'`
     *  + `'TEXCOORD_1'`
     *  + `'COLOR'`
     *  + `'JOINT'`
     *  + `'WEIGHT'`
     * 
     * In shader, attribute with same semantic will be automatically mapped. For example:
     * ```glsl
     * attribute vec3 pos: POSITION
     * ```
     * will use the attribute value with semantic POSITION in geometry, no matter what name it used.
     * @type {string}
     */
    this.semantic = semantic || '';

    /**
     * Value of the attribute.
     * @type {TypedArray}
     */
    this.value = null;

    // Init getter setter
    switch (size) {
        case 1:
            this.get = function (idx) {
                return this.value[idx];
            };
            this.set = function (idx, value) {
                this.value[idx] = value;
            };
            // Copy from source to target
            this.copy = function (target, source) {
                this.value[target] = this.value[target];
            };
            break;
        case 2:
            this.get = function (idx, out) {
                var arr = this.value;
                out[0] = arr[idx * 2];
                out[1] = arr[idx * 2 + 1];
                return out;
            };
            this.set = function (idx, val) {
                var arr = this.value;
                arr[idx * 2] = val[0];
                arr[idx * 2 + 1] = val[1];
            };
            this.copy = function (target, source) {
                var arr = this.value;
                source *= 2;
                target *= 2;
                arr[target] = arr[source];
                arr[target + 1] = arr[source + 1];
            };
            break;
        case 3:
            this.get = function (idx, out) {
                var idx3 = idx * 3;
                var arr = this.value;
                out[0] = arr[idx3];
                out[1] = arr[idx3 + 1];
                out[2] = arr[idx3 + 2];
                return out;
            };
            this.set = function (idx, val) {
                var idx3 = idx * 3;
                var arr = this.value;
                arr[idx3] = val[0];
                arr[idx3 + 1] = val[1];
                arr[idx3 + 2] = val[2];
            };
            this.copy = function (target, source) {
                var arr = this.value;
                source *= 3;
                target *= 3;
                arr[target] = arr[source];
                arr[target + 1] = arr[source + 1];
                arr[target + 2] = arr[source + 2];
            };
            break;
        case 4:
            this.get = function (idx, out) {
                var arr = this.value;
                var idx4 = idx * 4;
                out[0] = arr[idx4];
                out[1] = arr[idx4 + 1];
                out[2] = arr[idx4 + 2];
                out[3] = arr[idx4 + 3];
                return out;
            };
            this.set = function (idx, val) {
                var arr = this.value;
                var idx4 = idx * 4;
                arr[idx4] = val[0];
                arr[idx4 + 1] = val[1];
                arr[idx4 + 2] = val[2];
                arr[idx4 + 3] = val[3];
            };
            this.copy = function (target, source) {
                var arr = this.value;
                source *= 4;
                target *= 4;
                // copyWithin is extremely slow
                arr[target] = arr[source];
                arr[target + 1] = arr[source + 1];
                arr[target + 2] = arr[source + 2];
                arr[target + 3] = arr[source + 3];
            };
    }
}

/**
 * Set item value at give index. Second parameter val is number if size is 1
 * @method
 * @name qtek.Geometry.Attribute#set
 * @param {number} idx
 * @param {number[]|number} val
 * @example
 * geometry.getAttribute('position').set(0, [1, 1, 1]);
 */

/**
 * Get item value at give index. Second parameter out is no need if size is 1
 * @method
 * @name qtek.Geometry.Attribute#set
 * @param {number} idx
 * @param {number[]} [out]
 * @example
 * geometry.getAttribute('position').get(0, out);
 */

/**
 * Initialize attribute with given vertex count
 * @param {number} nVertex 
 */
Attribute.prototype.init = function (nVertex) {
    if (!this.value || this.value.length != nVertex * this.size) {
        var ArrayConstructor = getArrayCtorByType(this.type);
        this.value = new ArrayConstructor(nVertex * this.size);
    }
};

/**
 * Initialize attribute with given array. Which can be 1 dimensional or 2 dimensional
 * @param {Array} array
 * @example
 *  geometry.getAttribute('position').fromArray(
 *      [-1, 0, 0, 1, 0, 0, 0, 1, 0]
 *  );
 *  geometry.getAttribute('position').fromArray(
 *      [ [-1, 0, 0], [1, 0, 0], [0, 1, 0] ]
 *  );
 */
Attribute.prototype.fromArray = function (array) {
    var ArrayConstructor = getArrayCtorByType(this.type);
    var value;
    // Convert 2d array to flat
    if (array[0] && (array[0].length)) {
        var n = 0;
        var size = this.size;
        value = new ArrayConstructor(array.length * size);
        for (var i = 0; i < array.length; i++) {
            for (var j = 0; j < size; j++) {
                value[n++] = array[i][j];
            }
        }
    }
    else {
        value = new ArrayConstructor(array);
    }
    this.value = value;
};

Attribute.prototype.clone = function(copyValue) {
    var ret = new Attribute(this.name, this.type, this.size, this.semantic);
    // FIXME
    if (copyValue) {
        console.warn('todo');
    }
    return ret;
};

function AttributeBuffer(name, type, buffer, size, semantic) {
    this.name = name;
    this.type = type;
    this.buffer = buffer;
    this.size = size;
    this.semantic = semantic;

    // To be set in mesh
    // symbol in the shader
    this.symbol = '';

    // Needs remove flag
    this.needsRemove = false;
}

function IndicesBuffer(buffer) {
    this.buffer = buffer;
    this.count = 0;
}

/**
 * @constructor qtek.Geometry
 * @extends qtek.core.Base
 */
var Geometry = Base.extend(function () {
    return /** @lends qtek.Geometry# */ {
        /**
         * Attributes of geometry. Including:
         *  + `position`
         *  + `texcoord0`
         *  + `texcoord1`
         *  + `normal`
         *  + `tangent`
         *  + `color`
         *  + `weight`
         *  + `joint`
         *  + `barycentric`
         * @type {Object}
         */
        attributes: {
            position: new Attribute('position', 'float', 3, 'POSITION'),
            texcoord0: new Attribute('texcoord0', 'float', 2, 'TEXCOORD_0'),
            texcoord1: new Attribute('texcoord1', 'float', 2, 'TEXCOORD_1'),
            normal: new Attribute('normal', 'float', 3, 'NORMAL'),
            tangent: new Attribute('tangent', 'float', 4, 'TANGENT'),
            color: new Attribute('color', 'float', 4, 'COLOR'),
            // Skinning attributes
            // Each vertex can be bind to 4 bones, because the
            // sum of weights is 1, so the weights is stored in vec3 and the last
            // can be calculated by 1-w.x-w.y-w.z
            weight: new Attribute('weight', 'float', 3, 'WEIGHT'),
            joint: new Attribute('joint', 'float', 4, 'JOINT'),
            // For wireframe display
            // http://codeflow.org/entries/2012/aug/02/easy-wireframe-display-with-barycentric-coordinates/
            barycentric: new Attribute('barycentric', 'float', 3, null),
        },
        /**
         * Calculated bounding box of geometry.
         * @type {qtek.math.BoundingBox}
         */
        boundingBox: null,

        /**
         * Indices of geometry.
         * @type {Uint16Array|Uint32Array}
         */
        indices: null,

        /**
         * Is vertices data dynamically updated.
         * Attributes value can't be changed after first render if dyanmic is false.
         * @type {boolean}
         */
        dynamic: true,

        _enabledAttributes: null
    };
}, function() {
    // Use cache
    this._cache = new Cache();

    this._attributeList = Object.keys(this.attributes);
},
/** @lends qtek.Geometry.prototype */
{
    /**
     * Main attribute will be used to count vertex number
     * @type {string}
     */
    mainAttribute: 'position',
    /**
     * User defined picking algorithm instead of default
     * triangle ray intersection
     * x, y are NDC.
     * ```typescript
     * (x, y, renderer, camera, renderable, out) => boolean
     * ```
     * @type {?Function}
     */
    pick: null,

    /**
     * User defined ray picking algorithm instead of default
     * triangle ray intersection
     * ```typescript
     * (ray: qtek.math.Ray, renderable: qtek.Renderable, out: Array) => boolean
     * ```
     * @type {?Function}
     */
    pickByRay: null,

    /**
     * Update boundingBox of Geometry
     */
    updateBoundingBox: function () {
        var bbox = this.boundingBox;
        if (!bbox) {
            bbox = this.boundingBox = new BoundingBox();
        }
        var posArr = this.attributes.position.value;
        if (posArr && posArr.length) {
            var min = bbox.min;
            var max = bbox.max;
            var minArr = min._array;
            var maxArr = max._array;
            vec3$8.set(minArr, posArr[0], posArr[1], posArr[2]);
            vec3$8.set(maxArr, posArr[0], posArr[1], posArr[2]);
            for (var i = 3; i < posArr.length;) {
                var x = posArr[i++];
                var y = posArr[i++];
                var z = posArr[i++];
                if (x < minArr[0]) { minArr[0] = x; }
                if (y < minArr[1]) { minArr[1] = y; }
                if (z < minArr[2]) { minArr[2] = z; }

                if (x > maxArr[0]) { maxArr[0] = x; }
                if (y > maxArr[1]) { maxArr[1] = y; }
                if (z > maxArr[2]) { maxArr[2] = z; }
            }
            min._dirty = true;
            max._dirty = true;
        }
    },
    /**
     * Mark attributes and indices in geometry needs to update.
     */
    dirty: function () {
        var enabledAttributes = this.getEnabledAttributes();
        for (var i = 0; i < enabledAttributes.length; i++) {
            this.dirtyAttribute(enabledAttributes[i]);
        }
        this.dirtyIndices();
        this._enabledAttributes = null;
    },
    /**
     * Mark the indices needs to update.
     */
    dirtyIndices: function () {
        this._cache.dirtyAll('indices');
    },
    /**
     * Mark the attributes needs to update.
     * @param {string} [attrName]
     */
    dirtyAttribute: function (attrName) {
        this._cache.dirtyAll(makeAttrKey(attrName));
        this._cache.dirtyAll('attributes');
    },
    /**
     * Get indices of triangle at given index.
     * @param {number} idx
     * @param {Array.<number>} out
     * @return {Array.<number>}
     */
    getTriangleIndices: function (idx, out) {
        if (idx < this.triangleCount && idx >= 0) {
            if (!out) {
                out = vec3Create();
            }
            var indices = this.indices;
            out[0] = indices[idx * 3];
            out[1] = indices[idx * 3 + 1];
            out[2] = indices[idx * 3 + 2];
            return out;
        }
    },

    /**
     * Set indices of triangle at given index.
     * @param {number} idx
     * @param {Array.<number>} arr
     */
    setTriangleIndices: function (idx, arr) {
        var indices = this.indices;
        indices[idx * 3] = arr[0];
        indices[idx * 3 + 1] = arr[1];
        indices[idx * 3 + 2] = arr[2];
    },

    isUseIndices: function () {
        return !!this.indices;
    },

    /**
     * Initialize indices from an array.
     * @param {Array} array 
     */
    initIndicesFromArray: function (array) {
        var value;
        var ArrayConstructor = this.vertexCount > 0xffff
            ? vendor.Uint32Array : vendor.Uint16Array;
        // Convert 2d array to flat
        if (array[0] && (array[0].length)) {
            var n = 0;
            var size = 3;

            value = new ArrayConstructor(array.length * size);
            for (var i = 0; i < array.length; i++) {
                for (var j = 0; j < size; j++) {
                    value[n++] = array[i][j];
                }
            }
        }
        else {
            value = new ArrayConstructor(array);
        }

        this.indices = value;
    },
    /**
     * Create a new attribute
     * @param {string} name
     * @param {string} type
     * @param {number} size
     * @param {string} [semantic]
     */
    createAttribute: function (name, type, size, semantic) {
        var attrib = new Attribute(name, type, size, semantic);
        if (this.attributes[name]) {
            this.removeAttribute(name);
        }
        this.attributes[name] = attrib;
        this._attributeList.push(name);
        return attrib;
    },
    /**
     * Remove attribute
     * @param {string} name
     */
    removeAttribute: function (name) {
        var attributeList = this._attributeList;
        var idx = attributeList.indexOf(name);
        if (idx >= 0) {
            attributeList.splice(idx, 1);
            delete this.attributes[name];
            return true;
        }
        return false;
    },

    /**
     * Get attribute
     * @param {string} name
     * @return {qtek.Geometry.Attribute}
     */
    getAttribute: function (name) {
        return this.attribute[name];
    },

    /**
     * Get enabled attributes name list
     * Attribute which has the same vertex number with position is treated as a enabled attribute
     * @return {string[]}
     */
    getEnabledAttributes: function () {
        var enabledAttributes = this._enabledAttributes;
        var attributeList = this._attributeList;
        // Cache
        if (enabledAttributes) {
            return enabledAttributes;
        }

        var result = [];
        var nVertex = this.vertexCount;

        for (var i = 0; i < attributeList.length; i++) {
            var name = attributeList[i];
            var attrib = this.attributes[name];
            if (attrib.value) {
                if (attrib.value.length === nVertex * attrib.size) {
                    result.push(name);
                }
            }
        }

        this._enabledAttributes = result;

        return result;
    },

    getBufferChunks: function (renderer) {
        var cache = this._cache;
        cache.use(renderer.__GUID__);
        var isAttributesDirty = cache.isDirty('attributes');
        var isIndicesDirty = cache.isDirty('indices');
        if (isAttributesDirty || isIndicesDirty) {
            this._updateBuffer(renderer.gl, isAttributesDirty, isIndicesDirty);
            var enabledAttributes = this.getEnabledAttributes();
            for (var i = 0; i < enabledAttributes.length; i++) {
                cache.fresh(makeAttrKey(enabledAttributes[i]));
            }
            cache.fresh('attributes');
            cache.fresh('indices');
        }
        return cache.get('chunks');
    },

    _updateBuffer: function (_gl, isAttributesDirty, isIndicesDirty) {
        var cache = this._cache;
        var chunks = cache.get('chunks');
        var firstUpdate = false;
        if (!chunks) {
            chunks = [];
            // Intialize
            chunks[0] = {
                attributeBuffers: [],
                indicesBuffer: null
            };
            cache.put('chunks', chunks);
            firstUpdate = true;
        }

        var chunk = chunks[0];
        var attributeBuffers = chunk.attributeBuffers;
        var indicesBuffer = chunk.indicesBuffer;

        if (isAttributesDirty || firstUpdate) {
            var attributeList = this.getEnabledAttributes();

            var attributeBufferMap = {};
            if (!firstUpdate) {
                for (var i = 0; i < attributeBuffers.length; i++) {
                    attributeBufferMap[attributeBuffers[i].name] = attributeBuffers[i];
                }
            }
            // FIXME If some attributes removed
            for (var k = 0; k < attributeList.length; k++) {
                var name = attributeList[k];
                var attribute = this.attributes[name];

                var bufferInfo;

                if (!firstUpdate) {
                    bufferInfo = attributeBufferMap[name];
                }
                var buffer;
                if (bufferInfo) {
                    buffer = bufferInfo.buffer;
                }
                else {
                    buffer = _gl.createBuffer();
                }
                if (cache.isDirty(makeAttrKey(name))) {
                    // Only update when they are dirty.
                    // TODO: Use BufferSubData?
                    _gl.bindBuffer(_gl.ARRAY_BUFFER, buffer);
                    _gl.bufferData(_gl.ARRAY_BUFFER, attribute.value, this.dynamic ? glenum.DYNAMIC_DRAW : glenum.STATIC_DRAW);
                }

                attributeBuffers[k] = new AttributeBuffer(name, attribute.type, buffer, attribute.size, attribute.semantic);
            }
            // Remove unused attributes buffers.
            // PENDING
            for (var i = k; i < attributeBuffers.length; i++) {
                _gl.deleteBuffer(attributeBuffers[i].buffer);
            }
            attributeBuffers.length = k;

        }

        if (this.isUseIndices() && (isIndicesDirty || firstUpdate)) {
            if (!indicesBuffer) {
                indicesBuffer = new IndicesBuffer(_gl.createBuffer());
                chunk.indicesBuffer = indicesBuffer;
            }
            indicesBuffer.count = this.indices.length;
            _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, indicesBuffer.buffer);
            _gl.bufferData(_gl.ELEMENT_ARRAY_BUFFER, this.indices, this.dynamic ? glenum.DYNAMIC_DRAW : glenum.STATIC_DRAW);
        }
    },

    /**
     * Generate normals per vertex.
     */
    generateVertexNormals: function () {
        if (!this.vertexCount) {
            return;
        }

        var indices = this.indices;
        var attributes = this.attributes;
        var positions = attributes.position.value;
        var normals = attributes.normal.value;

        if (!normals || normals.length !== positions.length) {
            normals = attributes.normal.value = new vendor.Float32Array(positions.length);
        }
        else {
            // Reset
            for (var i = 0; i < normals.length; i++) {
                normals[i] = 0;
            }
        }

        var p1 = vec3Create();
        var p2 = vec3Create();
        var p3 = vec3Create();

        var v21 = vec3Create();
        var v32 = vec3Create();

        var n = vec3Create();

        var len = indices ? indices.length : this.vertexCount;
        var i1, i2, i3;
        for (var f = 0; f < len;) {
            if (indices) {
                i1 = indices[f++];
                i2 = indices[f++];
                i3 = indices[f++];
            }
            else {
                i1 = f++;
                i2 = f++;
                i3 = f++;
            }

            vec3Set$2(p1, positions[i1*3], positions[i1*3+1], positions[i1*3+2]);
            vec3Set$2(p2, positions[i2*3], positions[i2*3+1], positions[i2*3+2]);
            vec3Set$2(p3, positions[i3*3], positions[i3*3+1], positions[i3*3+2]);

            vec3$8.sub(v21, p1, p2);
            vec3$8.sub(v32, p2, p3);
            vec3$8.cross(n, v21, v32);
            // Already be weighted by the triangle area
            for (var i = 0; i < 3; i++) {
                normals[i1*3+i] = normals[i1*3+i] + n[i];
                normals[i2*3+i] = normals[i2*3+i] + n[i];
                normals[i3*3+i] = normals[i3*3+i] + n[i];
            }
        }

        for (var i = 0; i < normals.length;) {
            vec3Set$2(n, normals[i], normals[i+1], normals[i+2]);
            vec3$8.normalize(n, n);
            normals[i++] = n[0];
            normals[i++] = n[1];
            normals[i++] = n[2];
        }
        this.dirty();
    },

    /**
     * Generate normals per face.
     */
    generateFaceNormals: function () {
        if (!this.vertexCount) {
            return;
        }

        if (!this.isUniqueVertex()) {
            this.generateUniqueVertex();
        }

        var indices = this.indices;
        var attributes = this.attributes;
        var positions = attributes.position.value;
        var normals = attributes.normal.value;

        var p1 = vec3Create();
        var p2 = vec3Create();
        var p3 = vec3Create();

        var v21 = vec3Create();
        var v32 = vec3Create();
        var n = vec3Create();

        if (!normals) {
            normals = attributes.normal.value = new Float32Array(positions.length);
        }
        var len = indices ? indices.length : this.vertexCount;
        var i1, i2, i3;
        for (var f = 0; f < len;) {
            if (indices) {
                i1 = indices[f++];
                i2 = indices[f++];
                i3 = indices[f++];
            }
            else {
                i1 = f++;
                i2 = f++;
                i3 = f++;
            }

            vec3Set$2(p1, positions[i1*3], positions[i1*3+1], positions[i1*3+2]);
            vec3Set$2(p2, positions[i2*3], positions[i2*3+1], positions[i2*3+2]);
            vec3Set$2(p3, positions[i3*3], positions[i3*3+1], positions[i3*3+2]);

            vec3$8.sub(v21, p1, p2);
            vec3$8.sub(v32, p2, p3);
            vec3$8.cross(n, v21, v32);

            vec3$8.normalize(n, n);

            for (var i = 0; i < 3; i++) {
                normals[i1*3 + i] = n[i];
                normals[i2*3 + i] = n[i];
                normals[i3*3 + i] = n[i];
            }
        }
        this.dirty();
    },

    /**
     * Generate tangents attributes.
     */
    generateTangents: function () {
        if (!this.vertexCount) {
            return;
        }

        var nVertex = this.vertexCount;
        var attributes = this.attributes;
        if (!attributes.tangent.value) {
            attributes.tangent.value = new Float32Array(nVertex * 4);
        }
        var texcoords = attributes.texcoord0.value;
        var positions = attributes.position.value;
        var tangents = attributes.tangent.value;
        var normals = attributes.normal.value;

        if (!texcoords) {
            console.warn('Geometry without texcoords can\'t generate tangents.');
            return;
        }

        var tan1 = [];
        var tan2 = [];
        for (var i = 0; i < nVertex; i++) {
            tan1[i] = [0.0, 0.0, 0.0];
            tan2[i] = [0.0, 0.0, 0.0];
        }

        var sdir = [0.0, 0.0, 0.0];
        var tdir = [0.0, 0.0, 0.0];
        var indices = this.indices;

        var len = indices ? indices.length : this.vertexCount;
        var i1, i2, i3;
        for (var i = 0; i < len;) {
            if (indices) {
                i1 = indices[i++];
                i2 = indices[i++];
                i3 = indices[i++];
            }
            else {
                i1 = i++;
                i2 = i++;
                i3 = i++;
            }

            var st1s = texcoords[i1 * 2],
                st2s = texcoords[i2 * 2],
                st3s = texcoords[i3 * 2],
                st1t = texcoords[i1 * 2 + 1],
                st2t = texcoords[i2 * 2 + 1],
                st3t = texcoords[i3 * 2 + 1],

                p1x = positions[i1 * 3],
                p2x = positions[i2 * 3],
                p3x = positions[i3 * 3],
                p1y = positions[i1 * 3 + 1],
                p2y = positions[i2 * 3 + 1],
                p3y = positions[i3 * 3 + 1],
                p1z = positions[i1 * 3 + 2],
                p2z = positions[i2 * 3 + 2],
                p3z = positions[i3 * 3 + 2];

            var x1 = p2x - p1x,
                x2 = p3x - p1x,
                y1 = p2y - p1y,
                y2 = p3y - p1y,
                z1 = p2z - p1z,
                z2 = p3z - p1z;

            var s1 = st2s - st1s,
                s2 = st3s - st1s,
                t1 = st2t - st1t,
                t2 = st3t - st1t;

            var r = 1.0 / (s1 * t2 - t1 * s2);
            sdir[0] = (t2 * x1 - t1 * x2) * r;
            sdir[1] = (t2 * y1 - t1 * y2) * r;
            sdir[2] = (t2 * z1 - t1 * z2) * r;

            tdir[0] = (s1 * x2 - s2 * x1) * r;
            tdir[1] = (s1 * y2 - s2 * y1) * r;
            tdir[2] = (s1 * z2 - s2 * z1) * r;

            vec3Add(tan1[i1], tan1[i1], sdir);
            vec3Add(tan1[i2], tan1[i2], sdir);
            vec3Add(tan1[i3], tan1[i3], sdir);
            vec3Add(tan2[i1], tan2[i1], tdir);
            vec3Add(tan2[i2], tan2[i2], tdir);
            vec3Add(tan2[i3], tan2[i3], tdir);
        }
        var tmp = vec3Create();
        var nCrossT = vec3Create();
        var n = vec3Create();
        for (var i = 0; i < nVertex; i++) {
            n[0] = normals[i * 3];
            n[1] = normals[i * 3 + 1];
            n[2] = normals[i * 3 + 2];
            var t = tan1[i];

            // Gram-Schmidt orthogonalize
            vec3$8.scale(tmp, n, vec3$8.dot(n, t));
            vec3$8.sub(tmp, t, tmp);
            vec3$8.normalize(tmp, tmp);
            // Calculate handedness.
            vec3$8.cross(nCrossT, n, t);
            tangents[i * 4] = tmp[0];
            tangents[i * 4 + 1] = tmp[1];
            tangents[i * 4 + 2] = tmp[2];
            // PENDING can config ?
            tangents[i * 4 + 3] = vec3$8.dot(nCrossT, tan2[i]) < 0.0 ? -1.0 : 1.0;
        }
        this.dirty();
    },
    
    /**
     * If vertices are not shared by different indices.
     */
    isUniqueVertex: function () {
        if (this.isUseIndices()) {
            return this.vertexCount === this.indices.length;
        }
        else {
            return true;
        }
    },
    /**
     * Create a unique vertex for each index.
     */
    generateUniqueVertex: function () {
        if (!this.vertexCount || !this.indices) {
            return;
        }

        if (this.indices.length > 0xffff) {
            this.indices = new vendor.Uint32Array(this.indices);
        }

        var attributes = this.attributes;
        var indices = this.indices;

        var attributeNameList = this.getEnabledAttributes();

        var oldAttrValues = {};
        for (var a = 0; a < attributeNameList.length; a++) {
            var name = attributeNameList[a];
            oldAttrValues[name] = attributes[name].value;
            attributes[name].init(this.indices.length);
        }

        var cursor = 0;
        for (var i = 0; i < indices.length; i++) {
            var ii = indices[i];
            for (var a = 0; a < attributeNameList.length; a++) {
                var name = attributeNameList[a];
                var array = attributes[name].value;
                var size = attributes[name].size;

                for (var k = 0; k < size; k++) {
                    array[cursor * size + k] = oldAttrValues[name][ii * size + k];
                }
            }
            indices[i] = cursor;
            cursor++;
        }

        this.dirty();
    },

    /**
     * Generate barycentric coordinates for wireframe draw.
     */
    generateBarycentric: function () {
        if (!this.vertexCount) {
            return;
        }

        if (!this.isUniqueVertex()) {
            this.generateUniqueVertex();
        }

        var attributes = this.attributes;
        var array = attributes.barycentric.value;
        var indices = this.indices;
        // Already existed;
        if (array && array.length === indices.length * 3) {
            return;
        }
        array = attributes.barycentric.value = new Float32Array(indices.length * 3);
        
        for (var i = 0; i < (indices ? indices.length : this.vertexCount / 3);) {
            for (var j = 0; j < 3; j++) {
                var ii = indices ? indices[i++] : (i * 3 + j);
                array[ii * 3 + j] = 1;
            }
        }
        this.dirty();
    },

    /**
     * Apply transform to geometry attributes.
     * @param {qtek.math.Matrix4} matrix
     */
    applyTransform: function (matrix) {

        var attributes = this.attributes;
        var positions = attributes.position.value;
        var normals = attributes.normal.value;
        var tangents = attributes.tangent.value;

        matrix = matrix._array;
        // Normal Matrix
        var inverseTransposeMatrix = mat4$5.create();
        mat4$5.invert(inverseTransposeMatrix, matrix);
        mat4$5.transpose(inverseTransposeMatrix, inverseTransposeMatrix);

        var vec3TransformMat4 = vec3$8.transformMat4;
        var vec3ForEach = vec3$8.forEach;
        vec3ForEach(positions, 3, 0, null, vec3TransformMat4, matrix);
        if (normals) {
            vec3ForEach(normals, 3, 0, null, vec3TransformMat4, inverseTransposeMatrix);
        }
        if (tangents) {
            vec3ForEach(tangents, 4, 0, null, vec3TransformMat4, inverseTransposeMatrix);
        }

        if (this.boundingBox) {
            this.updateBoundingBox();
        }
    },
    /**
     * Dispose geometry data in GL context.
     * @param {qtek.Renderer} renderer
     */
    dispose: function (renderer) {

        var cache = this._cache;

        cache.use(renderer.__GUID__);
        var chunks = cache.get('chunks');
        if (chunks) {
            for (var c = 0; c < chunks.length; c++) {
                var chunk = chunks[c];

                for (var k = 0; k < chunk.attributeBuffers.length; k++) {
                    var attribs = chunk.attributeBuffers[k];
                    renderer.gl.deleteBuffer(attribs.buffer);
                }
            }
        }
        cache.deleteContext(renderer.__GUID__);
    }

});

if (Object.defineProperty) {
    /**
     * @name qtek.Geometry#vertexCount
     * @type {number}
     * @readOnly
     */
    Object.defineProperty(Geometry.prototype, 'vertexCount', {

        enumerable: false,

        get: function () {
            var mainAttribute = this.attributes[this.mainAttribute];
            if (!mainAttribute || !mainAttribute.value) {
                return 0;
            }
            return mainAttribute.value.length / mainAttribute.size;
        }
    });
    /**
     * @name qtek.Geometry#triangleCount
     * @type {number}
     * @readOnly
     */
    Object.defineProperty(Geometry.prototype, 'triangleCount', {

        enumerable: false,

        get: function () {
            var indices = this.indices;
            if (!indices) {
                return 0;
            }
            else {
                return indices.length / 3;
            }
        }
    });
}

Geometry.STATIC_DRAW = glenum.STATIC_DRAW;
Geometry.DYNAMIC_DRAW = glenum.DYNAMIC_DRAW;
Geometry.STREAM_DRAW = glenum.STREAM_DRAW;

Geometry.AttributeBuffer = AttributeBuffer;
Geometry.IndicesBuffer = IndicesBuffer;

Geometry.Attribute = Attribute;

var particleEssl = "@export qtek.particle.vertex\nuniform mat4 worldView : WORLDVIEW;\nuniform mat4 projection : PROJECTION;\nattribute vec3 position : POSITION;\nattribute vec3 normal : NORMAL;\n#ifdef UV_ANIMATION\nattribute vec2 texcoord0 : TEXCOORD_0;\nattribute vec2 texcoord1 : TEXCOORD_1;\nvarying vec2 v_Uv0;\nvarying vec2 v_Uv1;\n#endif\nvarying float v_Age;\nvoid main() {\n    v_Age = normal.x;\n    float rotation = normal.y;\n    vec4 worldViewPosition = worldView * vec4(position, 1.0);\n    gl_Position = projection * worldViewPosition;\n    float w = gl_Position.w;\n    gl_PointSize = normal.z * projection[0].x / w;\n    #ifdef UV_ANIMATION\n        v_Uv0 = texcoord0;\n        v_Uv1 = texcoord1;\n    #endif\n}\n@end\n@export qtek.particle.fragment\nuniform sampler2D sprite;\nuniform sampler2D gradient;\nuniform vec3 color : [1.0, 1.0, 1.0];\nuniform float alpha : 1.0;\nvarying float v_Age;\n#ifdef UV_ANIMATION\nvarying vec2 v_Uv0;\nvarying vec2 v_Uv1;\n#endif\nvoid main() {\n    vec4 color = vec4(color, alpha);\n    #ifdef SPRITE_ENABLED\n        #ifdef UV_ANIMATION\n            color *= texture2D(sprite, mix(v_Uv0, v_Uv1, gl_PointCoord));\n        #else\n            color *= texture2D(sprite, gl_PointCoord);\n        #endif\n    #endif\n    #ifdef GRADIENT_ENABLED\n        color *= texture2D(gradient, vec2(v_Age, 0.5));\n    #endif\n    gl_FragColor = color;\n}\n@end";

Shader['import'](particleEssl);

var particleShader = new Shader({
    vertex: Shader.source('qtek.particle.vertex'),
    fragment: Shader.source('qtek.particle.fragment')
});
particleShader.enableTexture('sprite');

/**
 * @constructor qtek.particle.ParticleRenderable
 * @extends qtek.Renderable
 *
 * @example
 *     var particleRenderable = new qtek.particle.ParticleRenderable({
 *         spriteAnimationTileX: 4,
 *         spriteAnimationTileY: 4,
 *         spriteAnimationRepeat: 1
 *     });
 *     scene.add(particleRenderable);
 *     // Enable uv animation in the shader
 *     particleRenderable.material.shader.define('both', 'UV_ANIMATION');
 *     var Emitter = qtek.particle.Emitter;
 *     var Vector3 = qtek.math.Vector3;
 *     var emitter = new Emitter({
 *         max: 2000,
 *         amount: 100,
 *         life: Emitter.random1D(10, 20),
 *         position: Emitter.vector(new Vector3()),
 *         velocity: Emitter.random3D(new Vector3(-10, 0, -10), new Vector3(10, 0, 10));
 *     });
 *     particleRenderable.addEmitter(emitter);
 *     var gravityField = new qtek.particle.ForceField();
 *     gravityField.force.y = -10;
 *     particleRenderable.addField(gravityField);
 *     ...
 *     animation.on('frame', function(frameTime) {
 *         particleRenderable.updateParticles(frameTime);
 *         renderer.render(scene, camera);
 *     });
 */
var ParticleRenderable = Renderable.extend(
/** @lends qtek.particle.ParticleRenderable# */
{
    /**
     * @type {boolean}
     */
    loop: true,
    /**
     * @type {boolean}
     */
    oneshot: false,
    /**
     * Duration of particle system in milliseconds
     * @type {number}
     */
    duration: 1,

    // UV Animation
    /**
     * @type {number}
     */
    spriteAnimationTileX: 1,
    /**
     * @type {number}
     */
    spriteAnimationTileY: 1,
    /**
     * @type {number}
     */
    spriteAnimationRepeat: 0,

    mode: Renderable.POINTS,

    ignorePicking: true,

    _elapsedTime: 0,

    _emitting: true

}, function(){

    this.geometry = new Geometry({
        dynamic: true
    });

    if (!this.material) {
        this.material = new Material({
            shader: particleShader,
            transparent: true,
            depthMask: false
        });
    }

    this._particles = [];
    this._fields = [];
    this._emitters = [];
},
/** @lends qtek.particle.ParticleRenderable.prototype */
{

    culling: false,

    frustumCulling: false,

    castShadow: false,
    receiveShadow: false,

    /**
     * Add emitter
     * @param {qtek.particle.Emitter} emitter
     */
    addEmitter: function(emitter) {
        this._emitters.push(emitter);
    },

    /**
     * Remove emitter
     * @param {qtek.particle.Emitter} emitter
     */
    removeEmitter: function(emitter) {
        this._emitters.splice(this._emitters.indexOf(emitter), 1);
    },

    /**
     * Add field
     * @param {qtek.particle.Field} field
     */
    addField: function(field) {
        this._fields.push(field);
    },

    /**
     * Remove field
     * @param {qtek.particle.Field} field
     */
    removeField: function(field) {
        this._fields.splice(this._fields.indexOf(field), 1);
    },

    /**
     * Reset the particle system.
     */
    reset: function() {
        // Put all the particles back
        for (var i = 0; i < this._particles.length; i++) {
            var p = this._particles[i];
            p.emitter.kill(p);
        }
        this._particles.length = 0;
        this._elapsedTime = 0;
        this._emitting = true;
    },

    /**
     * @param  {number} deltaTime
     */
    updateParticles: function(deltaTime) {

        // MS => Seconds
        deltaTime /= 1000;
        this._elapsedTime += deltaTime;

        var particles = this._particles;

        if (this._emitting) {
            for (var i = 0; i < this._emitters.length; i++) {
                this._emitters[i].emit(particles);
            }
            if (this.oneshot) {
                this._emitting = false;
            }
        }

        // Aging
        var len = particles.length;
        for (var i = 0; i < len;) {
            var p = particles[i];
            p.age += deltaTime;
            if (p.age >= p.life) {
                p.emitter.kill(p);
                particles[i] = particles[len-1];
                particles.pop();
                len--;
            } else {
                i++;
            }
        }

        for (var i = 0; i < len; i++) {
            // Update
            var p = particles[i];
            if (this._fields.length > 0) {
                for (var j = 0; j < this._fields.length; j++) {
                    this._fields[j].applyTo(p.velocity, p.position, p.weight, deltaTime);
                }
            }
            p.update(deltaTime);
        }

        this._updateVertices();
    },

    _updateVertices: function() {
        var geometry = this.geometry;
        // If has uv animation
        var animTileX = this.spriteAnimationTileX;
        var animTileY = this.spriteAnimationTileY;
        var animRepeat = this.spriteAnimationRepeat;
        var nUvAnimFrame = animTileY * animTileX * animRepeat;
        var hasUvAnimation = nUvAnimFrame > 1;
        var positions = geometry.attributes.position.value;
        // Put particle status in normal
        var normals = geometry.attributes.normal.value;
        var uvs = geometry.attributes.texcoord0.value;
        var uvs2 = geometry.attributes.texcoord1.value;

        var len = this._particles.length;
        if (!positions || positions.length !== len * 3) {
            // TODO Optimize
            positions = geometry.attributes.position.value = new Float32Array(len * 3);
            normals = geometry.attributes.normal.value = new Float32Array(len * 3);
            if (hasUvAnimation) {
                uvs = geometry.attributes.texcoord0.value = new Float32Array(len * 2);
                uvs2 = geometry.attributes.texcoord1.value = new Float32Array(len * 2);
            }
        }

        var invAnimTileX = 1 / animTileX;
        for (var i = 0; i < len; i++) {
            var particle = this._particles[i];
            var offset = i * 3;
            for (var j = 0; j < 3; j++) {
                positions[offset + j] = particle.position._array[j];
                normals[offset] = particle.age / particle.life;
                // normals[offset + 1] = particle.rotation;
                normals[offset + 1] = 0;
                normals[offset + 2] = particle.spriteSize;
            }
            var offset2 = i * 2;
            if (hasUvAnimation) {
                // TODO
                var p = particle.age / particle.life;
                var stage = Math.round(p * (nUvAnimFrame - 1)) * animRepeat;
                var v = Math.floor(stage * invAnimTileX);
                var u = stage - v * animTileX;
                uvs[offset2] = u / animTileX;
                uvs[offset2 + 1] = 1 - v / animTileY;
                uvs2[offset2] = (u + 1) / animTileX;
                uvs2[offset2 + 1] = 1 - (v + 1) / animTileY;
            }
        }

        geometry.dirty();
    },

    /**
     * @return {boolean}
     */
    isFinished: function() {
        return this._elapsedTime > this.duration && !this.loop;
    },

    /**
     * @param  {qtek.Renderer} renderer
     */
    dispose: function(renderer) {
        // Put all the particles back
        for (var i = 0; i < this._particles.length; i++) {
            var p = this._particles[i];
            p.emitter.kill(p);
        }
        this.geometry.dispose(renderer);
        // TODO Dispose texture, shader ?
    },

    /**
     * @return {qtek.particle.ParticleRenderable}
     */
    clone: function() {
        var particleRenderable = new ParticleRenderable({
            material: this.material
        });
        particleRenderable.loop = this.loop;
        particleRenderable.duration = this.duration;
        particleRenderable.oneshot = this.oneshot;
        particleRenderable.spriteAnimationRepeat = this.spriteAnimationRepeat;
        particleRenderable.spriteAnimationTileY = this.spriteAnimationTileY;
        particleRenderable.spriteAnimationTileX = this.spriteAnimationTileX;

        particleRenderable.position.copy(this.position);
        particleRenderable.rotation.copy(this.rotation);
        particleRenderable.scale.copy(this.scale);

        for (var i = 0; i < this._children.length; i++) {
            particleRenderable.add(this._children[i].clone());
        }
        return particleRenderable;
    }
});

var vec3$10 = glmatrix.vec3;

/**
 * @constructor
 * @alias qtek.particle.Particle
 */
var Particle = function() {
    /**
     * @type {qtek.math.Vector3}
     */
    this.position = new Vector3();

    /**
     * Use euler angle to represent particle rotation
     * @type {qtek.math.Vector3}
     */
    this.rotation = new Vector3();

    /**
     * @type {?qtek.math.Vector3}
     */
    this.velocity = null;

    /**
     * @type {?qtek.math.Vector3}
     */
    this.angularVelocity = null;

    /**
     * @type {number}
     */
    this.life = 1;

    /**
     * @type {number}
     */
    this.age = 0;

    /**
     * @type {number}
     */
    this.spriteSize = 1;

    /**
     * @type {number}
     */
    this.weight = 1;

    /**
     * @type {qtek.particle.Emitter}
     */
    this.emitter = null;
};

/**
 * Update particle position
 * @param  {number} deltaTime
 */
Particle.prototype.update = function(deltaTime) {
    if (this.velocity) {
        vec3$10.scaleAndAdd(this.position._array, this.position._array, this.velocity._array, deltaTime);
    }
    if (this.angularVelocity) {
        vec3$10.scaleAndAdd(this.rotation._array, this.rotation._array, this.angularVelocity._array, deltaTime);
    }
};

/**
 * Random or constant 1d, 2d, 3d vector generator
 * @constructor
 * @alias qtek.math.Value
 */
var Value = function() {};

/**
 * @method
 * @param {number|qtek.math.Vector2|qtek.math.Vector3} [out]
 * @return {number|qtek.math.Vector2|qtek.math.Vector3}
 */
Value.prototype.get = function(out) {};

// Constant
var ConstantValue = function(val) {
    this.get = function() {
        return val;
    };
};
ConstantValue.prototype = new Value();
ConstantValue.prototype.constructor = ConstantValue;

// Vector
var VectorValue = function(val) {
    var Constructor = val.constructor;
    this.get = function(out) {
        if (!out) {
            out = new Constructor();
        }
        out.copy(val);
        return out;
    };
};
VectorValue.prototype = new Value();
VectorValue.prototype.constructor = VectorValue;
//Random 1D
var Random1D = function(min, max) {
    var range = max - min;
    this.get = function() {
        return Math.random() * range + min;
    };
};
Random1D.prototype = new Value();
Random1D.prototype.constructor = Random1D;

// Random2D
var Random2D = function(min, max) {
    var rangeX = max.x - min.x;
    var rangeY = max.y - min.y;

    this.get = function(out) {
        if (!out) {
            out = new Vector2();
        }
        Vector2.set(
            out,
            rangeX * Math.random() + min._array[0],
            rangeY * Math.random() + min._array[1]
        );

        return out;
    };
};
Random2D.prototype = new Value();
Random2D.prototype.constructor = Random2D;

var Random3D = function(min, max) {
    var rangeX = max.x - min.x;
    var rangeY = max.y - min.y;
    var rangeZ = max.z - min.z;

    this.get = function(out) {
        if (!out) {
            out = new Vector3();
        }
        Vector3.set(
            out,
            rangeX * Math.random() + min._array[0],
            rangeY * Math.random() + min._array[1],
            rangeZ * Math.random() + min._array[2]
        );

        return out;
    };
};
Random3D.prototype = new Value();
Random3D.prototype.constructor = Random3D;

// Factory methods

/**
 * Create a constant 1d value generator
 * @param  {number} constant
 * @return {qtek.math.Value}
 */
Value.constant = function(constant) {
    return new ConstantValue(constant);
};

/**
 * Create a constant vector value(2d or 3d) generator
 * @param  {qtek.math.Vector2|qtek.math.Vector3} vector
 * @return {qtek.math.Value}
 */
Value.vector = function(vector) {
    return new VectorValue(vector);
};

/**
 * Create a random 1d value generator
 * @param  {number} min
 * @param  {number} max
 * @return {qtek.math.Value}
 */
Value.random1D = function(min, max) {
    return new Random1D(min, max);
};

/**
 * Create a random 2d value generator
 * @param  {qtek.math.Vector2} min
 * @param  {qtek.math.Vector2} max
 * @return {qtek.math.Value}
 */
Value.random2D = function(min, max) {
    return new Random2D(min, max);
};

/**
 * Create a random 3d value generator
 * @param  {qtek.math.Vector3} min
 * @param  {qtek.math.Vector3} max
 * @return {qtek.math.Value}
 */
Value.random3D = function(min, max) {
    return new Random3D(min, max);
};

var vec3$9 =  glmatrix.vec3;

/**
 * @constructor qtek.particle.Emitter
 * @extends qtek.core.Base
 */
var Emitter = Base.extend(
/** @lends qtek.particle.Emitter# */
{
    /**
     * Maximum number of particles created by this emitter
     * @type {number}
     */
    max: 1000,
    /**
     * Number of particles created by this emitter each shot
     * @type {number}
     */
    amount: 20,

    // Init status for each particle
    /**
     * Particle life generator
     * @type {?qtek.math.Value.<number>}
     */
    life: null,
    /**
     * Particle position generator
     * @type {?qtek.math.Value.<qtek.math.Vector3>}
     */
    position: null,
    /**
     * Particle rotation generator
     * @type {?qtek.math.Value.<qtek.math.Vector3>}
     */
    rotation: null,
    /**
     * Particle velocity generator
     * @type {?qtek.math.Value.<qtek.math.Vector3>}
     */
    velocity: null,
    /**
     * Particle angular velocity generator
     * @type {?qtek.math.Value.<qtek.math.Vector3>}
     */
    angularVelocity: null,
    /**
     * Particle sprite size generator
     * @type {?qtek.math.Value.<number>}
     */
    spriteSize: null,
    /**
     * Particle weight generator
     * @type {?qtek.math.Value.<number>}
     */
    weight: null,

    _particlePool: null

}, function() {

    this._particlePool = [];

    // TODO Reduce heap memory
    for (var i = 0; i < this.max; i++) {
        var particle = new Particle();
        particle.emitter = this;
        this._particlePool.push(particle);

        if (this.velocity) {
            particle.velocity = new Vector3();
        }
        if (this.angularVelocity) {
            particle.angularVelocity = new Vector3();
        }
    }
},
/** @lends qtek.particle.Emitter.prototype */
{
    /**
     * Emitter number of particles and push them to a given particle list. Emmit number is defined by amount property
     * @param  {Array.<qtek.particle.Particle>} out
     */
    emit: function(out) {
        var amount = Math.min(this._particlePool.length, this.amount);

        var particle;
        for (var i = 0; i < amount; i++) {
            particle = this._particlePool.pop();
            // Initialize particle status
            if (this.position) {
                this.position.get(particle.position);
            }
            if (this.rotation) {
                this.rotation.get(particle.rotation);
            }
            if (this.velocity) {
                this.velocity.get(particle.velocity);
            }
            if (this.angularVelocity) {
                this.angularVelocity.get(particle.angularVelocity);
            }
            if (this.life) {
                particle.life = this.life.get();
            }
            if (this.spriteSize) {
                particle.spriteSize = this.spriteSize.get();
            }
            if (this.weight) {
                particle.weight = this.weight.get();
            }
            particle.age = 0;

            out.push(particle);
        }
    },
    /**
     * Kill a dead particle and put it back in the pool
     * @param  {qtek.particle.Particle} particle
     */
    kill: function(particle) {
        this._particlePool.push(particle);
    }
});

/**
 * Create a constant 1d value generator. Alias for {@link qtek.math.Value.constant}
 * @method qtek.particle.Emitter.constant
 */
Emitter.constant = Value.constant;

/**
 * Create a constant vector value(2d or 3d) generator. Alias for {@link qtek.math.Value.vector}
 * @method qtek.particle.Emitter.vector
 */
Emitter.vector = Value.vector;

/**
 * Create a random 1d value generator. Alias for {@link qtek.math.Value.random1D}
 * @method qtek.particle.Emitter.random1D
 */
Emitter.random1D = Value.random1D;

/**
 * Create a random 2d value generator. Alias for {@link qtek.math.Value.random2D}
 * @method qtek.particle.Emitter.random2D
 */
Emitter.random2D = Value.random2D;

/**
 * Create a random 3d value generator. Alias for {@link qtek.math.Value.random3D}
 * @method qtek.particle.Emitter.random3D
 */
Emitter.random3D = Value.random3D;

/**
 * @constructor qtek.Mesh
 * @extends qtek.Renderable
 */
var Mesh = Renderable.extend(
/** @lends qtek.Mesh# */
{
    /**
     * Used when it is a skinned mesh
     * @type {qtek.Skeleton}
     */
    skeleton: null,
    /**
     * Joints indices Meshes can share the one skeleton instance and each mesh can use one part of joints. Joints indices indicate the index of joint in the skeleton instance
     * @type {number[]}
     */
    joints: null,

    /**
     * If store the skin matrices in vertex texture
     * @type {bool}
     */
    useSkinMatricesTexture: false

}, function () {
    if (!this.joints) {
        this.joints = [];
    }
}, {

    isSkinnedMesh: function () {
        return !!(this.skeleton && this.material.shader.isDefined('vertex', 'SKINNING'));
    },

    render: function (renderer, shader) {
        var _gl = renderer.gl;
        shader = shader || this.material.shader;
        // Set pose matrices of skinned mesh
        if (this.skeleton) {
            // TODO Multiple mesh share same skeleton
            this.skeleton.update();

            var skinMatricesArray = this.skeleton.getSubSkinMatrices(this.__GUID__, this.joints);

            if (this.useSkinMatricesTexture) {
                var size;
                var numJoints = this.joints.length;
                if (numJoints > 256) {
                    size = 64;
                }
                else if (numJoints > 64) {
                    size = 32;
                }
                else if (numJoints > 16) {
                    size = 16;
                }
                else {
                    size = 8;
                }

                var texture = this.getSkinMatricesTexture();
                texture.width = size;
                texture.height = size;

                if (!texture.pixels || texture.pixels.length !== size * size * 4) {
                    texture.pixels = new Float32Array(size * size * 4);
                }
                texture.pixels.set(skinMatricesArray);
                texture.dirty();

                shader.setUniform(_gl, '1f', 'skinMatricesTextureSize', size);
            }
            else {
                shader.setUniformOfSemantic(_gl, 'SKIN_MATRIX', skinMatricesArray);
            }
        }

        return Renderable.prototype.render.call(this, renderer, shader);
    },

    getSkinMatricesTexture: function () {
        this._skinMatricesTexture = this._skinMatricesTexture || new Texture2D({
            type: glenum.FLOAT,
            minFilter: glenum.NEAREST,
            magFilter: glenum.NEAREST,
            useMipmap: false,
            flipY: false
        });

        return this._skinMatricesTexture;
    }
});

// Enums
Mesh.POINTS = glenum.POINTS;
Mesh.LINES = glenum.LINES;
Mesh.LINE_LOOP = glenum.LINE_LOOP;
Mesh.LINE_STRIP = glenum.LINE_STRIP;
Mesh.TRIANGLES = glenum.TRIANGLES;
Mesh.TRIANGLE_STRIP = glenum.TRIANGLE_STRIP;
Mesh.TRIANGLE_FAN = glenum.TRIANGLE_FAN;

Mesh.BACK = glenum.BACK;
Mesh.FRONT = glenum.FRONT;
Mesh.FRONT_AND_BACK = glenum.FRONT_AND_BACK;
Mesh.CW = glenum.CW;
Mesh.CCW = glenum.CCW;

/**
 * @constructor qtek.geometry.Plane
 * @extends qtek.Geometry
 * @param {Object} [opt]
 * @param {number} [opt.widthSegments]
 * @param {number} [opt.heightSegments]
 */
var Plane$2 = Geometry.extend(
/** @lends qtek.geometry.Plane# */
{
    dynamic: false,
    /**
     * @type {number}
     */
    widthSegments: 1,
    /**
     * @type {number}
     */
    heightSegments: 1
}, function() {
    this.build();
},
/** @lends qtek.geometry.Plane.prototype */
{
    /**
     * Build plane geometry
     */
    build: function() {
        var heightSegments = this.heightSegments;
        var widthSegments = this.widthSegments;
        var attributes = this.attributes;
        var positions = [];
        var texcoords = [];
        var normals = [];
        var faces = [];

        for (var y = 0; y <= heightSegments; y++) {
            var t = y / heightSegments;
            for (var x = 0; x <= widthSegments; x++) {
                var s = x / widthSegments;

                positions.push([2 * s - 1, 2 * t - 1, 0]);
                if (texcoords) {
                    texcoords.push([s, t]);
                }
                if (normals) {
                    normals.push([0, 0, 1]);
                }
                if (x < widthSegments && y < heightSegments) {
                    var i = x + y * (widthSegments + 1);
                    faces.push([i, i + 1, i + widthSegments + 1]);
                    faces.push([i + widthSegments + 1, i + 1, i + widthSegments + 2]);
                }
            }
        }

        attributes.position.fromArray(positions);
        attributes.texcoord0.fromArray(texcoords);
        attributes.normal.fromArray(normals);

        this.initIndicesFromArray(faces);

        this.boundingBox = new BoundingBox();
        this.boundingBox.min.set(-1, -1, 0);
        this.boundingBox.max.set(1, 1, 0);
    }
});

var planeMatrix = new Matrix4();

/**
 * @constructor qtek.geometry.Cube
 * @extends qtek.Geometry
 * @param {Object} [opt]
 * @param {number} [opt.widthSegments]
 * @param {number} [opt.heightSegments]
 * @param {number} [opt.depthSegments]
 * @param {boolean} [opt.inside]
 */
var Cube = Geometry.extend(
/**@lends qtek.geometry.Cube# */
{
    dynamic: false,
    /**
     * @type {number}
     */
    widthSegments: 1,
    /**
     * @type {number}
     */
    heightSegments: 1,
    /**
     * @type {number}
     */
    depthSegments: 1,
    /**
     * @type {boolean}
     */
    inside: false
}, function() {
    this.build();
},
/** @lends qtek.geometry.Cube.prototype */
{
    /**
     * Build cube geometry
     */
    build: function() {

        var planes = {
            'px': createPlane('px', this.depthSegments, this.heightSegments),
            'nx': createPlane('nx', this.depthSegments, this.heightSegments),
            'py': createPlane('py', this.widthSegments, this.depthSegments),
            'ny': createPlane('ny', this.widthSegments, this.depthSegments),
            'pz': createPlane('pz', this.widthSegments, this.heightSegments),
            'nz': createPlane('nz', this.widthSegments, this.heightSegments),
        };

        var attrList = ['position', 'texcoord0', 'normal'];
        var vertexNumber = 0;
        var faceNumber = 0;
        for (var pos in planes) {
            vertexNumber += planes[pos].vertexCount;
            faceNumber += planes[pos].indices.length;
        }
        for (var k = 0; k < attrList.length; k++) {
            this.attributes[attrList[k]].init(vertexNumber);
        }
        this.indices = new vendor.Uint16Array(faceNumber);
        var faceOffset = 0;
        var vertexOffset = 0;
        for (var pos in planes) {
            var plane = planes[pos];
            for (var k = 0; k < attrList.length; k++) {
                var attrName = attrList[k];
                var attrArray = plane.attributes[attrName].value;
                var attrSize = plane.attributes[attrName].size;
                var isNormal = attrName === 'normal';
                for (var i = 0; i < attrArray.length; i++) {
                    var value = attrArray[i];
                    if (this.inside && isNormal) {
                        value = -value;
                    }
                    this.attributes[attrName].value[i + attrSize * vertexOffset] = value;
                }
            }
            for (var i = 0; i < plane.indices.length; i++) {
                this.indices[i + faceOffset] = vertexOffset + plane.indices[i];
            }
            faceOffset += plane.indices.length;
            vertexOffset += plane.vertexCount;
        }

        this.boundingBox = new BoundingBox();
        this.boundingBox.max.set(1, 1, 1);
        this.boundingBox.min.set(-1, -1, -1);
    }
});

function createPlane(pos, widthSegments, heightSegments) {

    planeMatrix.identity();

    var plane = new Plane$2({
        widthSegments: widthSegments,
        heightSegments: heightSegments
    });

    switch(pos) {
        case 'px':
            Matrix4.translate(planeMatrix, planeMatrix, Vector3.POSITIVE_X);
            Matrix4.rotateY(planeMatrix, planeMatrix, Math.PI / 2);
            break;
        case 'nx':
            Matrix4.translate(planeMatrix, planeMatrix, Vector3.NEGATIVE_X);
            Matrix4.rotateY(planeMatrix, planeMatrix, -Math.PI / 2);
            break;
        case 'py':
            Matrix4.translate(planeMatrix, planeMatrix, Vector3.POSITIVE_Y);
            Matrix4.rotateX(planeMatrix, planeMatrix, -Math.PI / 2);
            break;
        case 'ny':
            Matrix4.translate(planeMatrix, planeMatrix, Vector3.NEGATIVE_Y);
            Matrix4.rotateX(planeMatrix, planeMatrix, Math.PI / 2);
            break;
        case 'pz':
            Matrix4.translate(planeMatrix, planeMatrix, Vector3.POSITIVE_Z);
            break;
        case 'nz':
            Matrix4.translate(planeMatrix, planeMatrix, Vector3.NEGATIVE_Z);
            Matrix4.rotateY(planeMatrix, planeMatrix, Math.PI);
            break;
    }
    plane.applyTransform(planeMatrix);
    return plane;
}

Shader.import("@export qtek.skybox.vertex\nuniform mat4 world : WORLD;\nuniform mat4 worldViewProjection : WORLDVIEWPROJECTION;\nattribute vec3 position : POSITION;\nvarying vec3 v_WorldPosition;\nvoid main()\n{\n    v_WorldPosition = (world * vec4(position, 1.0)).xyz;\n    gl_Position = worldViewProjection * vec4(position, 1.0);\n}\n@end\n@export qtek.skybox.fragment\nuniform mat4 viewInverse : VIEWINVERSE;\nuniform samplerCube environmentMap;\nuniform float lod: 0.0;\nvarying vec3 v_WorldPosition;\nvoid main()\n{\n    vec3 eyePos = viewInverse[3].xyz;\n    vec3 viewDirection = normalize(v_WorldPosition - eyePos);\n    vec3 tex = textureCube(environmentMap, viewDirection).rgb;\n#ifdef SRGB_DECODE\n    tex.rgb = pow(tex.rgb, vec3(2.2));\n#endif\n    gl_FragColor = vec4(tex, 1.0);\n}\n@end");

// Overwrite skybox
/**
 * @constructor qtek.plugin.Skybox
 *
 * @example
 *     var skyTex = new qtek.TextureCube();
 *     skyTex.load({
 *         'px': 'assets/textures/sky/px.jpg',
 *         'nx': 'assets/textures/sky/nx.jpg'
 *         'py': 'assets/textures/sky/py.jpg'
 *         'ny': 'assets/textures/sky/ny.jpg'
 *         'pz': 'assets/textures/sky/pz.jpg'
 *         'nz': 'assets/textures/sky/nz.jpg'
 *     });
 *     var skybox = new qtek.plugin.Skybox({
 *         scene: scene
 *     });
 *     skybox.material.set('environmentMap', skyTex);
 */
var Skybox = Mesh.extend(function () {

    var skyboxShader = new Shader({
        vertex: Shader.source('qtek.skybox.vertex'),
        fragment: Shader.source('qtek.skybox.fragment')
    });
    var material = new Material({
        shader: skyboxShader,
        depthMask: false
    });

    return {
        /**
         * @type {qtek.Scene}
         * @memberOf qtek.plugin.Skybox.prototype
         */
        scene: null,

        geometry: new Cube(),

        material: material,

        environmentMap: null,

        culling: false
    };
}, function () {
    var scene = this.scene;
    if (scene) {
        this.attachScene(scene);
    }
    if (this.environmentMap) {
        this.setEnvironmentMap(this.environmentMap);
    }
}, /** @lends qtek.plugin.Skybox# */ {
    /**
     * Attach the skybox to the scene
     * @param  {qtek.Scene} scene
     */
    attachScene: function (scene) {
        if (this.scene) {
            this.detachScene();
        }
        this.scene = scene;
        scene.on('beforerender', this._beforeRenderScene, this);
    },
    /**
     * Detach from scene
     */
    detachScene: function () {
        if (this.scene) {
            this.scene.off('beforerender', this._beforeRenderScene);
        }
        this.scene = null;
    },

    /**
     * Dispose skybox
     * @param  {qtek.Renderer} renderer
     */
    dispose: function (renderer) {
        this.detachScene();
        this.geometry.dispose(renderer);
        this.material.dispose(renderer);
    },
    /**
     * Set environment map
     * @param {qtek.TextureCube} envMap
     */
    setEnvironmentMap: function (envMap) {
        this.material.set('environmentMap', envMap);
    },
    /**
     * Get environment map
     * @return {qtek.TextureCube}
     */
    getEnvironmentMap: function () {
        return this.material.get('environmentMap');
    },

    _beforeRenderScene: function(renderer, scene, camera) {
        this.renderSkybox(renderer, camera);
    },

    renderSkybox: function (renderer, camera) {
        this.position.copy(camera.getWorldPosition());
        this.update();
        // Don't remember to disable blend
        renderer.gl.disable(renderer.gl.BLEND);
        renderer.renderQueue([this], camera);
    }
});

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
    this._camera = new Perspective();

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

return Environment;

})));
