"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type * as ThreeTypes from "three";

type ThreeModule = typeof import("three");

type FlightMode = "briefing" | "running" | "paused" | "landed" | "crashed";
type Weather = "clear" | "windy" | "sunset";
type CameraMode = "chase" | "cockpit" | "tower";

type Telemetry = {
  speed: number;
  altitude: number;
  heading: number;
  verticalSpeed: number;
  throttle: number;
  pitch: number;
  roll: number;
  gForce: number;
  distance: number;
  fuel: number;
  stage: number;
  gearDown: boolean;
  onGround: boolean;
  warning: string;
};

type FlightState = {
  position: ThreeTypes.Vector3;
  speed: number;
  verticalSpeed: number;
  throttle: number;
  pitch: number;
  roll: number;
  yaw: number;
  onGround: boolean;
  gearDown: boolean;
  stage: number;
  score: number;
  elapsed: number;
  distance: number;
  lastHudUpdate: number;
};

const GROUND_Y = 1.9;
const KNOTS = 1.94384;
const FEET = 3.28084;

const OBJECTIVES = [
  "Pist 27’den kalkış yap ve 300 ft irtifaya tırman.",
  "Kuzey kapısından 650–1.100 ft aralığında geç.",
  "Batı kapısını dönerek kıyı hattını takip et.",
  "Dönüş kapısında 90° sağa yatışsız, dengeli dönüş yap.",
  "İniş takımını aç, piste hizalan ve yumuşak iniş yap.",
];

const CHECKPOINT_COORDS = [
  [0, 105, -640],
  [-560, 190, -1260],
  [-980, 150, -350],
  [-180, 75, 500],
] as const;

const CAMERA_LABELS: Record<CameraMode, string> = {
  chase: "Takip",
  cockpit: "Kokpit",
  tower: "Kule",
};

const INITIAL_TELEMETRY: Telemetry = {
  speed: 0,
  altitude: 0,
  heading: 0,
  verticalSpeed: 0,
  throttle: 0,
  pitch: 0,
  roll: 0,
  gForce: 1,
  distance: 0,
  fuel: 100,
  stage: 0,
  gearDown: true,
  onGround: true,
  warning: "",
};

function makeAircraft(THREE: ThreeModule) {
  const aircraft = new THREE.Group();
  aircraft.name = "aircraft";

  const white = new THREE.MeshStandardMaterial({
    color: 0xe8ece7,
    roughness: 0.48,
    metalness: 0.35,
  });
  const charcoal = new THREE.MeshStandardMaterial({
    color: 0x152024,
    roughness: 0.5,
    metalness: 0.25,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: 0xd6ff4b,
    roughness: 0.4,
    emissive: 0x1c2602,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x5ca0b2,
    roughness: 0.18,
    metalness: 0.45,
  });

  const fuselage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.38, 7.8, 14),
    white,
  );
  fuselage.rotation.x = Math.PI / 2;
  aircraft.add(fuselage);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.45, 14), accent);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -4.6;
  aircraft.add(nose);

  const wing = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.12, 1.55), white);
  wing.position.z = -0.25;
  aircraft.add(wing);

  const wingStripe = new THREE.Mesh(
    new THREE.BoxGeometry(9.68, 0.14, 0.18),
    accent,
  );
  wingStripe.position.set(0, 0.02, -0.28);
  aircraft.add(wingStripe);

  const tailWing = new THREE.Mesh(
    new THREE.BoxGeometry(3.35, 0.1, 0.82),
    white,
  );
  tailWing.position.z = 3.1;
  aircraft.add(tailWing);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.7, 1.25), charcoal);
  tail.position.set(0, 0.72, 3);
  tail.rotation.x = -0.18;
  aircraft.add(tail);

  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.56, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    glass,
  );
  canopy.scale.set(0.85, 0.85, 1.7);
  canopy.position.set(0, 0.48, -1.55);
  aircraft.add(canopy);

  const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x0b0d0d });
  const wheelGeometry = new THREE.CylinderGeometry(0.22, 0.22, 0.16, 10);
  const gear = new THREE.Group();
  [
    [-1.55, -0.62, -0.25],
    [1.55, -0.62, -0.25],
    [0, -0.6, 2.6],
  ].forEach(([x, y, z]) => {
    const strut = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.75, 0.06),
      charcoal,
    );
    strut.position.set(x, y + 0.25, z);
    gear.add(strut);
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y - 0.12, z);
    gear.add(wheel);
  });
  gear.name = "landing-gear";
  aircraft.add(gear);

  const navLight = new THREE.PointLight(0xd6ff4b, 2.2, 14);
  navLight.position.set(-4.75, 0, -0.2);
  aircraft.add(navLight);

  aircraft.scale.setScalar(1.1);
  return aircraft;
}

