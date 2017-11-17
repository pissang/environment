import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
		  
function loadGLSL() {
    return {
        transform(code, id) {
            if (!/\.glsl$/.test(id)) {
                return;
            }
            let glslCode = JSON.stringify(
                code
                .replace(/[ \t]*\/\/.*\n/g, '') // remove //
                    .replace(/[ \t]*\/\*[\s\S]*?\*\//g, '') // remove /* */
                    .replace(/\n{2,}/g, '\n') // # \n+ to \n
            );
            let transformedCode = `
                import Shader from 'qtek/src/Shader';
                Shader.import(${glslCode});
            `;
            return {
                code: transformedCode,
                map: { mappings: '' }
            };       
        }
    };    
}
         
export default {
    input: __dirname + '/src/Environment.js',
    plugins: [
        loadGLSL(),
        nodeResolve(),
        commonjs()
        // babel({
        //     babelrc: false,
        //     exclude: 'node_modules/**',
        //     presets: [
        //         [
        //             'env',
        //             {
        //                 modules: false
        //             }
        //         ]
        //     ],
        // })
    ],
    // sourceMap: true,
    output: [
        {
            format: 'umd',
            name: 'Environment',
            file: 'dist/environment.js'
        }
    ]
};