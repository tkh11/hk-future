"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { publicPath } from "@/lib/public-path";
import { FIRE_VIEWS, isFirePart, prepareFireOffModel, type FireSelection, type FireView } from "./fireoff-model";
import styles from "../data-centers/CoolingExplorer.module.css";
import fireStyles from "./FireExplorer.module.css";
import { FIRE_PARTS } from "./fireoff-content";

type CameraPose = { target: THREE.Vector3; rotation: THREE.Quaternion; height: number; fov: number };

function getPose(view: FireView, aspect: number): CameraPose {
  const preset = FIRE_VIEWS[view];
  const direction = new THREE.Vector3(...preset.direction).normalize();
  const rotation = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().lookAt(direction, new THREE.Vector3(), new THREE.Vector3(...(preset.up ?? [0, 1, 0]))),
  );
  return { target: new THREE.Vector3(...preset.target), rotation, height: Math.max(preset.height, preset.width / aspect), fov: preset.fov };
}

export default function FireOffViewer({ selection, onSelect }: { selection: FireSelection; onSelect: (selection: FireSelection) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const annotations = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<((part: FireSelection) => void) | null>(null);
  const changeViewRef = useRef<(() => void) | null>(null);
  const selected = useRef(selection);
  const selectRef = useRef(onSelect);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { selected.current = selection; changeViewRef.current?.(); }, [selection]);
  useEffect(() => { selectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    if (!host.current) return;
    const element = host.current;
    let disposed = false, hoverFrame = 0, cameraFrame = 0, moving = false, visible = true;
    let model: ReturnType<typeof prepareFireOffModel> | undefined;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" }); }
    catch { queueMicrotask(() => { if (!disposed) setStatus("error"); }); return () => { disposed = true; }; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xffffff, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true");
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x999999, 2.2));
    const light = new THREE.DirectionalLight(0xffffff, 2.5);
    light.position.set(-6, 12, 8);
    scene.add(light);
    const camera = new THREE.PerspectiveCamera(10, 2, .002, 1200);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let pose = getPose(selected.current ?? "overview", 2);
    let hovered: FireSelection = null;
    let emphasisProgress = 1;
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
    const direction = new THREE.Vector3();
    const projected = new THREE.Vector3();
    const markers = FIRE_PARTS.map(part => ({
      ...part,
      point: new THREE.Vector3(...part.anchor),
      element: annotations.current?.querySelector<HTMLDivElement>(`[data-fire-marker="${part.id}"]`),
    }));

    function updateAnnotations() {
      const width = element.clientWidth, height = element.clientHeight;
      for (const marker of markers) {
        if (!marker.element) continue;
        projected.copy(marker.point).project(camera);
        const x = (projected.x + 1) * width / 2;
        const y = (1 - projected.y) * height / 2;
        const inView = !moving && projected.z > -1 && projected.z < 1 && x > 0 && x < width && y > 0 && y < height;
        marker.element.hidden = !inView;
        if (!inView) continue;
        const pinX = THREE.MathUtils.clamp(x + marker.offset[0], 24, width - 24);
        const pinY = THREE.MathUtils.clamp(y + marker.offset[1], 24, height - 24);
        marker.element.style.transform = `translate(${pinX}px, ${pinY}px)`;
        marker.element.dataset.align = pinX > width * .58 ? "left" : "right";
        const line = marker.element.querySelector<SVGLineElement>("line");
        const dot = marker.element.querySelector<SVGCircleElement>("circle");
        line?.setAttribute("x2", String(x - pinX)); line?.setAttribute("y2", String(y - pinY));
        dot?.setAttribute("cx", String(x - pinX)); dot?.setAttribute("cy", String(y - pinY));
      }
    }

    function render() {
      if (disposed || !model || !visible || document.hidden) return;
      model.updateAppearance(hovered, emphasisProgress);
      camera.fov = pose.fov;
      const distance = pose.height / (2 * Math.tan(THREE.MathUtils.degToRad(pose.fov / 2)));
      // Keep depth precision across both the full parking lot and centimetre-scale details.
      camera.near = Math.max(.001, distance * .5);
      camera.far = distance + 70;
      direction.set(0, 0, 1).applyQuaternion(pose.rotation);
      camera.position.copy(pose.target).addScaledVector(direction, distance);
      camera.quaternion.copy(pose.rotation);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      renderer.render(scene, camera);
      updateAnnotations();
    }

    function finishMove() {
      cancelAnimationFrame(cameraFrame);
      moving = false;
      emphasisProgress = 1;
      element.dataset.cameraMoving = "false";
      pose = getPose(selected.current ?? "overview", camera.aspect);
      render();
    }

    function changeView() {
      cancelAnimationFrame(cameraFrame);
      cancelAnimationFrame(hoverFrame);
      hovered = null;
      renderer.domElement.style.cursor = "default";
      if (!model) return;
      model.select(selected.current);
      if (reducedMotion.matches || !visible || document.hidden) { finishMove(); return; }
      const start = pose;
      const end = getPose(selected.current ?? "overview", camera.aspect);
      const travel = start.target.distanceTo(end.target);
      const pullback = Math.max(0, travel * .5 - Math.max(start.height, end.height));
      const began = performance.now();
      moving = true;
      emphasisProgress = 0;
      element.dataset.cameraMoving = "true";
      function animate(now: number) {
        if (disposed) return;
        const progress = Math.min(1, (now - began) / 1050);
        const t = progress * progress * (3 - 2 * progress);
        const emphasis = Math.min(1, (now - began) / 420);
        emphasisProgress = emphasis * emphasis * (3 - 2 * emphasis);
        pose = {
          target: start.target.clone().lerp(end.target, t),
          rotation: start.rotation.clone().slerp(end.rotation, t),
          height: Math.exp(THREE.MathUtils.lerp(Math.log(start.height), Math.log(end.height), t)) + pullback * Math.sin(Math.PI * t),
          fov: THREE.MathUtils.lerp(start.fov, end.fov, t),
        };
        render();
        if (progress < 1) cameraFrame = requestAnimationFrame(animate);
        else finishMove();
      }
      cameraFrame = requestAnimationFrame(animate);
    }

    function pick(clientX: number, clientY: number): FireSelection {
      if (!model || moving) return null;
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set((clientX - bounds.left) / bounds.width * 2 - 1, -(clientY - bounds.top) / bounds.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const object = raycaster.intersectObjects(model.pickable, false)[0]?.object;
      return isFirePart(object?.userData.firePart) ? object.userData.firePart : null;
    }
    function hover(event: PointerEvent) {
      if (event.pointerType === "touch" || moving) return;
      cancelAnimationFrame(hoverFrame);
      hoverFrame = requestAnimationFrame(() => {
        const next = pick(event.clientX, event.clientY);
        renderer.domElement.style.cursor = next ? "pointer" : "default";
        if (hovered !== next) { hovered = next; render(); }
      });
    }
    function leave() { cancelAnimationFrame(hoverFrame); hovered = null; renderer.domElement.style.cursor = "default"; render(); }
    hoverRef.current = part => { hovered = part; render(); };
    let press: { x: number; y: number } | null = null;
    function pointerDown(event: PointerEvent) { press = { x: event.clientX, y: event.clientY }; }
    function pointerCancel() { press = null; }
    function click(event: MouseEvent) {
      const down = press;
      press = null;
      if (!down || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) return;
      const next = pick(event.clientX, event.clientY);
      if (next) selectRef.current(next);
    }
    function resize() {
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      if (moving) render(); else finishMove();
    }
    function visibilityChange() { if (document.hidden) finishMove(); else render(); }
    function motionChange() { if (reducedMotion.matches) finishMove(); }
    renderer.domElement.addEventListener("pointermove", hover);
    renderer.domElement.addEventListener("pointerleave", leave);
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointercancel", pointerCancel);
    renderer.domElement.addEventListener("click", click);
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    const intersection = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (!visible) finishMove(); else render();
    });
    intersection.observe(element);
    document.addEventListener("visibilitychange", visibilityChange);
    reducedMotion.addEventListener("change", motionChange);
    const contextLost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(cameraFrame); setStatus("error"); };
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    new GLTFLoader().load(publicPath("/models/parking-sprinkler.glb"), gltf => {
      try {
        const prepared = prepareFireOffModel(gltf.scene);
        if (disposed) { prepared.dispose(); return; }
        model = prepared;
        model.select(selected.current);
        scene.add(model.group);
        changeViewRef.current = changeView;
        resize();
        setStatus("ready");
      } catch { if (!disposed) setStatus("error"); }
    }, undefined, () => { if (!disposed) setStatus("error"); });
    return () => {
      disposed = true;
      cancelAnimationFrame(hoverFrame); cancelAnimationFrame(cameraFrame);
      changeViewRef.current = null;
      hoverRef.current = null;
      observer.disconnect(); intersection.disconnect();
      document.removeEventListener("visibilitychange", visibilityChange);
      reducedMotion.removeEventListener("change", motionChange);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      renderer.domElement.removeEventListener("pointermove", hover); renderer.domElement.removeEventListener("pointerleave", leave);
      renderer.domElement.removeEventListener("pointerdown", pointerDown); renderer.domElement.removeEventListener("pointercancel", pointerCancel);
      renderer.domElement.removeEventListener("click", click);
      model?.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [attempt]);

  return <div className={fireStyles.viewer} data-model-status={status} data-model-view={selection ?? "overview"}>
    <div ref={host} className={styles.canvas} role="img" aria-label="Система пожаротушения паркинга. Выберите метку на модели или название в панели слева сверху, чтобы перейти к фиксированному ракурсу узла." />
    <div ref={annotations} className={fireStyles.annotations} aria-label="Подсказки на модели" role="group" hidden={status !== "ready"}>
      {FIRE_PARTS.map((part, index) => <div key={part.id} className={fireStyles.marker} data-fire-marker={part.id} data-muted={!!selection && selection !== part.id} hidden>
        <svg className={fireStyles.leader} width="1" height="1" aria-hidden="true"><line x1="0" y1="0" x2="0" y2="0" /><circle r="3" /></svg>
        <button type="button" className={fireStyles.pin} aria-label={`Показать: ${part.label}`} aria-pressed={selection === part.id} aria-controls={`fireoff-detail-${part.id}`} onClick={() => { onSelect(part.id); document.getElementById(`fireoff-toggle-${part.id}`)?.focus({ preventScroll: true }); }} onPointerEnter={() => hoverRef.current?.(part.id)} onPointerLeave={() => hoverRef.current?.(null)} onFocus={() => hoverRef.current?.(part.id)} onBlur={() => hoverRef.current?.(null)}>
          <span aria-hidden="true">0{index + 1}</span><span className={fireStyles.tooltip} aria-hidden="true">{part.label}</span>
        </button>
      </div>)}
    </div>
    {status === "loading" && <div className={styles.loading} role="status"><span />Загрузка системы FireOff</div>}
    {status === "error" && <div className={styles.loading} role="alert"><p>Не удалось показать модель. Выберите описание в панели.</p><button type="button" className="home-hero__link" onClick={() => { setStatus("loading"); setAttempt(value => value + 1); }}>Попробовать снова</button></div>}
  </div>;
}