function makeWorld(
  THREE: ThreeModule,
  scene: ThreeTypes.Scene,
  weather: Weather,
  gateRefs: ThreeTypes.Group[],
  checkpoints: ThreeTypes.Vector3[],
) {
  const skyColors = {
    clear: [0x84b7c5, 0xdce5d7, 0x1d4a53],
    windy: [0x6e8790, 0xc6cec4, 0x253d43],
    sunset: [0x253a51, 0xf3a76d, 0x412e36],
  }[weather];

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(3500, 28, 18),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: new THREE.Color(skyColors[0]) },
        horizonColor: { value: new THREE.Color(skyColors[1]) },
        bottomColor: { value: new THREE.Color(skyColors[2]) },
      },
      vertexShader:
        "varying vec3 vPos; void main(){ vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
      fragmentShader:
        "uniform vec3 topColor; uniform vec3 horizonColor; uniform vec3 bottomColor; varying vec3 vPos; void main(){ float h=normalize(vPos).y; vec3 c=h>0.0?mix(horizonColor,topColor,pow(h,0.65)):mix(horizonColor,bottomColor,min(1.0,-h*3.0)); gl_FragColor=vec4(c,1.0); }",
    }),
  );
  scene.add(sky);

  scene.fog = new THREE.FogExp2(
    weather === "windy" ? 0x82989a : weather === "sunset" ? 0xd19070 : 0x9fc3c5,
    weather === "windy" ? 0.0007 : 0.00042,
  );

  const hemi = new THREE.HemisphereLight(
    skyColors[0],
    0x203325,
    weather === "sunset" ? 1.4 : 1.8,
  );
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(
    weather === "sunset" ? 0xffb06c : 0xfff7da,
    2.7,
  );
  sun.position.set(weather === "sunset" ? -800 : 600, 900, 500);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -420;
  sun.shadow.camera.right = 420;
  sun.shadow.camera.top = 420;
  sun.shadow.camera.bottom = -420;
  scene.add(sun);

  const groundGeometry = new THREE.PlaneGeometry(5200, 5200, 48, 48);
  const positions = groundGeometry.attributes.position;
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const distanceFromAirfield = Math.max(0, Math.abs(x) - 360);
    const height =
      (Math.sin(x * 0.009) + Math.cos(y * 0.007) + Math.sin((x + y) * 0.004)) *
      Math.min(28, distanceFromAirfield * 0.018);
    positions.setZ(i, height);
  }
  groundGeometry.computeVertexNormals();
  const ground = new THREE.Mesh(
    groundGeometry,
    new THREE.MeshStandardMaterial({
      color: weather === "sunset" ? 0x3d4931 : 0x304f3d,
      roughness: 0.98,
      metalness: 0,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.3;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(5000, 100, 0x62816a, 0x47614f);
  grid.position.y = 0.05;
  (grid.material as ThreeTypes.Material).transparent = true;
  (grid.material as ThreeTypes.Material).opacity = 0.17;
  scene.add(grid);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(1500, 5200),
    new THREE.MeshStandardMaterial({
      color: 0x245d69,
      roughness: 0.24,
      metalness: 0.32,
      transparent: true,
      opacity: 0.88,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(1800, 0.2, 0);
  scene.add(water);

  const runway = new THREE.Mesh(
    new THREE.PlaneGeometry(54, 1280),
    new THREE.MeshStandardMaterial({
      color: 0x22292a,
      roughness: 0.92,
    }),
  );
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(0, 0.18, -300);
  runway.receiveShadow = true;
  scene.add(runway);

  const shoulderMaterial = new THREE.MeshStandardMaterial({ color: 0x59605b });
  [-30.5, 30.5].forEach((x) => {
    const shoulder = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 1280),
      shoulderMaterial,
    );
    shoulder.rotation.x = -Math.PI / 2;
    shoulder.position.set(x, 0.14, -300);
    scene.add(shoulder);
  });

  const markingMaterial = new THREE.MeshBasicMaterial({ color: 0xe6e4d4 });
  for (let z = 275; z > -885; z -= 70) {
    const marking = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 31),
      markingMaterial,
    );
    marking.rotation.x = -Math.PI / 2;
    marking.position.set(0, 0.24, z);
    scene.add(marking);
  }

  [-890, 290].forEach((z) => {
    for (let i = -3; i <= 3; i += 1) {
      const threshold = new THREE.Mesh(
        new THREE.PlaneGeometry(4.5, 24),
        markingMaterial,
      );
      threshold.rotation.x = -Math.PI / 2;
      threshold.position.set(i * 7, 0.25, z);
      scene.add(threshold);
    }
  });

  const runwayLightGeometry = new THREE.SphereGeometry(0.28, 6, 6);
  for (let z = 330; z > -950; z -= 34) {
    [-28, 28].forEach((x) => {
      const light = new THREE.Mesh(
        runwayLightGeometry,
        new THREE.MeshBasicMaterial({
          color: z < -850 ? 0xff4f4f : 0xd7f6ed,
        }),
      );
      light.position.set(x, 0.5, z);
      scene.add(light);
    });
  }

  const hangarMaterial = new THREE.MeshStandardMaterial({
    color: 0x85918b,
    roughness: 0.86,
  });
  [
    [-95, 18, 130, 54, 36, 82],
    [-120, 13, -40, 70, 26, 64],
    [105, 12, -80, 58, 24, 74],
  ].forEach(([x, y, z, w, h, d]) => {
    const hangar = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      hangarMaterial,
    );
    hangar.position.set(x, y, z);
    hangar.castShadow = true;
    hangar.receiveShadow = true;
    scene.add(hangar);
  });

  const tower = new THREE.Group();
  const towerBase = new THREE.Mesh(
    new THREE.BoxGeometry(12, 34, 12),
    hangarMaterial,
  );
  towerBase.position.y = 17;
  tower.add(towerBase);
  const towerCab = new THREE.Mesh(
    new THREE.BoxGeometry(22, 9, 22),
    new THREE.MeshStandardMaterial({
      color: 0x4d7882,
      metalness: 0.35,
      roughness: 0.2,
    }),
  );
  towerCab.position.y = 38;
  tower.add(towerCab);
  tower.position.set(92, 0, 130);
  scene.add(tower);

  const cityMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x6c756c, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x8a806d, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x53686b, roughness: 0.9 }),
  ];
  for (let i = 0; i < 70; i += 1) {
    const side = i % 2 === 0 ? 1 : -1;
    const x = side * (260 + ((i * 83) % 820));
    const z = 650 - ((i * 137) % 2200);
    const h = 10 + ((i * 29) % 52);
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(18 + (i % 4) * 7, h, 22 + (i % 3) * 9),
      cityMaterials[i % cityMaterials.length],
    );
    building.position.set(x, h / 2, z);
    building.castShadow = true;
    scene.add(building);
  }

  const mountainMaterial = new THREE.MeshStandardMaterial({
    color: 0x405c4d,
    roughness: 1,
    flatShading: true,
  });
  for (let i = 0; i < 28; i += 1) {
    const angle = (i / 28) * Math.PI * 2;
    const radius = 1550 + (i % 5) * 190;
    const height = 180 + (i % 7) * 45;
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(170 + (i % 4) * 45, height, 7),
      mountainMaterial,
    );
    mountain.position.set(
      Math.cos(angle) * radius,
      height / 2 - 5,
      Math.sin(angle) * radius,
    );
    mountain.rotation.y = angle;
    scene.add(mountain);
  }

  const cloudMaterial = new THREE.MeshLambertMaterial({
    color: weather === "sunset" ? 0xffc6aa : 0xe7efea,
    transparent: true,
    opacity: weather === "windy" ? 0.64 : 0.78,
  });
  for (let i = 0; i < 22; i += 1) {
    const cloud = new THREE.Group();
    for (let p = 0; p < 5; p += 1) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(20 + ((i + p) % 3) * 9, 8, 7),
        cloudMaterial,
      );
      puff.position.set(p * 22 - 44, (p % 2) * 8, ((p * 13) % 27) - 12);
      cloud.add(puff);
    }
    cloud.position.set(
      ((i * 293) % 2800) - 1400,
      240 + ((i * 71) % 260),
      ((i * 449) % 3000) - 1500,
    );
    cloud.scale.setScalar(0.8 + (i % 4) * 0.14);
    scene.add(cloud);
  }

  checkpoints.forEach((point, index) => {
    const gate = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(index === 3 ? 54 : 64, 3.2, 8, 48),
      new THREE.MeshBasicMaterial({
        color: 0xd6ff4b,
        transparent: true,
        opacity: index === 0 ? 0.92 : 0.24,
      }),
    );
    ring.rotation.y = index === 1 ? 0.75 : index === 2 ? Math.PI / 2 : 0;
    gate.add(ring);

    for (let tick = 0; tick < 8; tick += 1) {
      const marker = new THREE.Mesh(
        new THREE.BoxGeometry(2, 9, 2),
        new THREE.MeshBasicMaterial({
          color: 0xd6ff4b,
          transparent: true,
          opacity: 0.65,
        }),
      );
      const a = (tick / 8) * Math.PI * 2;
      marker.position.set(Math.cos(a) * 76, Math.sin(a) * 76, 0);
      marker.rotation.z = a;
      gate.add(marker);
    }

    gate.position.copy(point);
    gate.userData.baseY = point.y;
    gate.userData.index = index;
    scene.add(gate);
    gateRefs.push(gate);
  });
}

