### Example

```js
var environment = new Environment(document.getElementById('main'));
environment.loadCubemap({
    nx: 'asset/env/mobile_r.jpg',
    px: 'asset/env/mobile_l.jpg',
    ny: 'asset/env/mobile_d.jpg',
    py: 'asset/env/mobile_u.jpg',
    nz: 'asset/env/mobile_f.jpg',
    pz: 'asset/env/mobile_b.jpg'
}, function () {
    environment.start();
});
environment.initParticleEffect({
    sprite: './asset/snowflake7_alpha.png',
    // Range of particle size
    size: [20, 100],
    // Range of particle life in second.
    life: [5, 8],
    // Range of particle speed in 3d space.
    speed: [[-0.1, -2, -0.1], [0.1, -1, 0.1]]
});

window.addEventListener('resize', environment.resize.bind(environment));
```