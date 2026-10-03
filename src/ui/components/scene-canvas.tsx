"use client";
import { useEffect, useRef } from "react";
import {
  AmbientLight,
  Box3,
  DirectionalLight,
  Euler,
  Group,
  Mesh,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { SceneAsset } from "./decorative-scene";

const assetBytes = new Map<SceneAsset, Promise<ArrayBuffer>>();
const REST_X = 0.1,
  REST_Y = -0.22,
  RANGE_X = 0.09,
  RANGE_Y = 0.25;
function loadAsset(asset: SceneAsset) {
  let bytes = assetBytes.get(asset);
  if (!bytes) {
    bytes = fetch(`/assets/pn-ui-v2/models/${asset}.glb`, {
      // Revalidate between app loads so a replaced GLB cannot stay stale.
      // The in-memory promise still avoids duplicate downloads in this tab.
      cache: "no-cache",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("ASSET_UNAVAILABLE");
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > 500000) throw new Error("ASSET_LIMIT");
        return buffer;
      })
      .catch((error) => {
        assetBytes.delete(asset);
        throw error;
      });
    assetBytes.set(asset, bytes);
  }
  return bytes.then((buffer) =>
    new GLTFLoader().parseAsync(buffer, "/assets/pn-ui-v2/models/"),
  );
}

export default function SceneCanvas({
  asset,
  reduced,
  onFailure,
}: {
  asset: SceneAsset;
  reduced: boolean;
  onFailure: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const canvas = document.createElement("canvas");
    canvas.className = "scene-canvas";
    // Stable build audit marker: this optional chunk must stay out of the
    // offline shell precache, including its Three/GLTF dependencies.
    canvas.dataset.engine = "PN_DECORATIVE_SCENE_V2";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Ilustrasi alat belajar 3D");
    host.appendChild(canvas);
    let renderer: WebGLRenderer;
    try {
      const context = canvas.getContext("webgl2");
      if (!context) {
        canvas.remove();
        onFailure();
        return;
      }
      renderer = new WebGLRenderer({
        canvas,
        context,
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      canvas.remove();
      onFailure();
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    const scene = new Scene(),
      camera = new PerspectiveCamera(35, 1, 0.1, 100),
      pivot = new Group();
    scene.add(pivot, new AmbientLight(0xffffff, 1.6));
    const light = new DirectionalLight(0xffffff, 2);
    light.position.set(4, 6, 8);
    scene.add(light);
    camera.position.set(0, 0, 6);
    let alive = true,
      visible = true,
      loaded = false;
    const corners: Vector3[] = [];
    const render = () => {
      if (alive && visible && !document.hidden && loaded)
        renderer.render(scene, camera);
    };
    const resize = () => {
      const box = canvas.parentElement!.getBoundingClientRect();
      if (box.width <= 0 || box.height <= 0) return;
      renderer.setSize(box.width, box.height, false);
      camera.aspect = box.width / Math.max(1, box.height);
      if (corners.length) {
        // Fit the entire model, including its base, at rest and throughout the
        // small pointer tilt. Use both fields of view and reserve 12% padding.
        const tanY = Math.tan((camera.fov * Math.PI) / 360),
          tanX = tanY * camera.aspect;
        let distance = 0;
        for (const x of [REST_X - RANGE_X, REST_X, REST_X + RANGE_X])
          for (const y of [REST_Y - RANGE_Y, REST_Y, REST_Y + RANGE_Y])
            for (const corner of corners) {
              const point = corner.clone().applyEuler(new Euler(x, y, 0));
              distance = Math.max(
                distance,
                point.z +
                  1.12 *
                    Math.max(
                      Math.abs(point.x) / tanX,
                      Math.abs(point.y) / tanY,
                    ),
              );
            }
        camera.position.set(0, 0, distance);
        camera.lookAt(0, 0, 0);
      }
      camera.updateProjectionMatrix();
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement!);
    const intersection = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      render();
    });
    intersection.observe(canvas);
    const dispose = (group: Group) =>
      group.traverse((object) => {
        if (object instanceof Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
    // No RAF/auto-rotation: one frame per input, resize, visibility or load.
    loadAsset(asset)
      .then((result) => {
        if (!alive) {
          dispose(result.scene);
          return;
        }
        const bounds = new Box3().setFromObject(result.scene),
          center = bounds.getCenter(new Vector3()),
          size = bounds.getSize(new Vector3());
        result.scene.position.sub(center);
        const scale = 3.1 / Math.max(size.x, size.y, size.z);
        for (const x of [bounds.min.x, bounds.max.x])
          for (const y of [bounds.min.y, bounds.max.y])
            for (const z of [bounds.min.z, bounds.max.z])
              corners.push(
                new Vector3(x, y, z).sub(center).multiplyScalar(scale),
              );
        pivot.scale.setScalar(scale);
        pivot.add(result.scene);
        pivot.rotation.set(REST_X, REST_Y, 0);
        loaded = true;
        resize();
        canvas.dataset.ready = "true";
      })
      .catch(() => {
        if (alive) onFailure();
      });
    const move = (event: PointerEvent) => {
      if (reduced || event.pointerType === "touch") return;
      const box = canvas.getBoundingClientRect();
      pivot.rotation.y =
        REST_Y + ((event.clientX - box.left) / box.width - 0.5) * RANGE_Y * 2;
      pivot.rotation.x =
        REST_X + ((event.clientY - box.top) / box.height - 0.5) * RANGE_X * 2;
      render();
    };
    const leave = () => {
      pivot.rotation.set(REST_X, REST_Y, 0);
      render();
    };
    const lost = (event: Event) => {
      event.preventDefault();
      onFailure();
    };
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerleave", leave);
    canvas.addEventListener("webglcontextlost", lost);
    document.addEventListener("visibilitychange", render);
    resize();
    return () => {
      alive = false;
      observer.disconnect();
      intersection.disconnect();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("webglcontextlost", lost);
      document.removeEventListener("visibilitychange", render);
      dispose(pivot);
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, [asset, reduced, onFailure]);
  return <div ref={ref} className="scene-canvas-host" />;
}