function formatHeading(value: number) {
  const normalized = ((value % 360) + 360) % 360;
  return Math.round(normalized).toString().padStart(3, "0");
}

export function FlightSimulator() {
  const mountRef = useRef<HTMLDivElement>(null);
  const flightRef = useRef<FlightState | null>(null);
  const modeRef = useRef<FlightMode>("briefing");
  const keysRef = useRef<Record<string, boolean>>({});
  const touchRef = useRef<Record<string, boolean>>({});
  const cameraRef = useRef<CameraMode>("chase");
  const weatherRef = useRef<Weather>("clear");
  const mutedRef = useRef(false);
  const audioRef = useRef<{
    context: AudioContext;
    oscillator: OscillatorNode;
    gain: GainNode;
    filter: BiquadFilterNode;
  } | null>(null);

  const [mode, setMode] = useState<FlightMode>("briefing");
  const [weather, setWeather] = useState<Weather>("clear");
  const [cameraMode, setCameraMode] = useState<CameraMode>("chase");
  const [muted, setMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [telemetry, setTelemetry] = useState<Telemetry>(INITIAL_TELEMETRY);
  const [toast, setToast] = useState("");
  const [finalScore, setFinalScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem("skybound-best") || 0);
    const timer = window.setTimeout(() => setBestScore(saved), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    cameraRef.current = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    weatherRef.current = weather;
  }, [weather]);

  useEffect(() => {
    mutedRef.current = muted;
    const audio = audioRef.current;
    if (audio) {
      audio.gain.gain.setTargetAtTime(
        muted ? 0 : 0.025 + (flightRef.current?.throttle ?? 0) * 0.055,
        audio.context.currentTime,
        0.1,
      );
    }
  }, [muted]);

  const announce = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  }, []);

  const cycleCamera = useCallback(() => {
    setCameraMode((current) => {
      const next: CameraMode =
        current === "chase"
          ? "cockpit"
          : current === "cockpit"
            ? "tower"
            : "chase";
      announce(`Kamera: ${CAMERA_LABELS[next]}`);
      return next;
    });
  }, [announce]);

  const togglePause = useCallback(() => {
    setMode((current) => {
      if (current === "running") return "paused";
      if (current === "paused") return "running";
      return current;
    });
  }, []);

  const resetFlight = useCallback((toBriefing = false) => {
    const flight = flightRef.current;
    if (!flight) {
      setMode(toBriefing ? "briefing" : "running");
      return;
    }
    flight.position.set(0, GROUND_Y, 260);
    flight.speed = 0;
    flight.verticalSpeed = 0;
    flight.throttle = 0;
    flight.pitch = 0;
    flight.roll = 0;
    flight.yaw = 0;
    flight.onGround = true;
    flight.gearDown = true;
    flight.stage = 0;
    flight.score = 0;
    flight.elapsed = 0;
    flight.distance = 0;
    flight.lastHudUpdate = 0;
    setTelemetry(INITIAL_TELEMETRY);
    setFinalScore(0);
    setMode(toBriefing ? "briefing" : "running");
  }, []);

  const ensureAudio = useCallback(() => {
    if (audioRef.current) {
      void audioRef.current.context.resume();
      return;
    }
    const AudioContextClass =
      window.AudioContext ||
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    oscillator.type = "sawtooth";
    oscillator.frequency.value = 62;
    filter.type = "lowpass";
    filter.frequency.value = 280;
    gain.gain.value = 0.001;
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    audioRef.current = { context, oscillator, gain, filter };
  }, []);

  const startFlight = useCallback(() => {
    if (!flightRef.current) {
      announce("Uçuş sistemi hazırlanıyor — birkaç saniye sonra tekrar dene");
      return;
    }
    ensureAudio();
    resetFlight(false);
    announce("Skybound 01 — kalkış izni verildi");
  }, [announce, ensureAudio, resetFlight]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      keysRef.current[key] = true;
      if (
        ["w", "a", "s", "d", "q", "e", " ", "shift", "control"].includes(
          key,
        )
      ) {
        event.preventDefault();
      }
      if (event.repeat) return;
      if (key === "c") cycleCamera();
      if (key === "g" && modeRef.current === "running") {
        const flight = flightRef.current;
        if (!flight) return;
        flight.gearDown = !flight.gearDown;
        announce(
          flight.gearDown
            ? "İniş takımı açık"
            : "İniş takımı kapalı",
        );
      }
      if (key === "p" || key === "escape") togglePause();
      if (key === "m") setMuted((value) => !value);
      if (key === "h") setShowHelp((value) => !value);
      if (key === "r" && modeRef.current !== "briefing") resetFlight(false);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current[event.key.toLowerCase()] = false;
    };
    const onBlur = () => {
      keysRef.current = {};
      touchRef.current = {};
      if (modeRef.current === "running") setMode("paused");
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [announce, cycleCamera, resetFlight, togglePause]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
    const threeUrl = "/vendor/three.module.min.js";
    const THREE = (await import(
      /* @vite-ignore */ threeUrl
    )) as ThreeModule;
    if (disposed) return;

    const checkpoints = CHECKPOINT_COORDS.map(
      ([x, y, z]) => new THREE.Vector3(x, y, z),
    );
    const flight =
      flightRef.current ??
      ({
        position: new THREE.Vector3(0, GROUND_Y, 260),
        speed: 0,
        verticalSpeed: 0,
        throttle: 0,
        pitch: 0,
        roll: 0,
        yaw: 0,
        onGround: true,
        gearDown: true,
        stage: 0,
        score: 0,
        elapsed: 0,
        distance: 0,
        lastHudUpdate: 0,
      } satisfies FlightState);
    flightRef.current = flight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      56,
      mount.clientWidth / mount.clientHeight,
      0.1,
      7000,
    );
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = weather === "sunset" ? 0.92 : 1.02;
    renderer.domElement.className = "sim-canvas";
    renderer.domElement.setAttribute("aria-label", "3B uçuş simülasyonu");
    mount.appendChild(renderer.domElement);

    const gates: ThreeTypes.Group[] = [];
    makeWorld(THREE, scene, weather, gates, checkpoints);
    const aircraft = makeAircraft(THREE);
    scene.add(aircraft);

    const clock = new THREE.Clock();
    const chaseOffset = new THREE.Vector3();
    const lookTarget = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const up = new THREE.Vector3();
    const targetCamera = new THREE.Vector3();
    const towerCameraPosition = new THREE.Vector3(115, 48, 220);
    const tempQuaternion = new THREE.Quaternion();
    const euler = new THREE.Euler(0, 0, 0, "YXZ");
    let frameId = 0;

    const updateMission = (flight: FlightState) => {
      if (flight.stage === 0 && flight.position.y > 92) {
        flight.stage = 1;
        announce("Kalkış tamam — kuzey kapısına ilerle");
      } else if (flight.stage > 0 && flight.stage < 5) {
        const target = checkpoints[flight.stage - 1];
        const threshold = flight.stage === 4 ? 92 : 105;
        if (flight.position.distanceTo(target) < threshold) {
          flight.stage += 1;
          flight.score += 1250;
          announce(
            flight.stage === 5
              ? "Son yaklaşma — iniş takımı ve hız kontrolü"
              : `Kontrol noktası ${flight.stage - 1} tamam`,
          );
        }
      }

      gates.forEach((gate, index) => {
        const material = (gate.children[0] as ThreeTypes.Mesh)
          .material as ThreeTypes.MeshBasicMaterial;
        const gateStage = index + 1;
        material.opacity =
          flight.stage === gateStage ? 0.95 : flight.stage > gateStage ? 0.09 : 0.22;
        material.color.set(
          flight.stage > gateStage ? 0x71806a : 0xd6ff4b,
        );
        gate.rotation.z += 0.0015;
        gate.position.y =
          gate.userData.baseY +
          Math.sin(flight.elapsed * 0.9 + index) * 2.5;
      });
    };

    const finishFlight = (success: boolean, flight: FlightState) => {
      if (modeRef.current !== "running") return;
      if (success) {
        const landingQuality = Math.max(
          0,
          2500 -
            Math.abs(flight.verticalSpeed) * 260 -
            Math.abs(flight.roll) * 1200 -
            Math.max(0, flight.speed - 55) * 28,
        );
        const timeBonus = Math.max(0, 2200 - flight.elapsed * 9);
        const score = Math.round(flight.score + landingQuality + timeBonus);
        flight.score = score;
        setFinalScore(score);
        setBestScore((current) => {
          const next = Math.max(current, score);
          window.localStorage.setItem("skybound-best", String(next));
          return next;
        });
        setMode("landed");
      } else {
        setFinalScore(Math.round(flight.score));
        setMode("crashed");
      }
      flight.throttle = 0;
    };

    const animate = () => {
      frameId = window.requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.04);
      const flight = flightRef.current;
      if (!flight) return;
      const active = modeRef.current === "running";

      if (active) {
        const keys = keysRef.current;
        const touch = touchRef.current;
        const gamepad = navigator.getGamepads?.()[0];
        const deadzone = (value: number) =>
          Math.abs(value) < 0.12 ? 0 : value;

        const pitchInput = THREE.MathUtils.clamp(
          (keys.w || touch.up ? 1 : 0) -
            (keys.s || touch.down ? 1 : 0) -
            (gamepad ? deadzone(gamepad.axes[1] || 0) : 0),
          -1,
          1,
        );
        const rollInput = THREE.MathUtils.clamp(
          (keys.d || touch.right ? 1 : 0) -
            (keys.a || touch.left ? 1 : 0) +
            (gamepad ? deadzone(gamepad.axes[0] || 0) : 0),
          -1,
          1,
        );
        const rudderInput = THREE.MathUtils.clamp(
          (keys.e ? 1 : 0) -
            (keys.q ? 1 : 0) +
            (gamepad ? deadzone(gamepad.axes[2] || 0) : 0),
          -1,
          1,
        );
        const throttleUp =
          keys.shift || keys[" "] || touch.throttleUp || gamepad?.buttons[7]?.pressed;
        const throttleDown =
          keys.control || touch.throttleDown || gamepad?.buttons[6]?.pressed;

        if (throttleUp) flight.throttle += dt * 0.34;
        if (throttleDown) flight.throttle -= dt * 0.42;
        flight.throttle = THREE.MathUtils.clamp(flight.throttle, 0, 1);

        const pitchAuthority = flight.onGround
          ? THREE.MathUtils.smoothstep(flight.speed, 20, 52)
          : THREE.MathUtils.clamp(flight.speed / 42, 0.35, 1.2);
        flight.pitch += pitchInput * dt * 0.42 * pitchAuthority;
        flight.roll += rollInput * dt * 0.74 * pitchAuthority;
        if (Math.abs(pitchInput) < 0.05) flight.pitch *= Math.pow(0.996, dt * 60);
        if (Math.abs(rollInput) < 0.05) flight.roll *= Math.pow(0.987, dt * 60);
        flight.pitch = THREE.MathUtils.clamp(flight.pitch, -0.38, 0.46);
        flight.roll = THREE.MathUtils.clamp(
          flight.roll,
          flight.onGround ? -0.05 : -1.15,
          flight.onGround ? 0.05 : 1.15,
        );

        const turnRate =
          (Math.tan(flight.roll) * 9.81) / Math.max(34, flight.speed);
        flight.yaw +=
          (turnRate + rudderInput * (flight.onGround ? 0.32 : 0.2)) * dt;

        const drag =
          0.0017 * flight.speed * flight.speed +
          (flight.gearDown ? 0.85 : 0.12) +
          (flight.onGround ? 0.75 : 0);
        const engine = 13.2 * flight.throttle;
        flight.speed += (engine - drag) * dt;
        if (!flight.onGround && flight.speed < 22) flight.speed = 22;
        flight.speed = THREE.MathUtils.clamp(flight.speed, 0, 112);

        const stallSpeed = flight.gearDown ? 31 : 35;
        if (flight.onGround) {
          flight.position.y = GROUND_Y;
          flight.verticalSpeed = 0;
          if (flight.speed > 45 && flight.pitch > 0.075) {
            flight.onGround = false;
            flight.verticalSpeed = 2.5 + (flight.speed - 45) * 0.14;
          }
        } else {
          const liftRatio =
            Math.pow(flight.speed / 43, 2) * Math.cos(flight.roll);
          const targetClimb = Math.sin(flight.pitch) * flight.speed;
          const stallSink =
            flight.speed < stallSpeed
              ? (stallSpeed - flight.speed) * 0.65 + 2.5
              : 0;
          const turbulence =
            weatherRef.current === "windy"
              ? Math.sin(flight.elapsed * 4.1) * 0.75 +
                Math.sin(flight.elapsed * 7.7) * 0.35
              : 0;
          flight.verticalSpeed +=
            ((targetClimb - flight.verticalSpeed) * 0.92 +
              (liftRatio - 1) * 3.1 -
              stallSink +
              turbulence) *
            dt;
          flight.position.y += flight.verticalSpeed * dt;
        }

        const wind =
          weatherRef.current === "windy"
            ? Math.sin(flight.elapsed * 0.18) * 5.5
            : 0;
        flight.position.x +=
          (-Math.sin(flight.yaw) * Math.cos(flight.pitch) * flight.speed +
            wind) *
          dt;
        flight.position.z +=
          -Math.cos(flight.yaw) *
          Math.cos(flight.pitch) *
          flight.speed *
          dt;
        flight.elapsed += dt;
        flight.distance += flight.speed * dt;

        updateMission(flight);

        if (!flight.onGround && flight.position.y <= GROUND_Y) {
          const onRunway =
            Math.abs(flight.position.x) < 27 &&
            flight.position.z < 340 &&
            flight.position.z > -940;
          const safe =
            onRunway &&
            flight.gearDown &&
            flight.speed < 68 &&
            Math.abs(flight.verticalSpeed) < 4.2 &&
            Math.abs(flight.roll) < 0.18 &&
            flight.pitch > -0.12;
          flight.position.y = GROUND_Y;
          if (safe) {
            flight.onGround = true;
            flight.verticalSpeed = 0;
            flight.pitch *= 0.6;
            if (flight.stage >= 5) finishFlight(true, flight);
          } else {
            finishFlight(false, flight);
          }
        }

        if (
          Math.abs(flight.position.x) > 2600 ||
          Math.abs(flight.position.z) > 2900 ||
          flight.position.y > 1800
        ) {
          flight.score = Math.max(0, flight.score - dt * 12);
        }

        const warning =
          !flight.onGround && flight.speed < stallSpeed
            ? "STALL"
            : flight.speed > 98
              ? "AŞIRI HIZ"
              : flight.position.y < 28 &&
                  !flight.onGround &&
                  flight.verticalSpeed < -4
                ? "ALÇALMA"
                : flight.stage >= 4 && !flight.gearDown
                  ? "TAKIM"
                  : "";

        if (flight.elapsed - flight.lastHudUpdate > 0.09) {
          const target =
            flight.stage > 0 && flight.stage < 5
              ? checkpoints[flight.stage - 1]
              : null;
          setTelemetry({
            speed: flight.speed * KNOTS,
            altitude: Math.max(0, (flight.position.y - GROUND_Y) * FEET),
            heading: THREE.MathUtils.radToDeg(flight.yaw),
            verticalSpeed: flight.verticalSpeed * 196.85,
            throttle: flight.throttle * 100,
            pitch: THREE.MathUtils.radToDeg(flight.pitch),
            roll: THREE.MathUtils.radToDeg(flight.roll),
            gForce: THREE.MathUtils.clamp(
              Math.cos(flight.roll) === 0
                ? 1
                : 1 / Math.max(0.45, Math.cos(flight.roll)),
              0.2,
              3.8,
            ),
            distance: target ? flight.position.distanceTo(target) : 0,
            fuel: Math.max(0, 100 - flight.elapsed * 0.03),
            stage: flight.stage,
            gearDown: flight.gearDown,
            onGround: flight.onGround,
            warning,
          });
          flight.lastHudUpdate = flight.elapsed;
        }

        const audio = audioRef.current;
        if (audio) {
          audio.oscillator.frequency.setTargetAtTime(
            58 + flight.throttle * 86 + flight.speed * 0.25,
            audio.context.currentTime,
            0.08,
          );
          audio.filter.frequency.setTargetAtTime(
            240 + flight.throttle * 720,
            audio.context.currentTime,
            0.08,
          );
          audio.gain.gain.setTargetAtTime(
            mutedRef.current ? 0 : 0.02 + flight.throttle * 0.06,
            audio.context.currentTime,
            0.1,
          );
        }
      }

      euler.set(flight.pitch, flight.yaw, flight.roll, "YXZ");
      tempQuaternion.setFromEuler(euler);
      aircraft.position.copy(flight.position);
      aircraft.quaternion.slerp(tempQuaternion, active ? 0.18 : 0.08);
      const gear = aircraft.getObjectByName("landing-gear");
      if (gear) {
        gear.scale.y = THREE.MathUtils.lerp(
          gear.scale.y,
          flight.gearDown ? 1 : 0.04,
          0.13,
        );
        gear.visible = gear.scale.y > 0.07;
      }

      forward.set(0, 0, -1).applyQuaternion(aircraft.quaternion);
      up.set(0, 1, 0).applyQuaternion(aircraft.quaternion);
      const selectedCamera = cameraRef.current;
      if (selectedCamera === "chase") {
        chaseOffset
          .set(0, 5.8, 17 + flight.speed * 0.025)
          .applyQuaternion(aircraft.quaternion);
        targetCamera.copy(flight.position).add(chaseOffset);
        camera.position.lerp(targetCamera, 0.07);
        lookTarget
          .copy(flight.position)
          .addScaledVector(forward, 52)
          .addScaledVector(up, 1.4);
        camera.lookAt(lookTarget);
        aircraft.visible = true;
      } else if (selectedCamera === "cockpit") {
        targetCamera
          .copy(flight.position)
          .addScaledVector(forward, 2.2)
          .addScaledVector(up, 1.05);
        camera.position.lerp(targetCamera, 0.32);
        lookTarget
          .copy(targetCamera)
          .addScaledVector(forward, 120)
          .addScaledVector(up, 1.5);
        camera.lookAt(lookTarget);
        aircraft.visible = false;
      } else {
        camera.position.lerp(towerCameraPosition, 0.035);
        camera.lookAt(flight.position);
        aircraft.visible = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      if (!mount) return;
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    };
    window.addEventListener("resize", onResize);

    cleanup = () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
    })().catch((error: unknown) => {
      console.error("Skybound 3B motoru yüklenemedi", error);
      if (!disposed) {
        announce("3B uçuş sistemi yüklenemedi — sayfayı yenileyin");
      }
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [announce, weather]);

  useEffect(
    () => () => {
      if (audioRef.current) {
        audioRef.current.oscillator.stop();
        void audioRef.current.context.close();
      }
    },
    [],
  );

  const bindTouch = (control: string) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      touchRef.current[control] = true;
    },
    onPointerUp: () => {
      touchRef.current[control] = false;
    },
    onPointerCancel: () => {
      touchRef.current[control] = false;
    },
  });

  const objectiveStage = Math.min(telemetry.stage, OBJECTIVES.length - 1);

  return (
    <main className={`sim-shell weather-${weather}`}>
      <div ref={mountRef} aria-hidden="true" />
      <div className="vignette" />
      <div className="grain" />

      {mode !== "briefing" && (
        <>
          <div className="aim-reticle" aria-hidden="true">
            <span />
          </div>
          <section className="hud" aria-label="Uçuş göstergeleri">
            <div className="brand">
              <div className="brand-mark">
                <span>SB</span>
              </div>
              <div className="brand-copy">
                Skybound
                <small>Flight Simulator</small>
              </div>
            </div>

            <div className="top-telemetry">
              <div className="telemetry-item">
                <span className="telemetry-label">Hız</span>
                <span className="telemetry-value">
                  {Math.round(telemetry.speed).toString().padStart(3, "0")}
                  <span className="telemetry-unit">KT</span>
                </span>
              </div>
              <div className="telemetry-item">
                <span className="telemetry-label">İrtifa</span>
                <span className="telemetry-value">
                  {Math.round(telemetry.altitude).toString().padStart(4, "0")}
                  <span className="telemetry-unit">FT</span>
                </span>
              </div>
              <div className="telemetry-item">
                <span className="telemetry-label">Baş</span>
                <span className="telemetry-value">
                  {formatHeading(telemetry.heading)}
                  <span className="telemetry-unit">°</span>
                </span>
              </div>
            </div>

            <div className="status-stack">
              <div className="status-chip active">
                {weather === "clear"
                  ? "CAVOK"
                  : weather === "windy"
                    ? "RÜZGÂR"
                    : "GÜNBATIMI"}
              </div>
              <div
                className={`status-chip ${telemetry.warning ? "alert" : ""}`}
              >
                {telemetry.warning || "SİSTEM OK"}
              </div>
            </div>

            <aside className="flight-data glass-panel">
              <span className="panel-kicker">Canlı telemetri</span>
              <h2 className="panel-title">Cessna S-01</h2>
              <div className="data-row">
                <span>Dikey hız</span>
                <strong>
                  {telemetry.verticalSpeed >= 0 ? "+" : ""}
                  {Math.round(telemetry.verticalSpeed)} fpm
                </strong>
              </div>
              <div className="data-row">
                <span>Pitch / Roll</span>
                <strong>
                  {telemetry.pitch.toFixed(0)}° / {telemetry.roll.toFixed(0)}°
                </strong>
              </div>
              <div className="data-row">
                <span>G kuvveti</span>
                <strong>{telemetry.gForce.toFixed(1)} G</strong>
              </div>
              <div className="data-row">
                <span>Görev mesafesi</span>
                <strong>
                  {telemetry.distance > 0
                    ? `${Math.round(telemetry.distance)} m`
                    : "—"}
                </strong>
              </div>
              <div className="throttle-wrap">
                <div className="throttle-head">
                  <span>GAZ</span>
                  <span>{Math.round(telemetry.throttle)}%</span>
                </div>
                <div className="throttle-track">
                  <div
                    className="throttle-fill"
                    style={{ width: `${telemetry.throttle}%` }}
                  />
                </div>
              </div>
            </aside>

            <aside className="mission-panel glass-panel">
              <span className="panel-kicker">Görev SB-01</span>
              <h2 className="panel-title">Kıyı Devriyesi</h2>
              <div className="mission-progress" aria-hidden="true">
                {OBJECTIVES.map((_, index) => (
                  <span
                    key={index}
                    className={telemetry.stage > index ? "done" : ""}
                  />
                ))}
              </div>
              <div className="objective-list">
                {OBJECTIVES.map((objective, index) => (
                  <div
                    key={objective}
                    className={`objective ${
                      telemetry.stage > index
                        ? "done"
                        : objectiveStage === index
                          ? "current"
                          : ""
                    }`}
                  >
                    <span className="objective-index">
                      {telemetry.stage > index ? "✓" : index + 1}
                    </span>
                    <span>{objective}</span>
                  </div>
                ))}
              </div>
            </aside>

            <div className="bottom-instruments">
              <button
                className="camera-button"
                onClick={cycleCamera}
                aria-label="Kamera açısını değiştir"
              >
                Kamera · {CAMERA_LABELS[cameraMode]}
              </button>
              <div className="instrument">
                <span className="instrument-label">V/S</span>
                <span className="instrument-reading">
                  {Math.round(telemetry.verticalSpeed)}
                </span>
              </div>
              <div className="attitude" aria-label="Suni ufuk">
                <div
                  className="attitude-horizon"
                  style={{
                    transform: `translateY(${telemetry.pitch * 1.1}px) rotate(${-telemetry.roll}deg)`,
                  }}
                />
                <div className="attitude-plane">—•—</div>
              </div>
              <div className="instrument">
                <span className="instrument-label">YAKIT</span>
                <span className="instrument-reading">
                  {telemetry.fuel.toFixed(0)}%
                </span>
              </div>
              <button
                className="sound-button"
                onClick={() => setMuted((value) => !value)}
                aria-label="Sesi aç veya kapat"
              >
                Ses · {muted ? "Kapalı" : "Açık"}
              </button>
              <button
                className="pause-button"
                onClick={togglePause}
                aria-label="Uçuşu duraklat"
              >
                {mode === "paused" ? "Devam" : "Duraklat"}
              </button>
            </div>
          </section>

          <div className="touch-controls" aria-label="Dokunmatik kontroller">
            <div className="touch-cluster">
              <button className="touch-control touch-up" {...bindTouch("up")}>
                ↑
              </button>
              <button className="touch-control touch-left" {...bindTouch("left")}>
                ←
              </button>
              <button
                className="touch-control touch-down"
                {...bindTouch("down")}
              >
                ↓
              </button>
              <button
                className="touch-control touch-right"
                {...bindTouch("right")}
              >
                →
              </button>
            </div>
            <div className="throttle-touch">
              <button
                className="touch-control"
                {...bindTouch("throttleUp")}
                aria-label="Gaz artır"
              >
                +
              </button>
              <button
                className="touch-control"
                {...bindTouch("throttleDown")}
                aria-label="Gaz azalt"
              >
                −
              </button>
            </div>
          </div>
        </>
      )}

      {toast && <div className="toast">{toast}</div>}

      {mode === "briefing" && (
        <div className="overlay">
          <div className="briefing">
            <div>
              <div className="eyebrow">Tarayıcı tabanlı 3B uçuş deneyimi</div>
              <h1>
                SKY<span>BOUND</span>
              </h1>
              <p className="briefing-lead">
                Motoru çalıştır, pist 27’den kalk ve dört navigasyon kapısından
                geçerek meydana dön. Her kararın; hız, kaldırma, stall ve iniş
                puanını etkiler.
              </p>
              <div className="briefing-meta">
                <span>
                  Uçak <strong>S-01</strong>
                </span>
                <span>
                  Pist <strong>09 / 27</strong>
                </span>
                <span>
                  Süre <strong>~06 dk</strong>
                </span>
                <span>
                  Rekor <strong>{bestScore || "—"}</strong>
                </span>
              </div>
            </div>

            <div className="start-card">
              <span className="panel-kicker">Uçuş brifingi</span>
              <h2>SB-01 · Kıyı Devriyesi</h2>
              <p>
                1.200 ft’e tırman, işaretli rotayı tamamla ve 135 knot altında
                güvenli iniş yap. Rüzgârlı hava türbülans ve yan rüzgâr ekler.
              </p>
              <span className="panel-kicker">Hava koşulu</span>
              <div className="weather-picker">
                {(
                  [
                    ["clear", "Açık"],
                    ["windy", "Rüzgârlı"],
                    ["sunset", "Günbatımı"],
                  ] as [Weather, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    className={`weather-option ${
                      weather === value ? "selected" : ""
                    }`}
                    onClick={() => setWeather(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button className="start-button" onClick={startFlight}>
                <span>Uçuşu başlat</span>
                <span>→</span>
              </button>
              <div className="mini-controls">
                <div className="mini-control">
                  <span>Pitch</span>
                  <kbd>W / S</kbd>
                </div>
                <div className="mini-control">
                  <span>Roll</span>
                  <kbd>A / D</kbd>
                </div>
                <div className="mini-control">
                  <span>Gaz</span>
                  <kbd>SHIFT / CTRL</kbd>
                </div>
                <div className="mini-control">
                  <span>Kamera</span>
                  <kbd>C</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === "paused" && !showHelp && (
        <div className="overlay">
          <div className="result-card">
            <div className="result-icon">Ⅱ</div>
            <span className="panel-kicker">Uçuş beklemede</span>
            <h2>Duraklatıldı</h2>
            <p>
              Uçak donduruldu. Devam etmek için P veya ESC tuşuna basabilirsin.
            </p>
            <div className="result-actions">
              <button className="start-button" onClick={togglePause}>
                <span>Devam et</span>
                <span>→</span>
              </button>
              <button
                className="secondary-button"
                onClick={() => resetFlight(true)}
              >
                Brifinge dön
              </button>
            </div>
          </div>
        </div>
      )}

      {(mode === "landed" || mode === "crashed") && (
        <div className="overlay">
          <div className={`result-card ${mode === "crashed" ? "crash" : ""}`}>
            <div className="result-icon">{mode === "landed" ? "✓" : "!"}</div>
            <span className="panel-kicker">
              {mode === "landed" ? "Görev tamamlandı" : "Uçuş sonlandırıldı"}
            </span>
            <h2>{mode === "landed" ? "Yumuşak iniş" : "Kaza raporu"}</h2>
            <p>
              {mode === "landed"
                ? "Kıyı rotası tamamlandı ve uçak güvenle piste indirildi."
                : "İrtifa, iniş takımı, yatış açısı ve dikey hız değerlerini kontrol ederek yeniden dene."}
            </p>
            <div className="score">{finalScore.toString().padStart(4, "0")}</div>
            <div className="result-actions">
              <button className="start-button" onClick={() => resetFlight(false)}>
                <span>Tekrar uç</span>
                <span>↻</span>
              </button>
              <button
                className="secondary-button"
                onClick={() => resetFlight(true)}
              >
                Brifinge dön
              </button>
            </div>
          </div>
        </div>
      )}

      {showHelp && (
        <div className="overlay">
          <div className="help-sheet">
            <span className="panel-kicker">Kontrol rehberi</span>
            <h2>Uçuş kontrolleri</h2>
            <div className="help-grid">
              {[
                ["W / S", "Burun yukarı / aşağı"],
                ["A / D", "Sola / sağa yatış"],
                ["Q / E", "Dümen"],
                ["Shift / Ctrl", "Gaz artır / azalt"],
                ["G", "İniş takımı"],
                ["C", "Kamera değiştir"],
                ["P / Esc", "Duraklat / devam"],
                ["R", "Uçuşu sıfırla"],
                ["M", "Motor sesini kapat"],
                ["H", "Bu paneli aç / kapat"],
              ].map(([key, label]) => (
                <div className="help-row" key={key}>
                  <kbd>{key}</kbd>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <button
              className="start-button"
              onClick={() => setShowHelp(false)}
              style={{ marginTop: 22 }}
            >
              <span>Uçuşa dön</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
