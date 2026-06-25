import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  X,
  Check,
  AlertCircle,
  Building2,
  User,
  Briefcase,
  FileText,
  ChevronDown,
  ChevronRight,
  Eye,
  ShieldCheck,
  Ban,
  Trash2,
  Calendar,
  MessageSquare,
  BarChart3,
  ListFilter,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Download,
  Activity,
  UserCheck,
} from "lucide-react";
import { useAdminStore, Hospital, Recruiter, Job, Candidate, Application } from "@/lib/admin-store";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

// Card Dimensions & Spacing Settings
const CARD_WIDTH = 290;
const CARD_HEIGHT = 130;
const HORIZONTAL_GAP = 50;
const LEVEL_HEIGHTS = [60, 260, 480, 700, 920]; // Y coordinates for [Admin, Hospitals, Recruiters, Jobs, Applicants]

interface Coordinates {
  x: number;
  y: number;
}

interface NodeLayout {
  id: string;
  type: "admin" | "hospital" | "recruiter" | "job" | "applicant";
  x: number;
  y: number;
  width: number;
  data: any;
  parentId?: string;
}

// Helper to calculate connection path data (straight line for old skool node graph)
const getPathData = (from: Coordinates, to: Coordinates) => {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
};

// Helper to get connection line color based on the source level node type and hospital plan
const getConnectionColors = (fromId: string, toId: string, isHighlighted: boolean, store: any) => {
  const fromType = fromId.split("-")[0];
  const toType = toId.split("-")[0];

  if (fromType === "admin" && toType === "hospital") {
    const hospitalId = toId.split("-")[1];
    const hosp = store.hospitals.find((h: any) => h.id === hospitalId);
    if (hosp?.plan === "Premium") {
      return isHighlighted ? "#d4af37" : "rgba(212, 175, 55, 0.35)"; // Gold
    }
    if (hosp?.plan === "Pro") {
      return isHighlighted ? "#14b8a6" : "rgba(20, 184, 166, 0.25)"; // Teal
    }
    // Basic (Bronze)
    return isHighlighted ? "#cd7f32" : "rgba(205, 127, 50, 0.25)"; // Bronze
  }

  if (isHighlighted) {
    switch (fromType) {
      case "admin":
        return "var(--color-primary)";
      case "hospital":
        return "#6366f1"; // Indigo
      case "recruiter":
        return "#10b981"; // Emerald
      case "job":
        return "#8b5cf6"; // Violet
      default:
        return "var(--color-primary)";
    }
  } else {
    switch (fromType) {
      case "admin":
        return "var(--color-border)";
      case "hospital":
        return "rgba(99, 102, 241, 0.25)";
      case "recruiter":
        return "rgba(16, 185, 129, 0.25)";
      case "job":
        return "rgba(139, 92, 246, 0.25)";
      default:
        return "var(--color-border)";
    }
  }
};

// Helper to determine the arrow marker ID based on the source level node type and hospital plan
const getMarkerId = (fromId: string, toId: string, isHighlighted: boolean, store: any) => {
  if (!isHighlighted) return "arrow-muted";
  const fromType = fromId.split("-")[0];
  const toType = toId.split("-")[0];

  if (fromType === "admin" && toType === "hospital") {
    const hospitalId = toId.split("-")[1];
    const hosp = store.hospitals.find((h: any) => h.id === hospitalId);
    if (hosp?.plan === "Premium") return "arrow-premium";
    if (hosp?.plan === "Pro") return "arrow-pro";
    return "arrow-basic";
  }

  switch (fromType) {
    case "admin":
      return "arrow-admin";
    case "hospital":
      return "arrow-hospital";
    case "recruiter":
      return "arrow-recruiter";
    case "job":
      return "arrow-job";
    default:
      return "arrow-muted";
  }
};

