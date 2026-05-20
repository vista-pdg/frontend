export interface Node3D {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  depth: number;
  parent: string | null;
  properties: Record<string, unknown>;
}

export interface Edge3D {
  id: string;
  from: string;
  to: string;
  weight: number | null;
  directed: boolean;
}

export interface GraphMeta {
  type: string;
  subtype: string | null;
  nodeCount: number;
  edgeCount: number;
  computedProperties: Record<string, unknown>;
}

export interface StructureResponse {
  error: boolean;
  message: string | null;
  contract: Record<string, unknown> | null;
  nodes: Node3D[];
  edges: Edge3D[];
  meta: GraphMeta | null;
}
