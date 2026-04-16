export interface BranchLabel {
  id: number;
  project_id: number;
  position: number;
  label: string;
}

export interface Branch {
  id: number;
  node_id: number;
  position: number;
  text: string;
  media_path: string | null;
  media_type: string | null;
}

export interface Project {
  id: number;
  uuid: string;
  center_label: string;
  language: string;
  created_at: string;
  branch_labels: BranchLabel[];
  submission_count?: number;
  next_participant_number?: number;
}

export interface Node {
  id: number;
  project_id: number | null;
  participant_name: string;
  created_at: string;
  branches: Branch[];
}

export interface Connection {
  id: number;
  project_id: number;
  node_id_a: number;
  node_id_b: number;
  shared_keywords: string[];
  created_at: string;
}