export function HospitalFlowBoard() {
  const store = useAdminStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // Canvas Viewport State (Zoom & Pan)
  const [scale, setScale] = useState(0.85);
  const [pan, setPan] = useState({ x: 150, y: 30 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Track active pointer events for pinch-to-zoom
  const activePointers = useRef<{ [id: number]: { x: number; y: number } }>({});
  const lastTouchDistance = useRef<number | null>(null);

  // Expand/Collapse States
  const [expandedHospitals, setExpandedHospitals] = useState<Set<string>>(new Set());
  const [expandedRecruiters, setExpandedRecruiters] = useState<Set<string>>(new Set());
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Selected Card for Drawer Details
  const [selectedEntity, setSelectedEntity] = useState<{
    id: string;
    type: "hospital" | "recruiter" | "job" | "applicant";
    data: any;
  } | null>(null);

  // Initialize with some expanded hospitals so the board isn't completely collapsed
  useEffect(() => {
    if (store.hospitals.length > 0 && expandedHospitals.size === 0) {
      // Expand first hospital by default
      setExpandedHospitals(new Set([store.hospitals[0].id]));
    }
  }, [store.hospitals]);

  // Handle zoom centering or clamping
  const handleZoom = (factor: number) => {
    setScale((prev) => Math.min(Math.max(prev * factor, 0.3), 1.8));
  };

  const handleResetView = () => {
    setScale(0.85);
    if (containerRef.current) {
      const width = containerRef.current.clientWidth;
      setPan({ x: width / 2 - 50, y: 40 });
    } else {
      setPan({ x: 200, y: 40 });
    }
    setHighlightedNodeId(null);
  };

  // Center pan initially
  useEffect(() => {
    handleResetView();
  }, []);

  // Handle Mouse Wheel Zoom (Figmanic zoom experience!)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomIntensity = 0.05;

      // Calculate cursor position relative to the container
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setScale((prevScale) => {
        const delta = -e.deltaY * zoomIntensity * 0.01;
        const newScale = Math.min(Math.max(prevScale + delta, 0.25), 1.8);

        // Adjust pan so the zoom is centered on the cursor
        setPan((prevPan) => {
          const xs = (mouseX - prevPan.x) / prevScale;
          const ys = (mouseY - prevPan.y) / prevScale;
          return {
            x: mouseX - xs * newScale,
            y: mouseY - ys * newScale,
          };
        });

        return newScale;
      });
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Panning & Zoom Touch/Pointer Drag Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only pan if clicking on the background (svg / dot grid)
    if (
      (e.target as HTMLElement).closest(".flow-card-node") ||
      (e.target as HTMLElement).closest(".floating-toolbar")
    ) {
      return;
    }
    
    // Store pointer position
    activePointers.current[e.pointerId] = { x: e.clientX, y: e.clientY };
    const pointerIds = Object.keys(activePointers.current);

    if (pointerIds.length === 1) {
      const el = containerRef.current;
      if (el) {
        el.setPointerCapture(e.pointerId);
      }
      setIsPanning(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else if (pointerIds.length === 2) {
      // Start of pinch zoom: disable panning
      setIsPanning(false);
      const pts = Object.values(activePointers.current);
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      lastTouchDistance.current = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activePointers.current[e.pointerId]) {
      activePointers.current[e.pointerId] = { x: e.clientX, y: e.clientY };
    }

    const pointerIds = Object.keys(activePointers.current);
    if (pointerIds.length === 1 && isPanning) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    } else if (pointerIds.length === 2 && lastTouchDistance.current !== null) {
      const pts = Object.values(activePointers.current);
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      const factor = dist / lastTouchDistance.current;
      lastTouchDistance.current = dist;

      // Find midpoint of the two touches relative to the container bounding box
      const el = containerRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const midX = (pts[0].x + pts[1].x) / 2 - rect.left;
        const midY = (pts[0].y + pts[1].y) / 2 - rect.top;

        setScale((prevScale) => {
          const newScale = Math.min(Math.max(prevScale * factor, 0.25), 1.8);

          // Adjust pan so the zoom is centered on the midpoint
          setPan((prevPan) => {
            const xs = (midX - prevPan.x) / prevScale;
            const ys = (midY - prevPan.y) / prevScale;
            return {
              x: midX - xs * newScale,
              y: midY - ys * newScale,
            };
          });
          return newScale;
        });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    delete activePointers.current[e.pointerId];
    const pointerIds = Object.keys(activePointers.current);

    if (pointerIds.length < 2) {
      lastTouchDistance.current = null;
    }

    if (pointerIds.length === 0 && isPanning) {
      const el = containerRef.current;
      if (el) {
        try {
          el.releasePointerCapture(e.pointerId);
        } catch (err) {}
      }
      setIsPanning(false);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    delete activePointers.current[e.pointerId];
    lastTouchDistance.current = null;
    if (isPanning) {
      setIsPanning(false);
    }
  };

  // Toggle helpers
  const toggleHospital = (id: string) => {
    setExpandedHospitals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleRecruiter = (id: string) => {
    setExpandedRecruiters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleJob = (id: string) => {
    setExpandedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedHospitals(new Set(store.hospitals.map((h) => h.id)));
    setExpandedRecruiters(new Set(store.recruiters.map((r) => r.id)));
    setExpandedJobs(new Set(store.jobs.map((j) => j.id)));
  };

  const collapseAll = () => {
    setExpandedHospitals(new Set());
    setExpandedRecruiters(new Set());
    setExpandedJobs(new Set());
  };

  // Core visual tree node generator & coordinate layouts
  const { nodes, connections } = useMemo(() => {
    const computedNodes: NodeLayout[] = [];
    const computedConnections: {
      from: string;
      to: string;
      fromCoord: Coordinates;
      toCoord: Coordinates;
    }[] = [];
    const subtreeWidths: Record<string, number> = {};

    // 1. Helper to retrieve active children under a node
    const getChildren = (id: string, type: string) => {
      if (type === "admin") {
        return store.hospitals.map((h) => ({ id: h.id, type: "hospital" as const }));
      }
      if (type === "hospital") {
        if (!expandedHospitals.has(id)) return [];
        return store.recruiters
          .filter((r) => r.hospitalId === id)
          .map((r) => ({ id: r.id, type: "recruiter" as const }));
      }
      if (type === "recruiter") {
        if (!expandedRecruiters.has(id)) return [];
        return store.jobs
          .filter((j) => j.recruiterId === id)
          .map((j) => ({ id: j.id, type: "job" as const }));
      }
      if (type === "job") {
        if (!expandedJobs.has(id)) return [];
        return store.applications
          .filter((a) => a.jobId === id)
          .map((a) => ({ id: a.id, type: "applicant" as const }));
      }
      return [];
    };

    // 2. First Pass: Compute sub-tree widths bottom-up
    const computeWidth = (id: string, type: string): number => {
      const key = `${type}-${id}`;
      const children = getChildren(id, type);

      if (children.length === 0) {
        subtreeWidths[key] = CARD_WIDTH + HORIZONTAL_GAP;
        return CARD_WIDTH + HORIZONTAL_GAP;
      }

      let width = 0;
      for (const child of children) {
        width += computeWidth(child.id, child.type);
      }
      subtreeWidths[key] = width;
      return width;
    };

    // Initialize root widths
    computeWidth("root", "admin");

    // 3. Second Pass: Calculate positions top-down
    const assignPositions = (
      id: string,
      type: string,
      parentX: number,
      level: number,
      parentId?: string,
    ) => {
      const key = `${type}-${id}`;
      const y = LEVEL_HEIGHTS[level];
      const children = getChildren(id, type);

      // Determine actual data payload
      let data: any = null;
      if (type === "hospital") data = store.hospitals.find((h) => h.id === id);
      else if (type === "recruiter") data = store.recruiters.find((r) => r.id === id);
      else if (type === "job") data = store.jobs.find((j) => j.id === id);
      else if (type === "applicant") data = store.applications.find((a) => a.id === id);

      computedNodes.push({
        id: key,
        type: type as any,
        x: parentX,
        y,
        width: subtreeWidths[key] || CARD_WIDTH + HORIZONTAL_GAP,
        data,
        parentId,
      });

      if (children.length === 0) return;

      const totalWidth = subtreeWidths[key];
      let currentX = parentX - totalWidth / 2;

      for (const child of children) {
        const childKey = `${child.type}-${child.id}`;
        const childWidth = subtreeWidths[childKey];
        const childX = currentX + childWidth / 2;

        assignPositions(child.id, child.type, childX, level + 1, key);

        // Add connection
        computedConnections.push({
          from: key,
          to: childKey,
          fromCoord: { x: parentX, y: y + (type === "admin" ? 40 : CARD_HEIGHT / 2) },
          toCoord: { x: childX, y: LEVEL_HEIGHTS[level + 1] - CARD_HEIGHT / 2 },
        });

        currentX += childWidth;
      }
    };

    // Trigger position assignments from Admin root
    assignPositions("root", "admin", 0, 0);

    return { nodes: computedNodes, connections: computedConnections };
  }, [
    store.hospitals,
    store.recruiters,
    store.jobs,
    store.applications,
    expandedHospitals,
    expandedRecruiters,
    expandedJobs,
  ]);

  // Center/Pan and glow focus on a node from search
  const handleFocusNode = (node: NodeLayout) => {
    if (!containerRef.current) return;

    // Auto expand parent nodes if they are collapsed
    const parts = node.id.split("-");
    const nodeType = parts[0];
    const nodeId = parts[1];

    if (nodeType === "applicant") {
      const app = store.applications.find((a) => a.id === nodeId);
      if (app) {
        const job = store.jobs.find((j) => j.id === app.jobId);
        if (job) {
          setExpandedHospitals((prev) => new Set([...prev, job.hospitalId]));
          setExpandedRecruiters((prev) => new Set([...prev, job.recruiterId]));
          setExpandedJobs((prev) => new Set([...prev, job.id]));
        }
      }
    } else if (nodeType === "job") {
      const job = store.jobs.find((j) => j.id === nodeId);
      if (job) {
        setExpandedHospitals((prev) => new Set([...prev, job.hospitalId]));
        setExpandedRecruiters((prev) => new Set([...prev, job.recruiterId]));
      }
    } else if (nodeType === "recruiter") {
      const rec = store.recruiters.find((r) => r.id === nodeId);
      if (rec) {
        setExpandedHospitals((prev) => new Set([...prev, rec.hospitalId]));
      }
    }

    // Set highlight & center viewport on nodes coordinates
    setTimeout(() => {
      setHighlightedNodeId(node.id);
      const width = containerRef.current?.clientWidth || 800;
      const height = containerRef.current?.clientHeight || 600;

      setScale(1.0);
      setPan({
        x: width / 2 - node.x,
        y: height / 2 - node.y,
      });
    }, 100);

    setShowSearchDropdown(false);
    setSearchQuery("");
  };

  // Search Results Filtering
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const results: { label: string; sub: string; type: string; node: any }[] = [];

    // Hospitals
    store.hospitals.forEach((h) => {
      if (h.name.toLowerCase().includes(query) || h.location.toLowerCase().includes(query)) {
        results.push({
          label: h.name,
          sub: `Hospital · ${h.location}`,
          type: "hospital",
          node: nodes.find((n) => n.id === `hospital-${h.id}`) || {
            id: `hospital-${h.id}`,
            x: 0,
            y: LEVEL_HEIGHTS[1],
          },
        });
      }
    });

    // Recruiters
    store.recruiters.forEach((r) => {
      if (r.name.toLowerCase().includes(query) || r.email.toLowerCase().includes(query)) {
        results.push({
          label: r.name,
          sub: `Recruiter · ${r.email}`,
          type: "recruiter",
          node: nodes.find((n) => n.id === `recruiter-${r.id}`) || {
            id: `recruiter-${r.id}`,
            x: 0,
            y: LEVEL_HEIGHTS[2],
          },
        });
      }
    });

    // Jobs
    store.jobs.forEach((j) => {
      if (j.title.toLowerCase().includes(query) || j.location.toLowerCase().includes(query)) {
        results.push({
          label: j.title,
          sub: `Job Post · ${j.location}`,
          type: "job",
          node: nodes.find((n) => n.id === `job-${j.id}`) || {
            id: `job-${j.id}`,
            x: 0,
            y: LEVEL_HEIGHTS[3],
          },
        });
      }
    });

    // Applicants
    store.applications.forEach((a) => {
      const candidateName = a.candidate || "Unknown Candidate";
      if (candidateName.toLowerCase().includes(query) || a.status.toLowerCase().includes(query)) {
        results.push({
          label: candidateName,
          sub: `Applicant · Status: ${a.status}`,
          type: "applicant",
          node: nodes.find((n) => n.id === `applicant-${a.id}`) || {
            id: `applicant-${a.id}`,
            x: 0,
            y: LEVEL_HEIGHTS[4],
          },
        });
      }
    });

    return results.slice(0, 8); // Limit to 8 matching items
  }, [searchQuery, store.hospitals, store.recruiters, store.jobs, store.applications, nodes]);

  // Retrieve Candidate model for applicant drawer details
  const getCandidateData = (applicantId: string): Candidate | undefined => {
    const app = store.applications.find((a) => a.id === applicantId);
    if (!app) return undefined;
    return store.candidates.find((c) => c.id === app.candidateId || c.name === app.candidate);
  };

  return (
    <div className="relative w-full rounded-2xl border border-muted-foreground/15 bg-background shadow-xl select-none overflow-hidden h-[720px] flex flex-col">
      {/* Visual board header / controls */}
      <div className="z-20 border-b border-border bg-card/65 backdrop-blur-md px-6 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20">
            <Activity className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              Hierarchy Board
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-400 border border-indigo-500/20">
                <Sparkles className="h-2.5 w-2.5" /> Figma Canvas Mode
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Interact, drag, zoom and explore the connected workflow.
            </p>
          </div>
        </div>

        {/* Floating actions & Search bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px]">
            <div className="flex h-9.5 items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground shadow-sm focus-within:ring-1 focus-within:ring-ring">
              <Search className="h-3.5 w-3.5" />
              <input
                type="text"
                placeholder="Search hospitals, jobs, applicants..."
                className="w-full bg-transparent border-0 outline-none text-foreground text-xs"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onFocus={() => setShowSearchDropdown(true)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Search Dropdown Overlay */}
            {showSearchDropdown && searchResults.length > 0 && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowSearchDropdown(false)} />
                <div className="absolute left-0 right-0 mt-2 z-40 max-h-80 overflow-y-auto rounded-xl border bg-popover text-popover-foreground shadow-xl p-1.5 scrollbar-thin">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b">
                    Search Results
                  </div>
                  {searchResults.map((res, i) => (
                    <button
                      key={i}
                      onClick={() => handleFocusNode(res.node)}
                      className="w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs hover:bg-accent hover:text-accent-foreground transition-colors group"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {res.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">{res.sub}</p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transform translate-x-1 group-hover:translate-x-0 transition-all" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Quick Bulk Expand/Collapse Actions */}
          <div className="flex items-center gap-1.5 bg-muted/65 p-1 rounded-lg border">
            <button
              onClick={expandAll}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-md hover:bg-card hover:text-foreground transition-all flex items-center gap-1 text-muted-foreground"
              title="Expand all nodes"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-md hover:bg-card hover:text-foreground transition-all flex items-center gap-1 text-muted-foreground"
              title="Collapse all nodes"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* FLOW CANVAS CONTAINER */}
      <div
        ref={containerRef}
        className={`flex-1 relative overflow-hidden bg-background outline-none ${
          isPanning ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{
          touchAction: "none",
          backgroundImage: `radial-gradient(circle, var(--color-border) 1.2px, transparent 1.2px)`,
          backgroundSize: "28px 28px",
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {/* Animated Grid lines / Interactive content wrapper */}
        <motion.div
          className="absolute origin-top-left"
          style={{
            x: pan.x,
            y: pan.y,
            scale,
          }}
          animate={isPanning ? undefined : { x: pan.x, y: pan.y, scale }}
          transition={{ type: "spring", damping: 30, stiffness: 220 }}
        >
          {/* SVG Connection Lines layer */}
          <svg
            className="absolute overflow-visible pointer-events-none top-0 left-0"
            style={{ width: "1px", height: "1px" }}
          >
            <defs>
              {/* Arrowhead marker definitions colored per level/plan for old school graph look */}
              <marker
                id="arrow-admin"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--color-primary)" />
              </marker>
              <marker
                id="arrow-premium"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#d4af37" />
              </marker>
              <marker
                id="arrow-pro"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#14b8a6" />
              </marker>
              <marker
                id="arrow-hospital"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#6366f1" />
              </marker>
              <marker
                id="arrow-basic"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#cd7f32" />
              </marker>
              <marker
                id="arrow-recruiter"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
              </marker>
              <marker
                id="arrow-job"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#8b5cf6" />
              </marker>
              <marker
                id="arrow-muted"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--color-border)" />
              </marker>
            </defs>

            <AnimatePresence>
              {connections.map((conn) => {
                const { fromCoord, toCoord } = conn;

                // End the path slightly early so the arrowhead has room to point to the port circle
                const endPt = {
                  x: toCoord.x,
                  y: toCoord.y - 6,
                };

                const pathData = getPathData(fromCoord, endPt);
                const isHighlighted =
                  highlightedNodeId === conn.to || highlightedNodeId === conn.from;
                const lineColor = getConnectionColors(conn.from, conn.to, isHighlighted, store);
                const markerId = getMarkerId(conn.from, conn.to, isHighlighted, store);
                const key = `${conn.from}-${conn.to}`;

                return (
                  <motion.g
                    key={key}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Outer glow connection shadow for premium look */}
                    <motion.path
                      d={pathData}
                      fill="none"
                      stroke={lineColor}
                      strokeWidth={isHighlighted ? 5 : 2}
                      strokeOpacity={isHighlighted ? 0.25 : 0.45}
                      animate={{ d: pathData }}
                      transition={{ type: "spring", stiffness: 180, damping: 22 }}
                    />
                    {/* Inner dynamic flowing dash line with arrowhead */}
                    <motion.path
                      d={pathData}
                      fill="none"
                      stroke={lineColor}
                      strokeWidth={isHighlighted ? 2.5 : 1.5}
                      className={`transition-all duration-300 ${isHighlighted ? "stroke-dash-animated" : ""}`}
                      style={{
                        strokeDasharray: isHighlighted ? "8, 6" : undefined,
                      }}
                      markerEnd={`url(#${markerId})`}
                      animate={{ d: pathData }}
                      transition={{ type: "spring", stiffness: 180, damping: 22 }}
                    />
                  </motion.g>
                );
              })}
            </AnimatePresence>

            {/* Connection ports (jacks/dots) */}
            <AnimatePresence>
              {nodes.map((node) => {
                const cardHalfHeight = node.type === "admin" ? 40 : CARD_HEIGHT / 2;

                const inputPort =
                  node.type !== "admin" ? { x: node.x, y: node.y - cardHalfHeight } : null;
                const outputPort =
                  node.type !== "applicant" ? { x: node.x, y: node.y + cardHalfHeight } : null;

                let colorClass = "fill-indigo-500 stroke-indigo-200 dark:stroke-indigo-950";
                if (node.type === "hospital") {
                  if (node.data?.plan === "Premium") {
                    colorClass =
                      "fill-[#d4af37] stroke-[#d4af37]/35 dark:stroke-[#d4af37]/50 shadow-[0_0_8px_rgba(212,175,55,0.4)]";
                  } else if (node.data?.plan === "Pro") {
                    colorClass =
                      "fill-teal-500 stroke-teal-200 dark:stroke-teal-950 shadow-[0_0_8px_rgba(20,184,166,0.3)]";
                  } else {
                    colorClass = "fill-[#cd7f32] stroke-[#cd7f32]/20 dark:stroke-[#cd7f32]/45";
                  }
                } else if (node.type === "recruiter")
                  colorClass = "fill-emerald-500 stroke-emerald-200 dark:stroke-emerald-950";
                else if (node.type === "job")
                  colorClass = "fill-violet-500 stroke-violet-200 dark:stroke-violet-950";
                else if (node.type === "applicant")
                  colorClass = "fill-sky-500 stroke-sky-200 dark:stroke-sky-950";

                const parentNode = node.parentId ? nodes.find((n) => n.id === node.parentId) : null;
                const parentHalfHeight = parentNode
                  ? parentNode.type === "admin"
                    ? 40
                    : CARD_HEIGHT / 2
                  : CARD_HEIGHT / 2;
                const startCX = parentNode ? parentNode.x : node.x;
                const startCY = parentNode ? parentNode.y + parentHalfHeight : node.y;

                return (
                  <motion.g
                    key={`ports-${node.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {inputPort && (
                      <g>
                        {/* Outer port circle */}
                        <motion.circle
                          r={4.5}
                          className={`${colorClass} stroke-[1.5] shadow-sm`}
                          initial={{ cx: startCX, cy: startCY, scale: 0 }}
                          animate={{ cx: inputPort.x, cy: inputPort.y, scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ type: "spring", stiffness: 180, damping: 22 }}
                        />
                        {/* Inner port donut core for premium old-school jack look */}
                        <motion.circle
                          r={1.5}
                          className="fill-background"
                          initial={{ cx: startCX, cy: startCY, scale: 0 }}
                          animate={{ cx: inputPort.x, cy: inputPort.y, scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ type: "spring", stiffness: 180, damping: 22 }}
                        />
                      </g>
                    )}
                    {outputPort && (
                      <g>
                        {/* Outer port circle */}
                        <motion.circle
                          r={4.5}
                          className={`${colorClass} stroke-[1.5] shadow-sm`}
                          initial={{ cx: startCX, cy: startCY, scale: 0 }}
                          animate={{ cx: outputPort.x, cy: outputPort.y, scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ type: "spring", stiffness: 180, damping: 22 }}
                        />
                        {/* Inner port donut core */}
                        <motion.circle
                          r={1.5}
                          className="fill-background"
                          initial={{ cx: startCX, cy: startCY, scale: 0 }}
                          animate={{ cx: outputPort.x, cy: outputPort.y, scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ type: "spring", stiffness: 180, damping: 22 }}
                        />
                      </g>
                    )}
                  </motion.g>
                );
              })}
            </AnimatePresence>
          </svg>

          {/* Cards Elements Layout */}
          <AnimatePresence>
            {nodes.map((node) => {
              const isHighlighted = highlightedNodeId === node.id;

              const cardHalfHeight = node.type === "admin" ? 40 : CARD_HEIGHT / 2;
              const targetX = node.x - CARD_WIDTH / 2;
              const targetY = node.y - cardHalfHeight;

              const parentNode = node.parentId ? nodes.find((n) => n.id === node.parentId) : null;
              const parentHalfHeight = parentNode
                ? parentNode.type === "admin"
                  ? 40
                  : CARD_HEIGHT / 2
                : CARD_HEIGHT / 2;
              const startX = parentNode ? parentNode.x - CARD_WIDTH / 2 : targetX;
              const startY = parentNode ? parentNode.y - parentHalfHeight : targetY;

              return (
                <motion.div
                  key={node.id}
                  className="absolute flow-card-node"
                  initial={{
                    opacity: 0,
                    scale: 0.6,
                    x: startX,
                    y: startY,
                  }}
                  animate={{
                    opacity: 1,
                    scale: isHighlighted ? 1.03 : 1,
                    x: targetX,
                    y: targetY,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.6,
                    x: startX,
                    y: startY,
                  }}
                  transition={{ type: "spring", stiffness: 180, damping: 22 }}
                  style={{
                    left: 0,
                    top: 0,
                    width: CARD_WIDTH,
                    zIndex: isHighlighted ? 10 : 1,
                  }}
                >
                  {node.type === "admin" && (
                    <AdminNode
                      isHighlighted={isHighlighted}
                      onClick={() => {
                        setHighlightedNodeId(node.id);
                        toast.info("ApronHanger Super Admin Control Center");
                      }}
                    />
                  )}
                  {node.type === "hospital" && (
                    <HospitalCard
                      hospital={node.data}
                      isExpanded={expandedHospitals.has(node.data.id)}
                      isHighlighted={isHighlighted}
                      onToggleExpand={() => toggleHospital(node.data.id)}
                      onOpenDrawer={() =>
                        setSelectedEntity({ id: node.data.id, type: "hospital", data: node.data })
                      }
                      onActivateToggle={async () => {
                        try {
                          await store.toggleHospitalBlock(node.data.id);
                          toast.success(
                            `Hospital ${node.data.status === "Active" ? "Suspended" : "Reactivated"}`,
                          );
                        } catch (err: any) {
                          toast.error(err?.message || "Action failed.");
                        }
                      }}
                      onVerifyToggle={async () => {
                        try {
                          if (node.data.verified) {
                            await store.unverifyHospital(node.data.id);
                            toast.success("Verification revoked.");
                          } else {
                            await store.verifyHospital(node.data.id);
                            toast.success("Hospital successfully verified.");
                          }
                        } catch (err: any) {
                          toast.error(err?.message || "Verification action failed.");
                        }
                      }}
                    />
                  )}
                  {node.type === "recruiter" && (
                    <RecruiterCard
                      recruiter={node.data}
                      isExpanded={expandedRecruiters.has(node.data.id)}
                      isHighlighted={isHighlighted}
                      onToggleExpand={() => toggleRecruiter(node.data.id)}
                      onOpenDrawer={() =>
                        setSelectedEntity({ id: node.data.id, type: "recruiter", data: node.data })
                      }
                      onBlockToggle={async () => {
                        try {
                          await store.toggleRecruiterBlock(node.data.id);
                          toast.success(
                            `Recruiter ${node.data.status === "Active" ? "Suspended/Blocked" : "Reactivated"}`,
                          );
                        } catch (err: any) {
                          toast.error(err?.message || "Action failed.");
                        }
                      }}
                    />
                  )}
                  {node.type === "job" && (
                    <JobCard
                      job={node.data}
                      isExpanded={expandedJobs.has(node.data.id)}
                      isHighlighted={isHighlighted}
                      onToggleExpand={() => toggleJob(node.data.id)}
                      onOpenDrawer={() =>
                        setSelectedEntity({ id: node.data.id, type: "job", data: node.data })
                      }
                      onStatusChange={async (newStatus: "Active" | "Closed") => {
                        try {
                          await store.updateJobStatus(node.data.id, newStatus);
                          toast.success(`Job status updated to ${newStatus}`);
                        } catch (err: any) {
                          toast.error(err?.message || "Failed to update job status.");
                        }
                      }}
                    />
                  )}
                  {node.type === "applicant" && (
                    <ApplicantCard
                      application={node.data}
                      candidate={getCandidateData(node.data.id)}
                      isHighlighted={isHighlighted}
                      onOpenDrawer={() =>
                        setSelectedEntity({ id: node.data.id, type: "applicant", data: node.data })
                      }
                      onUpdateStatus={async (newStatus: string) => {
                        try {
                          await store.updateApplicationStatus(node.data.id, newStatus);
                          toast.success(`Application marked as ${newStatus}`);
                        } catch (err: any) {
                          toast.error(err?.message || "Status update failed.");
                        }
                      }}
                    />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Floating Canvas controls toolbar */}
      <div className="absolute bottom-5 left-5 z-20 bg-card/80 border border-border/80 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-lg flex items-center gap-3 floating-toolbar">
        <button
          onClick={() => handleZoom(0.85)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="text-xs font-bold text-foreground min-w-[36px] text-center select-none">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => handleZoom(1.15)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <div className="h-4 w-px bg-border mx-1" />
        <button
          onClick={handleResetView}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors flex items-center gap-1"
          title="Fit view to screen"
        >
          <Maximize2 className="h-4 w-4" />
          <span className="text-[10px] font-semibold">Reset</span>
        </button>
      </div>

      {/* Mini Visual Legend */}
      <div className="absolute bottom-5 right-5 z-20 bg-card/85 border border-border/80 backdrop-blur-md px-4 py-3.5 rounded-xl shadow-lg hidden lg:block select-none pointer-events-none min-w-[280px]">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3.5">
          <div>
            <h4 className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Workflow Hierarchy
            </h4>
            <div className="space-y-1.5 text-xs text-foreground">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded bg-indigo-500" />
                <span>Hospitals</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded bg-emerald-500" />
                <span>Recruiters</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded bg-violet-500" />
                <span>Job Posts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded bg-sky-500" />
                <span>Applicants</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Hospital Plans
            </h4>
            <div className="space-y-1.5 text-xs text-foreground">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded bg-[#fdf5ed] dark:bg-[#1c130d] border border-[#cd7f32] shadow-sm" />
                <span className="font-semibold text-muted-foreground">Basic (Bronze)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded bg-[#e6fbf7] dark:bg-[#091b1f] border border-teal-500 shadow-sm" />
                <span className="font-semibold text-muted-foreground">Pro (Teal)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded bg-[#ebf2fe] dark:bg-[#081229] border border-[#d4af37] shadow-[0_0_4.5px_rgba(212,175,55,0.4)]" />
                <span className="font-semibold text-muted-foreground">
                  Premium (Deep Blue & Gold)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* INLINE DETAILS SIDE DRAWER SHEET */}
      <Sheet
        open={selectedEntity !== null}
        onOpenChange={(open) => !open && setSelectedEntity(null)}
      >
        <SheetContent className="sm:max-w-md md:max-w-lg w-full bg-card/95 border-l border-border backdrop-blur-lg flex flex-col p-0 shadow-2xl z-[100]">
          {selectedEntity && (
            <EntityDetailsDrawer
              entityType={selectedEntity.type}
              entityId={selectedEntity.id}
              data={selectedEntity.data}
              store={store}
              getCandidateData={getCandidateData}
              onClose={() => setSelectedEntity(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* CSS Animation Keyframe Injection */}
      <style>{`
        @keyframes strokeDashFlow {
          to {
            stroke-dashoffset: -40;
          }
        }
        .stroke-dash-animated {
          animation: strokeDashFlow 1.6s linear infinite;
        }
      `}</style>
    </div>
  );
}

// ==========================================
// NODE 1: Admin Root Node component
// ==========================================
function AdminNode({ isHighlighted, onClick }: { isHighlighted: boolean; onClick: () => void }) {
  return (
    <motion.div
      onClick={onClick}
      className={`rounded-2xl bg-sidebar-bg border text-sidebar-active-foreground p-4 text-center cursor-pointer shadow-xl transition-all duration-300 select-none flex flex-col justify-center items-center h-[80px] ${
        isHighlighted
          ? "border-indigo-400 ring-2 ring-indigo-400/40 scale-105"
          : "border-sidebar-border hover:bg-sidebar-hover"
      }`}
      whileHover={{ y: -3, scale: 1.02 }}
    >
      <div className="mx-auto h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-400/25 flex items-center justify-center mb-1.5 shadow-sm">
        <Sparkles className="h-5 w-5" />
      </div>
      <p className="text-xs font-bold uppercase tracking-wider opacity-60">Super Portal</p>
      <h3 className="text-sm font-extrabold tracking-tight">System Admin</h3>
    </motion.div>
  );
}

// ==========================================
// NODE 2: Hospital Card Component
// ==========================================
interface HospitalCardProps {
  hospital: Hospital;
  isExpanded: boolean;
  isHighlighted: boolean;
  onToggleExpand: () => void;
  onOpenDrawer: () => void;
  onActivateToggle: () => void;
  onVerifyToggle: () => void;
}

function HospitalCard({
  hospital,
  isExpanded,
  isHighlighted,
  onToggleExpand,
  onOpenDrawer,
  onActivateToggle,
  onVerifyToggle,
}: HospitalCardProps) {
  const store = useAdminStore();
  const recCount = store.recruiters.filter((r) => r.hospitalId === hospital.id).length;
  const jobCount = store.jobs.filter((j) => j.hospitalId === hospital.id).length;

  // Clean any plan labels like (Premium), [Pro], - Basic from name to ensure the full name displays clearly
  const cleanName = useMemo(() => {
    return hospital.name
      .replace(/\s*[([\]](Premium|Pro|Basic)[)\]]\s*/gi, "")
      .replace(/\s*-\s*(Premium|Pro|Basic)\s*$/gi, "");
  }, [hospital.name]);

  // Plan styling mapping to differentiate tiers and look increasingly expensive/premium
  const planStyle = useMemo(() => {
    switch (hospital.plan) {
      case "Premium":
        return {
          cardClass: isHighlighted
            ? "border-[#d4af37] ring-2 ring-[#d4af37]/30 bg-gradient-to-br from-[#ebf2fe] via-[#f2f7ff] to-[#ebf2fe] dark:from-[#081229] dark:via-[#0d1f48] dark:to-[#081229] scale-[1.02] shadow-[0_0_20px_rgba(212,175,55,0.2)] text-slate-900 dark:text-slate-100"
            : "border-[#d4af37]/45 hover:border-[#d4af37] bg-gradient-to-br from-[#f3f7fe] via-[#f7faff] to-[#f3f7fe] dark:from-[#081229] dark:via-[#0b1a3c] dark:to-[#081229] shadow-md hover:shadow-lg hover:shadow-[#d4af37]/5 text-slate-800 dark:text-slate-200",
          iconClass:
            "bg-[#d4af37]/15 dark:bg-[#d4af37]/10 text-amber-600 dark:text-amber-400 border border-[#d4af37]/30 dark:border-[#d4af37]/25",
          textColor: "text-[#a87c00] dark:text-[#d4af37] hover:text-amber-600 font-extrabold",
          subtextColor: "text-slate-500 dark:text-slate-400",
          dividerColor: "border-amber-200 dark:border-[#d4af37]/15",
          expandBtnClass:
            "text-amber-700 border-amber-300/60 bg-amber-50/50 hover:bg-amber-100/60 dark:text-[#d4af37] dark:border-[#d4af37]/35 dark:bg-[#081229] dark:hover:bg-[#d4af37]/10 dark:hover:border-[#d4af37]",
          eyeBtnClass:
            "text-slate-500 hover:text-slate-700 border-amber-200 dark:text-slate-400 dark:hover:text-slate-200 dark:bg-[#081229] dark:hover:bg-[#d4af37]/10 dark:border-[#d4af37]/20",
        };
      case "Pro":
        return {
          cardClass: isHighlighted
            ? "border-teal-500 ring-2 ring-teal-500/30 bg-gradient-to-br from-[#e6fbf7] via-[#f0fdfb] to-[#e6fbf7] dark:from-[#091b1f] dark:via-[#0f2d34] dark:to-[#091b1f] scale-[1.02] shadow-[0_0_20px_rgba(20,184,166,0.18)] text-teal-950 dark:text-teal-50"
            : "border-teal-500/35 hover:border-teal-500 bg-gradient-to-br from-[#f0fdfa] via-[#f6fdfd] to-[#f0fdfa] dark:from-[#091b1f] dark:via-[#0b242a] dark:to-[#091b1f] shadow-md hover:shadow-lg hover:shadow-teal-500/5 text-slate-800 dark:text-teal-100",
          iconClass:
            "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 dark:border-teal-500/25",
          textColor: "text-teal-600 dark:text-teal-400 hover:text-teal-500 font-extrabold",
          subtextColor: "text-slate-500 dark:text-slate-400",
          dividerColor: "border-teal-100 dark:border-teal-500/15",
          expandBtnClass: isExpanded
            ? "text-teal-700 border-teal-300 bg-teal-50/60 hover:bg-teal-100/60 dark:text-teal-450 dark:border-teal-500/35 dark:bg-teal-950/30 dark:hover:bg-teal-500/10"
            : "text-muted-foreground hover:text-teal-600 hover:bg-teal-50/50 hover:border-teal-500/20 border-border",
          eyeBtnClass:
            "text-muted-foreground hover:text-teal-600 hover:bg-teal-50/50 border-border",
        };
      case "Basic":
      default:
        return {
          cardClass: isHighlighted
            ? "border-[#cd7f32] ring-2 ring-[#cd7f32]/30 bg-gradient-to-br from-[#fdf5ed] via-[#fdfaf5] to-[#fdf5ed] dark:from-[#1c130d] dark:via-[#2d1e15] dark:to-[#1c130d] scale-[1.02] shadow-[0_0_20px_rgba(205,127,50,0.15)] text-orange-950 dark:text-orange-100"
            : "border-[#cd7f32]/35 hover:border-[#cd7f32] bg-gradient-to-br from-[#fdfaf6] via-[#fdfcfb] to-[#fdfaf6] dark:from-[#1c130d] dark:via-[#241810] dark:to-[#1c130d] shadow-md hover:shadow-lg text-slate-800 dark:text-orange-200/95",
          iconClass:
            "bg-[#cd7f32]/10 text-[#a05a18] dark:text-orange-400 border border-[#cd7f32]/20 dark:border-[#cd7f32]/25",
          textColor: "text-[#a05a18] dark:text-[#cd7f32] hover:text-[#cd7f32] font-extrabold",
          subtextColor: "text-slate-500 dark:text-slate-400",
          dividerColor: "border-orange-100 dark:border-[#cd7f32]/15",
          expandBtnClass: isExpanded
            ? "text-[#a05a18] border-[#cd7f32]/35 bg-orange-50/30 hover:bg-orange-100/40 dark:text-[#cd7f32] dark:border-[#cd7f32]/35 dark:bg-[#2d1e15] dark:hover:bg-[#cd7f32]/10"
            : "text-muted-foreground hover:text-[#cd7f32] hover:bg-[#cd7f32]/5 hover:border-[#cd7f32]/20 border-border",
          eyeBtnClass:
            "text-muted-foreground hover:text-[#cd7f32] hover:bg-[#cd7f32]/5 border-border",
        };
    }
  }, [hospital.plan, isHighlighted, isExpanded]);

  return (
    <motion.div
      className={`rounded-2xl border bg-card p-4.5 space-y-3 transition-all duration-300 relative ${planStyle.cardClass}`}
      whileHover={{ y: -3 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 w-full">
          <div
            className={`h-9 w-9 shrink-0 items-center justify-center rounded-lg font-bold flex shadow-inner ${planStyle.iconClass}`}
          >
            {hospital.name[0]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h4
                className={`text-xs.5 font-bold transition-colors cursor-pointer leading-tight ${planStyle.textColor}`}
                onClick={onOpenDrawer}
              >
                {cleanName}
              </h4>
            </div>
            <p className={`text-[10px] truncate ${planStyle.subtextColor}`}>{hospital.location}</p>
          </div>
        </div>

        {/* Indicators */}
        <div className="flex items-center gap-1">
          {hospital.verified && (
            <span
              className="p-0.5 rounded bg-emerald-500/10 text-emerald-450 border border-emerald-500/20"
              title="Verified Hospital"
            >
              <ShieldCheck className="h-3 w-3" />
            </span>
          )}
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              hospital.status === "Active" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
            }`}
            title={`Status: ${hospital.status}`}
          />
        </div>
      </div>

      <div
        className={`flex items-center justify-between text-[10px] border-t pt-2.5 ${planStyle.dividerColor}`}
      >
        <div className={`flex gap-3 font-semibold ${planStyle.subtextColor}`}>
          <span>{recCount} Recs</span>
          <span>{jobCount} Jobs</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Action triggers */}
          <button
            onClick={onOpenDrawer}
            className={`p-1 rounded transition-colors border ${planStyle.eyeBtnClass}`}
            title="Details & Logs"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Floating expand/collapse pill */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleExpand();
        }}
        className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 z-20 h-6 px-3 rounded-full border text-[10px] font-bold shadow-md flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer hover:shadow-lg ${planStyle.expandBtnClass}`}
      >
        {isExpanded ? (
          <>
            <ChevronDown className="h-3.5 w-3.5" />
            <span>Collapse</span>
          </>
        ) : (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <span>Expand ({recCount})</span>
          </>
        )}
      </button>
    </motion.div>
  );
}

// ==========================================
// NODE 3: Recruiter Card Component
// ==========================================
interface RecruiterCardProps {
  recruiter: Recruiter;
  isExpanded: boolean;
  isHighlighted: boolean;
  onToggleExpand: () => void;
  onOpenDrawer: () => void;
  onBlockToggle: () => void;
}

function RecruiterCard({
  recruiter,
  isExpanded,
  isHighlighted,
  onToggleExpand,
  onOpenDrawer,
  onBlockToggle,
}: RecruiterCardProps) {
  const store = useAdminStore();
  const jobCount = store.jobs.filter((j) => j.recruiterId === recruiter.id).length;

  return (
    <motion.div
      className={`rounded-2xl border bg-card p-4.5 space-y-3 shadow-md hover:shadow-xl transition-all duration-300 relative ${
        isHighlighted
          ? "border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-500/5 scale-[1.02]"
          : "border-border hover:border-emerald-500/30"
      }`}
      whileHover={{ y: -3 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold flex shadow-inner">
            {recruiter.name[0]}
          </div>
          <div className="min-w-0">
            <h4
              className="text-xs.5 font-bold truncate text-foreground hover:text-emerald-500 transition-colors cursor-pointer"
              onClick={onOpenDrawer}
            >
              {recruiter.name}
            </h4>
            <p className="text-[10px] text-muted-foreground truncate">{recruiter.email}</p>
          </div>
        </div>

        {/* Status indicator */}
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            recruiter.status === "Active" ? "bg-emerald-500" : "bg-destructive"
          }`}
          title={`Status: ${recruiter.status}`}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] border-t pt-2.5 border-border">
        <div className="flex gap-2 text-muted-foreground font-semibold">
          <span>{jobCount} Active Job Posts</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenDrawer}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-muted-foreground/10"
            title="Details & Audit"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Floating expand/collapse pill */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleExpand();
        }}
        className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 z-20 h-6 px-3 rounded-full border bg-card text-[10px] font-bold shadow-md flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer hover:shadow-lg ${
          isExpanded
            ? "text-emerald-500 border-emerald-500/35 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-500/10"
            : "text-muted-foreground hover:text-foreground hover:bg-muted border-border"
        }`}
      >
        {isExpanded ? (
          <>
            <ChevronDown className="h-3.5 w-3.5" />
            <span>Collapse</span>
          </>
        ) : (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <span>Expand ({jobCount})</span>
          </>
        )}
      </button>
    </motion.div>
  );
}

// ==========================================
// NODE 4: Job Card Component
// ==========================================
interface JobCardProps {
  job: Job;
  isExpanded: boolean;
  isHighlighted: boolean;
  onToggleExpand: () => void;
  onOpenDrawer: () => void;
  onStatusChange: (status: "Active" | "Closed") => void;
}

function JobCard({
  job,
  isExpanded,
  isHighlighted,
  onToggleExpand,
  onOpenDrawer,
  onStatusChange,
}: JobCardProps) {
  const store = useAdminStore();
  const applicantCount = store.applications.filter((a) => a.jobId === job.id).length;

  return (
    <motion.div
      className={`rounded-2xl border bg-card p-4.5 space-y-3 shadow-md hover:shadow-xl transition-all duration-300 relative ${
        isHighlighted
          ? "border-violet-500 ring-2 ring-violet-500/30 bg-violet-50/5 scale-[1.02]"
          : "border-border hover:border-violet-500/30"
      }`}
      whileHover={{ y: -3 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500 border border-violet-500/20 font-bold flex shadow-inner">
            <Briefcase className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h4
              className="text-xs.5 font-bold truncate text-foreground hover:text-violet-500 transition-colors cursor-pointer"
              onClick={onOpenDrawer}
            >
              {job.title}
            </h4>
            <p className="text-[10px] text-muted-foreground truncate">{job.location}</p>
          </div>
        </div>

        {/* Status dot */}
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            job.status === "Active"
              ? "bg-emerald-500"
              : job.status === "Closed"
                ? "bg-muted-foreground"
                : "bg-amber-500"
          }`}
          title={`Status: ${job.status}`}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] border-t pt-2.5 border-border">
        <div className="flex gap-2 text-muted-foreground font-semibold">
          <span>{applicantCount} Candidates Applied</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenDrawer}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-muted-foreground/10"
            title="Details & Application Rates"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Floating expand/collapse pill */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleExpand();
        }}
        className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 z-20 h-6 px-3 rounded-full border bg-card text-[10px] font-bold shadow-md flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer hover:shadow-lg ${
          isExpanded
            ? "text-violet-500 border-violet-500/35 bg-violet-50/50 dark:bg-violet-950/30 hover:bg-violet-500/10"
            : "text-muted-foreground hover:text-foreground hover:bg-muted border-border"
        }`}
      >
        {isExpanded ? (
          <>
            <ChevronDown className="h-3.5 w-3.5" />
            <span>Collapse</span>
          </>
        ) : (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <span>Expand ({applicantCount})</span>
          </>
        )}
      </button>
    </motion.div>
  );
}

// ==========================================
// NODE 5: Applicant Card Component
// ==========================================
interface ApplicantCardProps {
  application: Application;
  candidate?: Candidate;
  isHighlighted: boolean;
  onOpenDrawer: () => void;
  onUpdateStatus: (newStatus: string) => void;
}

function ApplicantCard({
  application,
  candidate,
  isHighlighted,
  onOpenDrawer,
  onUpdateStatus,
}: ApplicantCardProps) {
  // Status styling colors
  const statusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "accepted":
      case "approved":
        return "bg-emerald-500/10 text-emerald-450 border-emerald-500/20";
      case "rejected":
        return "bg-rose-500/10 text-rose-450 border-rose-500/20";
      case "shortlisted":
        return "bg-violet-500/10 text-violet-450 border-violet-500/20";
      default:
        return "bg-amber-500/10 text-amber-500 border-amber-500/25";
    }
  };

  return (
    <motion.div
      className={`rounded-2xl border bg-card p-4 space-y-3 shadow-md hover:shadow-xl transition-all duration-300 ${
        isHighlighted
          ? "border-sky-500 ring-2 ring-sky-500/30 bg-sky-500/5 scale-[1.02]"
          : "border-border hover:border-sky-500/30"
      }`}
      whileHover={{ y: -3 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500 border border-sky-500/20 font-bold flex shadow-inner">
            <User className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h4
              className="text-xs.5 font-bold truncate text-foreground hover:text-sky-500 transition-colors cursor-pointer"
              onClick={onOpenDrawer}
            >
              {application.candidate || "Applicant"}
            </h4>
            <p className="text-[10px] text-muted-foreground truncate">
              {candidate?.role || "Specialist"} · {candidate?.experience || "N/A Exp"}
            </p>
          </div>
        </div>

        {/* View/Action icons */}
        <button
          onClick={onOpenDrawer}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Profile, CV, Timeline"
        >
          <Eye className="h-3 w-3" />
        </button>
      </div>

      <div className="flex items-center justify-between text-[10px] border-t pt-2.5 border-border">
        <span
          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-semibold border ${statusColor(application.status)}`}
        >
          {application.status}
        </span>

        {/* Quick action buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdateStatus("Shortlisted")}
            disabled={application.status === "Shortlisted"}
            className="px-1.5 py-0.5 rounded border border-violet-500/15 hover:bg-violet-500/10 text-violet-400 disabled:opacity-40 disabled:pointer-events-none"
            title="Shortlist Applicant"
          >
            SL
          </button>
          <button
            onClick={() => onUpdateStatus("Accepted")}
            disabled={application.status === "Accepted"}
            className="px-1.5 py-0.5 rounded border border-emerald-500/15 hover:bg-emerald-500/10 text-emerald-450 disabled:opacity-40 disabled:pointer-events-none"
            title="Approve/Accept Application"
          >
            Acc
          </button>
          <button
            onClick={() => onUpdateStatus("Rejected")}
            disabled={application.status === "Rejected"}
            className="px-1.5 py-0.5 rounded border border-rose-500/15 hover:bg-rose-500/10 text-rose-400 disabled:opacity-40 disabled:pointer-events-none"
            title="Reject Application"
          >
            Rej
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// =========================================================================
// ENTITY DETAILS DRAWER: Complete layout for side sheets
// =========================================================================
interface EntityDetailsDrawerProps {
  entityType: "hospital" | "recruiter" | "job" | "applicant";
  entityId: string;
  data: any;
  store: any;
  getCandidateData: (applicantId: string) => Candidate | undefined;
  onClose: () => void;
}

function EntityDetailsDrawer({
  entityType,
  entityId,
  data,
  store,
  getCandidateData,
  onClose,
}: EntityDetailsDrawerProps) {
  // Local active tab: 'profile' | 'audit' | 'analytics' | 'resume'
  const [activeTab, setActiveTab] = useState<"profile" | "audit" | "analytics" | "resume">(
    "profile",
  );

  // Fetch audit logs related to this entity
  const filteredLogs = useMemo(() => {
    const logs = store.logs || [];
    const query = data.name || data.title || data.candidate || "";
    if (!query) return [];
    return logs.filter(
      (log: any) =>
        log.user?.toLowerCase().includes(query.toLowerCase()) ||
        log.action?.toLowerCase().includes(query.toLowerCase()),
    );
  }, [store.logs, data]);

  // Analytics mock data
  const chartData = useMemo(() => {
    return [
      { name: "Week 1", count: 12 },
      { name: "Week 2", count: 18 },
      { name: "Week 3", count: 27 },
      { name: "Week 4", count: 32 },
      { name: "Week 5", count: 48 },
    ];
  }, []);

  // Set default tabs based on type
  useEffect(() => {
    if (entityType === "applicant") {
      setActiveTab("resume");
    } else {
      setActiveTab("profile");
    }
  }, [entityType, entityId]);

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* Drawer Header */}
      <div className="px-6 py-5 border-b border-border bg-card/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div
            className={`h-10 w-10 rounded-xl flex items-center justify-center text-primary-foreground font-bold shadow-md ${
              entityType === "hospital"
                ? "bg-indigo-500"
                : entityType === "recruiter"
                  ? "bg-emerald-500"
                  : entityType === "job"
                    ? "bg-violet-500"
                    : "bg-sky-500"
            }`}
          >
            {entityType === "hospital" && <Building2 className="h-5.5 w-5.5" />}
            {entityType === "recruiter" && <User className="h-5.5 w-5.5" />}
            {entityType === "job" && <Briefcase className="h-5.5 w-5.5" />}
            {entityType === "applicant" && <FileText className="h-5.5 w-5.5" />}
          </div>
          <div>
            <h3 className="text-base font-extrabold tracking-tight text-foreground">
              {data.name || data.title || data.candidate || "Profile Details"}
            </h3>
            <p className="text-xs text-muted-foreground capitalize">
              {entityType} Node · ID: {data.id}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="rounded-lg p-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-all border border-muted-foreground/15"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Tabs list menu */}
      <div className="px-6 border-b border-border bg-muted/20 flex items-center gap-1 shrink-0 h-11">
        {entityType === "applicant" && (
          <button
            onClick={() => setActiveTab("resume")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "resume"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            CV / Resume
          </button>
        )}
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === "profile"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Details
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === "analytics"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Analytics
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === "audit"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Audit Logs ({filteredLogs.length})
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        {activeTab === "profile" && (
          <div className="space-y-6">
            {/* Hospital fields */}
            {entityType === "hospital" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Location" value={data.location} />
                  <DetailField label="Joined Date" value={data.joined} />
                  <DetailField
                    label="Verification Status"
                    value={data.verified ? "Verified ✅" : "Unverified ❌"}
                  />
                  <DetailField label="Account Status" value={data.status} />
                  {data.inviteCode && <DetailField label="Invite Code" value={data.inviteCode} />}
                </div>

                <div className="border-t pt-5 space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Quick Admin Controls
                  </h4>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      onClick={async () => {
                        await store.toggleHospitalBlock(data.id);
                        toast.success("Hospital status updated.");
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/35 flex items-center gap-1.5"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      {data.status === "Active" ? "Suspend Account" : "Reactivate Account"}
                    </button>
                    <button
                      onClick={async () => {
                        if (data.verified) {
                          await store.unverifyHospital(data.id);
                          toast.success("Verification revoked.");
                        } else {
                          await store.verifyHospital(data.id);
                          toast.success("Hospital verified.");
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/35 flex items-center gap-1.5"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {data.verified ? "Revoke Verification" : "Verify Hospital"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Recruiter fields */}
            {entityType === "recruiter" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Role" value={data.role || "Recruiter"} />
                  <DetailField label="Email" value={data.email} />
                  <DetailField label="Joined Date" value={data.joined} />
                  <DetailField label="Status" value={data.status} />
                </div>

                <div className="border-t pt-5 space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Recruiter Actions
                  </h4>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      onClick={async () => {
                        await store.toggleRecruiterBlock(data.id);
                        toast.success("Recruiter status updated.");
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/25 flex items-center gap-1.5"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      {data.status === "Active" ? "Suspend Recruiter" : "Reactivate Recruiter"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Job fields */}
            {entityType === "job" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Location" value={data.location} />
                  <DetailField label="Job Status" value={data.status} />
                  <DetailField label="Posted Date" value={data.posted} />
                </div>

                <div className="border-t pt-5 space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Position Management
                  </h4>
                  <div className="flex flex-wrap gap-2.5">
                    {data.status === "Active" ? (
                      <button
                        onClick={async () => {
                          await store.updateJobStatus(data.id, "Closed");
                          toast.success("Job position closed.");
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border flex items-center gap-1.5"
                      >
                        <X className="h-3.5 w-3.5" />
                        Close Position
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          await store.updateJobStatus(data.id, "Active");
                          toast.success("Job position reactivated.");
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/35 flex items-center gap-1.5"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Re-Open Position
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        if (confirm("Are you sure you want to delete this job posting?")) {
                          await store.deleteJob(data.id);
                          toast.success("Job post deleted.");
                          onClose();
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/35 flex items-center gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Listing
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Applicant Details */}
            {entityType === "applicant" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Role Applied" value={data.job || "Medical Specialist"} />
                  <DetailField label="Applied Date" value={data.applied} />
                  <DetailField label="Application Status" value={data.status} />
                  <DetailField label="Hospital Entity" value={data.hospital || "Apollo"} />
                </div>

                <div className="border-t pt-5 space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Hiring Decision actions
                  </h4>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      onClick={async () => {
                        await store.updateApplicationStatus(data.id, "Shortlisted");
                        toast.success("Candidate shortlisted.");
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-violet-500/10 hover:bg-violet-500/20 text-violet-500 border border-violet-500/35 flex items-center gap-1.5"
                    >
                      Shortlist Candidate
                    </button>
                    <button
                      onClick={async () => {
                        await store.updateApplicationStatus(data.id, "Accepted");
                        toast.success("Candidate accepted/hired!");
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/35 flex items-center gap-1.5"
                    >
                      Approve & Accept
                    </button>
                    <button
                      onClick={async () => {
                        await store.updateApplicationStatus(data.id, "Rejected");
                        toast.success("Application rejected.");
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/35 flex items-center gap-1.5"
                    >
                      Reject Application
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ANALYTICS GRAPH TAB */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="bg-muted/30 border p-4.5 rounded-2xl">
              <h4 className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-indigo-500" />
                Hiring Velocity (Past 5 Weeks)
              </h4>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="100%">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--color-border)"
                    />
                    <XAxis
                      dataKey="name"
                      stroke="var(--color-muted-foreground)"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} />
                    <RechartsTooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        fontSize: 11,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCount)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border p-4 rounded-xl text-center">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Conversion Rate
                </p>
                <p className="text-2xl font-extrabold text-foreground">78.5%</p>
              </div>
              <div className="border p-4 rounded-xl text-center">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Avg. Hiring Speed
                </p>
                <p className="text-2xl font-extrabold text-foreground">12 Days</p>
              </div>
            </div>
          </div>
        )}

        {/* AUDIT TIMELINE TAB */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Audit Trail Actions
            </h4>
            {filteredLogs.length === 0 ? (
              <div className="text-center py-10 border border-dashed rounded-2xl p-4">
                <Activity className="h-8 w-8 text-muted-foreground/45 mx-auto mb-2" />
                <p className="text-xs font-semibold text-muted-foreground">
                  No recent audit trails for this node.
                </p>
              </div>
            ) : (
              <div className="relative border-l pl-4.5 border-border space-y-5 ml-2.5">
                {filteredLogs.map((log: any, i: number) => (
                  <div key={log.id || i} className="relative">
                    <span className="absolute -left-[25px] top-1.5 h-3.5 w-3.5 rounded-full border bg-card flex items-center justify-center border-border">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    </span>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-foreground">{log.action}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Triggered by <span className="font-semibold">{log.user}</span> ·{" "}
                        {log.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PREMIUM RESUME VIEWER (APPLICANTS ONLY) */}
        {activeTab === "resume" && entityType === "applicant" && (
          <div className="space-y-6">
            <ApplicantResumeViewer candidate={getCandidateData(entityId)} />
          </div>
        )}
      </div>
    </div>
  );
}

// Simple label/value decorator
function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border p-3.5 rounded-xl bg-card">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-xs font-bold text-foreground truncate">{value}</p>
    </div>
  );
}

// ==========================================
// RESUME COMPONENT: Premium styling for CVs
// ==========================================
function ApplicantResumeViewer({ candidate }: { candidate?: Candidate }) {
  if (!candidate) {
    return (
      <div className="text-center py-10 border border-dashed rounded-xl">
        <AlertCircle className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
        <p className="text-xs font-semibold text-muted-foreground">No CV Profile available.</p>
      </div>
    );
  }

  // Simulated professional resume details based on candidate
  const summaryText =
    candidate.role === "Doctor"
      ? `Dedicated Specialist in ${candidate.specialty} with over ${candidate.experience} of clinical experience in high-volume tertiary care centers. Skilled in diagnostic clinical reasoning, surgical procedures, and compassionate patient care. Expert in coordinating interdisciplinary teams to optimize healthcare delivery.`
      : `Registered Nurse specialized in ${candidate.specialty} patient care. Proactive clinical skills in emergency responsiveness, treatment execution, and patient documentation. Committed to providing premium clinical support and maintaining standard safety workflows in critical settings.`;

  const workExpList =
    candidate.role === "Doctor"
      ? [
          {
            role: `Senior consultant - ${candidate.specialty}`,
            facility: "Metro Cardiac Center",
            period: "2021 - Present",
            desc: "Supervised healthcare teams, handled emergency diagnostics, and led medical interventions.",
          },
          {
            role: `Junior Consultant`,
            facility: "General Medical Care Hospital",
            period: "2017 - 2021",
            desc: "Coordinated inpatient ward reviews, outpatient clinics, and treatment plans.",
          },
        ]
      : [
          {
            role: `Staff Nurse (ICU/Pediatrics)`,
            facility: "St. Jude Children Hospital",
            period: "2022 - Present",
            desc: "Maintained safety protocols, monitored intensive support lines, and administered doctor-prescribed medications.",
          },
          {
            role: `Ward Assistant`,
            facility: "City Clinic Healthcare",
            period: "2019 - 2022",
            desc: "Supported primary nursing care, vitals tracking, and patient records keeping.",
          },
        ];

  const handleDownload = () => {
    // Generate text/plain CV download for demonstration
    const content = `
APRONHANGER PROFESSIONAL CV / RESUME
====================================
Name: ${candidate.name}
Role: ${candidate.role}
Specialty: ${candidate.specialty}
Experience: ${candidate.experience}
Joined Platform: ${candidate.joined}

SUMMARY:
${summaryText}

WORK HISTORY:
${workExpList.map((exp) => `- ${exp.role} at ${exp.facility} (${exp.period})\n  ${exp.desc}`).join("\n")}
    `;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${candidate.name.replace(/\s+/g, "_")}_CV.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CV download started!");
  };

  return (
    <div className="space-y-6">
      {/* Action panel */}
      <div className="flex items-center justify-between border-b pb-4 shrink-0">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
          Interactive CV Viewer
        </h4>
        <button
          onClick={handleDownload}
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Download Resume
        </button>
      </div>

      {/* Styled Glassmorphic Sheet CV Layout */}
      <div className="border bg-card shadow-lg p-6 rounded-2xl relative space-y-5 border-border">
        {/* CV Header */}
        <div className="flex items-start justify-between border-b pb-4">
          <div>
            <h3 className="text-base font-extrabold tracking-tight text-foreground">
              {candidate.name}
            </h3>
            <p className="text-xs font-semibold text-primary">
              {candidate.role} · {candidate.specialty}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Experience: {candidate.experience}
            </p>
          </div>
          <div className="h-10 w-10 bg-primary/5 rounded-full flex items-center justify-center text-primary border border-primary/20">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        {/* Summary section */}
        <div className="space-y-1.5">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Professional Summary
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed text-justify">
            {summaryText}
          </p>
        </div>

        {/* Work experience */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Work Experience
          </h4>
          <div className="space-y-3">
            {workExpList.map((exp, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-foreground">{exp.role}</span>
                  <span className="text-primary">{exp.period}</span>
                </div>
                <p className="text-[10px] font-semibold text-muted-foreground">{exp.facility}</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{exp.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Education & Credentials
          </h4>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
            <div className="p-2 border rounded-lg bg-muted/20">
              <p className="font-bold text-foreground">Clinical Degree</p>
              <p>State University of Health Sciences</p>
            </div>
            <div className="p-2 border rounded-lg bg-muted/20">
              <p className="font-bold text-foreground">Practitioner License</p>
              <p>National Council Registered</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
