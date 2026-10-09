"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { publicPath } from "@/lib/public-path";
import { prepareFireOffModel, type FireSelection } from "./fireoff-model";
import styles from "../data-centers/CoolingExplorer.module.css";

export default function FireOffViewer({ selection, onSelect }: { selection: FireSelection; onSelect: (selection: FireSelection) => void }) {
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
    let disposed = false, hoverFrame = 0;
    let model: ReturnType<typeof prepareFireOffModel> | undefined;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" }); }
    catch { queueMicrotask(() => { if (!disposed) setStatus("error"); }); return () => { disposed = true; }; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xffffff, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true"); element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x777780, 2.1));
    const light = new THREE.DirectionalLight(0xffffff, 2.2); light.position.set(-3, 7, 6); scene.add(light);
    const camera = new THREE.OrthographicCamera(-1.2, 1.2, .7, -.7, .01, 200);
    camera.position.set(2, 3, 4); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    let hovered: FireSelection = null;
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
    function refresh() {
      if (disposed || !model) return;
      model.select(hovered ?? selected.current); renderer.render(scene, camera);
    }
    function pick(clientX: number, clientY: number): FireSelection {
      if (!model) return null;
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set((clientX - bounds.left) / bounds.width * 2 - 1, -(clientY - bounds.top) / bounds.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const part = raycaster.intersectObjects(model.group.children, false)[0]?.object.name;
      return part === "main" || part === "saddle" || part === "tee" ? part : null;
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
    function resize() {
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height);
      const aspect = width / height, half = Math.max(.68, 1.2 / aspect);
      camera.left = -half * aspect; camera.right = half * aspect; camera.top = half; camera.bottom = -half;
      camera.updateProjectionMatrix(); refresh();
    }
    renderer.domElement.addEventListener("pointermove", hover);
    renderer.domElement.addEventListener("pointerleave", leave);
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("click", click);
    const observer = new ResizeObserver(resize); observer.observe(element);
    const contextLost = (event: Event) => { event.preventDefault(); setStatus("error"); };
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    new GLTFLoader().load(publicPath("/models/fireoff.glb"), gltf => {
      try {
        const prepared = prepareFireOffModel(gltf.scene);
        if (disposed) { prepared.dispose(); return; }
        model = prepared; scene.add(model.group);
        camera.up.copy(model.up); camera.position.copy(model.viewDirection).multiplyScalar(6);
        camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
        refreshRef.current = refresh; resize(); setStatus("ready");
      } catch { if (!disposed) setStatus("error"); }
    }, undefined, () => { if (!disposed) setStatus("error"); });
    return () => {
      disposed = true; cancelAnimationFrame(hoverFrame); refreshRef.current = null; observer.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      renderer.domElement.removeEventListener("pointermove", hover); renderer.domElement.removeEventListener("pointerleave", leave);
      renderer.domElement.removeEventListener("pointerdown", pointerDown); renderer.domElement.removeEventListener("click", click);
      model?.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [attempt]);
  return <div className={styles.viewer} data-model-status={status}>
    <div ref={host} className={styles.canvas} role="img" aria-label="Узел FireOff в фиксированном изометрическом виде: основная магистраль, вварное седло и тройники. Выберите элемент на модели или в карточках ниже." />
    {status === "loading" && <div className={styles.loading} role="status"><span />Загрузка системы FireOff</div>}
    {status === "error" && <div className={styles.loading} role="alert"><p>Не удалось показать модель. Описания доступны ниже.</p><button type="button" className="home-hero__link" onClick={() => { setStatus("loading"); setAttempt(value => value + 1); }}>Попробовать снова</button></div>}
  </div>;
}
