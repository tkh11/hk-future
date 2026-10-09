"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { publicPath } from "@/lib/public-path";
import { prepareChillingModel, type Selection } from "./chilling-model";
import styles from "./CoolingExplorer.module.css";

export default function ChillingViewer({ selection, onSelect }: { selection: Selection; onSelect: (selection: Selection) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const refreshRef = useRef<(() => void) | null>(null);
  const selected = useRef(selection);
  const selectRef = useRef(onSelect);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { selected.current = selection; refreshRef.current?.(); }, [selection]);
  useEffect(() => { selectRef.current = onSelect; }, [onSelect]);
  useEffect(() => {
    if (!host.current) return;
    const element = host.current;
    let disposed = false, frame = 0, visible = true;
    let model: ReturnType<typeof prepareChillingModel> | undefined;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" }); }
    catch { queueMicrotask(() => { if (!disposed) setStatus("error"); }); return () => { disposed = true; }; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xffffff, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true"); element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a8a, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 2.3); key.position.set(-3, 7, 6); scene.add(key);
    const camera = new THREE.OrthographicCamera(-4, 4, 3, -3, .1, 100);
    // Fixed orthographic view. The front faces and pipework face +Z in this asset.
    camera.position.set(-3.6, 3.1, 7.5); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let hovered: Selection = null, hoverFrame = 0;
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
    function pick(clientX: number, clientY: number): Selection {
      if (!model) return null;
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set((clientX - bounds.left) / bounds.width * 2 - 1, -(clientY - bounds.top) / bounds.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      // The closest visible surface wins, including non-interactive equipment.
      const part = raycaster.intersectObjects(model.group.children, false)[0]?.object.name;
      return part === "supply" || part === "return" ? "pipes" : part === "pumps" || part === "valves" ? part : null;
    }
    function hover(event: PointerEvent) {
      if (event.pointerType === "touch") return;
      cancelAnimationFrame(hoverFrame);
      hoverFrame = requestAnimationFrame(() => {
        const next = pick(event.clientX, event.clientY);
        renderer.domElement.style.cursor = next ? "pointer" : "default";
        if (hovered !== next) { hovered = next; refresh(); }
      });
    }
    function leave() { cancelAnimationFrame(hoverFrame); hovered = null; renderer.domElement.style.cursor = "default"; refresh(); }
    let press: { x: number; y: number } | null = null;
    function pointerDown(event: PointerEvent) { press = { x: event.clientX, y: event.clientY }; }
    function click(event: MouseEvent) {
      if (!press || Math.hypot(event.clientX - press.x, event.clientY - press.y) > 6) return;
      const next = pick(event.clientX, event.clientY);
      if (next) selectRef.current(next);
      press = null;
    }
    renderer.domElement.addEventListener("pointermove", hover);
    renderer.domElement.addEventListener("pointerleave", leave);
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("click", click);
    function render(time = performance.now()) {
      frame = 0;
      if (disposed || !model) return;
      const active = hovered ?? selected.current;
      const animate = visible && !document.hidden && !reduced.matches && active === "pumps";
      const beat = animate ? Math.pow((Math.sin(time / 1000 * Math.PI) + 1) / 2, 4) : 0;
      model.select(active, beat); renderer.render(scene, camera);
      if (animate) frame = requestAnimationFrame(render);
    }
    function refresh() { cancelAnimationFrame(frame); render(); }
    function resize() {
      if (!model) return;
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height);
      const box = new THREE.Box3().setFromObject(model.group), projected = new THREE.Box3();
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) projected.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
      const size = projected.getSize(new THREE.Vector3()), center = projected.getCenter(new THREE.Vector3());
      const half = Math.max(size.y / 2, size.x / (2 * width / height)) * 1.06;
      camera.left = center.x - half * width / height; camera.right = center.x + half * width / height;
      camera.top = center.y + half; camera.bottom = center.y - half; camera.updateProjectionMatrix(); refresh();
    }
    const observer = new ResizeObserver(resize); observer.observe(element);
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; refresh(); }); visibility.observe(element);
    document.addEventListener("visibilitychange", refresh); reduced.addEventListener("change", refresh);
    const contextLost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(frame); setStatus("error"); };
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    new GLTFLoader().load(publicPath("/models/chilling.glb"), gltf => {
      try {
        const prepared = prepareChillingModel(gltf.scene);
        if (disposed) { prepared.dispose(); return; }
        model = prepared; scene.add(model.group); refreshRef.current = refresh; resize(); setStatus("ready");
      } catch { if (!disposed) setStatus("error"); }
    }, undefined, () => { if (!disposed) setStatus("error"); });
    return () => {
      disposed = true; cancelAnimationFrame(frame); cancelAnimationFrame(hoverFrame); refreshRef.current = null;
      observer.disconnect(); visibility.disconnect(); document.removeEventListener("visibilitychange", refresh); reduced.removeEventListener("change", refresh);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost); model?.dispose(); renderer.dispose(); renderer.domElement.remove();
      renderer.domElement.removeEventListener("pointermove", hover); renderer.domElement.removeEventListener("pointerleave", leave);
      renderer.domElement.removeEventListener("pointerdown", pointerDown); renderer.domElement.removeEventListener("click", click);
    };
  }, [attempt]);
  return <div className={styles.viewer} data-model-status={status}>
    <div ref={host} className={styles.canvas} role="img" aria-label="Система охлаждения ЦОД: серверные стойки слева, насосы и трубопроводы спереди, наружный охладитель справа. Фиксированный изометрический вид." />
    {status === "loading" && <div className={styles.loading} role="status"><span />Загрузка системы охлаждения</div>}
    {status === "error" && <div className={styles.loading} role="alert"><p>Не удалось показать модель.</p><button type="button" className="home-hero__link" onClick={() => { setStatus("loading"); setAttempt(value => value + 1); }}>Попробовать снова</button></div>}
  </div>;
}
