// Build-time entry for the Three.js bundle vendored into index.html (node orch/three/vendor.mjs).
// The game is one classic <script> that expects a global THREE (with THREE.GLTFLoader and THREE.SkeletonUtils), as the
// old r128 UMD build gave it. Three.js only ships ES modules now, so esbuild bundles them into one classic script.
import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
window.THREE = Object.assign({}, T, { GLTFLoader, SkeletonUtils });
